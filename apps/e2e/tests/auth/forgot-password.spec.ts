import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Forgot Password', () => {
  test('shows forgot password form', async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.goto();
    await expect(forgotPasswordPage.heading).toBeVisible();
    await expect(forgotPasswordPage.emailInput).toBeVisible();
    await expect(forgotPasswordPage.submitButton).toBeVisible();
  });

  test('shows success after valid email submit', async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.goto();
    await forgotPasswordPage.submitEmail('admin@app.local');
    await expect(forgotPasswordPage.successHeading).toBeVisible();
  });

  test('shows success for non-existent email', async ({ forgotPasswordPage }) => {
    await forgotPasswordPage.goto();
    await forgotPasswordPage.submitEmail('nobody@app.local');
    // Anti-enumeration: always shows success regardless of email existence
    await expect(forgotPasswordPage.successHeading).toBeVisible();
  });

  test('back to login link navigates to /login', async ({ forgotPasswordPage, page }) => {
    await forgotPasswordPage.goto();
    await forgotPasswordPage.submitEmail('admin@app.local');
    await expect(forgotPasswordPage.successHeading).toBeVisible();
    await forgotPasswordPage.backToLoginLink.click();
    await page.waitForURL('**/login');
  });
});
