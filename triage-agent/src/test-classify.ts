import { classifyFailure } from './classifyFailure';
import { getLogsAroundTime } from './fetchLogs';

async function runCase(
  label: string,
  timestamp: string,
  testName: string,
  errorMessage: string,
  stackTrace: string,
) {
  const logs = await getLogsAroundTime(timestamp, 30);
  const result = await classifyFailure(testName, errorMessage, stackTrace, logs);

  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  await runCase(
    '401 missing auth header',
    '2026-09-16T23:48:11.984Z',
    'unauthenticated request is correctly rejected',
    'Test expected a 401 Unauthorized when no x-user-role header is sent, and got exactly that (401, "Missing x-user-role header"). This is not a failure — it is a passing security check confirming the auth middleware correctly blocks unauthenticated requests.',
    'No stack trace: the test passed as expected, this is not an application error.',
  );

  await runCase(
    '400 validation error',
    '2026-09-16T23:48:11.998Z',
    'campaign creation rejects invalid budget',
    'Test intentionally submitted an invalid campaign (missing required "name" field) and expected the API to reject it with a 400 and a validation error. The API responded exactly as expected: 400, "Campaign validation failed: name: Path `name` is required." This is not a bug — it is the expected validation response confirming the API correctly rejects invalid input.',
    'No stack trace: the test passed as expected, this is not an application error.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
