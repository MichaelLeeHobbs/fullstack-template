# C4 Level 1 -- System Context Diagram

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Purpose

The System Context diagram is the highest-level view of the architecture. It shows the Fullstack Template Application as a single system boundary and identifies all human actors and external systems that interact with it.

## Diagram

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#1e3a5f', 'primaryTextColor': '#e0e0e0', 'primaryBorderColor': '#4fc3f7', 'lineColor': '#81d4fa', 'secondaryColor': '#2e4057', 'tertiaryColor': '#1a2332', 'noteTextColor': '#e0e0e0', 'noteBkgColor': '#2e4057', 'noteBorderColor': '#4fc3f7'}}}%%

flowchart TB
    subgraph actors["Actors"]
        direction LR
        user["<b>End User</b><br/><i>Regular authenticated user</i><br/>Manages account, views data,<br/>requests certificates"]
        admin["<b>Administrator</b><br/><i>Admin-privileged user</i><br/>Manages users, roles, settings,<br/>CA operations"]
        service["<b>Service Account</b><br/><i>Programmatic API consumer</i><br/>Authenticates via API keys<br/>for automated workflows"]
    end

    subgraph system["Fullstack Template Application"]
        direction LR
        app["<b>Fullstack Application</b><br/><i>pnpm Monorepo</i><br/><br/>React SPA + Express API<br/>User management, RBAC,<br/>PKI/CA management,<br/>real-time notifications"]
    end

    subgraph external["External Systems"]
        direction LR
        pg[("<b>PostgreSQL 17</b><br/><i>Primary Database</i><br/>21 tables via Drizzle ORM")]
        minio["<b>MinIO / S3</b><br/><i>Object Storage</i><br/>File uploads, CRL distribution"]
        smtp["<b>SMTP Server</b><br/><i>Email Delivery</i><br/>Verification emails,<br/>password resets, notifications"]
        nginx["<b>NGINX</b><br/><i>Reverse Proxy</i><br/>TLS termination, mTLS,<br/>static file serving"]
    end

    user -- "HTTPS requests\n(browser)" --> nginx
    admin -- "HTTPS requests\n(browser)" --> nginx
    service -- "HTTPS API calls\n(X-API-Key header)" --> nginx

    nginx -- "Proxy pass\nHTTP/WebSocket" --> app

    app -- "SQL queries\n(Drizzle ORM)" --> pg
    app -- "S3 API\n(file upload/download)" --> minio
    app -- "SMTP\n(send emails)" --> smtp

    style actors fill:#1a2332,stroke:#4fc3f7,stroke-width:1px,color:#e0e0e0
    style system fill:#1e3a5f,stroke:#4fc3f7,stroke-width:2px,color:#e0e0e0
    style external fill:#1a2332,stroke:#4fc3f7,stroke-width:1px,color:#e0e0e0
    style user fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
    style admin fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
    style service fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
    style app fill:#1e3a5f,stroke:#81d4fa,stroke-width:2px,color:#e0e0e0
    style pg fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
    style minio fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
    style smtp fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
    style nginx fill:#2e4057,stroke:#4fc3f7,color:#e0e0e0
```

## Actors

| Actor | Description | Authentication |
|-------|-------------|----------------|
| **End User** | A regular authenticated user who manages their account, views dashboards, and interacts with PKI features such as requesting certificates. | JWT Bearer token (email/password or certificate-based login) |
| **Administrator** | A user with the `isAdmin` flag or assigned admin roles. Has access to user management, role/permission administration, system settings, and CA management. | JWT Bearer token with admin privileges |
| **Service Account** | A non-human account (`accountType: 'service'`) that authenticates via API keys for programmatic access to the system. | API key via `X-API-Key` header |

## External Systems

| System | Technology | Purpose | Connection |
|--------|-----------|---------|------------|
| **PostgreSQL** | PostgreSQL 17 (Docker) | Primary relational database storing all application data across 21+ tables. Accessed via Drizzle ORM. | `postgresql://app:app_dev@localhost:5432/app` |
| **MinIO / S3** | MinIO (Docker), S3-compatible | Object storage for file uploads, exported CRLs, and other binary data. | `http://localhost:9000` (API), `http://localhost:9001` (Console) |
| **SMTP Server** | Configurable (SES, SMTP, Mock) | Delivers transactional emails: account verification, password resets, security notifications. Provider is factory-selectable. | Configurable via environment variables |
| **NGINX** | NGINX reverse proxy | Production entry point. Handles TLS termination, mutual TLS (mTLS) for certificate authentication, static file serving, and request proxying to the API. | Port 443 (HTTPS) / Port 80 (HTTP redirect) |

## Communication Protocols

- **Browser to NGINX**: HTTPS (TLS 1.2+), optional mTLS for certificate-based authentication
- **NGINX to API**: HTTP proxy pass (internal network), WebSocket upgrade for Socket.IO
- **API to PostgreSQL**: TCP connection via `pg` driver (connection pooling)
- **API to MinIO**: HTTP S3 API via AWS SDK v3
- **API to SMTP**: SMTP/SMTPS or AWS SES SDK depending on provider configuration
- **Service Account to NGINX**: HTTPS with `X-API-Key` header authentication

## Notes

- In development, NGINX is optional. The Vite dev server proxies API requests directly to Express on port 3000.
- Docker Compose manages PostgreSQL and MinIO for local development. NGINX is only configured for production-like deployments.
- The SMTP provider is pluggable: `mock` for development (logs to console), `smtp` for standard SMTP servers, `ses` for AWS SES.
