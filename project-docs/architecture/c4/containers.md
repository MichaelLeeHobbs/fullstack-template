# C4 Level 2 -- Container Diagram

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Purpose

The Container diagram zooms into the Fullstack Template system boundary to show the major deployable and runnable units. Each container is a separately running process or deployable artifact. This level reveals the high-level technology choices and how they communicate.

## Diagram

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#1e3a5f', 'primaryTextColor': '#e0e0e0', 'primaryBorderColor': '#4fc3f7', 'lineColor': '#81d4fa', 'secondaryColor': '#2e4057', 'tertiaryColor': '#1a2332', 'noteTextColor': '#e0e0e0', 'noteBkgColor': '#2e4057', 'noteBorderColor': '#4fc3f7'}}}%%

flowchart TB
    user["<b>End User / Admin</b><br/><i>Browser or API Client</i>"]
    serviceAcct["<b>Service Account</b><br/><i>Programmatic API consumer</i>"]

    subgraph nginx_layer["Reverse Proxy"]
        nginx["<b>NGINX</b><br/><i>Reverse Proxy</i><br/>TLS termination, mTLS,<br/>static file serving,<br/>rate limiting"]
    end

    subgraph app_boundary["Fullstack Template Application"]
        direction TB

        subgraph frontend["Browser Runtime"]
            spa["<b>React SPA</b><br/><i>Vite + React 18 + MUI 6</i><br/><br/>Single-page application<br/>TanStack Query for data fetching<br/>Zustand for state management<br/>Socket.IO client for real-time"]
        end

        subgraph backend["Node.js Runtime"]
            api["<b>Express API Server</b><br/><i>Node.js 20+ / TypeScript</i><br/><br/>REST API (port 3000)<br/>JWT + API key authentication<br/>RBAC permission system<br/>4-layer architecture:<br/>Router → Controller → Service → Model"]

            socketio["<b>Socket.IO Server</b><br/><i>Embedded in Express</i><br/><br/>Real-time event broadcasting<br/>Notification delivery<br/>Session-aware connections"]

            jobs["<b>Background Job Worker</b><br/><i>pg-boss</i><br/><br/>Email delivery queue<br/>Session/token cleanup<br/>Notification processing<br/>Certificate expiration checks"]
        end

        subgraph shared_pkg["Shared Package"]
            shared["<b>@fullstack-template/shared</b><br/><i>TypeScript</i><br/><br/>Shared types, interfaces,<br/>and utility functions"]
        end
    end

    subgraph data_layer["Data & Infrastructure"]
        direction LR
        pg[("<b>PostgreSQL 17</b><br/><i>Primary Database</i><br/>21 tables, Drizzle ORM")]
        minio["<b>MinIO / S3</b><br/><i>Object Storage</i><br/>File uploads, CRL export"]
        smtp["<b>SMTP / SES</b><br/><i>Email Provider</i><br/>Transactional email delivery"]
    end

    user -- "HTTPS" --> nginx
    serviceAcct -- "HTTPS + API Key" --> nginx

    nginx -- "Proxy: /api/*" --> api
    nginx -- "Proxy: /socket.io/*" --> socketio
    nginx -- "Serve static" --> spa

    spa -- "HTTP REST\n/api/v1/*" --> api
    spa -- "WebSocket\n/socket.io/" --> socketio
    spa -. "imports types" .-> shared

    api -- "SQL\n(Drizzle ORM)" --> pg
    api -- "S3 API\n(AWS SDK v3)" --> minio
    api -- "Enqueues jobs" --> jobs
    api -. "imports types" .-> shared

    socketio -- "Auth check" --> api

    jobs -- "SQL\n(Drizzle ORM)" --> pg
    jobs -- "SMTP / SES SDK" --> smtp
    jobs -- "Emits events" --> socketio

    style nginx_layer fill:#1a2332,stroke:#4fc3f7,stroke-width:1px,color:#e0e0e0
    style app_boundary fill:#1a2332,stroke:#4fc3f7,stroke-width:2px,color:#e0e0e0
    style frontend fill:#1e3a5f,stroke:#4fc3f7,stroke-width:1px,color:#e0e0e0
    style backend fill:#1e3a5f,stroke:#4fc3f7,stroke-width:1px,color:#e0e0e0
    style shared_pkg fill:#2e4057,stroke:#4fc3f7,stroke-width:1px,color:#e0e0e0
    style data_layer fill:#1a2332,stroke:#4fc3f7,stroke-width:1px,color:#e0e0e0

    style user fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
    style serviceAcct fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
    style nginx fill:#2e4057,stroke:#81d4fa,color:#e0e0e0
    style spa fill:#1e3a5f,stroke:#81d4fa,stroke-width:2px,color:#e0e0e0
    style api fill:#1e3a5f,stroke:#81d4fa,stroke-width:2px,color:#e0e0e0
    style socketio fill:#1e3a5f,stroke:#81d4fa,color:#e0e0e0
    style jobs fill:#1e3a5f,stroke:#81d4fa,color:#e0e0e0
    style shared fill:#2e4057,stroke:#81d4fa,color:#e0e0e0
    style pg fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
    style minio fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
    style smtp fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
