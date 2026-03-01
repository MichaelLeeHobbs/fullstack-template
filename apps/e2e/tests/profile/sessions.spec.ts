import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Sessions', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('shows sessions page with table', async ({ sessionsPage }) => {
    await sessionsPage.goto();
    await expect(sessionsPage.heading).toBeVisible();
    await expect(sessionsPage.table).toBeVisible();
  });

  test('sessions table has at least one row', async ({ sessionsPage, page }) => {
    await sessionsPage.goto();
    await expect(sessionsPage.table).toBeVisible({ timeout: 10000 });
    // Count data rows (tbody rows, excluding header)
    const dataRows = page.locator('tbody tr');
    const rowCount = await dataRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('revoke all others button is visible', async ({ sessionsPage }) => {
    await sessionsPage.goto();
    await expect(sessionsPage.heading).toBeVisible();
    await expect(sessionsPage.revokeAllOthersButton).toBeVisible();
  });
});
