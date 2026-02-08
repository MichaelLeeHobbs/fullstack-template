// ===========================================
// Integration Test Setup
// ===========================================
// Provides a supertest agent with mocked infrastructure layers.
// Tests exercise the full middleware chain (routing, validation, error handling)
// while mocking the database and external services.
//
// Each test file that uses this module must add its own vi.mock calls
// before importing this setup, since vi.mock is hoisted per-file.
// This module provides the shared createAgent() helper.

import request from 'supertest';
import type { Express } from 'express';

let appInstance: Express | null = null;

export async function createAgent() {
  if (!appInstance) {
    const mod = await import('../../src/app.js');
    appInstance = mod.default;
  }
  return request(appInstance);
}

export function resetApp() {
  appInstance = null;
}
