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
    key: 'feature.ai_enabled',
    value: 'false',
    type: 'boolean',
    category: 'features',
    description: 'Enable AI-powered features (requires API keys in .env)',
  },
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
  // AI Settings
  // ===========================================
  {
    key: 'ai.default_model',
    value: 'claude-3-sonnet-20240229',
    type: 'string',
    category: 'ai',
    description: 'Default AI model for text generation',
  },
  {
    key: 'ai.max_tokens',
    value: '4096',
    type: 'number',
    category: 'ai',
    description: 'Maximum tokens per AI request',
  },
  {
    key: 'ai.temperature',
    value: '0.7',
    type: 'number',
    category: 'ai',
    description: 'AI creativity setting (0.0 - 1.0)',
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

