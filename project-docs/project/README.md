# Project Management

> **[Template]** This covers the base template feature. Extend or modify for your project.

> Roadmap, service level objectives, and project planning documentation.

---

## Overview

This section contains project management artifacts that guide the development trajectory and operational commitments. Use these documents to understand where the project is headed and what service levels are targeted.

---

## Sections

### Roadmap

> [`roadmap.md`](./roadmap.md)

Project development roadmap:
- Current milestone and progress
- Upcoming milestones with target dates
- Feature prioritization
- Technical debt items
- Long-term vision

---

### SLA / SLO

> [`sla-slo.md`](./sla-slo.md)

Service Level Agreements and Objectives:
- Availability targets (e.g., 99.9% uptime)
- Response time objectives (p50, p95, p99)
- Error rate budgets
- Recovery time objectives (RTO)
- Recovery point objectives (RPO)
- Measurement and reporting methodology

---

## Project Timeline

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#1e3a5f', 'primaryTextColor': '#e0e0e0', 'primaryBorderColor': '#4fc3f7', 'lineColor': '#81d4fa', 'secondaryColor': '#2e4057', 'tertiaryColor': '#1a2332', 'noteTextColor': '#e0e0e0', 'noteBkgColor': '#2e4057', 'noteBorderColor': '#4fc3f7'}}}%%
gantt
    title Project Roadmap Overview
    dateFormat  YYYY-MM-DD
    section Foundation
        Template Core           :done, 2025-01-01, 2026-02-01
        Authentication & RBAC   :done, 2025-06-01, 2026-02-01
        PKI / CA Management     :done, 2026-01-15, 2026-02-28
    section Growth
        Advanced Features       :active, 2026-03-01, 2026-06-01
        Performance Optimization:        2026-04-01, 2026-07-01
    section Maturity
        Production Hardening    :        2026-06-01, 2026-09-01
        Scale & Observability   :        2026-08-01, 2026-12-01
```

---

## Related Documentation

- [Feature Tracker](../product/feature-tracker.md) - Current feature status
- [Changelog](../product/changelog.md) - Release history
- [Operations](../operations/README.md) - Deployment and infrastructure
- [Security](../security/README.md) - Security posture and policies
