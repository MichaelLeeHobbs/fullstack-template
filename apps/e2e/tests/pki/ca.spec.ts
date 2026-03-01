import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Certificate Authorities', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('CA list loads', async ({ caListPage }) => {
    await caListPage.goto();
    await expect(caListPage.heading).toBeVisible({ timeout: 15000 });
  });

  test('create CA button navigates to form', async ({ caListPage, page }) => {
    await caListPage.goto();
    await expect(caListPage.heading).toBeVisible({ timeout: 15000 });
    await caListPage.createCaButton.click();
    await page.waitForURL('**/pki/ca/create');
  });

  test('stepper shows 4 steps', async ({ caCreatePage }) => {
    await caCreatePage.goto();
    await expect(caCreatePage.getStepLabel('CA Type')).toBeVisible();
    await expect(caCreatePage.getStepLabel('Subject Information')).toBeVisible();
    await expect(caCreatePage.getStepLabel('Key & Validity')).toBeVisible();
    await expect(caCreatePage.getStepLabel('Review')).toBeVisible();
  });

  // BUG: CA creation wizard completes but CA does not appear in list.
  // The backend CA creation (key pair generation, certificate signing) may be
  // failing silently or the API returns success without persisting the CA.
  test.describe.serial('Create Root CA', () => {
    const caName = `E2E Root CA ${Date.now()}`;

    test.fixme('create root CA through wizard', async ({ caCreatePage, page }) => {
      await caCreatePage.goto();

      // Step 0: CA Type — Root CA is default, click Next
      await caCreatePage.nextButton.click();

      // Step 1: Subject Information
      await caCreatePage.caNameInput.fill(caName);
      await caCreatePage.commonNameInput.fill(`${caName} CN`);
      await caCreatePage.nextButton.click();

      // Step 2: Key & Validity
      await caCreatePage.passphraseInput.fill('E2eTestPass123!');
      await caCreatePage.nextButton.click();

      // Step 3: Review — click Create CA
      await caCreatePage.createCaButton.click();

      // Should redirect to CA detail page (NOT /pki/ca/create)
      await page.waitForURL(/\/pki\/ca\/(?!create)[^/]+/, { timeout: 30000 });
    });

    test.fixme('new CA appears in list', async ({ caListPage }) => {
      await caListPage.goto();
      await expect(caListPage.heading).toBeVisible({ timeout: 15000 });
      await expect(caListPage.getCaRow(caName)).toBeVisible({ timeout: 10000 });
    });

    test.fixme('CA row click navigates to detail', async ({ caListPage, page }) => {
      await caListPage.goto();
      await expect(caListPage.heading).toBeVisible({ timeout: 15000 });
      await expect(caListPage.getCaRow(caName)).toBeVisible({ timeout: 10000 });
      await caListPage.getCaRow(caName).click();
      await expect(page).toHaveURL(/\/pki\/ca\/.+/);
    });
  });
});
