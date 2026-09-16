import { type Page } from '@playwright/test';

export class DashboardPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('http://localhost:5173');
  }

  async login(role: string) {
    await this.page.getByRole('combobox').selectOption(role);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }

  async getCampaignNames(): Promise<string[]> {
    await this.page.locator('table').waitFor();
    const rows = this.page.locator('table tbody tr');
    const count = await rows.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const name = await rows.nth(i).locator('td').first().innerText();
      names.push(name);
    }

    return names;
  }
}
