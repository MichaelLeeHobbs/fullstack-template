import type { Page, Locator } from '@playwright/test';

export class CaListPage {
  readonly heading: Locator;
  readonly createCaButton: Locator;
  readonly statusFilter: Locator;
  readonly table: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /certificate authorities/i });
    this.createCaButton = page.getByRole('button', { name: /create ca/i });
    this.statusFilter = page.getByLabel('Status');
    this.table = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/pki/ca');
  }

  getCaRow(name: string) {
    return this.page.getByRole('row').filter({ has: this.page.getByText(name) });
  }
}
