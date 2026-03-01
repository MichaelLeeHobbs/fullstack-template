import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Admin Roles', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('loads roles page with table', async ({ rolesPage }) => {
    await rolesPage.goto();
    await expect(rolesPage.heading).toBeVisible();
    await expect(rolesPage.table).toBeVisible();
  });

  test('shows default roles', async ({ rolesPage }) => {
    await rolesPage.goto();
    await expect(rolesPage.heading).toBeVisible();
    await expect(rolesPage.getRoleRow('Super Admin')).toBeVisible();
    await expect(rolesPage.getRoleRow('Admin')).toBeVisible();
    await expect(rolesPage.getRoleRow('User')).toBeVisible();
  });

  test('system role has disabled edit and delete', async ({ rolesPage }) => {
    await rolesPage.goto();
    await expect(rolesPage.heading).toBeVisible();
    const superAdminRow = rolesPage.getRoleRow('Super Admin');
    await expect(superAdminRow).toBeVisible();
    // System roles have disabled buttons in the actions cell
    const buttons = superAdminRow.getByRole('button');
    const count = await buttons.count();
    // All action buttons should be disabled for system roles
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      // Only check buttons that aren't permission chip buttons like "+34 more"
      const text = await btn.textContent();
      if (text && text.includes('more')) continue;
      await expect(btn).toBeDisabled();
    }
  });

  test.describe.serial('Role CRUD', () => {
    const roleName = `E2E Test Role ${Date.now()}`;

    test('create a new role', async ({ rolesPage, page }) => {
      await rolesPage.goto();
      await expect(rolesPage.heading).toBeVisible();
      await rolesPage.createRoleButton.click();

      // Fill create dialog
      await page.getByLabel('Role Name').fill(roleName);
      await page.getByLabel('Description').fill('E2E test role description');
      await page.getByRole('button', { name: /^create$/i }).click();

      // New role should appear in table
      await expect(rolesPage.getRoleRow(roleName)).toBeVisible();
    });

    test('open permissions dialog', async ({ rolesPage, page }) => {
      await rolesPage.goto();
      await expect(rolesPage.heading).toBeVisible();
      const roleRow = rolesPage.getRoleRow(roleName);
      await expect(roleRow).toBeVisible();
      // Click the Edit permissions button (first action button in the row)
      await roleRow.getByRole('button').first().click();

      await expect(page.getByRole('heading', { name: /edit permissions/i })).toBeVisible();
      await page.getByRole('button', { name: /cancel/i }).click();
    });

    test('delete custom role', async ({ rolesPage, page }) => {
      await rolesPage.goto();
      await expect(rolesPage.heading).toBeVisible();
      const roleRow = rolesPage.getRoleRow(roleName);
      await expect(roleRow).toBeVisible();
      // Click delete button (last action button)
      await roleRow.getByRole('button').last().click();

      // Confirm delete dialog
      await page.getByRole('button', { name: /^delete$/i }).click();

      // Role should be removed
      await expect(rolesPage.getRoleRow(roleName)).not.toBeVisible();
    });
  });
});
