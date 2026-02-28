# ADR-006: Pino Structured Logging

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | logging, observability, backend |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The backend needs a logging solution that supports structured JSON output for log aggregation services (ELK, Datadog, CloudWatch), request-level correlation, and high throughput without becoming a performance bottleneck. Console.log is insufficient for production -- it lacks log levels, structured fields, and is synchronous on some runtimes. The logger must integrate with Express middleware for automatic HTTP request/response logging and provide a consistent API across all service, controller, and job code.

## Decision

Use Pino as the application logger with the following configuration:

- **Singleton logger** exported from `src/lib/logger.ts` -- all application code imports this single instance
- **pino-http middleware** on Express for automatic request/response logging with request IDs, status codes, and response times
- **JSON output** in production for machine parsing; `pino-pretty` in development for human readability
- **Log levels**: `fatal`, `error`, `warn`, `info`, `debug`, `trace` with environment-configurable minimum level
- **Strict argument order**: Pino enforces `logger.info(objectArg, messageArg)` (object first, then message string), which TypeScript types enforce at compile time

All code uses the Pino logger. Direct `console.log`, `console.error`, or `console.warn` calls are prohibited and flagged in code review.

## Consequences

### Positive

- JSON structured logs are immediately compatible with log aggregation and search tools
- Pino is the fastest Node.js logger (benchmarked significantly ahead of Winston and Bunyan) due to asynchronous writing and minimal serialization overhead
- pino-http provides request ID propagation, response timing, and status code logging with zero manual effort
- TypeScript enforces the `(object, message)` argument order, catching misuse at compile time
- Silent log level in tests prevents noisy output while still exercising logging code paths

### Negative

- Pino's argument order `(object, message)` is unintuitive for developers accustomed to `winston.info('message', { data })` -- reversed parameter order causes confusion during onboarding
- JSON logs are unreadable without `pino-pretty` or a log viewer, making raw Docker/container logs hard to scan
- pino-http logs every request including health checks, requiring filter configuration to avoid noise
- Child loggers for request context require explicit creation and threading through service calls

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Winston | Most popular, flexible transports, familiar API | Slower, synchronous by default, heavier | Rejected |
| Bunyan | JSON-native, streams-based | Largely unmaintained, slower than Pino | Rejected |
| console.log + format utility | No dependency | No levels, no structure, synchronous, unprofessional | Rejected |
| **Pino** | Fastest Node.js logger, JSON-native, pino-http integration, TypeScript-strict API | Unfamiliar argument order, unreadable raw JSON | **Selected** |
