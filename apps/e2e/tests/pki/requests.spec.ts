import { test, expect } from '../../fixtures/test-fixtures';

// BUG: CSR list page shows "Failed to load certificate requests" because the API
// returns a different response format than what the frontend expects (PaginatedResponse).
test.describe('Certificate Requests', () => {
  test.use({ storageState: '.auth/admin.json' });

  test.fixme('CSR list loads', async ({ page }) => {
    await page.goto('/pki/requests');
    await expect(page.getByRole('heading', { name: /certificate requests/i })).toBeVisible({ timeout: 15000 });
  });

  test.fixme('status filter has expected options', async ({ page }) => {
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
