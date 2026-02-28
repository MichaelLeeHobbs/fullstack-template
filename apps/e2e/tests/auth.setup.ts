import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, '..', '.auth', 'admin.json');

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('admin@app.local');
  await page.getByLabel('Password').fill('Admin123!');
  await page.getByRole('button', { name: /login/i }).click();

  // Wait for navigation to home page after login
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
