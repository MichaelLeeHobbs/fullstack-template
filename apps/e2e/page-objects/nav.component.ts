import type { Page, Locator } from '@playwright/test';

export class NavComponent {
  readonly accountMenuButton: Locator;
  readonly logoutMenuItem: Locator;

  constructor(private readonly page: Page) {
    this.accountMenuButton = page.getByRole('button', { name: /account menu/i });
    this.logoutMenuItem = page.getByRole('menuitem', { name: /logout/i });
  }

  async logout() {
    await this.accountMenuButton.click();
    await this.logoutMenuItem.click();
  }
}
