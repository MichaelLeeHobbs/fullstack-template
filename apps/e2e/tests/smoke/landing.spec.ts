import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Landing Page', () => {
  test('renders the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/app name/i);
  });

  test('has Get Started link', async ({ page }) => {
    await page.goto('/');
    const getStarted = page.getByRole('link', { name: /get started/i });
    await expect(getStarted).toBeVisible();
  });

  test('has Sign In link', async ({ page }) => {
    await page.goto('/');
    const signIn = page.getByRole('link', { name: /sign in/i });
    await expect(signIn).toBeVisible();
  });

  test('Sign In link navigates away from landing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign in/i }).click();
    // Authenticated users redirect to /home, unauthenticated to /login
    await expect(page).not.toHaveURL('/');
  });
});
