import { test, expect } from '../../fixtures/test-fixtures';

test.describe('PKI Dashboard', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('shows dashboard with stat cards', async ({ pkiDashboardPage }) => {
    await pkiDashboardPage.goto();
    await expect(pkiDashboardPage.heading).toBeVisible();
    await expect(pkiDashboardPage.activeCasCard).toBeVisible({ timeout: 15000 });
    await expect(pkiDashboardPage.certificatesCard).toBeVisible();
    await expect(pkiDashboardPage.pendingCsrsCard).toBeVisible();
    await expect(pkiDashboardPage.expiringSoonCard).toBeVisible();
  });

  test('stat cards show counts', async ({ pkiDashboardPage, page }) => {
    await pkiDashboardPage.goto();
    await expect(pkiDashboardPage.heading).toBeVisible();
    await expect(pkiDashboardPage.activeCasCard).toBeVisible({ timeout: 15000 });
    // Each stat card renders an h4 with a count number
    const main = page.getByRole('main');
    const statValues = main.getByRole('heading', { level: 4 });
    // Should have at least 5 h4s: "PKI Dashboard" + 4 stat card counts
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('New CA button navigates to /pki/ca/create', async ({ pkiDashboardPage, page }) => {
    await pkiDashboardPage.goto();
    await expect(pkiDashboardPage.heading).toBeVisible();
    await pkiDashboardPage.newCaButton.click();
    await page.waitForURL('**/pki/ca/create');
  });

  test('Issue Certificate button navigates to /pki/certificates/issue', async ({ pkiDashboardPage, page }) => {
    await pkiDashboardPage.goto();
    await expect(pkiDashboardPage.heading).toBeVisible();
    await pkiDashboardPage.issueCertificateButton.click();
    await page.waitForURL('**/pki/certificates/issue');
  });
});
