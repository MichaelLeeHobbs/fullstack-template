# Tech Stack

## Overview

This is a full-stack web application template using TypeScript throughout, with a
React frontend and Node.js backend.

---

## Frontend

| Technology                  | Version | Purpose                          |
|-----------------------------|---------|----------------------------------|
| React                       | 18.x    | UI framework                     |
| TypeScript                  | 5.x     | Type safety                      |
| Vite                        | 5.x     | Build tool & dev server          |
| React Router                | 6.x     | Client-side routing              |
| Zustand                     | 4.x     | State management                 |
| Material UI (MUI)           | 6.x     | Component library                |
| TanStack Query              | 5.x     | Server state & caching           |

---

## Backend

| Technology         | Version | Purpose                         |
|--------------------|---------|---------------------------------|
| Node.js            | 20.x    | Runtime                         |
| TypeScript         | 5.x     | Type safety                     |
| Express.js         | 4.x     | HTTP framework                  |
| Drizzle ORM        | 0.38.x  | Database ORM & query builder    |
| PostgreSQL         | 17+     | Primary database                |
| Pino               | 8.x     | Structured logging              |
| pino-pretty        | 10.x    | Dev log formatting              |
| JWT (jsonwebtoken) | 9.x     | Authentication tokens           |
| bcrypt             | 5.x     | Password hashing                |
| Zod                | 3.24.x  | Request validation (`zod/v4`)   |
| stderr-lib         | 2.x     | Error handling & Result pattern |
| node-cron          | 3.x     | Job scheduling                  |

---

## File Storage

| Technology | Purpose                         |
|------------|---------------------------------|
| AWS S3     | Asset storage (images, exports) |
| MinIO      | Local S3-compatible development |

---

## DevOps & Infrastructure

### Production (AWS)

| Technology         | Purpose                              |
|--------------------|--------------------------------------|
| AWS ECS Fargate    | Container orchestration (serverless) |
| AWS ECR            | Container registry                   |
| AWS RDS PostgreSQL | Managed database                     |
| AWS S3             | Asset storage                        |
| AWS CloudFront     | CDN for static assets                |
| AWS CloudWatch     | Logging & metrics                    |
| AWS Route 53       | DNS management                       |
| AWS ALB            | Load balancer                        |
| GitHub Actions     | CI/CD pipeline                       |

### Local Development

| Technology          | Purpose                       |
|---------------------|-------------------------------|
| Docker Compose      | Local container orchestration |
| PostgreSQL (Docker) | Local database                |
| MinIO (Docker)      | Local S3-compatible storage   |

---

## Development Tools

| Technology  | Purpose                         |
|-------------|---------------------------------|
| pnpm        | Package manager (workspaces)    |
| tsx         | Fast TypeScript execution (dev) |
| ESLint      | Linting                         |
| Prettier    | Code formatting                 |
| Vitest      | Unit testing                    |
| Playwright  | E2E testing                     |
| Husky       | Git hooks                       |
| Drizzle Kit | Migrations & studio             |

---

## Key Library Choices

### Why Drizzle over Prisma?

- **SQL-like syntax** - explicit joins, more control
- **No binary dependency** - simpler deployment
- **Better type inference** - true SQL types
- **Faster cold starts** - no query engine startup
- **Complex queries** - better for our relational context building

### Why Pino over Winston?

- **Performance** - async by default, faster logging
- **Structured JSON** - CloudWatch-friendly
- **Lightweight** - smaller bundle

### Why stderr-lib?

- **Result pattern** - type-safe error handling
- **No thrown exceptions** - explicit success/failure
- **Error normalization** - consistent error structure
- **Works with async** - `tryCatch()` for promises

### Why Zod v4?

- **Better errors** - `z.prettifyError()` for readable messages
- **Performance** - faster validation
- **TypeScript inference** - automatic type generation

---

## Version Pinning Strategy

- **Exact versions** in `package.json` (no `^` or `~`)
- **Lock files** committed (`pnpm-lock.yaml`)
- **Monthly reviews** for dependency updates
- **Dependabot** for security patches only

