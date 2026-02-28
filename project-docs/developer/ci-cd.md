# CI/CD Pipeline Guide

> **[Template]** This covers the base template feature. Extend or modify for your project.

This document describes the recommended CI/CD pipeline for the fullstack template. Since deployment targets vary, this provides a GitHub Actions template that you should adapt for your specific infrastructure.

---

## Pipeline Overview

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#1e3a5f', 'primaryTextColor': '#e0e0e0', 'primaryBorderColor': '#4fc3f7', 'lineColor': '#81d4fa', 'secondaryColor': '#2e4057', 'tertiaryColor': '#1a2332', 'noteTextColor': '#e0e0e0', 'noteBkgColor': '#2e4057', 'noteBorderColor': '#4fc3f7'}}}%%
flowchart LR
    A[Push / PR] --> B[Install]
    B --> C[Lint]
    C --> D[Type Check]
    D --> E[Test]
    E --> F[Build]
    F --> G{Branch?}
    G -->|main| H[Deploy Staging]
    G -->|release/*| I[Deploy Production]
    G -->|feature/*| J[Done]
```

The pipeline runs four validation stages in order. Each stage must pass before the next one begins:

1. **Lint** -- ESLint checks across all packages
2. **Type Check** -- TypeScript compilation verification
3. **Test** -- Unit and integration tests with Vitest
4. **Build** -- Production build of all packages

---

## GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    name: Lint, Test, Build
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_DB: app
          POSTGRES_USER: app
          POSTGRES_PASSWORD: app_dev
        ports:
          - 5433:5432
        options: >-
          --health-cmd "pg_isready -U app -d app"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    env:
      NODE_ENV: test
      DATABASE_URL: postgresql://app:app_dev@localhost:5433/app
      JWT_SECRET: ci-test-secret-key-minimum-32-characters-long
      LOG_LEVEL: silent
      EMAIL_PROVIDER: mock
      S3_ENDPOINT: http://localhost:9000
      S3_ACCESS_KEY: test
      S3_SECRET_KEY: test
      S3_BUCKET: test-bucket
      S3_REGION: us-east-1

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm build

      - name: Run database migrations
        run: pnpm db:migrate

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

---

## Stage Details

### 1. Install

```bash
pnpm install --frozen-lockfile
```

- Uses `--frozen-lockfile` to ensure reproducible builds
- Fails if `pnpm-lock.yaml` is out of sync with `package.json`
- Cached by the `actions/setup-node` step for faster subsequent runs

### 2. Lint

```bash
pnpm lint
```

Runs ESLint across all packages (`apps/api`, `apps/web`, `packages/shared`). The project uses a flat ESLint config (`eslint.config.js`) at the monorepo root.

### 3. Type Check

```bash
pnpm build
```

TypeScript compilation serves as the type check. The `build` script runs `tsc` across all packages via `pnpm run -r build`. This catches:

- Type errors
- Missing imports
- Incorrect function signatures
- Strict null violations

### 4. Test

```bash
pnpm test
```

Runs all test suites in parallel:

- **API tests** (`pnpm test:api`): Unit tests (co-located with source) and integration tests (`test/integration/`)
- **Web tests** (`pnpm test:web`): Component, hook, and store tests

The API Vitest config uses `pool: 'forks'` for isolation between test files.

### 5. Build

```bash
pnpm build
```

Produces production-ready artifacts:

- **API**: Compiled TypeScript to `apps/api/dist/`
- **Web**: Vite production bundle to `apps/web/dist/`
- **Shared**: Compiled package to `packages/shared/dist/`

---

## Environment Configuration for CI

### Required Environment Variables

| Variable        | CI Value                                              | Notes                           |
|-----------------|-------------------------------------------------------|---------------------------------|
| `NODE_ENV`      | `test`                                                | Enables test-mode behaviors     |
| `DATABASE_URL`  | `postgresql://app:app_dev@localhost:5433/app`          | Points to the CI service container |
| `JWT_SECRET`    | Any 32+ character string                              | Not used for real auth in CI    |
| `LOG_LEVEL`     | `silent`                                              | Suppresses log output in tests  |
| `EMAIL_PROVIDER`| `mock`                                                | Uses mock email provider        |

### GitHub Secrets

For deployment stages, configure these as repository secrets:

| Secret              | Purpose                              |
|---------------------|--------------------------------------|
| `DATABASE_URL`      | Production/staging database URL      |
| `JWT_SECRET`        | Production JWT signing key           |
| `S3_ACCESS_KEY`     | Production S3 credentials            |
| `S3_SECRET_KEY`     | Production S3 credentials            |
| `SENTRY_DSN`        | Error tracking (optional)            |
| `DEPLOY_KEY`        | SSH key or cloud credentials         |

---

## Deployment Pipeline Stages

> **Note**: The following stages are templates. Configure them for your specific deployment target (AWS, GCP, Azure, VPS, etc.).

### Staging Deployment (on push to `main`)

```yaml
  deploy-staging:
    name: Deploy to Staging
    needs: ci
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install and build
        run: |
          pnpm install --frozen-lockfile
          pnpm build

      - name: Run migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

      # Add your deployment steps here:
      # - Docker build and push
      # - Cloud provider deployment (AWS ECS, GCP Cloud Run, etc.)
      # - VPS deployment via SSH
```

### Production Deployment (on release tags)

```yaml
  deploy-production:
    name: Deploy to Production
    needs: ci
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # Similar to staging, but with production secrets
      # and additional safeguards (manual approval, etc.)
```

---

## Docker Build

The project includes a `Dockerfile` at the repository root for containerized deployments:

```bash
# Build the Docker image
docker build -t fullstack-app .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  fullstack-app
```

For CI-driven Docker builds, add these steps to your deployment job:

```yaml
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            your-registry/your-app:${{ github.sha }}
            your-registry/your-app:latest
```

---

## Coverage Reports

To add test coverage reporting to CI:

```yaml
      - name: Test with coverage
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: apps/api/coverage/lcov.info,apps/web/coverage/lcov.info
          token: ${{ secrets.CODECOV_TOKEN }}
```

The Vitest configs are set up with v8 coverage provider and output both `text` and `html` reports.

---

## Branch Protection Rules

Configure these branch protection rules on `main`:

1. **Require status checks to pass** before merging
   - Required checks: `ci` (the CI job name)
2. **Require pull request reviews** (at least 1 approval)
3. **Require branches to be up to date** before merging
4. **Do not allow force pushes** to `main`

---

## Troubleshooting CI Failures

### Tests Pass Locally but Fail in CI

- **Database**: CI uses a fresh PostgreSQL container. Ensure migrations are applied before tests.
- **Timing**: CI runners may be slower. Check for test timeouts.
- **Dependencies**: Use `--frozen-lockfile` to match exact versions.
- **Environment**: Verify all required env vars are set in the CI config.

### Build Failures

- **TypeScript errors**: Run `pnpm build` locally first.
- **Missing dependencies**: Ensure `pnpm-lock.yaml` is committed and up to date.
- **Node version mismatch**: The project requires Node.js 20+.

### Flaky Tests

- Look for tests that depend on timing (`setTimeout`, `Date.now()`)
- Check for test isolation issues (shared state between tests)
- Verify `beforeEach` / `afterEach` properly reset mocks with `vi.clearAllMocks()`
