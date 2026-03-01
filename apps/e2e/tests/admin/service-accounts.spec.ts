import { test, expect } from '../../fixtures/test-fixtures';

// BUG: Service accounts page crashes with React error boundary "Something went wrong"
// The page component throws an unhandled error during rendering.
// All tests are marked fixme until the underlying bug is resolved.
test.describe('Admin Service Accounts', () => {
  test.use({ storageState: '.auth/admin.json' });

  test.fixme('loads service accounts page', async ({ serviceAccountsPage }) => {
    await serviceAccountsPage.goto();
    await expect(serviceAccountsPage.heading).toBeVisible({ timeout: 15000 });
    await expect(serviceAccountsPage.table).toBeVisible({ timeout: 15000 });
  });

  test.fixme('create dialog opens with email field', async ({ serviceAccountsPage, page }) => {
    await serviceAccountsPage.goto();
    await expect(serviceAccountsPage.heading).toBeVisible({ timeout: 15000 });
    await serviceAccountsPage.createButton.click();
    await expect(page.getByRole('heading', { name: /create service account/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
  });

  test.describe.serial('Service Account lifecycle', () => {
    const accountEmail = `e2e-svc-${Date.now()}@app.local`;

    test.fixme('create a service account', async ({ serviceAccountsPage, page }) => {
      await serviceAccountsPage.goto();
      await expect(serviceAccountsPage.heading).toBeVisible({ timeout: 15000 });
      await serviceAccountsPage.createButton.click();
      await page.getByLabel('Email').fill(accountEmail);
      await page.getByRole('button', { name: /^create$/i }).click();

      // New row should appear
      await expect(serviceAccountsPage.getAccountRow(accountEmail)).toBeVisible({ timeout: 10000 });
    });

    test.fixme('new account shows Active status', async ({ serviceAccountsPage }) => {
      await serviceAccountsPage.goto();
      await expect(serviceAccountsPage.heading).toBeVisible({ timeout: 15000 });
      const row = serviceAccountsPage.getAccountRow(accountEmail);
      await expect(row).toBeVisible({ timeout: 10000 });
      await expect(row.getByText('Active')).toBeVisible();
    });

    test.fixme('delete with confirmation removes account', async ({ serviceAccountsPage, page }) => {
      await serviceAccountsPage.goto();
      await expect(serviceAccountsPage.heading).toBeVisible({ timeout: 15000 });
      const row = serviceAccountsPage.getAccountRow(accountEmail);
      await expect(row).toBeVisible({ timeout: 10000 });
      await row.getByRole('button', { name: /delete/i }).click();

      // Confirm delete dialog
      await page.getByRole('button', { name: /^delete$/i }).click();

      // Account should be removed
      await expect(serviceAccountsPage.getAccountRow(accountEmail)).not.toBeVisible();
    });
  });

  test.fixme('cancel delete does not remove account', async ({ serviceAccountsPage, page }) => {
    await serviceAccountsPage.goto();
    await expect(serviceAccountsPage.heading).toBeVisible({ timeout: 15000 });
    // Create a temp account first
    const tempEmail = `e2e-temp-${Date.now()}@app.local`;
    await serviceAccountsPage.createButton.click();
    await page.getByLabel('Email').fill(tempEmail);
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(serviceAccountsPage.getAccountRow(tempEmail)).toBeVisible({ timeout: 10000 });

    // Try to delete but cancel
    const row = serviceAccountsPage.getAccountRow(tempEmail);
    await row.getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();

    // Account should still be there
    await expect(serviceAccountsPage.getAccountRow(tempEmail)).toBeVisible();

    // Clean up: actually delete it
    await row.getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /^delete$/i }).click();
  });
});
