import type { Page, Locator } from '@playwright/test';

export class CaCreatePage {
  readonly caNameInput: Locator;
  readonly commonNameInput: Locator;
  readonly passphraseInput: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly createCaButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.caNameInput = page.getByLabel('CA Name');
    this.commonNameInput = page.getByLabel('Common Name (CN)');
    this.passphraseInput = page.getByLabel('Passphrase');
    this.nextButton = page.getByRole('button', { name: /next/i });
    this.backButton = page.getByRole('button', { name: /back/i });
    this.createCaButton = page.getByRole('button', { name: /create ca/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
  }

  async goto() {
    await this.page.goto('/pki/ca/create');
  }

  getStepLabel(name: string) {
    return this.page.getByText(name);
  }
}
