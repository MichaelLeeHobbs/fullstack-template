import type { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /welcome/i });
  }

  async goto() {
    await this.page.goto('/home');
  }
}
