# Dependency Documentation

Complete reference of every dependency across all workspaces, with explanations of what each package does and why it's included.

---

## Root (`package.json`)

Root-level tooling shared across the entire monorepo.

### devDependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@eslint/js` | 9.17.0 | ESLint core JavaScript rules for the flat config format |
| `@typescript-eslint/eslint-plugin` | 8.18.2 | TypeScript-specific lint rules (no-unused-vars, type-checking, etc.) |
| `@typescript-eslint/parser` | 8.18.2 | Parses TypeScript files so ESLint can analyze them |
| `eslint` | 9.17.0 | JavaScript/TypeScript linter — enforces code quality and consistency |
| `eslint-plugin-jsx-a11y` | ^6.10.2 | Accessibility lint rules for JSX (ARIA roles, alt text, focus management) |
| `eslint-plugin-react-hooks` | ^7.0.1 | Enforces React Hooks rules (dependency arrays, call order) |
| `prettier` | 3.4.2 | Opinionated code formatter — handles all formatting so ESLint focuses on logic |
| `typescript` | 5.7.2 | TypeScript compiler — provides static type checking across all packages |
| `typescript-eslint` | 8.18.2 | Monorepo package that coordinates the TS-ESLint parser and plugin versions |

---

## API (`apps/api/package.json`)

Express backend with Drizzle ORM, PostgreSQL, and background job processing.

### dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@aws-sdk/client-s3` | 3.962.0 | S3-compatible object storage client — used with MinIO for file uploads |
| `@aws-sdk/client-ses` | 3.971.0 | AWS Simple Email Service client — sends transactional emails in production |
| `@aws-sdk/s3-request-presigner` | 3.962.0 | Generates pre-signed S3 URLs for secure direct browser uploads/downloads |
| `@fullstack-template/shared` | workspace:* | Shared types, constants, and Zod validation schemas used by both API and web |
| `@sentry/node` | ^10.38.0 | Error tracking and performance monitoring for the Node.js backend |
| `argon2` | ^0.44.0 | Password hashing algorithm (Argon2id) — more resistant to GPU attacks than bcrypt |
| `bcrypt` | 5.1.1 | Legacy password hashing — used for verifying existing bcrypt-hashed passwords |
| `compression` | 1.8.1 | Gzip/deflate response compression middleware for Express |
| `cookie-parser` | 1.4.7 | Parses Cookie headers into `req.cookies` — used for refresh token cookies |
| `cors` | 2.8.5 | Cross-Origin Resource Sharing middleware — allows the web frontend to call the API |
| `dotenv` | 16.4.7 | Loads `.env` files into `process.env` for local development configuration |
| `drizzle-orm` | 0.38.2 | Type-safe SQL ORM — schema definitions, query builder, and migrations |
| `express` | 4.21.2 | HTTP server framework — handles routing, middleware, and request/response lifecycle |
| `express-rate-limit` | 8.2.1 | Rate limiting middleware — protects against brute-force and DoS attacks |
| `helmet` | 8.0.0 | Sets security-related HTTP headers (CSP, HSTS, X-Frame-Options, etc.) |
| `jsonwebtoken` | 9.0.2 | Signs and verifies JWTs for authentication (access + refresh tokens) |
| `node-forge` | ^1.3.3 | PKI toolkit — generates X.509 certificates and handles crypto operations |
| `nodemailer` | 7.0.12 | Sends emails via SMTP — used in development with a local mail server |
| `otpauth` | 9.5.0 | TOTP/HOTP implementation for two-factor authentication |
| `pg` | 8.13.1 | PostgreSQL client driver — underlying connection layer used by Drizzle |
| `pg-boss` | 12.9.0 | PostgreSQL-backed job queue — handles background tasks (emails, cleanup) |
| `pino` | 10.2.1 | High-performance structured JSON logger (replaces console.log) |
| `pino-http` | 11.0.0 | Express middleware that logs every HTTP request/response via Pino |
| `qrcode` | 1.5.4 | Generates QR code images — used for TOTP 2FA setup |
| `socket.io` | 4.8.3 | WebSocket server — provides real-time events (notifications, live updates) |
| `stderr-lib` | 2.1.0 | Result pattern utilities (`tryCatch`, `Result<T>`) — used for error handling in all services |
| `swagger-jsdoc` | 6.2.8 | Generates OpenAPI spec from JSDoc annotations in route files |
| `swagger-ui-express` | 5.0.1 | Serves interactive Swagger UI at `/api-docs` for API exploration |
| `zod` | 4.3.4 | Runtime schema validation — validates all request bodies and query params |

### devDependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/bcrypt` | 5.0.2 | TypeScript type definitions for bcrypt |
| `@types/compression` | 1.8.1 | TypeScript type definitions for compression middleware |
| `@types/cookie-parser` | 1.4.10 | TypeScript type definitions for cookie-parser |
| `@types/cors` | 2.8.17 | TypeScript type definitions for cors |
| `@types/express` | 5.0.0 | TypeScript type definitions for Express |
| `@types/jsonwebtoken` | 9.0.7 | TypeScript type definitions for jsonwebtoken |
| `@types/node` | 22.10.2 | TypeScript type definitions for Node.js built-in modules |
| `@types/node-forge` | ^1.3.14 | TypeScript type definitions for node-forge |
| `@types/nodemailer` | 7.0.5 | TypeScript type definitions for nodemailer |
| `@types/pg` | 8.11.10 | TypeScript type definitions for the pg driver |
| `@types/qrcode` | 1.5.6 | TypeScript type definitions for qrcode |
| `@types/supertest` | 6.0.3 | TypeScript type definitions for supertest |
| `@types/swagger-jsdoc` | 6.0.4 | TypeScript type definitions for swagger-jsdoc |
| `@types/swagger-ui-express` | 4.1.8 | TypeScript type definitions for swagger-ui-express |
| `@vitest/coverage-v8` | 2.1.8 | V8-based code coverage provider for Vitest |
| `drizzle-kit` | 0.30.1 | Drizzle CLI — generates SQL migrations from schema changes, runs Drizzle Studio |
| `pino-pretty` | 13.1.3 | Pretty-prints Pino JSON logs in development for readability |
| `rimraf` | 6.0.1 | Cross-platform `rm -rf` — used in the `clean` script to remove `dist/` |
| `supertest` | 7.2.2 | HTTP assertion library — makes requests against Express in integration tests |
| `tsc-alias` | 1.8.16 | Resolves TypeScript path aliases in compiled output |
| `tsx` | 4.19.2 | TypeScript execution engine — runs `.ts` files directly in dev (`tsx watch`) |
| `typescript` | 5.7.2 | TypeScript compiler (workspace-local copy for build scripts) |
| `vitest` | 2.1.8 | Test framework — runs unit and integration tests with native ESM support |

---

## Web (`apps/web/package.json`)

React SPA with Material UI, TanStack Query for data fetching, and Zustand for state.

### dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@emotion/react` | 11.14.0 | CSS-in-JS runtime — required by Material UI for styling |
| `@emotion/styled` | 11.14.0 | Styled component API for Emotion — required by Material UI |
| `@fullstack-template/shared` | workspace:* | Shared types, constants, and Zod validation schemas |
| `@hookform/resolvers` | 5.2.2 | Connects Zod schemas to React Hook Form for form validation |
| `@mui/icons-material` | 6.3.0 | Material Design icon components (500+ icons) |
| `@mui/material` | 6.3.0 | Material UI component library — buttons, dialogs, tables, etc. |
| `@sentry/react` | ^10.38.0 | Error tracking and performance monitoring for the React frontend |
| `@tanstack/react-query` | 5.62.8 | Server state management — handles data fetching, caching, and synchronization |
| `notistack` | 3.0.2 | Snackbar/toast notification system built on Material UI |
| `react` | 18.3.1 | UI rendering library |
| `react-dom` | 18.3.1 | React DOM renderer for browser environments |
| `react-hook-form` | 7.71.1 | Performant form library — manages form state without re-rendering entire forms |
| `react-router` | 6.28.0 | Client-side routing core |
| `react-router-dom` | 6.28.0 | React Router DOM bindings — `<BrowserRouter>`, `<Link>`, `useNavigate`, etc. |
| `socket.io-client` | 4.8.3 | WebSocket client — connects to the API's Socket.IO server for real-time events |
| `stderr-lib` | 2.1.0 | Result pattern utilities — used for error handling in API client layer |
| `zod` | 4.3.4 | Runtime schema validation — validates API responses and form inputs |
| `zustand` | 5.0.2 | Lightweight state management — stores auth state, theme preferences, etc. |

### devDependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@testing-library/jest-dom` | 6.6.3 | Custom DOM matchers for tests (toBeInTheDocument, toHaveTextContent) |
| `@testing-library/react` | 16.1.0 | React component testing utilities — renders components and queries the DOM |
| `@testing-library/user-event` | 14.5.2 | Simulates realistic user interactions (click, type, tab) in tests |
| `@types/react` | 18.3.14 | TypeScript type definitions for React |
| `@types/react-dom` | 18.3.2 | TypeScript type definitions for React DOM |
| `@vitejs/plugin-react` | 4.3.4 | Vite plugin for React — enables fast refresh and JSX transform |
| `@vitest/coverage-v8` | 2.1.8 | V8-based code coverage provider for Vitest |
| `jsdom` | 25.0.1 | Browser DOM implementation for Node.js — test environment for component tests |
| `rimraf` | 6.0.1 | Cross-platform `rm -rf` — used in the `clean` script |
| `typescript` | 5.7.2 | TypeScript compiler (workspace-local copy) |
| `vite` | 6.0.5 | Build tool and dev server — fast HMR, optimized production bundles |
| `vitest` | 2.1.8 | Test framework — runs component and unit tests |

---

## Shared (`packages/shared/package.json`)

Shared types, constants, and Zod schemas consumed by both API and web.

### dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | ^4.3.4 | Runtime schema validation — shared schemas validate on both frontend and backend |

### devDependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `rimraf` | 6.0.1 | Cross-platform `rm -rf` — used in the `clean` script |
| `typescript` | 5.7.2 | TypeScript compiler — builds the shared package to `dist/` |

---

## E2E (`apps/e2e/package.json`)

End-to-end tests that run against the full stack (API + web + database).

### devDependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@playwright/test` | ^1.50.0 | Browser automation framework — drives Chromium to test complete user flows |

---

## pnpm Overrides

Overrides force specific dependency versions across the entire dependency tree to patch security vulnerabilities or fix compatibility issues. These are defined in the root `package.json` under `pnpm.overrides`.

| Override | Target | Reason |
|----------|--------|--------|
| `vitest@>=2.0.0 <2.1.9` | `>=2.1.9 <3.0.0` | Security fix for Vitest versions before 2.1.9 |
| `vite@>=6.0.0 <=6.4.0` | `>=6.4.1 <7.0.0` | Security fix for Vite server vulnerability |
| `@eslint/plugin-kit@<0.3.4` | `>=0.3.4` | Security fix for ESLint plugin-kit |
| `qs@<=6.14.1` | `>=6.14.2` | [GHSA-w7fw-mjwx-w883](https://github.com/advisories/GHSA-w7fw-mjwx-w883) — prototype pollution in querystring parser (low severity, via express) |
| `@remix-run/router@<=1.23.1` | `>=1.23.2` | Security fix for React Router's internal router package |
| `react-router@>=6.0.0 <6.30.2` | `6.30.2` | [GHSA-9jcx-v3wj-wh4m](https://github.com/advisories/GHSA-9jcx-v3wj-wh4m) — unexpected external redirect via untrusted paths (moderate severity) |
| `tar@<7.5.8` | `>=7.5.8` | [GHSA-83g3-92jg-28cx](https://github.com/advisories/GHSA-83g3-92jg-28cx) — path traversal in tar extraction (high severity, via bcrypt > node-pre-gyp) |
| `lodash@>=4.0.0 <=4.17.22` | `>=4.17.23` | Prototype pollution fix in lodash |
| `fast-xml-parser@<5.3.8` | `>=5.3.8` | [GHSA-fj3w-jwp8-x2g3](https://github.com/advisories/GHSA-fj3w-jwp8-x2g3) — entity expansion DoS in XML parser (low severity, via AWS SDK) |
| `@isaacs/brace-expansion@<=5.0.0` | `>=5.0.1` | ReDoS fix in brace expansion (used by minimatch/glob) |
| `minimatch@<3.1.4` | `>=3.1.4` | [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26) + [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74) — ReDoS in minimatch v3 (high severity, via eslint internals) |
| `minimatch@>=9.0.0 <9.0.6` | `>=9.0.6` | [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26) + [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj) — ReDoS in minimatch v9 (high severity, via typescript-estree) |
| `minimatch@>=10.0.0 <10.2.3` | `>=10.2.3` | [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj) — ReDoS in minimatch v10 (high severity, via rimraf > glob) |
| `ajv@>=6.0.0 <6.14.0` | `>=6.14.0 <7.0.0` | [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) — prototype pollution in JSON schema validator (moderate severity, via eslint). Constrained to v6 range because eslint requires the v6 API |
| `rollup@>=4.0.0 <4.59.0` | `>=4.59.0` | [GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) — arbitrary file write via path traversal (high severity, via vitest > vite) |
| `esbuild@<=0.24.2` | `>=0.25.0` | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — dev server allows cross-origin requests to read responses (moderate severity, via drizzle-kit) |

### Note on GHSA-p5wg-g6qr-c7cg (eslint)

This advisory was **withdrawn** by GitHub — the advisory page shows "WITHDRAWN" status. It does not appear in `pnpm audit` output and no override is needed.
