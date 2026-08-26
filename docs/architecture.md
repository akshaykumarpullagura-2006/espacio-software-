# ESPACIO ERP — Architecture Specification

## 1. System Overview

ESPACIO ERP is a production-grade internal Enterprise Resource Planning system tailored specifically for ESPACIO's interior design and interior execution business operations. The application provides an integrated operational control room across CRM, Project Management, Sales, Finance, Procurement, Analytics, and Business Operations.

The system is designed for high availability, security, transactional integrity, local office network access, and off-site data protection.

---

## 2. Technical Stack

| Tier | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15+ (App Router, Server Actions, React 19) | Server-side rendering, fast SPA navigation, unified full-stack architecture |
| **Language** | TypeScript (Strict mode) | End-to-end type safety, reliable refactoring, interface contracts |
| **Styling** | Tailwind CSS + ESPACIO Custom Token System | Rapid enterprise design implementation, Inter font, quiet professional palette |
| **Database Tier** | SQLite via Prisma ORM | Embedded zero-config ACID database for local office server with seamless PG migration path |
| **Authentication** | JWT in HTTP-only, SameSite Cookies + bcryptjs | Secure session handling without client-side token exposure |
| **Authorization** | Server-side RBAC Service & Middleware | Enforces role and permission permissions at API and server-action boundaries |
| **Validation** | Zod Schema Validation | Strict runtime schema enforcement for request payloads and service boundaries |
| **Logging** | Structured JSON Logger | Correlation IDs, context-rich error logging, audit trail emission |
| **Testing** | Vitest | Fast unit and integration testing of foundation modules |

---

## 3. High-Level System Architecture & Layering

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ESPACIO APP SHELL (UI)                          │
│   Dashboard | CRM | Projects | Sales | Finance | Procurement | Settings │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Requests / Server Actions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API & ROUTE HANDLERS                            │
│           Middleware (Auth, RBAC, Rate Limit) | Zod Validation          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Validated Requests
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       MODULAR DOMAIN SERVICES                          │
│   AuthService  |  RbacService  |  AuditService  |  ActivityService     │
│   SearchService|SettingsService|NotificationService|IdGeneratorService │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Atomic Transactions / Queries
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         PRISMA ORM & DATABASE                          │
│                SQLite (ACID DB with WAL Checkpointing)                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Architectural Principles

1. **Modular Boundary Isolation**: Domain logic resides strictly inside domain service classes (`src/modules/*`), keeping React UI components clean and presentational.
2. **Server-Enforced Authorization**: Never trust client-side state. Every API endpoint and server action validates user authentication and permission rights server-side.
3. **Database-First Integrity**: Financial and business-critical operations execute inside database transactions (`prisma.$transaction`) to guarantee zero partial writes.
4. **Auditability & Traceability**: All critical system actions generate an immutable record in `AuditLog` containing actor, timestamp, action type, entity ID, and previous/new state diffs.
5. **Business Reference Number Generator**: System entities receive safe, unique, human-readable reference IDs (`LEAD-YYYY-XXXX`, `PROJ-YYYY-XXXX`, `Q-YYYY-XXX`, `PAY-YYYY-XXXX`) generated with concurrency protection.
