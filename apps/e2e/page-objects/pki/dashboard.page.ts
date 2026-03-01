import type { Page, Locator } from '@playwright/test';

export class PkiDashboardPage {
  readonly heading: Locator;
  readonly newCaButton: Locator;
  readonly issueCertificateButton: Locator;
  readonly activeCasCard: Locator;
  readonly certificatesCard: Locator;
  readonly pendingCsrsCard: Locator;
  readonly expiringSoonCard: Locator;

  constructor(private readonly page: Page) {
    const main = page.getByRole('main');
    this.heading = main.getByRole('heading', { name: /pki dashboard/i });
    this.newCaButton = main.getByRole('button', { name: /new ca/i });
    this.issueCertificateButton = main.getByRole('button', { name: /issue certificate/i });
    this.activeCasCard = main.getByText('Active CAs');
    this.certificatesCard = main.getByText('Certificates', { exact: true });
    this.pendingCsrsCard = main.getByText('Pending CSRs');
    this.expiringSoonCard = main.getByText('Expiring Soon');
  }

  async goto() {
    await this.page.goto('/pki');
  }
}
