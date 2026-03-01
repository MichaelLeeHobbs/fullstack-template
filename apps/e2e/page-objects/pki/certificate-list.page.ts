import type { Page, Locator } from '@playwright/test';

export class CertificateListPage {
  readonly heading: Locator;
  readonly issueCertificateButton: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly typeFilter: Locator;
  readonly table: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /certificates/i });
    this.issueCertificateButton = page.getByRole('button', { name: /issue certificate/i });
    this.searchInput = page.getByLabel('Search');
    this.statusFilter = page.getByLabel('Status');
    this.typeFilter = page.getByLabel('Type');
    this.table = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/pki/certificates');
  }
}
