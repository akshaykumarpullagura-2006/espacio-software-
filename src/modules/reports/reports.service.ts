import { db } from "@/lib/db";
import { RbacService } from "@/modules/rbac/rbac.service";
import { AuditService } from "@/modules/audit/audit.service";
import { AnalyticsService, AnalyticsDateFilter } from "@/modules/analytics/analytics.service";
import { AuthError, ForbiddenError, ValidationError, NotFoundError } from "@/lib/errors";

export interface ReportDefinition {
  key: string;
  category: "SALES" | "FINANCE" | "PROJECTS" | "CLIENTS" | "EMPLOYEES" | "PROCUREMENT" | "INVENTORY" | "OPERATIONS" | "TAX";
  name: string;
  description: string;
  requiredPermission: string;
}

export const REPORT_CATALOG: ReportDefinition[] = [
  // SALES
  { key: "sales_leads", category: "SALES", name: "Lead Pipeline Report", description: "All leads with source, stage, estimated budget, and age", requiredPermission: "reports:sales" },
  { key: "sales_quotations", category: "SALES", name: "Quotation Summary Report", description: "Created and approved quotations with values and conversion status", requiredPermission: "reports:sales" },

  // FINANCE
  { key: "finance_revenue", category: "FINANCE", name: "Revenue & Sales Ledger Report", description: "Issued GST invoices with taxable values, taxes, and client details", requiredPermission: "reports:finance" },
  { key: "finance_receivables", category: "FINANCE", name: "Receivable Aging Report", description: "Client receivables categorized by aging buckets and overdue status", requiredPermission: "reports:finance" },
  { key: "finance_expenses", category: "FINANCE", name: "Expense Breakdown Report", description: "Project and operational expenses categorized by type and payment method", requiredPermission: "reports:finance" },
  { key: "finance_payments", category: "FINANCE", name: "Client Payments Collection Report", description: "Verified incoming payments with reference numbers and payment modes", requiredPermission: "reports:finance" },

  // PROJECTS
  { key: "project_status", category: "PROJECTS", name: "Project Performance & Status Report", description: "Active projects with stages, contract values, and completion timelines", requiredPermission: "reports:projects" },
  { key: "project_profitability", category: "PROJECTS", name: "Project Contribution & Cost Report", description: "Billed revenue vs direct expenses and procurement costs per project", requiredPermission: "reports:projects" },

  // CLIENTS
  { key: "client_directory", category: "CLIENTS", name: "Client Directory & Revenue Report", description: "Client directory with total billed revenue, payments, and outstanding balances", requiredPermission: "reports:sales" },

  // EMPLOYEES
  { key: "employee_workload", category: "EMPLOYEES", name: "Employee Task Workload Report", description: "Task allocation, completion rates, and pending assignments per employee", requiredPermission: "reports:tasks" },
  { key: "employee_cost", category: "EMPLOYEES", name: "Employee Compensation & Cost Report", description: "Salary disbursements and expense advances per employee (Strict RBAC)", requiredPermission: "reports:hr" },

  // PROCUREMENT
  { key: "procurement_pos", category: "PROCUREMENT", name: "Purchase Orders & Spend Report", description: "Issued purchase orders, vendor spend, and fulfillment status", requiredPermission: "reports:procurement" },
  { key: "procurement_vendors", category: "PROCUREMENT", name: "Vendor Performance & Spend Report", description: "Vendor directory with total PO commitments and payables", requiredPermission: "reports:procurement" },

  // INVENTORY
  { key: "inventory_stock", category: "INVENTORY", name: "Current Stock & Valuation Report", description: "Active materials, stock levels, reorder alerts, and valuation", requiredPermission: "reports:inventory" },
  { key: "inventory_movements", category: "INVENTORY", name: "Stock Movement Audit Report", description: "Historical stock receipts, issues, and transfers", requiredPermission: "reports:inventory" },

  // OPERATIONS
  { key: "operations_tasks", category: "OPERATIONS", name: "Task Execution & Overdue Report", description: "All tasks with priorities, assignees, due dates, and SLA compliance", requiredPermission: "reports:tasks" },

  // TAX
  { key: "tax_gst", category: "TAX", name: "GST Tax Liability Summary Report", description: "Taxable sales, CGST, SGST, IGST totals and B2B/B2C categorization", requiredPermission: "reports:tax" },
];

