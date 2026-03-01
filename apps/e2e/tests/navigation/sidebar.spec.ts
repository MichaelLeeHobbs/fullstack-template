import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Sidebar Navigation', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('admin section visible with all links', async ({ page, sidebar }) => {
    await page.goto('/home');
    await expect(sidebar.adminSection).toBeVisible();
    await expect(sidebar.usersLink).toBeVisible();
    await expect(sidebar.rolesLink).toBeVisible();
    await expect(sidebar.settingsLink).toBeVisible();
    await expect(sidebar.auditLogsLink).toBeVisible();
    await expect(sidebar.apiKeysLink).toBeVisible();
    await expect(sidebar.serviceAccountsLink).toBeVisible();
  });

  test('PKI section visible with all links', async ({ page, sidebar }) => {
    await page.goto('/home');
    await expect(sidebar.pkiSection).toBeVisible();
    await expect(sidebar.dashboardLink).toBeVisible();
    await expect(sidebar.casLink).toBeVisible();
    await expect(sidebar.certificatesLink).toBeVisible();
    await expect(sidebar.requestsLink).toBeVisible();
    await expect(sidebar.profilesLink).toBeVisible();
    await expect(sidebar.pkiAuditLink).toBeVisible();
  });

  test('Users link navigates to /admin/users', async ({ page, sidebar }) => {
    await page.goto('/home');
    await sidebar.usersLink.click();
    await page.waitForURL('**/admin/users');
  });

  test('PKI Dashboard link navigates to /pki', async ({ page, sidebar }) => {
    await page.goto('/home');
    await sidebar.dashboardLink.click();
    await page.waitForURL('**/pki');
  });
});
