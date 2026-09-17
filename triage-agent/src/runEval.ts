import { runTriage } from './triageGraph';
import { evalSet } from './evalSet';

type Mismatch = {
  testName: string;
  expectedCategory: string;
  actualCategory: string;
  reasoning: string;
  reconsidered: boolean;
};

async function main() {
  let correct = 0;
  let reconsideredCount = 0;
  const mismatches: Mismatch[] = [];

  for (const testCase of evalSet) {
    const result = await runTriage(
      testCase.testName,
      testCase.errorMessage,
      testCase.stackTrace,
      '',
      testCase.logs,
    );

    if (result.reconsidered) {
      reconsideredCount++;
    }

    if (result.category === testCase.expectedCategory) {
      correct++;
    } else {
      mismatches.push({
        testName: testCase.testName,
        expectedCategory: testCase.expectedCategory,
        actualCategory: result.category,
        reasoning: result.reasoning,
        reconsidered: result.reconsidered,
      });
    }
  }

  const total = evalSet.length;
  const accuracy = ((correct / total) * 100).toFixed(1);

  console.log('\n=== Eval Results ===');
  console.log(`Total cases: ${total}`);
  console.log(`Correct: ${correct}`);
  console.log(`Accuracy: ${accuracy}%`);
  console.log(`Reconsidered (confidence < 0.7): ${reconsideredCount}`);

  if (mismatches.length > 0) {
    console.log(`\n=== Mismatches (${mismatches.length}) ===`);
    for (const m of mismatches) {
      console.log(`\nTest: ${m.testName}`);
      console.log(`  Expected: ${m.expectedCategory}`);
      console.log(`  Actual:   ${m.actualCategory}`);
      console.log(`  Reconsidered: ${m.reconsidered}`);
      console.log(`  Reasoning: ${m.reasoning}`);
    }
  } else {
    console.log('\nNo mismatches.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
