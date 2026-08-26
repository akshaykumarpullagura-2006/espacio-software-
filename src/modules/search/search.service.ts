import { db } from "@/lib/db";
import { RbacService } from "@/modules/rbac/rbac.service";

export type SearchEntityType =
  | "LEAD"
  | "CLIENT"
  | "PROJECT"
  | "QUOTATION"
  | "GST_INVOICE"
  | "CLIENT_PAYMENT"
  | "EXPENSE"
  | "PETTY_CASH"
  | "VENDOR"
  | "PURCHASE_ORDER"
  | "MATERIAL_REQUEST"
  | "GOODS_RECEIPT"
  | "MATERIAL"
  | "WAREHOUSE"
  | "STOCK_MOVEMENT"
  | "VENDOR_PAYMENT"
  | "RECEIVABLE"
  | "PAYABLE"
  | "FINANCIAL_ACCOUNT"
  | "USER"
  | "ACTIVITY";

export interface RelatedRecordRef {
  type: string;
  id: string;
  referenceNo?: string;
  title: string;
  href: string;
}

export interface SearchResultItem {
  id: string;
  type: SearchEntityType;
  typeLabel: string;
  title: string;
  subtitle: string;
  referenceNo: string;
  status?: string;
  amount?: number;
  date?: string;
  matchedField?: string;
  href: string;
  relevanceScore: number;
  relatedRecords?: RelatedRecordRef[];
}

export interface SearchQueryResponse {
  query: string;
  totalResults: number;
  moduleCounts: Record<string, number>;
  didYouMean?: string;
  results: SearchResultItem[];
  executionTimeMs: number;
}

export interface SearchOptions {
  module?: string;
  limit?: number;
  offset?: number;
  sortBy?: "relevance" | "date" | "amount";
  sortOrder?: "asc" | "desc";
}

const PREFIX_ENTITY_MAP: Record<string, SearchEntityType> = {
  "LEAD-": "LEAD",
  "CLI-": "CLIENT",
  "PROJ-": "PROJECT",
  "PR-": "PROJECT",
  "Q-": "QUOTATION",
  "INV-": "GST_INVOICE",
  "PAY-": "CLIENT_PAYMENT",
  "EXP-": "EXPENSE",
  "ADV-": "PETTY_CASH",
  "PCX-": "PETTY_CASH",
  "VEN-": "VENDOR",
  "PO-": "PURCHASE_ORDER",
  "MR-": "MATERIAL_REQUEST",
  "GRN-": "GOODS_RECEIPT",
  "MAT-": "MATERIAL",
  "WH-": "WAREHOUSE",
  "STM-": "STOCK_MOVEMENT",
  "VPAY-": "VENDOR_PAYMENT",
  "REC-": "RECEIVABLE",
  "VPAYABLE-": "PAYABLE",
  "ACC-": "FINANCIAL_ACCOUNT",
};

const SYNONYM_MAP: Record<string, string> = {
  po: "Purchase Order",
  mr: "Material Request",
  grn: "Goods Receipt",
  vendor: "Supplier",
  supplier: "Vendor",
  client: "Customer",
  customer: "Client",
  inv: "Invoice",
  bill: "Invoice",
  exp: "Expense",
  adv: "Advance",
  stm: "Stock Movement",
  vensai: "Venasai Plywood",
};

