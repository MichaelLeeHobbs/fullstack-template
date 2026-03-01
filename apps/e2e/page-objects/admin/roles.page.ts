import type { Page, Locator } from '@playwright/test';

export class RolesPage {
  readonly heading: Locator;
  readonly createRoleButton: Locator;
  readonly table: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /role management/i });
    this.createRoleButton = page.getByRole('button', { name: /create role/i });
    this.table = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/admin/roles');
  }

  getRoleRow(name: string) {
    return this.page.getByRole('row').filter({ has: this.page.getByText(name, { exact: true }) });
  }
}
