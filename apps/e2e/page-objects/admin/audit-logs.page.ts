import type { Page, Locator } from '@playwright/test';

export class AuditLogsPage {
  readonly heading: Locator;
  readonly table: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /audit logs/i });
    this.table = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/admin/audit-logs');
  }
}
