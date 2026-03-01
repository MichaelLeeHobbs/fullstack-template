import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Certificate Profiles', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('profiles page loads with table', async ({ profileListPage }) => {
    await profileListPage.goto();
    await expect(profileListPage.heading).toBeVisible({ timeout: 15000 });
    await expect(profileListPage.table).toBeVisible({ timeout: 15000 });
  });

  test('shows built-in profiles', async ({ profileListPage, page }) => {
    await profileListPage.goto();
    await expect(profileListPage.heading).toBeVisible({ timeout: 15000 });
    await expect(profileListPage.table).toBeVisible({ timeout: 15000 });
    // At least one profile row should exist
    const rows = page.getByRole('row');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2); // header + at least 1 profile
  });

  test('create profile button navigates to form', async ({ profileListPage, page }) => {
    await profileListPage.goto();
    await expect(profileListPage.heading).toBeVisible({ timeout: 15000 });
    await profileListPage.createProfileButton.click();
    await page.waitForURL('**/pki/profiles/create**');
  });
});
