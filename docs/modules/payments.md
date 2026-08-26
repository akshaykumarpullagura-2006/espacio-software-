# ESPACIO ERP — Client Payment Management Module Specification

## 1. Overview

The **Client Payment Management Module** is an authoritative financial subsystem designed for interior project receivable management, milestone installment tracking, payment verification, controlled payment reversals, client-level aggregate receivables, and financial summary analytics.

---

## 2. Authoritative Single Source of Financial Truth

- Financial calculations (`Total Paid`, `Pending Amount`, `Remaining Balance`, `Payment Progress %`) are derived exclusively via `FinancialCalculationService` from `ClientPayment` records and `Project` commercial values (`totalBudget` and `revisedBudget`).
- No UI components or static database fields maintain conflicting payment totals.

---

## 3. Human-Readable Reference ID & Taxonomy

- **Format**: `PAY-YYYY-XXXX` (e.g. `PAY-2026-0001`).
- Server-generated, unique, concurrency-resistant.
- **Payment Methods**: Configurable dynamic taxonomy via `PaymentMethodConfig` (`BANK_TRANSFER`, `UPI`, `CHEQUE`, `CASH`, `CARD`, `NEFT`, `RTGS`).

---

## 4. Controlled Payment States & Reversal Audit

- **Status Engine**: `RECORDED` $\rightarrow$ `PENDING_VERIFICATION` $\rightarrow$ `VERIFIED` $\rightarrow$ `REVERSED` / `CANCELLED`.
- **Reversals**: Hard deletion of verified payments is strictly prohibited. Payment reversals mark `status = REVERSED`, store `reversalReason`, `reversedById`, `reversedAt`, and restore project/milestone balances atomically via ACID transactions.

---

## 5. Client Aggregate Receivables ("Total Pending by Client")

- Aggregates all commercial projects per client at `/payments/receivables`.
- Calculates total commercial portfolio value, verified receipts, and total pending receivables.
