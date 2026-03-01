import type { Page, Locator } from '@playwright/test';

export class SidebarComponent {
  readonly homeLink: Locator;
  readonly adminSection: Locator;
  readonly usersLink: Locator;
  readonly rolesLink: Locator;
  readonly settingsLink: Locator;
  readonly auditLogsLink: Locator;
  readonly apiKeysLink: Locator;
  readonly serviceAccountsLink: Locator;
  readonly pkiSection: Locator;
  readonly dashboardLink: Locator;
  readonly casLink: Locator;
  readonly certificatesLink: Locator;
  readonly requestsLink: Locator;
  readonly profilesLink: Locator;
  readonly pkiAuditLink: Locator;

  constructor(private readonly page: Page) {
    this.homeLink = page.getByRole('link', { name: /^home$/i });
    this.adminSection = page.getByText('Admin', { exact: true });
    this.usersLink = page.getByRole('link', { name: /^users$/i });
    this.rolesLink = page.getByRole('link', { name: /^roles$/i });
    this.settingsLink = page.getByRole('link', { name: /^settings$/i });
    this.auditLogsLink = page.getByRole('link', { name: /audit logs/i });
    this.apiKeysLink = page.getByRole('link', { name: /api keys/i });
    this.serviceAccountsLink = page.getByRole('link', { name: /service accounts/i });
    this.pkiSection = page.getByText('PKI', { exact: true });
    this.dashboardLink = page.getByRole('link', { name: /^dashboard$/i });
    this.casLink = page.getByRole('link', { name: /^cas$/i });
    this.certificatesLink = page.getByRole('link', { name: /^certificates$/i });
    this.requestsLink = page.getByRole('link', { name: /^requests$/i });
    this.profilesLink = page.getByRole('link', { name: /^profiles$/i });
    this.pkiAuditLink = page.getByRole('link', { name: /pki audit/i });
  }

  async clickLink(name: string) {
    await this.page.getByRole('link', { name: new RegExp(`^${name}$`, 'i') }).click();
  }
}
