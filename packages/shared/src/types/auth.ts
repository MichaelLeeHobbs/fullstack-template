// ===========================================
// Auth & User Types
// ===========================================

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
}

export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  preferences: UserPreferences;
  permissions: string[];
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSuccessResponse {
  user: User;
  accessToken: string;
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  mfaMethods: string[];
  tempToken: string;
}

export type AuthResponse = AuthSuccessResponse | MfaRequiredResponse;

export interface UserProfile {
  id: string;
  email: string;
  isAdmin: boolean;
  preferences: UserPreferences;
  createdAt: string;
}
