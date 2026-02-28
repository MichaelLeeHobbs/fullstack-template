# Operations Documentation

> **[Template]** This covers the base template feature. Extend or modify for your project.

> Deployment, infrastructure, monitoring, and incident response documentation.

---

## Overview

This section covers everything needed to deploy, run, and maintain the application in production. It includes deployment procedures, environment configuration, monitoring setup, incident response, and database operations.

---

## Sections

### Deployment

> [`deployment.md`](./deployment.md)

Complete deployment guide:
- Build process (multi-stage Docker)
- Container registry setup
- Deployment targets (Docker Compose, Kubernetes, cloud platforms)
- Zero-downtime deployment strategies
- Rollback procedures
- Environment-specific configurations

---

### Production Checklist

> [`production-checklist.md`](./production-checklist.md)

Pre-launch verification checklist:
- Security hardening
- Environment variables configured
- Database migrations applied
- SSL/TLS certificates
- Logging and monitoring active
- Backup procedures verified
- Rate limiting configured
- CORS and CSP headers set

---

### Environment Configuration

> [`environment-config.md`](./environment-config.md)

Environment variable reference and configuration:
- Required vs. optional variables
- Per-environment defaults (development, staging, production)
- Secret management best practices
- Zod validation schema for env vars
- Docker and container configuration

See also: [Configuration](../../docs/architecture/CONFIG.md) (template-level reference)

---

### Monitoring

> [`monitoring.md`](./monitoring.md)

Monitoring and observability setup:
- Health check endpoints (`/api/health`)
- Structured logging (Pino) and log aggregation
- Application metrics
- Alerting rules and thresholds
- Dashboard setup
- Request ID tracking for distributed tracing

---

### Incident Response

> [`incidents.md`](./incidents.md)

Incident response procedures:
- Severity levels and escalation paths
- On-call rotation
- Incident response playbooks
- Post-mortem template
- Communication procedures
- Recovery procedures

---

### Database Operations

> [`database/`](./database/)

Database administration and operations:

| Document | Description |
|----------|-------------|
| `migrations.md` | Migration strategy and execution |
| `backups.md` | Backup and restore procedures |
| `performance.md` | Query optimization and indexing |
| `maintenance.md` | Routine maintenance tasks |

**Key database commands:**
```bash
pnpm db:generate      # Generate migration after schema change
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio GUI
pnpm db:seed          # Seed database with test data
```

**Connection:** `postgresql://app:app_dev@localhost:5432/app` (development)

---

## Infrastructure Diagram

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#1e3a5f', 'primaryTextColor': '#e0e0e0', 'primaryBorderColor': '#4fc3f7', 'lineColor': '#81d4fa', 'secondaryColor': '#2e4057', 'tertiaryColor': '#1a2332', 'noteTextColor': '#e0e0e0', 'noteBkgColor': '#2e4057', 'noteBorderColor': '#4fc3f7'}}}%%
graph TB
    subgraph "Load Balancer"
        LB[Reverse Proxy / CDN]
    end

    subgraph "Application Tier"
        API1[API Server 1]
        API2[API Server N]
    end

    subgraph "Static Assets"
        CDN[Static Files / CDN<br/>React SPA]
    end

    subgraph "Data Tier"
        DB[(PostgreSQL)]
        S3[Object Storage<br/>S3 / MinIO]
    end

    subgraph "External Services"
        EMAIL[Email Service]
        MON[Monitoring]
    end

    LB --> CDN
    LB --> API1
    LB --> API2
    API1 --> DB
    API2 --> DB
    API1 --> S3
    API2 --> S3
    API1 --> EMAIL
    API1 -.-> MON
    API2 -.-> MON
```

---

## Related Documentation

- [Configuration Reference](../../docs/architecture/CONFIG.md) - Environment variables
- [Dev Environment](../../docs/architecture/DEV_ENVIRONMENT.md) - Local development setup
- [Security Documentation](../security/README.md) - Security policies and hardening
- [SLA/SLO](../project/sla-slo.md) - Service level objectives
