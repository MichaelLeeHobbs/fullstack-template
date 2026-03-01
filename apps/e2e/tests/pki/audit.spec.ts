import { test, expect } from '../../fixtures/test-fixtures';

test.describe('PKI Audit Log', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('PKI audit page loads', async ({ page }) => {
    await page.goto('/pki/audit');
    await expect(page.getByRole('heading', { name: /pki audit log/i })).toBeVisible({ timeout: 15000 });
  });

  test('action filter dropdown has PKI-specific options', async ({ page }) => {
    await page.goto('/pki/audit');
    await expect(page.getByRole('heading', { name: /pki audit log/i })).toBeVisible({ timeout: 15000 });
    const actionFilter = page.getByLabel('Action');
    await expect(actionFilter).toBeVisible({ timeout: 10000 });
    await actionFilter.click();
    await expect(page.getByRole('option', { name: /all actions/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /ca created/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /certificate issued/i })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('pagination controls visible', async ({ page }) => {
    await page.goto('/pki/audit');
    await expect(page.getByRole('heading', { name: /pki audit log/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/rows per page/i)).toBeVisible({ timeout: 10000 });
  });
});
