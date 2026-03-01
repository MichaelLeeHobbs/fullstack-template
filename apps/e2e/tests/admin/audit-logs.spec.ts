import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Admin Audit Logs', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('loads audit logs page with table', async ({ auditLogsPage }) => {
    await auditLogsPage.goto();
    await expect(auditLogsPage.heading).toBeVisible();
    await expect(auditLogsPage.table).toBeVisible({ timeout: 15000 });
  });

  test('shows at least one audit entry', async ({ auditLogsPage, page }) => {
    await auditLogsPage.goto();
    await expect(auditLogsPage.heading).toBeVisible();
    await expect(auditLogsPage.table).toBeVisible({ timeout: 15000 });
    // The admin login during setup should generate at least one entry
    const rows = page.getByRole('row');
    // At least header row + 1 data row
    await expect(rows.nth(1)).toBeVisible({ timeout: 10000 });
  });

  test('entries have action chips', async ({ auditLogsPage, page }) => {
    await auditLogsPage.goto();
    await expect(auditLogsPage.heading).toBeVisible();
    await expect(auditLogsPage.table).toBeVisible({ timeout: 15000 });
    // Action column renders Chip components
    const chips = page.locator('.MuiChip-root');
    await expect(chips.first()).toBeVisible({ timeout: 10000 });
  });

  test('pagination controls visible', async ({ auditLogsPage, page }) => {
    await auditLogsPage.goto();
    await expect(auditLogsPage.heading).toBeVisible();
    await expect(auditLogsPage.table).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/rows per page/i)).toBeVisible();
  });
});
