import type { Page, Locator } from '@playwright/test';

export class ApiKeysPage {
  readonly heading: Locator;
  readonly createKeyButton: Locator;
  readonly table: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /api keys/i });
    this.createKeyButton = page.getByRole('button', { name: /create key/i });
    this.table = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/admin/api-keys');
  }

  getKeyRow(name: string) {
    return this.page.getByRole('row').filter({ has: this.page.getByText(name) });
  }

  async getRawKey() {
    const input = this.page.getByRole('textbox');
    return input.inputValue();
  }
}