export class SearchService {
  public static async globalSearch(
    userId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchQueryResponse> {
    const startTime = Date.now();
    const cleanQuery = query.trim();

    if (!cleanQuery || cleanQuery.length < 1) {
      return {
        query: "",
        totalResults: 0,
        moduleCounts: {},
        results: [],
        executionTimeMs: 0,
      };
    }

    // Check RBAC permissions for the user
    const userPermissions = await RbacService.getUserPermissions(userId);
    const isAdmin = userPermissions.includes("*");

    const canRead = (perm: string) => isAdmin || userPermissions.includes(perm);

    // Parse structured query (e.g. "Projects: Rakesh" or "Finance: pending")
    let targetModule = options.module?.toUpperCase();
    let searchTerm = cleanQuery;

    if (cleanQuery.includes(":")) {
      const parts = cleanQuery.split(":");
      const modPrefix = parts[0].trim().toUpperCase();
      const rest = parts.slice(1).join(":").trim();
      if (modPrefix && rest) {
        targetModule = modPrefix;
        searchTerm = rest;
      }
    }

    const qUpper = searchTerm.toUpperCase();

    // Check if query starts with a known reference prefix
    let priorityEntityType: SearchEntityType | null = null;
    for (const [prefix, entityType] of Object.entries(PREFIX_ENTITY_MAP)) {
      if (qUpper.startsWith(prefix)) {
        priorityEntityType = entityType;
        break;
      }
    }

    // Check for "Did you mean?" suggestions
    let didYouMean: string | undefined;
    const lowerQ = searchTerm.toLowerCase();
    if (SYNONYM_MAP[lowerQ]) {
      didYouMean = SYNONYM_MAP[lowerQ];
    }

    const containsQuery = { contains: searchTerm };
    const limitPerEntity = options.limit ? Math.max(options.limit, 10) : 10;
    const allResults: SearchResultItem[] = [];

    const tasks: Promise<void>[] = [];

    // 1. LEADS
    if (canRead("leads:read") && (!targetModule || targetModule === "LEADS" || targetModule === "CRM" || priorityEntityType === "LEAD")) {
      tasks.push(
        db.lead
          .findMany({
            where: {
              OR: [
                { referenceNo: containsQuery },
                { clientName: containsQuery },
                { phone: containsQuery },
                { email: containsQuery },
                { location: containsQuery },
                { stage: containsQuery },
              ],
            },
            take: limitPerEntity,
            orderBy: { createdAt: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              const exactName = r.clientName.toLowerCase() === lowerQ;
              let score = 50;
              if (exactRef) score = 100;
              else if (exactName) score = 90;
              else if (r.referenceNo.toUpperCase().startsWith(qUpper)) score = 80;
              else if (r.clientName.toLowerCase().includes(lowerQ)) score = 70;

              allResults.push({
                id: r.id,
                type: "LEAD",
                typeLabel: "Lead",
                title: r.clientName,
                subtitle: `Lead ${r.referenceNo} • ${r.stage} • ${r.phone}`,
                referenceNo: r.referenceNo,
                status: r.stage,
                amount: r.estimatedBudget ?? undefined,
                date: r.createdAt.toISOString(),
                matchedField: exactRef ? "Reference No" : "Client Name",
                href: `/leads?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // 2. CLIENTS
    if (canRead("leads:read") && (!targetModule || targetModule === "CLIENTS" || targetModule === "CRM" || priorityEntityType === "CLIENT")) {
      tasks.push(
        db.client
          .findMany({
            where: {
              OR: [
                { referenceNo: containsQuery },
                { fullName: containsQuery },
                { phone: containsQuery },
                { email: containsQuery },
                { city: containsQuery },
                { gstin: containsQuery },
              ],
            },
            take: limitPerEntity,
            orderBy: { createdAt: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              const exactName = r.fullName.toLowerCase() === lowerQ;
              let score = 50;
              if (exactRef) score = 100;
              else if (exactName) score = 90;
              else if (r.referenceNo.toUpperCase().startsWith(qUpper)) score = 80;

              allResults.push({
                id: r.id,
                type: "CLIENT",
                typeLabel: "Client",
                title: r.fullName,
                subtitle: `Client ${r.referenceNo} • ${r.phone} • ${r.city || "N/A"}`,
                referenceNo: r.referenceNo,
                date: r.createdAt.toISOString(),
                matchedField: exactRef ? "Reference No" : "Client Name",
                href: `/clients?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // 3. PROJECTS
    if (canRead("projects:read") && (!targetModule || targetModule === "PROJECTS" || priorityEntityType === "PROJECT")) {
      tasks.push(
        db.project
          .findMany({
            where: {
              OR: [
                { referenceNo: containsQuery },
                { title: containsQuery },
                { siteAddress: containsQuery },
                { city: containsQuery },
                { stage: containsQuery },
              ],
            },
            take: limitPerEntity,
            include: { client: { select: { fullName: true } } },
            orderBy: { createdAt: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              const exactTitle = r.title.toLowerCase() === lowerQ;
              let score = 50;
              if (exactRef) score = 100;
              else if (exactTitle) score = 90;
              else if (r.referenceNo.toUpperCase().startsWith(qUpper)) score = 80;
              else if (r.title.toLowerCase().includes(lowerQ)) score = 70;

              allResults.push({
                id: r.id,
                type: "PROJECT",
                typeLabel: "Project",
                title: r.title,
                subtitle: `Project ${r.referenceNo} • ${r.stage} ${r.client ? `(${r.client.fullName})` : ""}`,
                referenceNo: r.referenceNo,
                status: r.stage,
                amount: r.contractValue,
                date: r.createdAt.toISOString(),
                matchedField: exactRef ? "Reference No" : "Project Title",
                href: `/projects?id=${r.id}`,
                relevanceScore: score,
                relatedRecords: r.client
                  ? [{ type: "Client", id: r.clientId!, title: r.client.fullName, href: `/clients?id=${r.clientId}` }]
                  : [],
              });
            });
          })
      );
    }

    // 4. QUOTATIONS
    if (canRead("quotations:read") && (!targetModule || targetModule === "QUOTATIONS" || targetModule === "SALES" || priorityEntityType === "QUOTATION")) {
      tasks.push(
        db.quotation
          .findMany({
            where: {
              OR: [{ referenceNo: containsQuery }, { status: containsQuery }, { notes: containsQuery }],
            },
            take: limitPerEntity,
            orderBy: { createdAt: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              let score = exactRef ? 100 : r.referenceNo.toUpperCase().startsWith(qUpper) ? 80 : 60;

              allResults.push({
                id: r.id,
                type: "QUOTATION",
                typeLabel: "Quotation",
                title: `Quotation ${r.referenceNo}`,
                subtitle: `Status: ${r.status} • Total: ₹${r.totalAmount.toLocaleString("en-IN")}`,
                referenceNo: r.referenceNo,
                status: r.status,
                amount: r.totalAmount,
                date: r.createdAt.toISOString(),
                matchedField: "Reference No",
                href: `/quotations?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // 5. VENDORS
    if (canRead("vendors:read") && (!targetModule || targetModule === "VENDORS" || targetModule === "PROCUREMENT" || priorityEntityType === "VENDOR")) {
      tasks.push(
        db.vendor
          .findMany({
            where: {
              OR: [
                { referenceNo: containsQuery },
                { name: containsQuery },
                { legalName: containsQuery },
                { phone: containsQuery },
                { email: containsQuery },
                { categoryKey: containsQuery },
                { contactPerson: containsQuery },
              ],
            },
            take: limitPerEntity,
            orderBy: { createdAt: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              const exactName = r.name.toLowerCase() === lowerQ;
              let score = 50;
              if (exactRef) score = 100;
              else if (exactName) score = 90;
              else if (r.referenceNo.toUpperCase().startsWith(qUpper)) score = 80;
              else if (r.name.toLowerCase().includes(lowerQ)) score = 70;

              allResults.push({
                id: r.id,
                type: "VENDOR",
                typeLabel: "Vendor",
                title: r.name,
                subtitle: `Vendor ${r.referenceNo} • ${r.categoryKey} • ${r.phone}`,
                referenceNo: r.referenceNo,
                status: r.status,
                date: r.createdAt.toISOString(),
                matchedField: exactRef ? "Reference No" : "Vendor Name",
                href: `/procurement/vendors?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // 6. PURCHASE ORDERS
    if (canRead("procurement:read") && (!targetModule || targetModule === "PURCHASE_ORDERS" || targetModule === "PROCUREMENT" || priorityEntityType === "PURCHASE_ORDER")) {
      tasks.push(
        db.purchaseOrder
          .findMany({
            where: {
              OR: [{ referenceNo: containsQuery }, { status: containsQuery }, { notes: containsQuery }],
            },
            take: limitPerEntity,
            include: { vendor: { select: { name: true } }, project: { select: { title: true } } },
            orderBy: { createdAt: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              let score = exactRef ? 100 : r.referenceNo.toUpperCase().startsWith(qUpper) ? 80 : 60;

              const related: RelatedRecordRef[] = [];
              if (r.vendor) {
                related.push({ type: "Vendor", id: r.vendorId, title: r.vendor.name, href: `/procurement/vendors?id=${r.vendorId}` });
              }
              if (r.project) {
                related.push({ type: "Project", id: r.projectId!, title: r.project.title, href: `/projects?id=${r.projectId}` });
              }

              allResults.push({
                id: r.id,
                type: "PURCHASE_ORDER",
                typeLabel: "Purchase Order",
                title: `PO ${r.referenceNo}`,
                subtitle: `Vendor: ${r.vendor?.name || "N/A"} • ₹${r.grandTotal.toLocaleString("en-IN")} (${r.status})`,
                referenceNo: r.referenceNo,
                status: r.status,
                amount: r.grandTotal,
                date: r.poDate.toISOString(),
                matchedField: "Reference No",
                href: `/procurement/purchase-orders?id=${r.id}`,
                relevanceScore: score,
                relatedRecords: related,
              });
            });
          })
      );
    }

    // 7. MATERIAL REQUESTS
    if (canRead("procurement:read") && (!targetModule || targetModule === "MATERIAL_REQUESTS" || targetModule === "PROCUREMENT" || priorityEntityType === "MATERIAL_REQUEST")) {
      tasks.push(
        db.materialRequest
          .findMany({
            where: {
              OR: [{ referenceNo: containsQuery }, { priority: containsQuery }, { status: containsQuery }],
            },
            take: limitPerEntity,
            include: { project: { select: { title: true } } },
            orderBy: { createdAt: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              let score = exactRef ? 100 : r.referenceNo.toUpperCase().startsWith(qUpper) ? 80 : 60;

              allResults.push({
                id: r.id,
                type: "MATERIAL_REQUEST",
                typeLabel: "Material Request",
                title: `MR ${r.referenceNo}`,
                subtitle: `Priority: ${r.priority} • Status: ${r.status} ${r.project ? `(${r.project.title})` : ""}`,
                referenceNo: r.referenceNo,
                status: r.status,
                date: r.createdAt.toISOString(),
                matchedField: "Reference No",
                href: `/procurement/material-requests?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // 8. GOODS RECEIPTS
    if (canRead("procurement:read") && (!targetModule || targetModule === "GOODS_RECEIPTS" || targetModule === "PROCUREMENT" || priorityEntityType === "GOODS_RECEIPT")) {
      tasks.push(
        db.goodsReceipt
          .findMany({
            where: {
              OR: [{ referenceNo: containsQuery }, { deliveryReference: containsQuery }, { status: containsQuery }],
            },
            take: limitPerEntity,
            include: { vendor: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              let score = exactRef ? 100 : r.referenceNo.toUpperCase().startsWith(qUpper) ? 80 : 60;

              allResults.push({
                id: r.id,
                type: "GOODS_RECEIPT",
                typeLabel: "Goods Receipt",
                title: `GRN ${r.referenceNo}`,
                subtitle: `Vendor: ${r.vendor?.name || "N/A"} • Challan: ${r.deliveryReference || "N/A"} (${r.status})`,
                referenceNo: r.referenceNo,
                status: r.status,
                date: r.receivedDate.toISOString(),
                matchedField: "Reference No",
                href: `/procurement/goods-receipts?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // 9. MATERIALS
    if (canRead("inventory:read") && (!targetModule || targetModule === "MATERIALS" || targetModule === "INVENTORY" || priorityEntityType === "MATERIAL")) {
      tasks.push(
        db.material
          .findMany({
            where: {
              OR: [
                { materialCode: containsQuery },
                { name: containsQuery },
                { sku: containsQuery },
                { categoryKey: containsQuery },
                { description: containsQuery },
              ],
            },
            take: limitPerEntity,
            orderBy: { createdAt: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactCode = r.materialCode.toUpperCase() === qUpper;
              const exactName = r.name.toLowerCase() === lowerQ;
              let score = 50;
              if (exactCode) score = 100;
              else if (exactName) score = 90;
              else if (r.materialCode.toUpperCase().startsWith(qUpper)) score = 80;
              else if (r.name.toLowerCase().includes(lowerQ)) score = 70;

              allResults.push({
                id: r.id,
                type: "MATERIAL",
                typeLabel: "Material",
                title: r.name,
                subtitle: `Code: ${r.materialCode} • Category: ${r.categoryKey} • Cost: ₹${r.purchaseCost}`,
                referenceNo: r.materialCode,
                status: r.status,
                amount: r.purchaseCost,
                date: r.createdAt.toISOString(),
                matchedField: exactCode ? "Material Code" : "Material Name",
                href: `/inventory/materials?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // 10. CLIENT PAYMENTS
    if (canRead("finance:read") && (!targetModule || targetModule === "PAYMENTS" || targetModule === "FINANCE" || priorityEntityType === "CLIENT_PAYMENT")) {
      tasks.push(
        db.clientPayment
          .findMany({
            where: {
              OR: [{ referenceNo: containsQuery }, { referenceNoExt: containsQuery }, { notes: containsQuery }],
            },
            take: limitPerEntity,
            include: { project: { select: { title: true } }, client: { select: { fullName: true } } },
            orderBy: { paymentDate: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              let score = exactRef ? 100 : r.referenceNo.toUpperCase().startsWith(qUpper) ? 80 : 60;

              allResults.push({
                id: r.id,
                type: "CLIENT_PAYMENT",
                typeLabel: "Client Payment",
                title: `Payment ${r.referenceNo}`,
                subtitle: `Amount: ₹${r.amount.toLocaleString("en-IN")} via ${r.paymentMethod} • ${r.client?.fullName || r.project?.title || "N/A"}`,
                referenceNo: r.referenceNo,
                status: r.status,
                amount: r.amount,
                date: r.paymentDate.toISOString(),
                matchedField: "Reference No",
                href: `/finance/payments?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // 11. EXPENSES
    if (canRead("finance:read") && (!targetModule || targetModule === "EXPENSES" || targetModule === "FINANCE" || priorityEntityType === "EXPENSE")) {
      tasks.push(
        db.expense
          .findMany({
            where: {
              OR: [
                { referenceNo: containsQuery },
                { description: containsQuery },
                { vendorName: containsQuery },
                { categoryKey: containsQuery },
              ],
            },
            take: limitPerEntity,
            orderBy: { expenseDate: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              let score = exactRef ? 100 : r.referenceNo.toUpperCase().startsWith(qUpper) ? 80 : 60;

              allResults.push({
                id: r.id,
                type: "EXPENSE",
                typeLabel: "Expense",
                title: `Expense ${r.referenceNo}`,
                subtitle: `${r.description} (₹${r.amount.toLocaleString("en-IN")}) • Status: ${r.status}`,
                referenceNo: r.referenceNo,
                status: r.status,
                amount: r.amount,
                date: r.expenseDate.toISOString(),
                matchedField: "Reference No",
                href: `/finance/expenses?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // 12. PETTY CASH & EMPLOYEE ADVANCES
    if (canRead("finance:read") && (!targetModule || targetModule === "PETTY_CASH" || targetModule === "FINANCE" || priorityEntityType === "PETTY_CASH")) {
      tasks.push(
        db.employeeAdvance
          .findMany({
            where: {
              OR: [{ referenceNo: containsQuery }, { purpose: containsQuery }, { status: containsQuery }],
            },
            take: limitPerEntity,
            include: { employee: { select: { fullName: true } } },
            orderBy: { createdAt: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.referenceNo.toUpperCase() === qUpper;
              let score = exactRef ? 100 : r.referenceNo.toUpperCase().startsWith(qUpper) ? 80 : 60;

              allResults.push({
                id: r.id,
                type: "PETTY_CASH",
                typeLabel: "Employee Advance",
                title: `Advance ${r.referenceNo}`,
                subtitle: `${r.employee.fullName}: ${r.purpose} (₹${r.amount.toLocaleString("en-IN")})`,
                referenceNo: r.referenceNo,
                status: r.status,
                amount: r.amount,
                date: r.issuedDate.toISOString(),
                matchedField: "Reference No",
                href: `/finance/petty-cash?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // 13. GST INVOICES
    if (canRead("finance:read") && (!targetModule || targetModule === "INVOICES" || targetModule === "FINANCE" || priorityEntityType === "GST_INVOICE")) {
      tasks.push(
        db.gstInvoice
          .findMany({
            where: {
              OR: [{ invoiceNo: containsQuery }, { customerName: containsQuery }, { customerGstin: containsQuery }],
            },
            take: limitPerEntity,
            orderBy: { invoiceDate: "desc" },
          })
          .then((records) => {
            records.forEach((r) => {
              const exactRef = r.invoiceNo.toUpperCase() === qUpper;
              let score = exactRef ? 100 : r.invoiceNo.toUpperCase().startsWith(qUpper) ? 80 : 60;

              allResults.push({
                id: r.id,
                type: "GST_INVOICE",
                typeLabel: "GST Invoice",
                title: `Invoice ${r.invoiceNo}`,
                subtitle: `${r.customerName} • Grand Total: ₹${r.grandTotal.toLocaleString("en-IN")} (${r.status})`,
                referenceNo: r.invoiceNo,
                status: r.status,
                amount: r.grandTotal,
                date: r.invoiceDate.toISOString(),
                matchedField: "Invoice No",
                href: `/finance/invoices?id=${r.id}`,
                relevanceScore: score,
              });
            });
          })
      );
    }

    // Wait for all queries to finish
    await Promise.all(tasks);

    // Sort results by relevance score descending
    allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Calculate module counts
    const moduleCounts: Record<string, number> = {};
    allResults.forEach((r) => {
      moduleCounts[r.typeLabel] = (moduleCounts[r.typeLabel] || 0) + 1;
    });

    const totalResults = allResults.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paginatedResults = allResults.slice(offset, offset + limit);

    return {
      query: cleanQuery,
      totalResults,
      moduleCounts,
      didYouMean,
      results: paginatedResults,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
