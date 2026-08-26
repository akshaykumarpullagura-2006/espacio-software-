# ESPACIO ERP — Role-Based Access Control (RBAC) Architecture

## 1. Overview

ESPACIO ERP implements a database-driven Role-Based Access Control (RBAC) architecture. Authorization is enforced strictly at the Server / API layer. Frontend UI element visibility (hiding buttons or tabs) is considered a convenience UX layer, NOT security.

---

## 2. Dynamic RBAC Schema

```
┌──────────┐          ┌───────────┐          ┌──────────┐
│  User    ├─────────►│ UserRole  │◄─────────┤   Role   │
└──────────┘          └───────────┘          └────┬─────┘
                                                  │
                                                  ▼
┌────────────┐        ┌────────────────┐     ┌────┴─────┐
│ Permission │◄───────┤ RolePermission │◄────┤   Role   │
└────────────┘        └────────────────┘     └──────────┘
```

---

## 3. Initial Baseline Roles & Permission Matrix

| Role | Description | Core Permissions |
| :--- | :--- | :--- |
| **`ADMIN`** | System Administrator | Full permissions (`*`) |
| **`LEADERSHIP`** | Executive Management | Full business visibility, approvals (`leads:*`, `projects:*`, `finance:*`, `reports:*`) |
| **`SALES`** | Sales Team & Managers | CRM & Quotation access (`leads:*`, `quotations:*`) |
| **`DESIGN`** | Interior Designers | Project views & stage updates (`projects:read`, `projects:update`) |
| **`PROJECT`** | Site Engineers / PMs | Project execution (`projects:*`, `materials:*`) |
| **`FINANCE`** | Finance Manager / Accountant | Financial ledger (`finance:*`, `payments:*`, `expenses:*`, `pettycash:*`) |
| **`EMPLOYEE`** | Standard Employee | Self profile, activity logs (`profile:read`) |

---

## 4. Server-Side Permission Enforcement Flow

Every protected API route or Server Action invokes `RbacService.authorize(user, requiredPermission)`:

```typescript
// Example usage in API / Server Action
const user = await getAuthenticatedUser(req);
const isAuthorized = await RbacService.hasPermission(user.id, "finance:approve");

if (!isAuthorized) {
  throw new ForbiddenError("Insufficient permissions to execute financial approval.");
}
```

If authorization fails:
1. Returns HTTP `403 Forbidden` response.
2. Emits security audit event (`SECURITY_UNAUTHORIZED_ACCESS_ATTEMPT`).
3. Prevents execution of underlying service logic.
