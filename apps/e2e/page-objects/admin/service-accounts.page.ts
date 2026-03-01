import type { Page, Locator } from '@playwright/test';

export class ServiceAccountsPage {
  readonly heading: Locator;
  readonly createButton: Locator;
  readonly table: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /service accounts/i });
    this.createButton = page.getByRole('button', { name: /create service account/i });
    this.table = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/admin/service-accounts');
  }

  getAccountRow(email: string) {
    return this.page.getByRole('row').filter({ has: this.page.getByText(email) });
  }
}
