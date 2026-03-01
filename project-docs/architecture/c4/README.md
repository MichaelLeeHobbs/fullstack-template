# C4 Architecture Diagrams

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Overview

This directory contains [C4 model](https://c4model.com/) architecture diagrams for the Fullstack Template project. The C4 model provides a hierarchical set of abstractions for describing software architecture at different levels of detail, from the highest-level system context down to individual code structures.

Each level zooms in further, revealing more detail about how the system is structured internally.

## Diagram Levels

### Level 1 -- System Context

**File:** [context.md](./context.md)

The highest-level view showing the system as a single box, surrounded by its users and the external systems it interacts with. This answers: *"What is the system, who uses it, and what does it depend on?"*

- Human actors (end users, administrators)
- The Fullstack Application as a single system boundary
- External dependencies (PostgreSQL, S3/MinIO, SMTP, NGINX)

### Level 2 -- Container

**File:** [containers.md](./containers.md)

Zooms into the system boundary to show the high-level technology choices and how responsibilities are divided among runtime containers. This answers: *"What are the major deployable/runnable units?"*

- React SPA (browser)
- Express API (Node.js server)
- Background Job Worker (pg-boss)
- Socket.IO real-time server (embedded in API)
- PostgreSQL database
- MinIO/S3 object storage
- NGINX reverse proxy

### Level 3 -- Component (API)

**File:** [components-api.md](./components-api.md)

Zooms into the Express API container to show its internal component architecture. This answers: *"How is the backend organized internally?"*

- Routes, Middleware, Controllers, Services
- Data access layer (Drizzle ORM)
- External providers (S3, SMTP)
- Background jobs (pg-boss workers)

### Level 3 -- Component (Web)

**File:** [components-web.md](./components-web.md)

Zooms into the React SPA container to show its internal component architecture. This answers: *"How is the frontend organized internally?"*

- Pages, shared UI components, layout
- Hooks (data fetching, auth, sockets)
- State stores (Zustand)
- API client layer
- Routing (React Router)

## Related Documentation

| Document | Description |
|----------|-------------|
| [Data Model ERD](../design/data-model.md) | Complete entity-relationship diagram for all 21+ database tables |
| [API Design Guidelines](../design/api-design-guidelines.md) | REST conventions, response formats, pagination, and authentication |
| [Core Patterns](../../../template-docs/architecture/CORE_PATTERNS.md) | Full architecture patterns and coding conventions |
| [Coding Standard](../../../template-docs/architecture/CODING_STANDARD.md) | TypeScript conventions and style guide |

## Mermaid Rendering

All diagrams use Mermaid syntax with the dark theme. They render natively in:

- **GitHub** -- Mermaid blocks in `.md` files render automatically
- **VS Code** -- Install the [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension
- **WebStorm / IntelliJ** -- Built-in Mermaid support in the Markdown preview
- **Mermaid Live Editor** -- Paste diagram code at [mermaid.live](https://mermaid.live)

## Conventions

- All diagrams use the same dark theme configuration for visual consistency
- Arrows indicate the direction of dependency (caller points to callee)
- Dashed arrows represent asynchronous or event-driven communication
- Color coding is consistent across diagrams: blue for internal components, darker shades for infrastructure
