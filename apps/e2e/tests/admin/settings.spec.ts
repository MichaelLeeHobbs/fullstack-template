import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Admin Settings', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('loads settings page with tabs', async ({ settingsPage, page }) => {
    await settingsPage.goto();
    await expect(settingsPage.heading).toBeVisible();
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 15000 });
  });

  test('tab switching works', async ({ settingsPage, page }) => {
    await settingsPage.goto();
    await expect(settingsPage.heading).toBeVisible();
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible({ timeout: 15000 });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(1);

    // If there are multiple tabs, click the second one
    if (tabCount > 1) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('settings cards are visible', async ({ settingsPage, page }) => {
    await settingsPage.goto();
    await expect(settingsPage.heading).toBeVisible();
    // Wait for settings to load by waiting for loading to finish
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 15000 });
    // At least one setting card (MUI Card with outlined variant) should be visible
    const cards = page.locator('.MuiCard-root');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
  });

  test('boolean setting has toggle switch', async ({ settingsPage, page }) => {
    await settingsPage.goto();
    await expect(settingsPage.heading).toBeVisible();
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 15000 });
    // Click the "Features" tab which has boolean settings (registration_enabled, email_verification_required)
    const featuresTab = page.getByRole('tab', { name: /features/i });
    await expect(featuresTab).toBeVisible({ timeout: 10000 });
    await featuresTab.click();
    // Wait for the tab content to load
    const cards = page.locator('.MuiCard-root');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    // MUI Switch renders as role="checkbox"
    const switches = page.getByRole('checkbox');
    await expect(switches.first()).toBeVisible({ timeout: 10000 });
  });
});
