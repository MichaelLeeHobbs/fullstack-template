import type { Page, Locator } from '@playwright/test';

export class ProfileListPage {
  readonly heading: Locator;
  readonly createProfileButton: Locator;
  readonly table: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /certificate profiles/i });
    this.createProfileButton = page.getByRole('button', { name: /create profile/i });
    this.table = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/pki/profiles');
  }
}
