# ESPACIO ERP — Project Management / Operations Module Specification

## 1. Overview

The **Project Management & Operations Module** governs interior design and interior-works execution from lead conversion through 13 operational stages, scope change orders, quality checks, handover validation, and post-handover warranty tracking.

---

## 2. 13-Stage Operational Workflow

1. **`CONFIRMATION_FEE_PAID`**: Initial booking deposit confirmed.
2. **`DESIGNING`**: 2D/3D visualizer & CAD drawing phase.
3. **`DESIGN_COMPLETED`**: Final CAD & visualizer sign-off.
4. **`MATERIAL_SELECTION`**: Studio material & finish selection.
5. **`RAW_MATERIAL_ORDERED`**: Plywood, hardware, and raw material procurement.
6. **`WOOD_WORK`**: Carcass assembly & carpentry on site.
7. **`WOOD_WORK_COMPLETED`**: Carcass carpentry complete.
8. **`LAMINATE_ORDERED`**: Laminate & veneer procurement.
9. **`LAMINATE_PASTING`**: Surface pressing & edge-banding.
10. **`FITTING_WORK_COMPLETED`**: Hardware, hinges, and modular assembly complete.
11. **`QUALITY_CHECK`**: Site engineering quality inspection.
12. **`PROJECT_HANDOVER`**: Official client handover. *(Strict Rule: Requires an approved Quality Check with status = PASSED!)*
13. **`PROJECT_COMPLETED`**: Execution closed.

---

## 3. Project Reference ID & Lead Integration

- Format: `PROJ-YYYY-XXXX` (e.g. `PROJ-2026-0001`).
- Originates automatically when converting a `WON` Lead via `LeadConversionService` or through direct creation by authorized users.

---

## 4. Scope Change Orders (`CO-YYYY-XXXX`)

- Format: `CO-YYYY-XXXX`.
- Allows additional cost and scope revisions.
- Approval of a Change Order updates project `revisedBudget` while preserving original contract value (`totalBudget`) in audit records without silent overwrites.

---

## 5. Quality Check & Handover Validation

- **Quality Check**: Records `PASSED` or `FAILED` inspections.
- **Handover Lock**: Transitioning to `PROJECT_HANDOVER` requires a passed Quality Check. Handover automatically initializes `WarrantyRecord` (default 12 months) and schedules a 45-day post-handover review & referral nudge (`REVIEW_PROMPT_DAYS`).

---

## 6. Warranty & Complaints Log (`WAR-YYYY-XXXX`)

- Format: `WAR-YYYY-XXXX`.
- Tracks post-handover complaints with priority levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and resolution workflows.
