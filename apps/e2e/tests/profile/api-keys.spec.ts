import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Profile API Keys', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('API keys card visible on profile', async ({ profilePage }) => {
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible();
    await expect(profilePage.apiKeysCard).toBeVisible();
  });

  test.describe.serial('Personal API Key lifecycle', () => {
    const keyName = `E2E Personal Key ${Date.now()}`;

    test('create personal API key shows raw key dialog', async ({ profilePage, page }) => {
      await profilePage.goto();
      await expect(profilePage.heading).toBeVisible();
      // Click create key button in the API Keys card
      await page.getByRole('button', { name: /create key/i }).click();
      await page.getByLabel('Key Name').fill(keyName);
      await page.getByRole('button', { name: /^create$/i }).click();

      // Raw key dialog should appear
      await expect(page.getByRole('heading', { name: /api key created/i })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: /done/i }).click();
    });

    test('new key visible in profile card', async ({ profilePage, page }) => {
      await profilePage.goto();
      await expect(profilePage.heading).toBeVisible();
      await expect(page.getByText(keyName)).toBeVisible({ timeout: 10000 });
    });
  });
});
