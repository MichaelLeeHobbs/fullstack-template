// ===========================================
// Account API
// ===========================================
// Account-related API calls (verification, password reset).

import { api } from './client.js';
import type { ForgotPasswordInput, ResetPasswordInput } from '@fullstack-template/shared';

export type { ForgotPasswordInput };
export type ResetPasswordApiInput = Omit<ResetPasswordInput, 'confirmPassword'>;

export interface VerifyEmailInput {
  token: string;
}

export interface VerifyEmailResponse {
  userId: string;
}

export const accountApi = {
  /**
   * Request a password reset email.
   * Always returns success to prevent email enumeration.
   */
  forgotPassword: (data: ForgotPasswordInput) =>
    api.post<{ message: string }>('/account/forgot-password', data, { skipAuth: true }),

  /**
   * Reset password using token from email.
   */
  resetPassword: (data: ResetPasswordApiInput) =>
    api.post<{ message: string }>('/account/reset-password', data, { skipAuth: true }),

  /**
   * Verify email using token from email.
   */
  verifyEmail: (data: VerifyEmailInput) =>
    api.post<VerifyEmailResponse>('/account/verify-email', data, { skipAuth: true }),

  /**
   * Resend verification email (requires authentication).
   */
  resendVerification: () => api.post<{ message: string }>('/account/resend-verification', {}),

  /**
   * Resend verification email (public — for login page when not authenticated).
   */
  resendVerificationPublic: (data: ForgotPasswordInput) =>
    api.post<{ message: string }>('/account/resend-verification-public', data, { skipAuth: true }),
};
