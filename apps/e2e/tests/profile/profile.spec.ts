import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Profile', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('shows profile page with account info', async ({ profilePage }) => {
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible();
    await expect(profilePage.accountInfoCard).toBeVisible();
    // Wait for profile data to load — email should appear
    await expect(profilePage.emailValue).toBeVisible({ timeout: 10000 });
    await expect(profilePage.roleValue).toBeVisible({ timeout: 10000 });
  });

  test('shows preferences card with theme toggles', async ({ profilePage }) => {
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible();
    await expect(profilePage.preferencesCard).toBeVisible();
    await expect(profilePage.lightToggle).toBeVisible();
    await expect(profilePage.darkToggle).toBeVisible();
    await expect(profilePage.systemToggle).toBeVisible();
  });

  test('theme toggle works', async ({ profilePage }) => {
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible();
    await profilePage.selectTheme('dark');
    await expect(profilePage.darkToggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('manage sessions button navigates to /sessions', async ({ profilePage, page }) => {
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible();
    await profilePage.manageSessionsButton.click();
    await page.waitForURL('**/sessions');
  });

  test('MFA card shows disabled status', async ({ profilePage }) => {
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible();
    await expect(profilePage.mfaCard).toBeVisible();
    await expect(profilePage.mfaStatusChip).toBeVisible();
  });

  test('change password card visible with all fields', async ({ profilePage }) => {
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible();
    await expect(profilePage.changePasswordCard).toBeVisible();
    await expect(profilePage.currentPasswordInput).toBeVisible();
    await expect(profilePage.newPasswordInput).toBeVisible();
    await expect(profilePage.confirmNewPasswordInput).toBeVisible();
    await expect(profilePage.changePasswordButton).toBeVisible();
  });
});
