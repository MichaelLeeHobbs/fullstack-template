import type { Page, Locator } from '@playwright/test';

export class ProfilePage {
  readonly heading: Locator;
  readonly accountInfoCard: Locator;
  readonly emailValue: Locator;
  readonly roleValue: Locator;
  readonly preferencesCard: Locator;
  readonly lightToggle: Locator;
  readonly darkToggle: Locator;
  readonly systemToggle: Locator;
  readonly sessionsCard: Locator;
  readonly manageSessionsButton: Locator;
  readonly mfaCard: Locator;
  readonly mfaStatusChip: Locator;
  readonly setupTotpButton: Locator;
  readonly changePasswordCard: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmNewPasswordInput: Locator;
  readonly changePasswordButton: Locator;
  readonly apiKeysCard: Locator;

  constructor(private readonly page: Page) {
    const main = page.getByRole('main');
    this.heading = main.getByRole('heading', { name: /profile/i });
    this.accountInfoCard = main.getByText('Account Information');
    this.emailValue = main.getByText('admin@app.local');
    this.roleValue = main.getByText('Administrator');
    this.preferencesCard = main.getByText('Preferences');
    this.lightToggle = main.getByRole('button', { name: /light/i });
    this.darkToggle = main.getByRole('button', { name: /dark/i });
    this.systemToggle = main.getByRole('button', { name: /system/i });
    this.sessionsCard = main.getByText('Sessions').first();
    this.manageSessionsButton = main.getByRole('button', { name: /manage sessions/i });
    this.mfaCard = main.getByText('Multi-Factor Authentication');
    this.mfaStatusChip = main.getByText('Disabled');
    this.setupTotpButton = main.getByRole('button', { name: /set up totp/i });
    // Use first() to avoid matching the submit button with the same text
    this.changePasswordCard = main.getByText('Change Password').first();
    this.currentPasswordInput = main.getByLabel('Current Password');
    this.newPasswordInput = main.getByLabel('New Password', { exact: true });
    this.confirmNewPasswordInput = main.getByLabel('Confirm New Password', { exact: true });
    this.changePasswordButton = main.getByRole('button', { name: /^change password$/i });
    // Use first() to avoid matching sidebar "API Keys" link
    this.apiKeysCard = main.getByText('API Keys').first();
  }

  async goto() {
    await this.page.goto('/profile');
  }

  async selectTheme(mode: 'light' | 'dark' | 'system') {
    const toggles = { light: this.lightToggle, dark: this.darkToggle, system: this.systemToggle };
    await toggles[mode].click();
  }

  async fillChangePassword(current: string, newPw: string, confirm: string) {
    await this.currentPasswordInput.fill(current);
    await this.newPasswordInput.fill(newPw);
    await this.confirmNewPasswordInput.fill(confirm);
  }
}
