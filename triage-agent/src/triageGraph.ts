import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import {
  classifyFailure,
  parseClassification,
  buildUserMessage,
  SYSTEM_PROMPT,
  ClassificationResult,
} from './classifyFailure';
import { getLogsAroundTime, LogEntry } from './fetchLogs';

const CONFIDENCE_THRESHOLD = 0.7;

const TriageState = Annotation.Root({
  testName: Annotation<string>,
  errorMessage: Annotation<string>,
  stackTrace: Annotation<string>,
  timestamp: Annotation<string>,
  logs: Annotation<LogEntry[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  classification: Annotation<ClassificationResult | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  reconsidered: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),
});

type TriageStateType = typeof TriageState.State;

async function fetchLogsNode(state: TriageStateType): Promise<Partial<TriageStateType>> {
  if (!state.timestamp) {
    // No timestamp to look up — the caller supplied logs directly (e.g. an
    // eval harness replaying captured cases), possibly an empty array on
    // purpose. Don't attempt a live Elasticsearch query in that case.
    return {};
  }
  const logs = await getLogsAroundTime(state.timestamp);
  return { logs };
}

async function classifyNode(state: TriageStateType): Promise<Partial<TriageStateType>> {
  const classification = await classifyFailure(
    state.testName,
    state.errorMessage,
    state.stackTrace,
    state.logs,
  );
  return { classification };
}

async function reconsiderNode(state: TriageStateType): Promise<Partial<TriageStateType>> {
  const model = new ChatAnthropic({
    model: 'claude-haiku-4-5-20251001',
    temperature: 0,
  });

  const reconsiderSystemPrompt = `${SYSTEM_PROMPT}

You previously classified this failure but your confidence was low (below ${CONFIDENCE_THRESHOLD}). Look again, more carefully, and weigh the evidence a second time before giving your final answer. Do not just repeat your previous answer out of habit — if the evidence genuinely supports a different category, choose it. If, after careful reconsideration, your original answer really is the best fit, it is fine to keep it.

Your previous classification was:
${JSON.stringify(state.classification, null, 2)}`;

  const response = await model.invoke([
    new SystemMessage(reconsiderSystemPrompt),
    new HumanMessage(buildUserMessage(state.testName, state.errorMessage, state.stackTrace, state.logs)),
  ]);

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  return { classification: parseClassification(content), reconsidered: true };
}

function routeAfterClassify(state: TriageStateType): typeof END | 'reconsiderNode' {
  if (state.classification && state.classification.confidence < CONFIDENCE_THRESHOLD) {
    return 'reconsiderNode';
  }
  return END;
}

const graph = new StateGraph(TriageState)
  .addNode('fetchLogsNode', fetchLogsNode)
  .addNode('classifyNode', classifyNode)
  .addNode('reconsiderNode', reconsiderNode)
  .addEdge(START, 'fetchLogsNode')
  .addEdge('fetchLogsNode', 'classifyNode')
  .addConditionalEdges('classifyNode', routeAfterClassify, {
    reconsiderNode: 'reconsiderNode',
    [END]: END,
  })
  .addEdge('reconsiderNode', END)
  .compile();

export type TriageResult = ClassificationResult & { reconsidered: boolean };

export async function runTriage(
  testName: string,
  errorMessage: string,
  stackTrace: string,
  timestamp: string,
  logs?: LogEntry[],
): Promise<TriageResult> {
  const finalState = await graph.invoke({
    testName,
    errorMessage,
    stackTrace,
    timestamp,
    logs: logs ?? [],
  });

  if (!finalState.classification) {
    throw new Error('Triage graph finished without producing a classification');
  }

  return { ...finalState.classification, reconsidered: finalState.reconsidered };
}
