# ESPACIO ERP — Expense Management & Project Cost Control Module Specification

## 1. Overview

The **Expense Management & Project Cost Control Module** manages financial outgoings, separating non-attributable Business Overhead expenses from direct Project Expenses. It computes authoritative Project Cost Sheets, category cost breakdowns, and budget variance controls.

---

## 2. Critical Financial Separation

- **Client Payments** (`ClientPayment`): Money received from clients. Increases `Project Paid`, does NOT increase `Project Cost`.
- **Expenses** (`Expense`): Money spent by business.
  - `expenseType = PROJECT`: Requires a `projectId` and increases that specific project's cost sheet.
  - `expenseType = BUSINESS`: Represents general company overhead (office rent, electricity, software) and is NOT charged to any individual project's cost sheet.

---

## 3. Human-Readable Reference ID & Taxonomy

- **Format**: `EXP-YYYY-XXXX` (e.g. `EXP-2026-0001`).
- **Categories**: Dynamic taxonomy via `ExpenseCategoryConfig` (`MATERIAL`, `LABOUR`, `TRANSPORT`, `FUEL`, `SUBCONTRACTOR`, `SITE_EXPENSE`, `EQUIPMENT`, `RENT`, `UTILITIES`, `MARKETING`, `SOFTWARE`, `OTHER`).

---

## 4. Approval Workflow & Control

- Approval Status: `DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `APPROVED` $\rightarrow$ `PAID` / `REJECTED` / `CANCELLED`.
- `AUTO_APPROVE_EXPENSES_BELOW`: Expenses below threshold (default ₹50,000) auto-approve.
- **Self-Approval Protection**: Creator of an expense cannot approve their own request if `ALLOW_SELF_APPROVAL = false`.
- **Cancellation & Reclassification**: Hard deletion is prohibited. Cancellations and category reclassifications log reasons and historical transitions into `reclassificationLog`.
