import { test, expect } from '@playwright/test';

const baseURL = 'http://localhost:3000';

test.describe('Campaign RBAC', () => {
  test('POST /campaigns without an x-user-role header returns 401', async ({ request }) => {
    const response = await request.post(`${baseURL}/campaigns`, {
      data: { name: 'No Auth Campaign', budget: 100 },
    });

    expect(response.status()).toBe(401);
  });

  test('clientA cannot spoof clientId when creating a campaign', async ({ request }) => {
    const response = await request.post(`${baseURL}/campaigns`, {
      headers: { 'x-user-role': 'clientA', 'x-client-id': 'clientA' },
      data: { clientId: 'clientB', name: 'Spoofed Campaign', budget: 100 },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.clientId).toBe('clientA');
  });

  test('clientA never sees campaigns belonging to clientB', async ({ request }) => {
    const response = await request.get(`${baseURL}/campaigns`, {
      headers: { 'x-user-role': 'clientA', 'x-client-id': 'clientA' },
    });

    expect(response.ok()).toBeTruthy();
    const campaigns = await response.json();
    expect(campaigns.every((c: { clientId: string }) => c.clientId !== 'clientB')).toBeTruthy();
  });

  test('clientC only sees its own campaigns via GET /campaigns', async ({ request }) => {
    const response = await request.get(`${baseURL}/campaigns`, {
      headers: { 'x-user-role': 'clientC', 'x-client-id': 'clientC' },
    });

    expect(response.ok()).toBeTruthy();
    const campaigns = await response.json();
    expect(campaigns.every((c: { clientId: string }) => c.clientId === 'clientC')).toBeTruthy();
  });
});
