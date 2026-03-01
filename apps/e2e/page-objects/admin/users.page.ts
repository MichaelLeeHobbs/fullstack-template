import type { Page, Locator } from '@playwright/test';

export class UsersPage {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /user management/i });
    this.searchInput = page.getByPlaceholder(/search by email/i);
    this.table = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/admin/users');
  }

  async searchUsers(query: string) {
    await this.searchInput.fill(query);
  }

  getRow(email: string) {
    return this.page.getByRole('row').filter({ has: this.page.getByText(email, { exact: true }) });
  }
}
