import type { Page, Locator } from '@playwright/test';

export class SettingsPage {
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /system settings/i });
  }

  async goto() {
    await this.page.goto('/admin/settings');
  }

  async selectTab(name: string) {
    await this.page.getByRole('tab', { name: new RegExp(name, 'i') }).click();
  }
}
