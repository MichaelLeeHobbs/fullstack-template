import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Certificates', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('certificate list loads', async ({ certificateListPage }) => {
    await certificateListPage.goto();
    await expect(certificateListPage.heading).toBeVisible({ timeout: 15000 });
  });

  test('search input and filters present', async ({ certificateListPage }) => {
    await certificateListPage.goto();
    await expect(certificateListPage.heading).toBeVisible({ timeout: 15000 });
    await expect(certificateListPage.searchInput).toBeVisible();
    await expect(certificateListPage.statusFilter).toBeVisible();
    await expect(certificateListPage.typeFilter).toBeVisible();
  });

  test('status filter has expected options', async ({ certificateListPage, page }) => {
    await certificateListPage.goto();
    await expect(certificateListPage.heading).toBeVisible({ timeout: 15000 });
    await certificateListPage.statusFilter.click();
    await expect(page.getByRole('option', { name: /all/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /active/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /revoked/i })).toBeVisible();
    // Close dropdown
    await page.keyboard.press('Escape');
  });

  test('issue certificate button navigates to form', async ({ certificateListPage, page }) => {
    await certificateListPage.goto();
    await expect(certificateListPage.heading).toBeVisible({ timeout: 15000 });
    await certificateListPage.issueCertificateButton.click();
    await page.waitForURL('**/pki/certificates/issue');
  });
});
