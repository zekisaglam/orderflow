import { ChatAnthropic } from '@langchain/anthropic';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import dotenv from 'dotenv';
import { LogEntry } from './fetchLogs';

dotenv.config();

export type FailureCategory =
  | 'product_bug'
  | 'flaky_test'
  | 'environment_issue'
  | 'locator_drift'
  | 'not_a_failure';

export type ClassificationResult = {
  category: FailureCategory;
  confidence: number;
  reasoning: string;
};

export const SYSTEM_PROMPT = `You are a test failure triage assistant. Given a failing test's name, error message, stack trace, and surrounding backend logs, classify the failure into exactly one of these categories:

- product_bug: The application itself behaved incorrectly (wrong response, wrong status code, wrong data) due to a genuine defect in the application code, independent of test or environment problems.
- flaky_test: The failure looks non-deterministic (timing, race condition, ordering dependency) and would likely pass on retry, without any real defect in the application.
- environment_issue: The failure was caused by the surrounding environment or infrastructure (a service being down, a database unreachable, network errors, missing configuration) rather than the application logic or the test itself.
- locator_drift: The failure was caused by a UI test using an outdated or incorrect selector/locator (e.g. element not found, text no longer matches) because the UI changed, rather than a real functional defect.
- not_a_failure: The input actually represents expected/correct behavior, not a real failure (e.g. a test intentionally exercising an error path, such as checking that invalid input is rejected, and the application responded exactly as expected).

Respond with ONLY a JSON object, no markdown formatting and no extra commentary, in exactly this shape:
{"category": "<one of product_bug | flaky_test | environment_issue | locator_drift | not_a_failure>", "confidence": <number between 0 and 1>, "reasoning": "<short explanation>"}`;

export function buildUserMessage(
  testName: string,
  errorMessage: string,
  stackTrace: string,
  logs: LogEntry[],
): string {
  return [
    `Test name: ${testName}`,
    `Error message: ${errorMessage}`,
    `Stack trace:\n${stackTrace}`,
    `Surrounding backend logs (chronological):\n${JSON.stringify(logs, null, 2)}`,
  ].join('\n\n');
}

export function parseClassification(content: string): ClassificationResult {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Could not find JSON in model response: ${content}`);
  }

  const parsed = JSON.parse(match[0]);

  if (
    typeof parsed.category !== 'string' ||
    typeof parsed.confidence !== 'number' ||
    typeof parsed.reasoning !== 'string'
  ) {
    throw new Error(`Model response missing required fields: ${content}`);
  }

  return {
    category: parsed.category as FailureCategory,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
  };
}

export async function classifyFailure(
  testName: string,
  errorMessage: string,
  stackTrace: string,
  logs: LogEntry[],
): Promise<ClassificationResult> {
  const model = new ChatAnthropic({
    model: 'claude-haiku-4-5-20251001',
    temperature: 0,
  });

  const response = await model.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(buildUserMessage(testName, errorMessage, stackTrace, logs)),
  ]);

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  return parseClassification(content);
}
