# Fullstack Template Documentation

> Documentation for the fullstack application template.

---

## Quick Links

### Getting Started
- **[Getting Started Guide](./GETTING_STARTED.md)** - Start here! Setup and first steps
- [Dev Environment](./architecture/DEV_ENVIRONMENT.md) - Detailed local setup
- [Template Features](./features/README.md) - What's included
- [AI Agent Instructions](./AI_README.md) - Instructions for AI assistants

### API
- Interactive API docs available at `/api/docs` (Swagger/OpenAPI)

### Deployment
- **[Deployment Guide](./DEPLOYMENT.md)** - Build, configure, and deploy to production
- **[Production Checklist](./PRODUCTION_CHECKLIST.md)** - Pre-launch checklist

### Architecture
- [Tech Stack](./architecture/TECH_STACK.md) - Frameworks and libraries
- [Dev Environment](./architecture/DEV_ENVIRONMENT.md) - Local development setup
- [Coding Standard](./architecture/CODING_STANDARD.md) - TypeScript conventions
- [Core Patterns](./architecture/CORE_PATTERNS.md) - Code organization
- [Data Model](./architecture/DATA_MODEL.md) - Database schema (Drizzle)
- [Permissions](./architecture/PERMISSIONS.md) - Auth and authorization
- [Configuration](./architecture/CONFIG.md) - Environment variables

### Features (Included)

| Feature                                            | Description                 |
|----------------------------------------------------|-----------------------------|
| [Project Setup](features/000_setup.md)             | Monorepo, tooling, database |
| [Core Services](features/001_core-services.md)     | Email, storage              |
| [Core Frontend](features/002_core-frontend.md)     | Layout, navigation, theme   |
| [System Settings](features/003_system-settings.md) | Runtime configuration       |
| [User Auth](features/004_user-auth.md)             | Registration, login, JWT    |
| [User Admin](features/005_user-admin.md)           | User management, admin UI   |

---

## Folder Structure

```
docs/
├── README.md              # This file
├── AI_README.md           # Instructions for AI agents
├── DEPLOYMENT.md          # Deployment guide
├── GETTING_STARTED.md     # Quick start guide
├── PRODUCTION_CHECKLIST.md# Pre-launch checklist
│
├── architecture/          # System design & patterns
│   ├── TECH_STACK.md
│   ├── DEV_ENVIRONMENT.md
│   ├── CODING_STANDARD.md
│   ├── CORE_PATTERNS.md
│   ├── DATA_MODEL.md
│   ├── PERMISSIONS.md
│   └── CONFIG.md
│
└── features/              # Feature specifications
    ├── README.md          # Template feature list
    ├── 000_setup.md
    ├── 001_core-services.md
    ├── 002_core-frontend.md
    ├── 003_system-settings.md
    ├── 004_user-auth.md
    └── 005_user-admin.md
```

---

## Document Conventions

### Status Indicators

| Status      | Meaning     |
|-------------|-------------|
| Complete    | Done and tested |
| In Progress | Currently implementing |
| Planned     | Not started |
