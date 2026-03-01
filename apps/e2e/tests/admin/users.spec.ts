import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Admin Users', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('loads users page with table', async ({ usersPage }) => {
    await usersPage.goto();
    await expect(usersPage.heading).toBeVisible();
    await expect(usersPage.table).toBeVisible({ timeout: 15000 });
  });

  test('shows admin user in the table', async ({ usersPage }) => {
    await usersPage.goto();
    await expect(usersPage.heading).toBeVisible();
    await expect(usersPage.getRow('admin@app.local')).toBeVisible({ timeout: 15000 });
  });

  test('search filters users by email', async ({ usersPage }) => {
    await usersPage.goto();
    await expect(usersPage.heading).toBeVisible();
    await expect(usersPage.table).toBeVisible({ timeout: 15000 });
    await usersPage.searchUsers('admin');
    await expect(usersPage.getRow('admin@app.local')).toBeVisible();
  });

  test('search with no results shows empty state', async ({ usersPage, page }) => {
    await usersPage.goto();
    await expect(usersPage.heading).toBeVisible();
    await expect(usersPage.table).toBeVisible({ timeout: 15000 });
    await usersPage.searchUsers('nonexistent-user-xyz@nowhere.com');
    await expect(page.getByText(/no users found/i)).toBeVisible();
  });

  test('pagination controls visible', async ({ usersPage, page }) => {
    await usersPage.goto();
    await expect(usersPage.heading).toBeVisible();
    await expect(usersPage.table).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/rows per page/i)).toBeVisible();
  });

  test('admin user status toggle is disabled', async ({ usersPage }) => {
    await usersPage.goto();
    await expect(usersPage.heading).toBeVisible();
    const adminRow = usersPage.getRow('admin@app.local');
    await expect(adminRow).toBeVisible({ timeout: 15000 });
    // The admin's own status switch should be disabled (self-protection)
    const switches = adminRow.getByRole('checkbox');
    const firstSwitch = switches.first();
    await expect(firstSwitch).toBeDisabled();
  });

  test('admin user delete button is disabled', async ({ usersPage }) => {
    await usersPage.goto();
    await expect(usersPage.heading).toBeVisible();
    const adminRow = usersPage.getRow('admin@app.local');
    await expect(adminRow).toBeVisible({ timeout: 15000 });
    // The delete button is an icon-only button with a Tooltip wrapper ("Delete user")
    // but no accessible name on the button itself. Target it as the last button in the row's Actions cell.
    const actionsCell = adminRow.getByRole('cell').last();
    const deleteButton = actionsCell.getByRole('button').last();
    await expect(deleteButton).toBeDisabled();
  });
});
