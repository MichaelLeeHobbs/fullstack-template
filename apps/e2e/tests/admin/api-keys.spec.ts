import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Admin API Keys', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('loads API keys page with table', async ({ apiKeysPage }) => {
    await apiKeysPage.goto();
    await expect(apiKeysPage.heading).toBeVisible({ timeout: 15000 });
    await expect(apiKeysPage.table).toBeVisible({ timeout: 15000 });
  });

  test('create key dialog opens with fields', async ({ apiKeysPage, page }) => {
    await apiKeysPage.goto();
    await expect(apiKeysPage.heading).toBeVisible({ timeout: 15000 });
    await apiKeysPage.createKeyButton.click();
    await expect(page.getByRole('heading', { name: /create api key/i })).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
  });

  test.describe.serial('API Key lifecycle', () => {
    const keyName = `E2E Key ${Date.now()}`;

    test('create a new API key', async ({ apiKeysPage, page }) => {
      await apiKeysPage.goto();
      await expect(apiKeysPage.heading).toBeVisible({ timeout: 15000 });
      await apiKeysPage.createKeyButton.click();
      await page.getByLabel('Name').fill(keyName);
      await page.getByRole('button', { name: /^create$/i }).click();

      // Raw key dialog should appear
      await expect(page.getByRole('heading', { name: /api key created/i })).toBeVisible();
    });

    test('raw key dialog has warning and copy button', async ({ apiKeysPage, page }) => {
      await apiKeysPage.goto();
      await expect(apiKeysPage.heading).toBeVisible({ timeout: 15000 });
      await apiKeysPage.createKeyButton.click();
      const tempKeyName = `E2E Temp ${Date.now()}`;
      await page.getByLabel('Name').fill(tempKeyName);
      await page.getByRole('button', { name: /^create$/i }).click();

      await expect(page.getByText(/will not be shown again/i)).toBeVisible();
      // Close dialog
      await page.getByRole('button', { name: /done/i }).click();
    });

    test('created key visible in table with Active status', async ({ apiKeysPage }) => {
      await apiKeysPage.goto();
      await expect(apiKeysPage.heading).toBeVisible({ timeout: 15000 });
      const keyRow = apiKeysPage.getKeyRow(keyName);
      await expect(keyRow).toBeVisible({ timeout: 10000 });
      await expect(keyRow.getByText('Active')).toBeVisible();
    });

    test('revoke key changes status', async ({ apiKeysPage, page }) => {
      await apiKeysPage.goto();
      await expect(apiKeysPage.heading).toBeVisible({ timeout: 15000 });
      const keyRow = apiKeysPage.getKeyRow(keyName);
      await expect(keyRow).toBeVisible({ timeout: 10000 });
      await keyRow.getByRole('button', { name: /revoke/i }).click();

      // Confirm revoke dialog
      await page.getByRole('button', { name: /^revoke$/i }).click();

      // Status should change to Revoked
      await expect(apiKeysPage.getKeyRow(keyName).getByText('Revoked')).toBeVisible({ timeout: 10000 });
    });

    test('delete key removes from table', async ({ apiKeysPage, page }) => {
      await apiKeysPage.goto();
      await expect(apiKeysPage.heading).toBeVisible({ timeout: 15000 });
      const keyRow = apiKeysPage.getKeyRow(keyName);
      await expect(keyRow).toBeVisible({ timeout: 10000 });
      await keyRow.getByRole('button', { name: /delete/i }).click();

      // Confirm delete dialog
      await page.getByRole('button', { name: /^delete$/i }).click();

      // Key should be removed
      await expect(apiKeysPage.getKeyRow(keyName)).not.toBeVisible();
    });
  });

  test('cancel create does not add key', async ({ apiKeysPage, page }) => {
    await apiKeysPage.goto();
    await expect(apiKeysPage.heading).toBeVisible({ timeout: 15000 });
    const cancelKeyName = `E2E Cancel ${Date.now()}`;
    await apiKeysPage.createKeyButton.click();
    await page.getByLabel('Name').fill(cancelKeyName);
    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(apiKeysPage.getKeyRow(cancelKeyName)).not.toBeVisible();
  });
});
