# Fullstack Template Documentation

> Documentation for the fullstack application template.

---

## Quick Links

### Getting Started
- **[Getting Started Guide](./GETTING_STARTED.md)** - Start here! Setup and first steps
- [Dev Environment](./architecture/DEV_ENVIRONMENT.md) - Detailed local setup
- [MVP Scope](./features/_MVP_SCOPE.md) - Template features
- [AI Agent Instructions](./AI_README.md) - Instructions for AI assistants

### API
- **[API Reference](./API_REFERENCE.md)** - Complete endpoint documentation

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
├── features/              # Feature specifications
│   ├── _MVP_SCOPE.md      # Master feature list
│   ├── 00_project-setup.md
│   ├── 00b_core-services.md
│   ├── 00c_core-frontend.md
│   ├── 00d_system-settings.md
│   ├── 01a_user-auth.md
│   └── 01b_user-admin.md
│
└── tasks/                 # Task tracking
    ├── README.md          # Task lifecycle guide
    └── completed/         # Completed task files
```

---

## Document Conventions

### Status Indicators

| Status         | Meaning                |
|----------------|------------------------|
| 📋 Planned     | Not started            |
| 🚧 In Progress | Currently implementing |
| ✅ Complete     | Done and tested        |
| ⏸️ Deferred    | Moved to future        |

