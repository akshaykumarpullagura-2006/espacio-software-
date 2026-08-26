# AGENTS.md — ESPACIO ERP Development & Architecture Guidelines

This document defines the strict engineering guidelines, architectural constraints, and standards for developing **ESPACIO ERP**. All agents and engineers working on this repository MUST strictly follow these rules.

---

## 1. Core Engineering Principles

1. **Inspect Before Modifying**: Always read existing code, schemas, and documentation before making changes.
2. **Never Break Existing Functionality**: Verify that existing modules, APIs, and tests continue to work.
3. **No Secrets in Source Code**: Credentials, keys, and tokens MUST strictly come from environment variables via `src/config/env.ts`. Never commit `.env` containing sensitive credentials.
4. **No Fake Production Data**: Never use mock data in production execution paths or quiet fallbacks that obscure missing data.
5. **No Frontend-Only Security**: All security, validation, authorization, and business rules MUST be strictly enforced at the Server/API/Service layer. Hiding UI elements is for UX only.
6. **No Destructive Financial Operations**: Financial history, client payments, expenses, and petty cash transactions MUST preserve audit history. Soft deletes or historical adjustment logs should be used instead of hard deletion.
7. **Database-First for Business Critical Data**: Store all state change logic in ACID-compliant transactions with foreign key integrity.
8. **Audit Everything**: All major business events (Auth, User edits, Lead changes, Project updates, Payments, Settings) MUST generate a record in `AuditLog`.

---

## 2. Code Organization & Module Boundaries

- `src/app/`: Next.js App Router UI pages, server actions, and standard REST API handlers (`/api/v1/...`).
- `src/components/ui/`: Reusable ESPACIO Design System primitives (Buttons, Inputs, Tables, Modals, Badges).
- `src/components/shell/`: Application Shell layout components (Sidebar, Navigation, Top Bar, User Menu).
- `src/modules/`: Domain service logic (`auth`, `rbac`, `audit`, `activity`, `settings`, `notifications`, `search`). Keep business logic inside service modules, NEVER in UI components.
- `src/lib/`: Infrastructure helpers (`db.ts`, `auth.ts`, `logger.ts`, `id-generator.ts`, `errors.ts`, `response.ts`).
- `src/validators/`: Zod schemas for request validation.
- `src/types/`: TypeScript type definitions.

---

## 3. Design System Standards

- **Color Palette**: Neutral foundation (Background `#F8FAFC`, Surface `#FFFFFF`, Border `#E2E8F0`, Text `#111827`, Muted `#64748B`) with primary ESPACIO Green (`#10B981`).
- **Typography**: Inter UI font. Use `font-variant-numeric: tabular-nums` for all currency, balances, percentages, reference numbers, and metrics.
- **Spacing**: Predictable 4px grid (`p-1`, `p-2`, `p-3`, `p-4`, `p-6`, `p-8`).
- **Borders & Radius**: Restrained geometry (`rounded-sm` 4px, `rounded-md` 6px, `rounded-lg` 8px, `rounded-xl` 10px). Avoid excessive rounding or heavy gradients.

---

## 4. Verification & Testing Standards

Before declaring completion of any task:
1. Run `npm run lint` — ensure 0 lint errors.
2. Run `npx tsc --noEmit` — ensure 0 TypeScript compilation errors.
3. Run `npm test` — ensure all unit and integration tests pass.
4. Run `npm run build` — ensure production build compiles cleanly.
