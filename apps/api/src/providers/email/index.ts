// ===========================================
// Email Providers
// ===========================================
// Re-exports all email provider types and utilities.

export type { EmailProvider, EmailOptions, EmailResult } from './email.provider.interface.js';
export { EmailProviderType } from './email.provider.interface.js';
export { getEmailProvider, resetEmailProvider } from './email.provider.factory.js';
export { MockEmailProvider } from './mock.email.provider.js';
export { SmtpEmailProvider, type SmtpConfig } from './smtp.email.provider.js';
export { SesEmailProvider, type SesConfig } from './ses.email.provider.js';
