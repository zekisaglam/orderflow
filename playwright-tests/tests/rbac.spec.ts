import { test, expect } from '@playwright/test';

const baseURL = 'http://localhost:3000';

const createdCampaignIds: string[] = [];

test.describe('Campaign RBAC', () => {
  test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    for (const id of createdCampaignIds) {
      await request.delete(`${baseURL}/campaigns/${id}`, {
        headers: { 'x-user-role': 'admin' },
      });
    }
    createdCampaignIds.length = 0;
    await request.dispose();
  });

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
    createdCampaignIds.push(body._id);
    expect(body.clientId).toBe('clientA');
  });

  test('DELETE /campaigns/:id only deletes within the caller\'s own scope', async ({ request }) => {
    const created = await request.post(`${baseURL}/campaigns`, {
      headers: { 'x-user-role': 'clientA', 'x-client-id': 'clientA' },
      data: { name: 'Delete Scope Campaign', budget: 100 },
    });
    const { _id } = await created.json();
    createdCampaignIds.push(_id);

    const asClientB = await request.delete(`${baseURL}/campaigns/${_id}`, {
      headers: { 'x-user-role': 'clientB', 'x-client-id': 'clientB' },
    });
    expect(asClientB.status()).toBe(404);

    const asOwner = await request.delete(`${baseURL}/campaigns/${_id}`, {
      headers: { 'x-user-role': 'clientA', 'x-client-id': 'clientA' },
    });
    expect(asOwner.status()).toBe(204);

    const again = await request.delete(`${baseURL}/campaigns/${_id}`, {
      headers: { 'x-user-role': 'admin' },
    });
    expect(again.status()).toBe(404);
  });

  test('DELETE /campaigns/:id without an x-user-role header returns 401', async ({ request }) => {
    const response = await request.delete(`${baseURL}/campaigns/000000000000000000000000`);
    expect(response.status()).toBe(401);
  });

  test('clientA never sees campaigns belonging to clientB', async ({ request }) => {
    const response = await request.get(`${baseURL}/campaigns`, {
      headers: { 'x-user-role': 'clientA', 'x-client-id': 'clientA' },
    });

    expect(response.ok()).toBeTruthy();
    const { campaigns } = await response.json();
    expect(campaigns.every((c: { clientId: string }) => c.clientId !== 'clientB')).toBeTruthy();
  });

  test('clientC only sees its own campaigns via GET /campaigns', async ({ request }) => {
    const response = await request.get(`${baseURL}/campaigns`, {
      headers: { 'x-user-role': 'clientC', 'x-client-id': 'clientC' },
    });

    expect(response.ok()).toBeTruthy();
    const { campaigns } = await response.json();
    expect(campaigns.every((c: { clientId: string }) => c.clientId === 'clientC')).toBeTruthy();
  });

  test('GET /campaigns defaults to page=1, limit=20', async ({ request }) => {
    const response = await request.get(`${baseURL}/campaigns`, {
      headers: { 'x-user-role': 'admin' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.campaigns.length).toBeLessThanOrEqual(20);
  });

  test('GET /campaigns caps limit at 100', async ({ request }) => {
    const response = await request.get(`${baseURL}/campaigns?limit=500`, {
      headers: { 'x-user-role': 'admin' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.limit).toBe(100);
    expect(body.campaigns.length).toBeLessThanOrEqual(100);
  });

  test('GET /campaigns paginates within the RBAC-filtered set', async ({ request }) => {
    const headers = { 'x-user-role': 'clientA', 'x-client-id': 'clientA' };
    const page1 = await (await request.get(`${baseURL}/campaigns?page=1&limit=2`, { headers })).json();
    const page2 = await (await request.get(`${baseURL}/campaigns?page=2&limit=2`, { headers })).json();

    expect(page2.page).toBe(2);
    const ids = [...page1.campaigns, ...page2.campaigns].map((c: { _id: string }) => c._id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of [...page1.campaigns, ...page2.campaigns]) {
      expect(c.clientId).toBe('clientA');
    }
  });

  for (const query of ['page=0', 'page=-1', 'page=abc', 'page=1.5', 'limit=0', 'limit=-5', 'limit=abc']) {
    test(`GET /campaigns?${query} returns 400`, async ({ request }) => {
      const response = await request.get(`${baseURL}/campaigns?${query}`, {
        headers: { 'x-user-role': 'admin' },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/positive integer/);
    });
  }
});
