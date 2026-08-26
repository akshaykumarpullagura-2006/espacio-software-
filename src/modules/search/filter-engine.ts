export type FilterFieldType = "TEXT" | "NUMBER" | "DATE" | "STATUS" | "BOOLEAN" | "SELECT";

export type FilterOperator =
  | "EQUALS"
  | "CONTAINS"
  | "STARTS_WITH"
  | "DOES_NOT_CONTAIN"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "GREATER_EQUAL"
  | "LESS_EQUAL"
  | "BETWEEN"
  | "BEFORE"
  | "AFTER"
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_QUARTER"
  | "THIS_YEAR"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "IS"
  | "IS_NOT"
  | "IN"
  | "NOT_IN";

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  secondValue?: any; // For BETWEEN operators
}

export interface FilterGroup {
  id: string;
  logicalOperator: "AND" | "OR";
  conditions: FilterCondition[];
  subGroups?: FilterGroup[];
}

export interface EntityFieldDefinition {
  key: string;
  label: string;
  type: FilterFieldType;
  operators: FilterOperator[];
  options?: { label: string; value: string }[];
}

export interface QuickFilterPreset {
  id: string;
  name: string;
  entityType: string;
  description?: string;
  filterGroup: FilterGroup;
}

export class FilterEngine {
  private static readonly ENTITY_FIELDS: Record<string, EntityFieldDefinition[]> = {
    LEAD: [
      { key: "clientName", label: "Client Name", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH", "DOES_NOT_CONTAIN"] },
      { key: "referenceNo", label: "Reference No", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "phone", label: "Phone", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
      { key: "email", label: "Email", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
      { key: "stage", label: "Stage", type: "STATUS", operators: ["IS", "IS_NOT", "IN", "NOT_IN"], options: [
        { label: "New", value: "NEW" },
        { label: "Contacted", value: "CONTACTED" },
        { label: "Requirement Gathered", value: "REQUIREMENT_GATHERED" },
        { label: "Site Visit Scheduled", value: "SITE_VISIT_SCHEDULED" },
        { label: "Estimate Sent", value: "ESTIMATE_SENT" },
        { label: "Negotiation", value: "NEGOTIATION" },
        { label: "Won", value: "WON" },
        { label: "Lost", value: "LOST" },
      ] },
      { key: "estimatedBudget", label: "Estimated Budget (₹)", type: "NUMBER", operators: ["EQUALS", "GREATER_THAN", "LESS_THAN", "GREATER_EQUAL", "LESS_EQUAL", "BETWEEN"] },
      { key: "createdAt", label: "Created Date", type: "DATE", operators: ["EQUALS", "BEFORE", "AFTER", "BETWEEN", "TODAY", "YESTERDAY", "THIS_MONTH", "LAST_MONTH", "THIS_YEAR"] },
    ],
    PROJECT: [
      { key: "title", label: "Project Title", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "referenceNo", label: "Reference No", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "stage", label: "Stage", type: "STATUS", operators: ["IS", "IS_NOT", "IN", "NOT_IN"], options: [
        { label: "Initiated", value: "INITIATED" },
        { label: "Confirmation Fee Paid", value: "CONFIRMATION_FEE_PAID" },
        { label: "Site Measurement Done", value: "SITE_MEASUREMENT_DONE" },
        { label: "2D/3D Design Approved", value: "2D_3D_DESIGN_APPROVED" },
        { label: "Advance Received", value: "ADVANCE_RECEIVED" },
        { label: "Raw Material Ordered", value: "RAW_MATERIAL_ORDERED" },
        { label: "Production In Progress", value: "PRODUCTION_IN_PROGRESS" },
        { label: "Quality Check Passed", value: "QUALITY_CHECK_PASSED" },
        { label: "Project Handover", value: "PROJECT_HANDOVER" },
        { label: "Completed", value: "COMPLETED" },
        { label: "Warranty", value: "WARRANTY" },
      ] },
      { key: "contractValue", label: "Contract Value (₹)", type: "NUMBER", operators: ["EQUALS", "GREATER_THAN", "LESS_THAN", "GREATER_EQUAL", "LESS_EQUAL", "BETWEEN"] },
      { key: "totalExpenses", label: "Total Expenses (₹)", type: "NUMBER", operators: ["EQUALS", "GREATER_THAN", "LESS_THAN", "GREATER_EQUAL", "LESS_EQUAL", "BETWEEN"] },
      { key: "createdAt", label: "Created Date", type: "DATE", operators: ["EQUALS", "BEFORE", "AFTER", "BETWEEN", "TODAY", "THIS_MONTH", "LAST_MONTH", "THIS_YEAR"] },
    ],
    CLIENT: [
      { key: "fullName", label: "Client Name", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "referenceNo", label: "Reference No", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "phone", label: "Phone", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
      { key: "email", label: "Email", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
      { key: "city", label: "City", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
      { key: "gstin", label: "GSTIN", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
    ],
    EXPENSE: [
      { key: "referenceNo", label: "Reference No", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "description", label: "Description", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
      { key: "expenseType", label: "Type", type: "SELECT", operators: ["IS", "IS_NOT"], options: [{ label: "Project", value: "PROJECT" }, { label: "Business", value: "BUSINESS" }] },
      { key: "categoryKey", label: "Category", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
      { key: "amount", label: "Amount (₹)", type: "NUMBER", operators: ["EQUALS", "GREATER_THAN", "LESS_THAN", "GREATER_EQUAL", "LESS_EQUAL", "BETWEEN"] },
      { key: "status", label: "Status", type: "STATUS", operators: ["IS", "IS_NOT", "IN"], options: [
        { label: "Submitted", value: "SUBMITTED" },
        { label: "Approved", value: "APPROVED" },
        { label: "Paid", value: "PAID" },
        { label: "Rejected", value: "REJECTED" },
        { label: "Cancelled", value: "CANCELLED" },
      ] },
      { key: "expenseDate", label: "Expense Date", type: "DATE", operators: ["EQUALS", "BEFORE", "AFTER", "BETWEEN", "THIS_MONTH", "LAST_MONTH"] },
    ],
    VENDOR: [
      { key: "name", label: "Vendor Name", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "referenceNo", label: "Reference No", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "categoryKey", label: "Category", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
      { key: "phone", label: "Phone", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
      { key: "status", label: "Status", type: "STATUS", operators: ["IS", "IS_NOT"], options: [{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }, { label: "Blocked", value: "BLOCKED" }] },
      { key: "creditLimit", label: "Credit Limit (₹)", type: "NUMBER", operators: ["EQUALS", "GREATER_THAN", "LESS_THAN", "GREATER_EQUAL", "LESS_EQUAL", "BETWEEN"] },
    ],
    PURCHASE_ORDER: [
      { key: "referenceNo", label: "Reference No", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "grandTotal", label: "Grand Total (₹)", type: "NUMBER", operators: ["EQUALS", "GREATER_THAN", "LESS_THAN", "GREATER_EQUAL", "LESS_EQUAL", "BETWEEN"] },
      { key: "status", label: "Status", type: "STATUS", operators: ["IS", "IS_NOT", "IN"], options: [
        { label: "Draft", value: "DRAFT" },
        { label: "Pending Approval", value: "PENDING_APPROVAL" },
        { label: "Approved", value: "APPROVED" },
        { label: "Sent", value: "SENT" },
        { label: "Acknowledged", value: "ACKNOWLEDGED" },
        { label: "Partially Received", value: "PARTIALLY_RECEIVED" },
        { label: "Received", value: "RECEIVED" },
        { label: "Cancelled", value: "CANCELLED" },
        { label: "Closed", value: "CLOSED" },
      ] },
      { key: "poDate", label: "PO Date", type: "DATE", operators: ["EQUALS", "BEFORE", "AFTER", "BETWEEN", "THIS_MONTH", "LAST_MONTH"] },
    ],
    MATERIAL: [
      { key: "name", label: "Material Name", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "materialCode", label: "Material Code", type: "TEXT", operators: ["EQUALS", "CONTAINS", "STARTS_WITH"] },
      { key: "categoryKey", label: "Category", type: "TEXT", operators: ["EQUALS", "CONTAINS"] },
      { key: "purchaseCost", label: "Purchase Cost (₹)", type: "NUMBER", operators: ["EQUALS", "GREATER_THAN", "LESS_THAN", "GREATER_EQUAL", "LESS_EQUAL", "BETWEEN"] },
      { key: "status", label: "Status", type: "STATUS", operators: ["IS", "IS_NOT"], options: [{ label: "Active", value: "ACTIVE" }, { label: "Inactive", value: "INACTIVE" }, { label: "Discontinued", value: "DISCONTINUED" }] },
    ],
  };

  public static getEntityFields(entityType: string): EntityFieldDefinition[] {
    return this.ENTITY_FIELDS[entityType.toUpperCase()] || [];
  }

  public static getDateRangeForPeriod(period: FilterOperator): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (period) {
      case "TODAY":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "YESTERDAY":
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "LAST_7_DAYS":
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "LAST_30_DAYS":
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "THIS_MONTH":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "LAST_MONTH":
        start.setMonth(now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "THIS_QUARTER": {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        start.setMonth(quarterMonth, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(quarterMonth + 3, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "THIS_YEAR":
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }

  public static buildPrismaWhere(group: FilterGroup): Record<string, any> {
    if (!group || !group.conditions || group.conditions.length === 0) {
      return {};
    }

    const clauses: Record<string, any>[] = [];

    for (const cond of group.conditions) {
      if (!cond.field || !cond.operator) continue;

      const fieldWhere: Record<string, any> = {};

      switch (cond.operator) {
        case "EQUALS":
        case "IS":
          fieldWhere[cond.field] = cond.value;
          break;
        case "IS_NOT":
          fieldWhere[cond.field] = { not: cond.value };
          break;
        case "CONTAINS":
          fieldWhere[cond.field] = { contains: String(cond.value) };
          break;
        case "STARTS_WITH":
          fieldWhere[cond.field] = { startsWith: String(cond.value) };
          break;
        case "DOES_NOT_CONTAIN":
          fieldWhere[cond.field] = { not: { contains: String(cond.value) } };
          break;
        case "GREATER_THAN":
          fieldWhere[cond.field] = { gt: Number(cond.value) };
          break;
        case "LESS_THAN":
          fieldWhere[cond.field] = { lt: Number(cond.value) };
          break;
        case "GREATER_EQUAL":
          fieldWhere[cond.field] = { gte: Number(cond.value) };
          break;
        case "LESS_EQUAL":
          fieldWhere[cond.field] = { lte: Number(cond.value) };
          break;
        case "BETWEEN":
          if (cond.secondValue !== undefined) {
            fieldWhere[cond.field] = { gte: Number(cond.value), lte: Number(cond.secondValue) };
          }
          break;
        case "BEFORE":
          fieldWhere[cond.field] = { lt: new Date(cond.value) };
          break;
        case "AFTER":
          fieldWhere[cond.field] = { gt: new Date(cond.value) };
          break;
        case "IN":
          fieldWhere[cond.field] = { in: Array.isArray(cond.value) ? cond.value : [cond.value] };
          break;
        case "NOT_IN":
          fieldWhere[cond.field] = { notIn: Array.isArray(cond.value) ? cond.value : [cond.value] };
          break;
        case "TODAY":
        case "YESTERDAY":
        case "LAST_7_DAYS":
        case "LAST_30_DAYS":
        case "THIS_MONTH":
        case "LAST_MONTH":
        case "THIS_QUARTER":
        case "THIS_YEAR": {
          const { start, end } = this.getDateRangeForPeriod(cond.operator);
          fieldWhere[cond.field] = { gte: start, lte: end };
          break;
        }
      }

      if (Object.keys(fieldWhere).length > 0) {
        clauses.push(fieldWhere);
      }
    }

    if (group.subGroups && group.subGroups.length > 0) {
      for (const sub of group.subGroups) {
        const subWhere = this.buildPrismaWhere(sub);
        if (Object.keys(subWhere).length > 0) {
          clauses.push(subWhere);
        }
      }
    }

    if (clauses.length === 0) return {};

    if (group.logicalOperator === "OR") {
      return { OR: clauses };
    }
    return { AND: clauses };
  }
}
