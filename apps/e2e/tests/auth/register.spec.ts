import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Register', () => {
  test('shows registration form', async ({ registerPage }) => {
    await registerPage.goto();
    await expect(registerPage.heading).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
  });

  test('registers a new user', async ({ registerPage }) => {
    const uniqueEmail = `test-${Date.now()}@app.local`;
    await registerPage.goto();
    await registerPage.register(uniqueEmail, 'TestPass123!');
    await expect(registerPage.successMessage).toBeVisible();
  });

  test('shows error for duplicate email', async ({ registerPage, page }) => {
    await registerPage.goto();
    await registerPage.register('admin@app.local', 'TestPass123!');
    // Scope to main content area to avoid matching the notistack snackbar too
    await expect(
      page.getByRole('main').getByText(/already registered|registration failed/i)
    ).toBeVisible();
  });
});
