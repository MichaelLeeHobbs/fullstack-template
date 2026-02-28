# Template Documentation

> Core documentation for the fullstack application template -- architecture, patterns, and feature specifications.

---

## Quick Links

### Getting Started

- **[Getting Started Guide](./GETTING_STARTED.md)** - Start here! Setup and first steps
- [Dev Environment](./architecture/DEV_ENVIRONMENT.md) - Detailed local setup
- [Template Features](./features/README.md) - What's included
- [AI Agent Instructions](./AI_README.md) - Instructions for AI assistants

### API

- Interactive API docs available at `/api/docs` (Swagger/OpenAPI)

---

## Architecture

Core patterns and conventions that define how the template works.

| Document | Description |
|----------|-------------|
| [Tech Stack](./architecture/TECH_STACK.md) | Frameworks, libraries, and runtime |
| [Dev Environment](./architecture/DEV_ENVIRONMENT.md) | Local development setup |
| [Coding Standard](./architecture/CODING_STANDARD.md) | TypeScript conventions and rules |
| [Core Patterns](./architecture/CORE_PATTERNS.md) | Router -> Controller -> Service -> Model |
| [Data Model](./architecture/DATA_MODEL.md) | Database schema (Drizzle ORM) |
| [Permissions](./architecture/PERMISSIONS.md) | RBAC and authorization model |
| [Configuration](./architecture/CONFIG.md) | Environment variables and config |

---

## Features (Included)

Feature specifications describing what is built into the template.

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 00 | [Project Setup](features/000_setup.md) | Monorepo, tooling, database | Complete |
| 00b | [Core Services](features/001_core-services.md) | Email, storage | Complete |
| 00c | [Core Frontend](features/002_core-frontend.md) | Layout, navigation, theme | Complete |
| 00d | [System Settings](features/003_system-settings.md) | Runtime configuration | Complete |
| 01a | [User Auth](features/004_user-auth.md) | Registration, login, JWT, MFA | Complete |
| 01b | [User Admin](features/005_user-admin.md) | User management, RBAC, admin UI | Complete |

---

## Enterprise / Project Documentation

For deployment, security, operations, API reference, user stories, and QA test cases, see the **project-level documentation**:

**[project-docs/](../project-docs/README.md)** - Enterprise documentation hub

| Section | Description | Link |
|---------|-------------|------|
| Architecture | ADRs, C4 diagrams, design docs | [project-docs/architecture/](../project-docs/architecture/README.md) |
| API Reference | Endpoints, auth, error codes, pagination | [project-docs/api/](../project-docs/api/README.md) |
| Developer | Setup, standards, contributing, CI/CD, testing | [project-docs/developer/](../project-docs/developer/README.md) |
| Operations | Deployment, monitoring, incidents, database | [project-docs/operations/](../project-docs/operations/README.md) |
| Security | Audit, threat model, policies, data protection | [project-docs/security/](../project-docs/security/README.md) |
| Product | Feature tracker, changelog, admin guide | [project-docs/product/](../project-docs/product/README.md) |
| Project | Roadmap, SLAs/SLOs | [project-docs/project/](../project-docs/project/README.md) |
| User Stories | 42 stories across 9 areas | [project-docs/stories/](../project-docs/stories/README.md) |
| QA | ~140 test cases across 9 areas | [project-docs/qa/](../project-docs/qa/README.md) |

---

## Folder Structure

```
docs/
├── README.md                  # This file - template docs hub
├── AI_README.md               # Instructions for AI agents
├── GETTING_STARTED.md         # Quick start guide
│
├── architecture/              # System design & patterns
│   ├── TECH_STACK.md
│   ├── DEV_ENVIRONMENT.md
│   ├── CODING_STANDARD.md
│   ├── CORE_PATTERNS.md
│   ├── DATA_MODEL.md
│   ├── PERMISSIONS.md
│   └── CONFIG.md
│
└── features/                  # Feature specifications
    ├── README.md              # Template feature list
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

| Status | Meaning |
|--------|---------|
| Complete | Done and tested |
| In Progress | Currently implementing |
| Planned | Not started |