export class ReportsService {
  /**
   * Return list of accessible reports for user
   */
  public static async getReportCatalog(userId: string): Promise<ReportDefinition[]> {
    const permissions = await RbacService.getUserPermissions(userId);
    const isSuperAdmin = permissions.includes("*");

    return REPORT_CATALOG.filter((report) => {
      if (isSuperAdmin) return true;
      return permissions.includes(report.requiredPermission) || permissions.includes("reports:company_wide");
    });
  }

  /**
   * Generate report data with multi-dimensional filtering
   */
  public static async generateReport(reportKey: string, filter: AnalyticsDateFilter, userId: string) {
    const permissions = await RbacService.getUserPermissions(userId);
    const isSuperAdmin = permissions.includes("*");

    const reportDef = REPORT_CATALOG.find((r) => r.key === reportKey);
    if (!reportDef) {
      throw new NotFoundError(`Report '${reportKey}' not found in catalog.`);
    }

    const hasPermission =
      isSuperAdmin ||
      permissions.includes(reportDef.requiredPermission) ||
      permissions.includes("reports:company_wide");

    if (!hasPermission) {
      throw new ForbiddenError(`Access denied: Missing required permission '${reportDef.requiredPermission}' for report.`);
    }

    const range = AnalyticsService.resolveDateRange(filter);

    let columns: Array<{ key: string; label: string; type?: "text" | "number" | "currency" | "date" }> = [];
    let rows: Array<Record<string, any>> = [];

    switch (reportKey) {
      case "sales_leads": {
        columns = [
          { key: "referenceNo", label: "Lead Ref", type: "text" },
          { key: "clientName", label: "Client Name", type: "text" },
          { key: "phone", label: "Phone", type: "text" },
          { key: "stage", label: "Stage", type: "text" },
          { key: "sourceKey", label: "Source", type: "text" },
          { key: "estimatedBudget", label: "Budget (₹)", type: "currency" },
          { key: "createdAt", label: "Created Date", type: "date" },
        ];
        const data = await db.lead.findMany({
          where: { createdAt: { gte: range.startDate, lte: range.endDate } },
          orderBy: { createdAt: "desc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.referenceNo,
          entityType: "Lead",
          clientName: d.clientName,
          phone: d.phone,
          stage: d.stage,
          sourceKey: d.sourceKey,
          estimatedBudget: d.estimatedBudget ?? 0,
          createdAt: d.createdAt.toISOString().split("T")[0],
        }));
        break;
      }

      case "sales_quotations": {
        columns = [
          { key: "referenceNo", label: "Quote Ref", type: "text" },
          { key: "title", label: "Title", type: "text" },
          { key: "status", label: "Status", type: "text" },
          { key: "subtotal", label: "Subtotal (₹)", type: "currency" },
          { key: "totalAmount", label: "Grand Total (₹)", type: "currency" },
          { key: "createdAt", label: "Created Date", type: "date" },
        ];
        const data = await db.quotation.findMany({
          where: { createdAt: { gte: range.startDate, lte: range.endDate } },
          orderBy: { createdAt: "desc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.referenceNo,
          entityType: "Quotation",
          title: d.title,
          status: d.status,
          subtotal: d.subtotal,
          totalAmount: d.totalAmount,
          createdAt: d.createdAt.toISOString().split("T")[0],
        }));
        break;
      }

      case "finance_revenue": {
        columns = [
          { key: "invoiceNo", label: "Invoice No", type: "text" },
          { key: "customerName", label: "Customer Name", type: "text" },
          { key: "status", label: "Status", type: "text" },
          { key: "taxableAmount", label: "Taxable (₹)", type: "currency" },
          { key: "totalTax", label: "Total Tax (₹)", type: "currency" },
          { key: "grandTotal", label: "Grand Total (₹)", type: "currency" },
          { key: "invoiceDate", label: "Invoice Date", type: "date" },
        ];
        const data = await db.gstInvoice.findMany({
          where: {
            invoiceDate: { gte: range.startDate, lte: range.endDate },
            status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] },
            ...(filter?.projectId ? { projectId: filter.projectId } : {}),
            ...(filter?.clientId ? { clientId: filter.clientId } : {}),
          },
          orderBy: { invoiceDate: "desc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.invoiceNo,
          entityType: "GstInvoice",
          customerName: d.customerName,
          status: d.status,
          taxableAmount: d.taxableAmount,
          totalTax: d.totalTax,
          grandTotal: d.grandTotal,
          invoiceDate: d.invoiceDate.toISOString().split("T")[0],
        }));
        break;
      }

