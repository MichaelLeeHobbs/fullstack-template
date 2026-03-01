import type { Page, Locator } from '@playwright/test';

export class ForgotPasswordPage {
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successHeading: Locator;
  readonly backToLoginLink: Locator;

  constructor(private readonly page: Page) {
    const main = page.getByRole('main');
    this.heading = main.getByRole('heading', { name: /forgot password/i });
    this.emailInput = main.getByLabel('Email');
    this.submitButton = main.getByRole('button', { name: /send reset link/i });
    this.successHeading = main.getByRole('heading', { name: /check your email/i });
    this.backToLoginLink = main.getByRole('link', { name: /back to login/i });
  }

  async goto() {
    await this.page.goto('/forgot-password');
  }

  async submitEmail(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
