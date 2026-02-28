import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Login', () => {
  test('shows login form', async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('logs in with valid credentials', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('admin@app.local', 'Admin123!');
    await page.waitForURL('**/home');
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });

  test('shows error with invalid credentials', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('admin@app.local', 'WrongPassword1!');
    await expect(loginPage.heading).toBeVisible();
    // Scope to main content area to avoid matching the notistack snackbar too
    await expect(page.getByRole('main').getByText(/invalid email or password/i)).toBeVisible();
  });

  test('shows error with non-existent user', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.login('nonexistent@app.local', 'Password123!');
    await expect(loginPage.heading).toBeVisible();
    await expect(page.getByRole('main').getByText(/invalid email or password/i)).toBeVisible();
  });
});