      case "finance_receivables": {
        columns = [
          { key: "receivableNo", label: "Receivable Ref", type: "text" },
          { key: "referenceNo", label: "Invoice Ref", type: "text" },
          { key: "amount", label: "Total Invoiced (₹)", type: "currency" },
          { key: "paidAmount", label: "Collected (₹)", type: "currency" },
          { key: "outstandingAmount", label: "Outstanding (₹)", type: "currency" },
          { key: "dueDate", label: "Due Date", type: "date" },
          { key: "status", label: "Status", type: "text" },
        ];
        const data = await db.clientReceivable.findMany({
          where: {
            status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] },
            ...(filter?.projectId ? { projectId: filter.projectId } : {}),
            ...(filter?.clientId ? { clientId: filter.clientId } : {}),
          },
          orderBy: { dueDate: "asc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.receivableNo,
          entityType: "ClientReceivable",
          invoiceRef: d.referenceNo || "N/A",
          amount: d.amount,
          paidAmount: d.paidAmount,
          outstandingAmount: d.outstandingAmount,
          dueDate: d.dueDate ? d.dueDate.toISOString().split("T")[0] : "N/A",
          status: d.status,
        }));
        break;
      }

      case "finance_expenses": {
        columns = [
          { key: "referenceNo", label: "Expense Ref", type: "text" },
          { key: "description", label: "Description", type: "text" },
          { key: "categoryKey", label: "Category", type: "text" },
          { key: "expenseType", label: "Type", type: "text" },
          { key: "amount", label: "Amount (₹)", type: "currency" },
          { key: "paymentMethod", label: "Payment Mode", type: "text" },
          { key: "expenseDate", label: "Date", type: "date" },
        ];
        const data = await db.expense.findMany({
          where: {
            expenseDate: { gte: range.startDate, lte: range.endDate },
            status: { in: ["APPROVED", "PAID"] },
            ...(filter?.projectId ? { projectId: filter.projectId } : {}),
          },
          orderBy: { expenseDate: "desc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.referenceNo,
          entityType: "Expense",
          description: d.description,
          categoryKey: d.categoryKey,
          expenseType: d.expenseType,
          amount: d.amount,
          paymentMethod: d.paymentMethod,
          expenseDate: d.expenseDate.toISOString().split("T")[0],
        }));
        break;
      }

      case "finance_payments": {
        columns = [
          { key: "referenceNo", label: "Payment Ref", type: "text" },
          { key: "amount", label: "Amount (₹)", type: "currency" },
          { key: "paymentMethod", label: "Method", type: "text" },
          { key: "status", label: "Status", type: "text" },
          { key: "paymentDate", label: "Payment Date", type: "date" },
        ];
        const data = await db.clientPayment.findMany({
          where: {
            paymentDate: { gte: range.startDate, lte: range.endDate },
            status: "VERIFIED",
            ...(filter?.projectId ? { projectId: filter.projectId } : {}),
            ...(filter?.clientId ? { clientId: filter.clientId } : {}),
          },
          orderBy: { paymentDate: "desc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.referenceNo,
          entityType: "ClientPayment",
          amount: d.amount,
          paymentMethod: d.paymentMethod,
          status: d.status,
          paymentDate: d.paymentDate.toISOString().split("T")[0],
        }));
        break;
      }

      case "project_status": {
        columns = [
          { key: "referenceNo", label: "Project Ref", type: "text" },
          { key: "title", label: "Title", type: "text" },
          { key: "stage", label: "Stage", type: "text" },
          { key: "status", label: "Status", type: "text" },
          { key: "contractValue", label: "Contract Value (₹)", type: "currency" },
          { key: "createdAt", label: "Start Date", type: "date" },
        ];
        const data = await db.project.findMany({
          where: {
            ...(filter?.projectId ? { id: filter.projectId } : {}),
            ...(filter?.clientId ? { clientId: filter.clientId } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.referenceNo,
          entityType: "Project",
          title: d.title,
          stage: d.stage,
          status: d.status,
          contractValue: d.contractValue,
          createdAt: d.createdAt.toISOString().split("T")[0],
        }));
        break;
      }

      case "client_directory": {
        columns = [
          { key: "referenceNo", label: "Client Ref", type: "text" },
          { key: "fullName", label: "Full Name", type: "text" },
          { key: "phone", label: "Phone", type: "text" },
          { key: "email", label: "Email", type: "text" },
          { key: "clientType", label: "Type", type: "text" },
          { key: "createdAt", label: "Registered Date", type: "date" },
        ];
        const data = await db.client.findMany({
          orderBy: { createdAt: "desc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.referenceNo,
          entityType: "Client",
          fullName: d.fullName,
          phone: d.phone,
          email: d.email || "N/A",
          clientType: d.clientType,
          createdAt: d.createdAt.toISOString().split("T")[0],
        }));
        break;
      }

      case "procurement_pos": {
        columns = [
          { key: "referenceNo", label: "PO Ref", type: "text" },
          { key: "status", label: "Status", type: "text" },
          { key: "grandTotal", label: "Total Amount (₹)", type: "currency" },
          { key: "poDate", label: "PO Date", type: "date" },
          { key: "expectedDeliveryDate", label: "Expected Delivery", type: "date" },
        ];
        const data = await db.purchaseOrder.findMany({
          where: {
            poDate: { gte: range.startDate, lte: range.endDate },
            status: { notIn: ["CANCELLED"] },
          },
          orderBy: { poDate: "desc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.referenceNo,
          entityType: "PurchaseOrder",
          status: d.status,
          grandTotal: d.grandTotal,
          poDate: d.poDate.toISOString().split("T")[0],
          expectedDeliveryDate: d.expectedDeliveryDate ? d.expectedDeliveryDate.toISOString().split("T")[0] : "N/A",
        }));
        break;
      }

      case "inventory_stock": {
        columns = [
          { key: "materialCode", label: "Material Code", type: "text" },
          { key: "name", label: "Material Name", type: "text" },
          { key: "categoryKey", label: "Category", type: "text" },
          { key: "baseUnitKey", label: "Unit", type: "text" },
          { key: "purchaseCost", label: "Purchase Cost (₹)", type: "currency" },
          { key: "reorderLevel", label: "Reorder Level", type: "number" },
          { key: "status", label: "Status", type: "text" },
        ];
        const data = await db.material.findMany({
          where: { status: "ACTIVE" },
          orderBy: { name: "asc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.materialCode,
          entityType: "Material",
          name: d.name,
          categoryKey: d.categoryKey,
          baseUnitKey: d.baseUnitKey,
          purchaseCost: d.purchaseCost,
          reorderLevel: d.reorderLevel,
          status: d.status,
        }));
        break;
      }

      case "operations_tasks": {
        columns = [
          { key: "referenceNo", label: "Task Ref", type: "text" },
          { key: "title", label: "Task Title", type: "text" },
          { key: "priority", label: "Priority", type: "text" },
          { key: "status", label: "Status", type: "text" },
          { key: "dueAt", label: "Due Date", type: "date" },
        ];
        const data = await db.task.findMany({
          where: { createdAt: { gte: range.startDate, lte: range.endDate } },
          orderBy: { dueAt: "asc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.referenceNo,
          entityType: "Task",
          title: d.title,
          priority: d.priority,
          status: d.status,
          dueAt: d.dueAt ? d.dueAt.toISOString().split("T")[0] : "N/A",
        }));
        break;
      }

      case "tax_gst": {
        columns = [
          { key: "invoiceNo", label: "Invoice No", type: "text" },
          { key: "customerName", label: "Customer Name", type: "text" },
          { key: "customerGstin", label: "GSTIN", type: "text" },
          { key: "taxableAmount", label: "Taxable Value (₹)", type: "currency" },
          { key: "cgstAmount", label: "CGST (₹)", type: "currency" },
          { key: "sgstAmount", label: "SGST (₹)", type: "currency" },
          { key: "igstAmount", label: "IGST (₹)", type: "currency" },
          { key: "totalTax", label: "Total Tax (₹)", type: "currency" },
          { key: "grandTotal", label: "Grand Total (₹)", type: "currency" },
        ];
        const data = await db.gstInvoice.findMany({
          where: {
            invoiceDate: { gte: range.startDate, lte: range.endDate },
            status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] },
          },
          orderBy: { invoiceDate: "desc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.invoiceNo,
          entityType: "GstInvoice",
          customerName: d.customerName,
          customerGstin: d.customerGstin || "Unregistered (B2C)",
          taxableAmount: d.taxableAmount,
          cgstAmount: d.cgstAmount,
          sgstAmount: d.sgstAmount,
          igstAmount: d.igstAmount,
          totalTax: d.totalTax,
          grandTotal: d.grandTotal,
        }));
        break;
      }

      case "employee_cost": {
        columns = [
          { key: "referenceNo", label: "Payment Ref", type: "text" },
          { key: "periodMonth", label: "Month", type: "number" },
          { key: "periodYear", label: "Year", type: "number" },
          { key: "amount", label: "Disbursed Salary (₹)", type: "currency" },
          { key: "paymentMethod", label: "Mode", type: "text" },
          { key: "paymentDate", label: "Date", type: "date" },
        ];
        const data = await db.employeeSalaryPayment.findMany({
          where: { paymentDate: { gte: range.startDate, lte: range.endDate }, status: "PAID" },
          orderBy: { paymentDate: "desc" },
        });
        rows = data.map((d) => ({
          entityId: d.id,
          referenceNo: d.referenceNo,
          entityType: "EmployeeSalaryPayment",
          periodMonth: d.periodMonth,
          periodYear: d.periodYear,
          amount: d.amount,
          paymentMethod: d.paymentMethod,
          paymentDate: d.paymentDate ? d.paymentDate.toISOString().split("T")[0] : "N/A",
        }));
        break;
      }

      default: {
        throw new ValidationError(`Report '${reportKey}' query handler is not implemented.`);
      }
    }

    return {
      reportKey: reportDef.key,
      reportName: reportDef.name,
      category: reportDef.category,
      period: range.periodLabel,
      totalRows: rows.length,
      columns,
      rows,
    };
  }

  /**
   * Export report as CSV or JSON
   */
  public static async exportReport(
    reportKey: string,
    format: "CSV" | "JSON",
    filter: AnalyticsDateFilter,
    userId: string
  ): Promise<{ contentType: string; fileName: string; content: string }> {
    const reportData = await this.generateReport(reportKey, filter, userId);

    await AuditService.logEvent({
      userId,
      action: "REPORT_EXPORTED",
      entityType: "Report",
      entityId: reportKey,
      newValues: { format, filter: filter as any, rowCount: reportData.totalRows },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedKey = reportKey.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    if (format === "JSON") {
      return {
        contentType: "application/json",
        fileName: `${sanitizedKey}_${timestamp}.json`,
        content: JSON.stringify(reportData, null, 2),
      };
    }

    // CSV Format
    const headers = reportData.columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
    const csvRows = reportData.rows.map((row) =>
      reportData.columns
        .map((col) => {
          const val = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : "";
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csvContent = [headers, ...csvRows].join("\r\n");

    return {
      contentType: "text/csv; charset=utf-8",
      fileName: `${sanitizedKey}_${timestamp}.csv`,
      content: csvContent,
    };
  }
}
