import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Certificate Requests', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('CSR list loads', async ({ page }) => {
    await page.goto('/pki/requests');
    await expect(page.getByRole('heading', { name: /certificate requests/i })).toBeVisible({ timeout: 15000 });
  });

  test('status filter has expected options', async ({ page }) => {
    await page.goto('/pki/requests');
    await expect(page.getByRole('heading', { name: /certificate requests/i })).toBeVisible({ timeout: 15000 });
    const statusFilter = page.getByLabel('Status');
    await expect(statusFilter).toBeVisible({ timeout: 10000 });
    await statusFilter.click();
    await expect(page.getByRole('option', { name: /all/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /pending/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /approved/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /rejected/i })).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
