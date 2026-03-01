import { test as base } from '@playwright/test';
import { LoginPage } from '../page-objects/login.page';
import { RegisterPage } from '../page-objects/register.page';
import { HomePage } from '../page-objects/home.page';
import { NavComponent } from '../page-objects/nav.component';
import { ProfilePage } from '../page-objects/profile.page';
import { SessionsPage } from '../page-objects/sessions.page';
import { ForgotPasswordPage } from '../page-objects/forgot-password.page';
import { SidebarComponent } from '../page-objects/sidebar.component';
import { UsersPage } from '../page-objects/admin/users.page';
import { RolesPage } from '../page-objects/admin/roles.page';
import { SettingsPage } from '../page-objects/admin/settings.page';
import { AuditLogsPage } from '../page-objects/admin/audit-logs.page';
import { ApiKeysPage } from '../page-objects/admin/api-keys.page';
import { ServiceAccountsPage } from '../page-objects/admin/service-accounts.page';
import { PkiDashboardPage } from '../page-objects/pki/dashboard.page';
import { CaListPage } from '../page-objects/pki/ca-list.page';
import { CaCreatePage } from '../page-objects/pki/ca-create.page';
import { CertificateListPage } from '../page-objects/pki/certificate-list.page';
import { ProfileListPage } from '../page-objects/pki/profile-list.page';

type Fixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  homePage: HomePage;
  nav: NavComponent;
  profilePage: ProfilePage;
  sessionsPage: SessionsPage;
  forgotPasswordPage: ForgotPasswordPage;
  sidebar: SidebarComponent;
  usersPage: UsersPage;
  rolesPage: RolesPage;
  settingsPage: SettingsPage;
  auditLogsPage: AuditLogsPage;
  apiKeysPage: ApiKeysPage;
  serviceAccountsPage: ServiceAccountsPage;
  pkiDashboardPage: PkiDashboardPage;
  caListPage: CaListPage;
  caCreatePage: CaCreatePage;
  certificateListPage: CertificateListPage;
  profileListPage: ProfileListPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  nav: async ({ page }, use) => {
    await use(new NavComponent(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
  sessionsPage: async ({ page }, use) => {
    await use(new SessionsPage(page));
  },
  forgotPasswordPage: async ({ page }, use) => {
    await use(new ForgotPasswordPage(page));
  },
  sidebar: async ({ page }, use) => {
    await use(new SidebarComponent(page));
  },
  usersPage: async ({ page }, use) => {
    await use(new UsersPage(page));
  },
  rolesPage: async ({ page }, use) => {
    await use(new RolesPage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  auditLogsPage: async ({ page }, use) => {
    await use(new AuditLogsPage(page));
  },
  apiKeysPage: async ({ page }, use) => {
    await use(new ApiKeysPage(page));
  },
  serviceAccountsPage: async ({ page }, use) => {
    await use(new ServiceAccountsPage(page));
  },
  pkiDashboardPage: async ({ page }, use) => {
    await use(new PkiDashboardPage(page));
  },
  caListPage: async ({ page }, use) => {
    await use(new CaListPage(page));
  },
  caCreatePage: async ({ page }, use) => {
    await use(new CaCreatePage(page));
  },
  certificateListPage: async ({ page }, use) => {
    await use(new CertificateListPage(page));
  },
  profileListPage: async ({ page }, use) => {
    await use(new ProfileListPage(page));
  },
});

export { expect } from '@playwright/test';
