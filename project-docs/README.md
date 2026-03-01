# Project Documentation

> Enterprise-level documentation for building, deploying, and operating applications built on the fullstack template.

---

## About This Documentation

This project uses a two-tier documentation structure:

| Location | Purpose | Audience |
|----------|---------|----------|
| [`template-docs/`](../template-docs/README.md) | Template-level patterns, architecture, and feature specs | Developers extending the template |
| `project-docs/` (this directory) | Enterprise/project-level docs: API reference, operations, security, QA | Full team (dev, ops, QA, product) |

**Template docs** (`template-docs/`) describe _how the template works_ -- coding standards, core patterns, data model, and feature specifications. They are checked into the template repository and evolve with the codebase.

**Project docs** (`project-docs/`) describe _how to build, ship, and run your product_ -- API contracts, deployment procedures, security policies, user stories, and test plans. They grow as your project matures beyond the template.

---

## Quick Navigation

| Section | Description | Link |
|---------|-------------|------|
| Architecture | ADRs, C4 diagrams, design documents | [project-docs/architecture/](./architecture/README.md) |
| API | Endpoint reference, auth, error codes, pagination | [project-docs/api/](./api/README.md) |
| Developer | Setup, standards, contributing, CI/CD, testing | [project-docs/developer/](./developer/README.md) |
| Operations | Deployment, monitoring, incidents, database | [project-docs/operations/](./operations/README.md) |
| Security | Audit, threat model, policies, data protection | [project-docs/security/](./security/README.md) |
| Product | Feature tracker, changelog, admin guide | [project-docs/product/](./product/README.md) |
| Project | Roadmap, SLAs/SLOs | [project-docs/project/](./project/README.md) |
| User Stories | 42 stories across 9 areas | [project-docs/stories/](./stories/README.md) |
| QA | ~140 test cases across 9 areas | [project-docs/qa/](./qa/README.md) |

---

## Getting Started

1. **New to the codebase?** Start with the [Getting Started Guide](../template-docs/GETTING_STARTED.md) and [Template Features](../template-docs/features/README.md).
2. **Building a feature?** Check [User Stories](./stories/README.md) for requirements and [API docs](./api/README.md) for contracts.
3. **Deploying?** See [Operations](./operations/README.md) for deployment guides and the production checklist.
4. **Running QA?** See [QA Test Cases](./qa/README.md) for comprehensive test plans.

---

## Folder Structure

```
project-docs/
├── README.md                  # This file - master navigation
│
├── architecture/              # System architecture
│   ├── README.md              # Section index
│   ├── adr/                   # Architecture Decision Records
│   ├── c4/                    # C4 Model Diagrams
│   └── design/                # Design documents
│
├── api/                       # API documentation
│   ├── README.md              # Section index
│   ├── authentication.md      # Auth mechanisms
│   ├── endpoints/             # Per-domain endpoint specs
│   ├── rate-limiting.md       # Rate limiting policies
│   ├── error-codes.md         # Standard error codes
│   └── pagination.md          # Pagination conventions
│
├── developer/                 # Developer documentation
│   ├── README.md              # Section index
│   ├── setup.md               # Local environment setup
│   ├── coding-standards.md    # Project coding standards
│   ├── contributing.md        # Contribution guidelines
│   ├── ci-cd.md               # CI/CD pipeline docs
│   └── testing/               # Test strategy and guides
│
├── operations/                # Operations & infrastructure
│   ├── README.md              # Section index
│   ├── deployment.md          # Deployment guide
│   ├── production-checklist.md# Pre-launch checklist
│   ├── environment-config.md  # Environment variables
│   ├── monitoring.md          # Monitoring and alerting
│   ├── incidents.md           # Incident response
│   └── database/              # DB operations (migrations, backups)
│
├── security/                  # Security documentation
│   ├── README.md              # Section index
│   ├── audit-report.md        # Security audit findings
│   ├── security-policy.md     # Security policies
│   ├── threat-model.md        # Threat model
│   ├── dependency-management.md # Dependency security
│   ├── authentication-security.md # Auth security deep-dive
│   └── data-protection.md     # Data handling and encryption
│
├── product/                   # Product documentation
│   ├── README.md              # Section index
│   ├── feature-tracker.md     # Feature status tracker
│   ├── changelog.md           # Release changelog
│   └── admin-guide.md         # Admin user guide
│
├── project/                   # Project management
│   ├── README.md              # Section index
│   ├── roadmap.md             # Project roadmap
│   └── sla-slo.md             # Service level objectives
│
├── stories/                   # User stories
│   ├── README.md              # Section index + story format
│   ├── auth.md                # Authentication stories
│   ├── mfa.md                 # MFA stories
│   ├── session.md             # Session management stories
│   ├── rbac.md                # RBAC stories
│   ├── admin.md               # Admin stories
│   ├── api-keys.md            # API key stories
│   ├── pki.md                 # PKI/CA stories
│   ├── notifications.md       # Notification stories
│   └── frontend.md            # Frontend stories
│
└── qa/                        # QA test cases
    ├── README.md              # Section index + test format
    ├── auth.md                # Authentication test cases
    ├── mfa.md                 # MFA test cases
    ├── session.md             # Session test cases
    ├── rbac.md                # RBAC test cases
    ├── admin.md               # Admin test cases
    ├── api-keys.md            # API key test cases
    ├── pki.md                 # PKI/CA test cases
    ├── notifications.md       # Notification test cases
    └── frontend.md            # Frontend test cases
```

---

## Document Conventions

### Status Indicators

| Status | Meaning |
|--------|---------|
| Complete | Fully implemented and tested |
| In Progress | Currently being implemented |
| Planned | Defined but not yet started |
| Draft | Document exists but is not finalized |

### Cross-References

- Template architecture docs: `../template-docs/architecture/`
- Template feature specs: `../template-docs/features/`
- AI agent instructions: `../template-docs/AI_README.md`
