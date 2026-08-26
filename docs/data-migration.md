# ESPACIO ERP — Legacy Data Migration Strategy

## 1. Context & Challenge

ESPACIO's legacy financial and operational records originate from spreadsheet files containing:
- Income & Client Transactions
- COGS & Project Execution Costs
- Operational Expenses (Rent, Salaries, Marketing, Fuel, Transport)
- Petty Cash Advances & Receipts
- Pending & Returned Transactions

Spreadsheet data often suffers from unnormalized structures, missing foreign keys, non-standardized dates, duplicate entries, and inconsistent category names.

---

## 2. Migration Rule: NO Blind Direct Imports

To preserve the production database's relational integrity and clean audit history, legacy data MUST NOT be directly inserted into production tables without validation.

---

## 3. 5-Stage Migration Workflow

```
┌─────────────────┐     1. Extract      ┌─────────────────┐
│ Legacy Excel /  ├────────────────────►│ Staging Parser  │
│ CSV Spreadsheets│                     │ (scripts/import)│
└─────────────────┘                     └────────┬────────┘
                                                 │
                                                2. Clean & Normalize
                                                 ▼
┌─────────────────┐     4. Commit       ┌─────────────────┐
│ Production DB   │◄────────────────────┤ Validation &    │
│ (Target Tables) │                     │ Transformation  │
└─────────────────┘                     └────────▲────────┘
                                                 │
                                                3. Exception Report
                                                 │
                                        ┌────────┴────────┐
                                        │ Invalid /       │
                                        │ Flagged Rows    │
                                        └─────────────────┘
```

### Stage 1: Extraction & Parsing
Script reads raw legacy files and loads rows into staging memory without touching production DB.

### Stage 2: Normalization & Mapping
- Standardize monetary amounts (Parse currency symbols, convert to decimal).
- Standardize dates into ISO-8601 (`YYYY-MM-DD`).
- Map messy expense names to strict system expense categories (`RENT`, `SALARY`, `MARKETING`, `TRANSPORT`, `MATERIAL`, `SUB_CONTRACTOR`).

### Stage 3: Validation & Exception Flagging
Row is flagged if:
- Required fields are missing (e.g. amount missing).
- Date is unparseable.
- Duplicate transaction ID or duplicate payment reference detected.

Flagged rows are saved into `/docs/migration-exceptions.json` for human manual review.

### Stage 4: Transactional Load
Valid records are inserted into production database using Prisma `$transaction` blocks, assigning proper business reference numbers (`PAY-`, `EXP-`) and generating initial migration audit records.

### Stage 5: Verification & Rollback
Verify total sums (Total Revenue, Total Expense) between raw spreadsheet and imported database records. If disparity exceeds 0.00%, execute rollback migration script.
