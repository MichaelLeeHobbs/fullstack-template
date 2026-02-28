import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Logout', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('logs out and redirects to landing or login', async ({ page, nav }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

    await nav.logout();

    // After logout, should be redirected away from home
    await expect(page).not.toHaveURL(/\/home/);
  });

  test('cannot access protected page after logout', async ({ page, nav }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

    await nav.logout();

    // Try to navigate back to home — should redirect to login
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });
});
