// ===========================================
// Default System Settings
// ===========================================
// These are seeded on first run. Values can be changed via Admin UI.

import { type NewSystemSetting } from '../schema/index.js';

export const defaultSettings: NewSystemSetting[] = [
  // ===========================================
  // Feature Flags
  // ===========================================
  {
    key: 'feature.registration_enabled',
    value: 'true',
    type: 'boolean',
    category: 'features',
    description: 'Allow new user registrations',
  },
  {
    key: 'feature.email_verification_required',
    value: 'false',
    type: 'boolean',
    category: 'features',
    description: 'Require email verification before login',
  },

  // ===========================================
  // Email Settings
  // ===========================================
  {
    key: 'email.from_name',
    value: 'App Name',
    type: 'string',
    category: 'email',
    description: 'Sender name for system emails',
  },

  // ===========================================
  // Security Settings
  // ===========================================
  {
    key: 'security.max_login_attempts',
    value: '5',
    type: 'number',
    category: 'security',
    description: 'Maximum consecutive failed login attempts before account lockout',
  },
  {
    key: 'security.lockout_duration_minutes',
    value: '15',
    type: 'number',
    category: 'security',
    description: 'Minutes an account stays locked after exceeding max login attempts',
  },

  // ===========================================
  // Application Settings
  // ===========================================
  {
    key: 'app.maintenance_mode',
    value: 'false',
    type: 'boolean',
    category: 'general',
    description: 'Enable maintenance mode (blocks non-admin access)',
  },
  {
    key: 'app.max_items_per_user',
    value: '100',
    type: 'number',
    category: 'general',
    description: 'Maximum items a user can create',
  },
];

