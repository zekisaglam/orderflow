import { test, expect, APIRequestContext } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';

const apiBaseURL = 'http://localhost:3000';

let clientACampaignName: string;
let clientBCampaignName: string;

async function createCampaign(request: APIRequestContext, role: string, name: string) {
  const response = await request.post(`${apiBaseURL}/campaigns`, {
    headers: { 'x-user-role': role, 'x-client-id': role },
    data: { name, budget: 100 },
  });
  expect(response.ok()).toBeTruthy();
}

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const suffix = Date.now();
  clientACampaignName = `ClientA Only Campaign ${suffix}`;
  clientBCampaignName = `ClientB Only Campaign ${suffix}`;

  await createCampaign(request, 'clientA', clientACampaignName);
  await createCampaign(request, 'clientB', clientBCampaignName);

  await request.dispose();
});

test('clientA sees only its own campaigns', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  await dashboard.login('clientA');

  const names = await dashboard.getCampaignNames();
  expect(names).toContain(clientACampaignName);
  expect(names).not.toContain(clientBCampaignName);
});

test('clientB sees only its own campaigns', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  await dashboard.login('clientB');

  const names = await dashboard.getCampaignNames();
  expect(names).toContain(clientBCampaignName);
  expect(names).not.toContain(clientACampaignName);
});

test('admin sees campaigns from multiple clients', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  await dashboard.login('admin');

  const names = await dashboard.getCampaignNames();
  expect(names).toContain(clientACampaignName);
  expect(names).toContain(clientBCampaignName);
});
