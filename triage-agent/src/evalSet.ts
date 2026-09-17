import { FailureCategory } from './classifyFailure';
import { LogEntry } from './fetchLogs';

export type EvalCase = {
  testName: string;
  errorMessage: string;
  stackTrace: string;
  logs: LogEntry[];
  expectedCategory: FailureCategory;
};

export const evalSet: EvalCase[] = [
  // ---------------------------------------------------------------------
  // product_bug — genuine assertion failures where actual output doesn't
  // match expected business logic
  // ---------------------------------------------------------------------
  {
    testName: 'campaign budget is stored as a number',
    errorMessage: "expect(received).toBe(expected) // Object.is equality\n\nExpected: 500\nReceived: \"500\"",
    stackTrace:
      'AssertionError: expect(campaign.budget).toBe(500)\n    at Object.<anonymous> (tests/campaigns.spec.ts:42:34)',
    logs: [
      {
        timestamp: '2026-09-10T14:02:11.001Z',
        method: 'POST',
        route: '/campaigns',
        statusCode: 201,
        role: 'clientA',
        clientId: 'clientA',
      },
    ],
    expectedCategory: 'product_bug',
  },
  {
    testName: 'percentage discount is applied exactly once',
    errorMessage: 'expect(order.total).toBe(90) // received 81',
    stackTrace:
      'AssertionError: expected 81 to equal 90\n    at Object.<anonymous> (tests/checkout.spec.ts:58:28)',
    logs: [
      {
        timestamp: '2026-09-11T09:15:44.221Z',
        method: 'POST',
        route: '/checkout',
        statusCode: 200,
        role: 'clientB',
        clientId: 'clientB',
      },
    ],
    expectedCategory: 'product_bug',
  },
  {
    testName: 'clientA GET /campaigns never returns clientB campaigns',
    errorMessage: "expect(names).not.toContain('B Campaign') // but it did",
    stackTrace:
      'AssertionError: expected array not to contain "B Campaign"\n    at Object.<anonymous> (tests/rbac.spec.ts:31:19)',
    logs: [
      {
        timestamp: '2026-09-12T11:40:02.500Z',
        method: 'GET',
        route: '/campaigns',
        statusCode: 200,
        role: 'clientA',
        clientId: 'clientA',
      },
    ],
    expectedCategory: 'product_bug',
  },
  {
    testName: 'order total includes tax correctly',
    errorMessage: 'expect(order.total).toBeCloseTo(108) // received 100',
    stackTrace:
      'AssertionError: expected 100 to be close to 108\n    at Object.<anonymous> (tests/orders.spec.ts:77:30)',
    logs: [
      {
        timestamp: '2026-09-12T16:22:19.884Z',
        method: 'POST',
        route: '/orders',
        statusCode: 200,
        role: 'admin',
        clientId: null,
      },
    ],
    expectedCategory: 'product_bug',
  },
  {
    testName: 'submitting the create-campaign form once creates exactly one campaign',
    errorMessage: 'expect(campaignCount).toBe(1) // received 2',
    stackTrace:
      'AssertionError: expected 2 to equal 1\n    at Object.<anonymous> (tests/rbac-ui.spec.ts:88:24)',
    logs: [
      {
        timestamp: '2026-09-13T08:05:30.111Z',
        method: 'POST',
        route: '/campaigns',
        statusCode: 201,
        role: 'clientA',
        clientId: 'clientA',
      },
      {
        timestamp: '2026-09-13T08:05:30.340Z',
        method: 'POST',
        route: '/campaigns',
        statusCode: 201,
        role: 'clientA',
        clientId: 'clientA',
      },
    ],
    expectedCategory: 'product_bug',
  },
  {
    testName: 'impressions counter increments after an ad view event',
    errorMessage: 'expect(campaign.impressions).toBe(1) // received 0',
    stackTrace:
      'AssertionError: expected 0 to equal 1\n    at Object.<anonymous> (tests/tracking.spec.ts:23:29)',
    logs: [
      {
        timestamp: '2026-09-13T19:47:02.700Z',
        method: 'POST',
        route: '/campaigns/track-impression',
        statusCode: 200,
        role: 'clientB',
        clientId: 'clientB',
      },
    ],
    expectedCategory: 'product_bug',
  },

  // ---------------------------------------------------------------------
  // flaky_test — timing/race condition patterns that would likely pass
  // on retry
  // ---------------------------------------------------------------------
  {
    testName: 'success toast appears after creating a campaign',
    errorMessage: 'TimeoutError: locator.textContent: Timeout 3000ms exceeded waiting for element to be visible',
    stackTrace:
      'TimeoutError: locator.textContent: Timeout 3000ms exceeded\n    at DashboardPage.getToastText (tests/pages/DashboardPage.ts:44:32)\n    at Object.<anonymous> (tests/dashboard.spec.ts:19:11)',
    logs: [
      {
        timestamp: '2026-09-14T10:11:02.010Z',
        method: 'POST',
        route: '/campaigns',
        statusCode: 201,
        role: 'clientA',
        clientId: 'clientA',
      },
    ],
    expectedCategory: 'flaky_test',
  },
  {
    testName: 'campaign table shows newest campaign first',
    errorMessage: "expect(rows[0]).toBe('Newest Campaign') // received 'Older Campaign'",
    stackTrace:
      "AssertionError: expected 'Older Campaign' to equal 'Newest Campaign'\n    at Object.<anonymous> (tests/dashboard.spec.ts:65:22)",
    logs: [
      {
        timestamp: '2026-09-14T13:29:40.400Z',
        method: 'POST',
        route: '/campaigns',
        statusCode: 201,
        role: 'clientA',
        clientId: 'clientA',
      },
      {
        timestamp: '2026-09-14T13:29:40.612Z',
        method: 'GET',
        route: '/campaigns',
        statusCode: 200,
        role: 'clientA',
        clientId: 'clientA',
      },
    ],
    expectedCategory: 'product_bug',
  },
  {
    testName: 'submit button becomes clickable after form validation',
    errorMessage: 'ElementNotInteractableError: element is not clickable, another element intercepts the click (mid-transition)',
    stackTrace:
      'ElementClickInterceptedError: element click intercepted\n    at DashboardPage.submitForm (tests/pages/DashboardPage.ts:29:17)',
    logs: [],
    expectedCategory: 'flaky_test',
  },
  {
    testName: 'campaign list refreshes within 2 seconds of creation',
    errorMessage: 'TimeoutError: expect(received).toContain(expected) exceeded 2000ms, resolved successfully after 2400ms',
    stackTrace:
      'TimeoutError: waiting for expect to succeed\n    at Object.<anonymous> (tests/rbac-ui.spec.ts:70:20)',
    logs: [
      {
        timestamp: '2026-09-15T09:00:11.900Z',
        method: 'POST',
        route: '/campaigns',
        statusCode: 201,
        role: 'clientB',
        clientId: 'clientB',
      },
      {
        timestamp: '2026-09-15T09:00:14.100Z',
        method: 'GET',
        route: '/campaigns',
        statusCode: 200,
        role: 'clientB',
        clientId: 'clientB',
      },
    ],
    expectedCategory: 'flaky_test',
  },
  {
    testName: 'network is idle before reading campaign count',
    errorMessage: "TimeoutError: page.waitForLoadState: Timeout 5000ms exceeded waiting for 'networkidle'",
    stackTrace:
      "TimeoutError: page.waitForLoadState: Timeout exceeded\n    at Object.<anonymous> (tests/dashboard.spec.ts:12:14)",
    logs: [
      {
        timestamp: '2026-09-15T15:44:02.220Z',
        method: 'GET',
        route: '/campaigns',
        statusCode: 200,
        role: 'admin',
        clientId: null,
      },
    ],
    expectedCategory: 'flaky_test',
  },
  {
    testName: 'clicking a campaign row opens its detail panel',
    errorMessage: 'Error: element is not attached to the DOM, likely re-rendered between locate and click',
    stackTrace:
      'Error: locator.click: Element is not attached to the DOM\n    at DashboardPage.openCampaign (tests/pages/DashboardPage.ts:51:22)',
    logs: [
      {
        timestamp: '2026-09-15T18:02:09.050Z',
        method: 'GET',
        route: '/campaigns',
        statusCode: 200,
        role: 'clientA',
        clientId: 'clientA',
      },
    ],
    expectedCategory: 'flaky_test',
  },

  // ---------------------------------------------------------------------
  // environment_issue — infrastructure problems (ECONNREFUSED, timeouts,
  // DNS failures)
  // ---------------------------------------------------------------------
  {
    testName: 'GET /campaigns returns campaigns when the database is available',
    errorMessage: 'connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017',
    stackTrace:
      'MongoServerSelectionError: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017\n    at Topology.selectServer (node_modules/mongodb/src/sdam/topology.ts:638:30)',
    logs: [
      {
        timestamp: '2026-09-16T23:48:53.926Z',
        method: 'GET',
        route: '/campaigns',
        statusCode: 500,
        role: 'admin',
        clientId: null,
        errorMessage: 'connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017',
      },
    ],
    expectedCategory: 'environment_issue',
  },
  {
    testName: 'request logs are queryable in Elasticsearch',
    errorMessage: 'ConnectionError: connect ETIMEDOUT 127.0.0.1:9200',
    stackTrace:
      'ConnectionError: connect ETIMEDOUT 127.0.0.1:9200\n    at TCPConnectWrap.afterConnect (node:net:1595:16)',
    logs: [],
    expectedCategory: 'environment_issue',
  },
  {
    testName: 'third-party fraud-check API responds within SLA',
    errorMessage: 'getaddrinfo ENOTFOUND fraud-check.partner-api.invalid',
    stackTrace:
      'DNSError: getaddrinfo ENOTFOUND fraud-check.partner-api.invalid\n    at GetAddrInfoReqWrap.onlookup (node:dns:71:26)',
    logs: [
      {
        timestamp: '2026-09-16T08:10:00.001Z',
        method: 'POST',
        route: '/orders',
        statusCode: 502,
        role: 'clientA',
        clientId: 'clientA',
        errorMessage: 'getaddrinfo ENOTFOUND fraud-check.partner-api.invalid',
      },
    ],
    expectedCategory: 'environment_issue',
  },
  {
    testName: 'backend health check succeeds before test suite runs',
    errorMessage: 'connect ECONNREFUSED 127.0.0.1:3000',
    stackTrace:
      'FetchError: request to http://localhost:3000/health failed, reason: connect ECONNREFUSED 127.0.0.1:3000\n    at ClientRequest.<anonymous> (node_modules/node-fetch/lib/index.js:1501:11)',
    logs: [],
    expectedCategory: 'environment_issue',
  },
  {
    testName: 'campaign export writes report file to disk',
    errorMessage: 'ENOSPC: no space left on device, write',
    stackTrace:
      "Error: ENOSPC: no space left on device, write\n    at Object.writeSync (node:fs:895:3)\n    at exportReport (src/reports/exportReport.ts:14:10)",
    logs: [
      {
        timestamp: '2026-09-16T12:30:44.700Z',
        method: 'GET',
        route: '/campaigns/export',
        statusCode: 500,
        role: 'admin',
        clientId: null,
        errorMessage: 'ENOSPC: no space left on device, write',
      },
    ],
    expectedCategory: 'environment_issue',
  },
  {
    testName: 'staging API is reachable over HTTPS',
    errorMessage: 'certificate has expired',
    stackTrace:
      'Error: certificate has expired\n    at TLSSocket.onConnectSecure (node:_tls_wrap:1668:34)',
    logs: [],
    expectedCategory: 'environment_issue',
  },

  // ---------------------------------------------------------------------
  // locator_drift — Playwright unable to find an element due to a
  // changed selector, not a real bug
  // ---------------------------------------------------------------------
  {
    testName: 'user can log in by selecting a role and clicking Login',
    errorMessage: "locator.click: Timeout 5000ms exceeded.\nCall log:\n  - waiting for getByRole('button', { name: 'Login' })",
    stackTrace:
      "TimeoutError: locator.click: Timeout 5000ms exceeded\n    at DashboardPage.login (tests/pages/DashboardPage.ts:15:45)",
    logs: [],
    expectedCategory: 'locator_drift',
  },
  {
    testName: 'role dropdown lets clientA select their role',
    errorMessage: "locator.selectOption: Timeout 5000ms exceeded.\nCall log:\n  - waiting for getByRole('combobox')",
    stackTrace:
      "TimeoutError: locator.selectOption: Timeout 5000ms exceeded\n    at DashboardPage.login (tests/pages/DashboardPage.ts:14:38)",
    logs: [],
    expectedCategory: 'locator_drift',
  },
  {
    testName: 'campaign table renders budget in the second column',
    errorMessage: "expect(received).toBe(expected)\n\nExpected: \"100\"\nReceived: \"Impressions\"",
    stackTrace:
      'AssertionError: expected "Impressions" to equal "100"\n    at Object.<anonymous> (tests/dashboard.spec.ts:40:26)',
    logs: [
      {
        timestamp: '2026-09-17T09:12:00.400Z',
        method: 'GET',
        route: '/campaigns',
        statusCode: 200,
        role: 'clientA',
        clientId: 'clientA',
      },
    ],
    expectedCategory: 'locator_drift',
  },
  {
    testName: 'create-campaign form is found inside the dashboard container',
    errorMessage: "locator.fill: Timeout 5000ms exceeded.\nCall log:\n  - waiting for locator('#create-campaign-form input[name=\"name\"]')",
    stackTrace:
      "TimeoutError: locator.fill: Timeout 5000ms exceeded\n    at Object.<anonymous> (tests/dashboard.spec.ts:52:30)",
    logs: [],
    expectedCategory: 'locator_drift',
  },
  {
    testName: 'submit button triggers campaign creation',
    errorMessage: "locator.click: Timeout 5000ms exceeded.\nCall log:\n  - waiting for getByRole('button', { name: 'Submit' })",
    stackTrace:
      "TimeoutError: locator.click: Timeout 5000ms exceeded\n    at Object.<anonymous> (tests/dashboard.spec.ts:60:28)",
    logs: [],
    expectedCategory: 'locator_drift',
  },
  {
    testName: 'confirmation dialog is visible after deleting a campaign',
    errorMessage: "locator.waitFor: Timeout 5000ms exceeded.\nCall log:\n  - waiting for getByRole('dialog')",
    stackTrace:
      "TimeoutError: locator.waitFor: Timeout 5000ms exceeded\n    at Object.<anonymous> (tests/dashboard.spec.ts:74:24)",
    logs: [
      {
        timestamp: '2026-09-17T14:55:10.222Z',
        method: 'DELETE',
        route: '/campaigns/6aab104587ed03d5599d8412',
        statusCode: 200,
        role: 'admin',
        clientId: null,
      },
    ],
    expectedCategory: 'locator_drift',
  },
];
