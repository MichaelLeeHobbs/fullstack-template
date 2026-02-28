# ADR-013: pg-boss for Background Jobs

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | jobs, background, postgresql, queue |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

The application requires background job processing for tasks that should not block HTTP request handling: sending emails (verification, password reset), cleaning up expired sessions and tokens, monitoring certificate expiration dates, and delivering notifications. The job system must support delayed execution, scheduled recurring jobs (cron), reliable delivery (at-least-once), and concurrency control. Since the template already depends on PostgreSQL for all data storage, adding a separate infrastructure dependency (Redis) for job queuing increases operational complexity for self-hosted deployments.

## Decision

Use pg-boss as the background job queue, leveraging PostgreSQL as both the data store and the job broker:

**Infrastructure**: pg-boss creates its own schema (`pgboss`) in the existing PostgreSQL database. No additional infrastructure services are required. The job tables use PostgreSQL's `SKIP LOCKED` for safe concurrent polling across multiple worker instances.

**Job registration** (`src/jobs/index.ts`):
- All job handlers are registered at application startup via `registerAllHandlers(boss)`
- A type-safe `enqueue<K>()` function maps job names to typed payloads via a `JobMap` interface
- When pg-boss is unavailable (test environment), `enqueue()` falls back to direct synchronous execution

**Current job queues**:
- `email:verification` -- Sends email verification links after registration
- `email:password-reset` -- Sends password reset tokens
- `notification:send` -- Persists and delivers real-time notifications
- `cleanup` -- Scheduled recurring job that purges expired sessions, tokens, and old audit logs
- `cert-expiration` -- Scheduled recurring job that checks certificate expiration dates and creates alerts

**Configuration**:
- Jobs are retried on failure with exponential backoff (configurable per queue)
- The cleanup and cert-expiration jobs run on cron schedules
- pg-boss maintenance (archive, purge) runs automatically based on configured retention

## Consequences

### Positive

- No Redis or additional infrastructure -- pg-boss uses the existing PostgreSQL database, simplifying deployment
- ACID transactions mean job enqueue can be part of the same database transaction as the business operation (e.g., create user + enqueue verification email atomically)
- `SKIP LOCKED` provides safe, efficient concurrent job processing across multiple application instances
- Type-safe `enqueue()` catches payload errors at compile time via the `JobMap` interface
- Built-in scheduling (cron), retry with backoff, and dead-letter queuing
- Test environment fallback (direct execution) avoids needing pg-boss running for unit tests

### Negative

- PostgreSQL is not optimized for high-throughput queuing -- job-heavy workloads may impact database performance
- pg-boss polling adds latency compared to Redis pub/sub (configurable polling interval, default 2 seconds)
- Job state lives in the same database as application data -- a database outage stops both the app and job processing
- pg-boss's schema migration on startup can cause issues with strict database migration policies
- Limited ecosystem compared to BullMQ (fewer monitoring UIs, community plugins)

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| BullMQ | Fast, mature, excellent dashboard (Bull Board), Redis pub/sub | Requires Redis infrastructure, separate dependency to manage and monitor | Rejected |
| Agenda (MongoDB-based) | Simple API, MongoDB-native | Requires MongoDB (this project uses PostgreSQL), less active maintenance | Rejected |
| Node.js setTimeout/setInterval | No dependency, simple | Not persistent (lost on restart), no concurrency control, no retry, no multi-instance | Rejected |
| AWS SQS / Cloud queues | Managed, scalable, reliable | Cloud vendor lock-in, not self-hostable, external dependency, cost | Rejected |
| **pg-boss** | PostgreSQL-native, no Redis, ACID transactions, SKIP LOCKED, built-in cron, type-safe enqueue | Polling latency, shared DB load, smaller ecosystem | **Selected** |
