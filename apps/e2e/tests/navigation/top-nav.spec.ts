import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Top Navigation', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('account menu shows user email and role', async ({ page, nav }) => {
    await page.goto('/home');
    await nav.accountMenuButton.click();
    const menu = page.getByRole('menu');
    await expect(menu.getByText('admin@app.local')).toBeVisible();
    await expect(menu.getByText('Administrator')).toBeVisible();
  });

  test('profile menuitem navigates to /profile', async ({ page, nav }) => {
    await page.goto('/home');
    await nav.accountMenuButton.click();
    await page.getByRole('menuitem', { name: /profile/i }).click();
    await page.waitForURL('**/profile');
  });

  test('admin settings menuitem navigates to /admin/settings', async ({ page, nav }) => {
    await page.goto('/home');
    await nav.accountMenuButton.click();
    await page.getByRole('menuitem', { name: /admin settings/i }).click();
    await page.waitForURL('**/admin/settings');
  });
});
