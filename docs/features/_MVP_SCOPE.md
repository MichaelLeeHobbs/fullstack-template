# Template Features

> Last Updated: 2025-01-17

## Overview

This document defines the features included in this fullstack template.

---

## Included Features

| #   | Feature                                     | Description                 | Status     |
|-----|---------------------------------------------|-----------------------------|------------|
| 00  | [Project Setup](./000_setup.md)             | Monorepo, tooling, database | ✅ Complete |
| 00b | [Core Services](./001_core-services.md)     | Email, storage              | ✅ Complete |
| 00c | [Core Frontend](./002_core-frontend.md)     | Layout, navigation, theme   | ✅ Complete |
| 00d | [System Settings](./003_system-settings.md) | Runtime configuration       | ✅ Complete |
| 01a | [User Auth](./004_user-auth.md)             | Registration, login, JWT    | ✅ Complete |
| 01b | [User Admin](./005_user-admin.md)           | User management, admin UI   | ✅ Complete |

---

## Feature Summary

### 00. Project Setup
- Initialize monorepo (frontend + backend)
- Configure TypeScript, ESLint, Prettier
- Set up Drizzle with PostgreSQL
- Configure environment variables
- Basic Express server with health check
- Vite React app with routing shell
- Dark mode support (system/light/dark)
- Pino logging configured

### 00b. Core Services
- Email service (mock dev, AWS SES production)
- Storage service (S3/MinIO)

### 00c. Core Frontend
- Layout components (header, footer, navigation)
- Landing page
- User profile page
- Error and loading states
- Notistack notifications

### 00d. System Settings
- Runtime configuration via database
- Admin settings UI
- Feature flags

### 01a. User Authentication
- User registration (email/password)
- Login / Logout
- JWT access tokens + refresh tokens
- Password hashing (bcrypt)
- Protected route middleware

### 01b. User Admin
- User management
- Password reset flow
- Email verification
- Rate limiting
- Audit logging
- Admin UI

---

## Adding Your Own Features

This template provides the foundation. Add your own features by:

1. Create feature doc in `docs/features/XX_feature-name.md`
2. Create task docs in `docs/tasks/XX_feature-name/`
3. Implement: Schema → Service → Controller → Routes → UI

---

## Definition of Done

A feature is complete when:

1. ✅ Backend API endpoints implemented
2. ✅ Frontend UI implemented
3. ✅ Unit tests pass
4. ✅ Integration tests pass (API)
5. ✅ No TypeScript errors
6. ✅ No ESLint warnings