```

## Container Inventory

### Application Containers

| Container | Technology | Source | Description |
|-----------|-----------|--------|-------------|
| **React SPA** | React 18, Vite, MUI 6, TanStack Query, Zustand | `apps/web/` | Single-page application served as static files. Handles all UI rendering, client-side routing, state management, and API communication. |
| **Express API Server** | Express 4.x, TypeScript, Node.js 20+ | `apps/api/` | REST API server implementing a 4-layer architecture (Router, Controller, Service, Model). Handles authentication, authorization, business logic, and data persistence. |
| **Socket.IO Server** | Socket.IO (embedded in Express) | `apps/api/src/socket/` | Real-time WebSocket server sharing the same HTTP server as Express. Broadcasts notifications, session events, and other real-time updates to connected clients. |
| **Background Job Worker** | pg-boss | `apps/api/src/jobs/` | Asynchronous job processing backed by PostgreSQL (via pg-boss). Handles email delivery, session/token cleanup, notification dispatch, and certificate expiration monitoring. |
| **Shared Package** | TypeScript | `packages/shared/` | Shared types, interfaces, and utility functions consumed by both the API and Web packages. Published as `@fullstack-template/shared` within the monorepo. |

### Infrastructure Containers

| Container | Technology | Purpose | Ports |
|-----------|-----------|---------|-------|
| **NGINX** | NGINX | Reverse proxy, TLS/mTLS termination, static file serving, request routing | 80, 443 |
| **PostgreSQL** | PostgreSQL 17 (Docker) | Primary relational database for all application data | 5432 |
| **MinIO** | MinIO (Docker), S3-compatible | Object storage for file uploads and CRL distribution | 9000 (API), 9001 (Console) |
| **SMTP / SES** | Configurable provider | Transactional email delivery (pluggable: mock, smtp, ses) | 587 (SMTP) or AWS API |

## Communication Paths

### Synchronous (Request-Response)

| From | To | Protocol | Description |
|------|----|----------|-------------|
| Browser | NGINX | HTTPS | All user-initiated requests |
| NGINX | Express API | HTTP | Proxied API requests (`/api/*`) |
| NGINX | React SPA | HTTP | Static file serving (HTML, JS, CSS) |
| React SPA | Express API | HTTP REST | API calls via `apiFetch()` with JWT Bearer tokens |
| Express API | PostgreSQL | TCP (SQL) | Data queries and mutations via Drizzle ORM |
| Express API | MinIO | HTTP (S3) | File upload/download via AWS SDK v3 |

### Asynchronous (Event-Driven)

| From | To | Protocol | Description |
|------|----|----------|-------------|
| React SPA | Socket.IO Server | WebSocket | Real-time bidirectional events |
| Express API | pg-boss Worker | PostgreSQL Queue | Job enqueue (email, cleanup, notifications) |
| pg-boss Worker | Socket.IO Server | In-process | Emit events after job completion |
| pg-boss Worker | SMTP/SES | SMTP/HTTP | Deliver transactional emails |

## Development vs Production

| Concern | Development | Production |
|---------|------------|------------|
| **SPA Serving** | Vite dev server (port 5173) with HMR | NGINX serves built static files |
| **API Proxy** | Vite proxies `/api` to Express (port 3000) | NGINX proxies `/api` to Express |
| **TLS** | None (HTTP only) | NGINX handles TLS + optional mTLS |
| **Email** | Mock provider (logs to console) | SMTP server or AWS SES |
| **Database** | Docker Compose PostgreSQL | Managed PostgreSQL or Docker |
| **Object Storage** | Docker Compose MinIO | AWS S3 or MinIO cluster |
