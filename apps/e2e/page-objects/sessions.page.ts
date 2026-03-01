import type { Page, Locator } from '@playwright/test';

export class SessionsPage {
  readonly heading: Locator;
  readonly table: Locator;
  readonly revokeAllOthersButton: Locator;
  readonly currentChip: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /active sessions/i });
    this.table = page.getByRole('table');
    this.revokeAllOthersButton = page.getByRole('button', { name: /revoke all others/i });
    this.currentChip = page.getByText('Current');
  }

  async goto() {
    await this.page.goto('/sessions');
  }
}
