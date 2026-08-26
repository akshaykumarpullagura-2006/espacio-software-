import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { SettingsService } from "../settings/settings.service";
import { CompanyService } from "../settings/company.service";
import { DocumentService } from "../documents/document.service";
import { NotificationEngine } from "../notifications/notification-engine";

export interface CreateInvoiceItemInput {
  description: string;
  hsnSacCode?: string;
  quantity: number;
  unitKey?: string;
  unitRate: number;
  discount?: number;
  gstRate?: number;
}

export interface CreateInvoiceInput {
  clientId?: string;
  projectId?: string;
  quotationId?: string;
  milestoneId?: string;
  customerName: string;
  customerGstin?: string;
  customerAddress?: string;
  placeOfSupply?: string;
  stateCode?: string;
  isInterState?: boolean;
  invoiceDate?: Date | string;
  dueDate?: Date | string;
  status?: "DRAFT" | "PENDING_APPROVAL" | "ISSUED";
  notes?: string;
  items: CreateInvoiceItemInput[];
  createdById?: string;
  allowOverBilling?: boolean;
}

export interface UpdateInvoiceInput {
  customerName?: string;
  customerGstin?: string;
  customerAddress?: string;
  placeOfSupply?: string;
  stateCode?: string;
  isInterState?: boolean;
  dueDate?: Date | string;
  notes?: string;
  items?: CreateInvoiceItemInput[];
}

export interface InvoiceFilterParams {
  status?: string;
  clientId?: string;
  projectId?: string;
  quotationId?: string;
  overdueOnly?: boolean;
  search?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
}

export class GstInvoiceService {
  /**
   * Round money to 2 decimal places with financial precision.
   */
  public static roundMoney(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  /**
   * Validates and computes all line items, tax components, and grand totals.
   */
  public static calculateInvoiceTotals(
    items: CreateInvoiceItemInput[],
    isInterState: boolean,
    defaultGstRate: number = 18
  ) {
    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const processedItems = items.map((item) => {
      const qty = Math.max(0, item.quantity);
      const rate = Math.max(0, item.unitRate);
      const disc = Math.max(0, item.discount ?? 0);
      const lineTaxable = this.roundMoney(Math.max(0, qty * rate - disc));
      const gstRate = item.gstRate !== undefined ? item.gstRate : defaultGstRate;

      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;

      if (gstRate > 0) {
        if (isInterState) {
          lineIgst = this.roundMoney((lineTaxable * gstRate) / 100);
        } else {
          const halfRate = gstRate / 2;
          lineCgst = this.roundMoney((lineTaxable * halfRate) / 100);
          lineSgst = this.roundMoney((lineTaxable * halfRate) / 100);
        }
      }

      taxableAmount = this.roundMoney(taxableAmount + lineTaxable);
      cgstAmount = this.roundMoney(cgstAmount + lineCgst);
      sgstAmount = this.roundMoney(sgstAmount + lineSgst);
      igstAmount = this.roundMoney(igstAmount + lineIgst);

      return {
        description: item.description.trim(),
        hsnSacCode: item.hsnSacCode ?? "995476",
        quantity: qty,
        unitKey: item.unitKey ?? "NOS",
        unitRate: rate,
        amount: this.roundMoney(qty * rate),
        discount: disc,
        taxableValue: lineTaxable,
        gstRate,
        cgstRate: isInterState ? 0 : gstRate / 2,
        cgstAmount: lineCgst,
        sgstRate: isInterState ? 0 : gstRate / 2,
        sgstAmount: lineSgst,
        igstRate: isInterState ? gstRate : 0,
        igstAmount: lineIgst,
        totalAmount: this.roundMoney(lineTaxable + lineCgst + lineSgst + lineIgst),
      };
    });

    const totalTax = this.roundMoney(cgstAmount + sgstAmount + igstAmount);
    const rawGrandTotal = this.roundMoney(taxableAmount + totalTax);
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = this.roundMoney(grandTotal - rawGrandTotal);

    return {
      processedItems,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      roundOff,
      grandTotal,
    };
  }

  /**
   * Retrieves the current billable summary for a project or quotation.
   */
  public static async getBillableSummary(options: { projectId?: string; quotationId?: string }) {
    let approvedValue = 0;

    if (options.quotationId) {
      const quotation = await db.quotation.findUnique({
        where: { id: options.quotationId },
        select: { totalAmount: true, status: true },
      });
      if (quotation && quotation.status === "APPROVED") {
        approvedValue = quotation.totalAmount;
      }
    } else if (options.projectId) {
      const project = await db.project.findUnique({
        where: { id: options.projectId },
        select: { contractValue: true },
      });
      if (project) {
        approvedValue = project.contractValue || 0;
      }
    }

    // Calculate total already invoiced (excluding CANCELLED/VOID)
    const existingInvoices = await db.gstInvoice.findMany({
      where: {
        OR: [
          options.projectId ? { projectId: options.projectId } : {},
          options.quotationId ? { quotationId: options.quotationId } : {},
        ],
        status: { notIn: ["CANCELLED", "VOID"] },
      },
      select: { grandTotal: true },
    });

    const totalInvoiced = existingInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const remainingBillable = Math.max(0, approvedValue - totalInvoiced);

    return {
      approvedValue,
      totalInvoiced,
      remainingBillable,
    };
  }

  /**
   * Create a new Commercial GST Invoice.
   */
  public static async createInvoice(input: CreateInvoiceInput) {
    if (!input.customerName || !input.items || input.items.length === 0) {
      throw new ValidationError("Customer name and at least one line item are required");
    }

    let invoiceNo: string;
    try {
      invoiceNo = await IdGeneratorService.generate("INV");
    } catch {
      const year = new Date().getFullYear();
      const count = await db.gstInvoice.count();
      invoiceNo = `INV-${year}-${(count + 1).toString().padStart(4, "0")}`;
    }

    const defaultGstRate = (await SettingsService.getBusinessPreferences()).gstRate || 18;
    const isInterState = input.isInterState ?? false;

    const totals = this.calculateInvoiceTotals(input.items, isInterState, defaultGstRate);

    // Over-Invoicing Check
    if ((input.projectId || input.quotationId) && !input.allowOverBilling) {
      const billable = await this.getBillableSummary({
        projectId: input.projectId,
        quotationId: input.quotationId,
      });

      if (billable.approvedValue > 0 && billable.totalInvoiced + totals.grandTotal > billable.approvedValue + 1.0) {
        throw new BusinessRuleError(
          `Over-invoicing blocked: Invoicing ₹${totals.grandTotal.toLocaleString("en-IN")} exceeds remaining billable value of ₹${billable.remainingBillable.toLocaleString("en-IN")} (Approved: ₹${billable.approvedValue.toLocaleString("en-IN")}, Already Invoiced: ₹${billable.totalInvoiced.toLocaleString("en-IN")}).`
        );
      }
    }

    const targetStatus = input.status ?? "ISSUED";
    const invoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : new Date();

    const invoice = await db.$transaction(async (tx) => {
      const created = await tx.gstInvoice.create({
        data: {
          invoiceNo,
          invoiceDate,
          clientId: input.clientId ?? null,
          projectId: input.projectId ?? null,
          quotationId: input.quotationId ?? null,
          customerName: input.customerName.trim(),
          customerGstin: input.customerGstin?.trim() || null,
          customerAddress: input.customerAddress?.trim() || null,
          stateCode: input.stateCode ?? "36", // Default Telangana
          placeOfSupply: input.placeOfSupply ?? "Telangana",
          isInterState,
          taxableAmount: totals.taxableAmount,
          cgstAmount: totals.cgstAmount,
          sgstAmount: totals.sgstAmount,
          igstAmount: totals.igstAmount,
          totalTax: totals.totalTax,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          paidAmount: 0,
          outstandingAmount: totals.grandTotal,
          status: targetStatus,
          notes: input.notes ?? null,
          createdById: input.createdById ?? null,
          items: {
            create: totals.processedItems,
          },
        },
        include: {
          items: true,
          client: true,
          project: true,
          quotation: true,
        },
      });

      // If status is ISSUED, create/link canonical ClientReceivable
      if (targetStatus === "ISSUED") {
        const receivableNo = await IdGeneratorService.generate("REC");
        const dueDate = input.dueDate ? new Date(input.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await tx.clientReceivable.create({
          data: {
            receivableNo,
            clientId: created.clientId,
            projectId: created.projectId,
            milestoneId: input.milestoneId ?? null,
            referenceNo: created.invoiceNo,
            amount: created.grandTotal,
            paidAmount: 0,
            outstandingAmount: created.grandTotal,
            dueDate,
            status: "OPEN",
            notes: `Auto-generated receivable for Tax Invoice ${created.invoiceNo}`,
            createdById: input.createdById ?? null,
          },
        });
      }

      return created;
    });

    await AuditService.logEvent({
      userId: input.createdById,
      action: "INVOICE_CREATED",
      entityType: "GstInvoice",
      entityId: invoice.id,
      newValues: {
        invoiceNo: invoice.invoiceNo,
        grandTotal: invoice.grandTotal,
        customerName: invoice.customerName,
        status: invoice.status,
      },
    });

    return invoice;
  }

  /**
   * Update an existing DRAFT invoice.
   */
  public static async updateDraftInvoice(id: string, input: UpdateInvoiceInput, actorId?: string) {
    const existing = await db.gstInvoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new NotFoundError("Invoice not found");

    if (existing.status !== "DRAFT" && existing.status !== "PENDING_APPROVAL") {
      throw new BusinessRuleError(`Cannot edit invoice with status ${existing.status}. Only DRAFT invoices may be modified.`);
    }

    const defaultGstRate = (await SettingsService.getBusinessPreferences()).gstRate || 18;
    const isInterState = input.isInterState ?? existing.isInterState;

    const itemsToCalculate = input.items || existing.items.map((i) => ({
      description: i.description,
      hsnSacCode: i.hsnSacCode || undefined,
      quantity: i.quantity,
      unitKey: i.unitKey,
      unitRate: i.unitRate,
      discount: i.discount,
      gstRate: i.gstRate,
    }));

    const totals = this.calculateInvoiceTotals(itemsToCalculate, isInterState, defaultGstRate);

    const updated = await db.$transaction(async (tx) => {
      if (input.items && input.items.length > 0) {
        await tx.gstInvoiceItem.deleteMany({ where: { invoiceId: id } });
        await tx.gstInvoiceItem.createMany({
          data: totals.processedItems.map((item) => ({
            ...item,
            invoiceId: id,
          })),
        });
      }

      return tx.gstInvoice.update({
        where: { id },
        data: {
          customerName: input.customerName?.trim() || undefined,
          customerGstin: input.customerGstin !== undefined ? input.customerGstin.trim() : undefined,
          customerAddress: input.customerAddress !== undefined ? input.customerAddress.trim() : undefined,
          placeOfSupply: input.placeOfSupply || undefined,
          stateCode: input.stateCode || undefined,
          isInterState,
          taxableAmount: totals.taxableAmount,
          cgstAmount: totals.cgstAmount,
          sgstAmount: totals.sgstAmount,
          igstAmount: totals.igstAmount,
          totalTax: totals.totalTax,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          outstandingAmount: totals.grandTotal - existing.paidAmount,
          notes: input.notes !== undefined ? input.notes : undefined,
        },
        include: { items: true, client: true, project: true },
      });
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "INVOICE_UPDATED",
      entityType: "GstInvoice",
      entityId: id,
      newValues: { grandTotal: updated.grandTotal, invoiceNo: updated.invoiceNo },
    });

    return updated;
  }

  /**
   * Approve a pending invoice and issue it.
   */
  public static async approveInvoice(id: string, approverId: string) {
    const existing = await db.gstInvoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Invoice not found");

    if (existing.status === "ISSUED" || existing.status === "PAID") {
      return existing;
    }

    const updated = await db.$transaction(async (tx) => {
      const inv = await tx.gstInvoice.update({
        where: { id },
        data: { status: "ISSUED" },
        include: { items: true, client: true, project: true },
      });

      // Ensure receivable exists
      const existingRec = await tx.clientReceivable.findFirst({
        where: { referenceNo: inv.invoiceNo },
      });

      if (!existingRec) {
        const receivableNo = await IdGeneratorService.generate("REC");
        await tx.clientReceivable.create({
          data: {
            receivableNo,
            clientId: inv.clientId,
            projectId: inv.projectId,
            referenceNo: inv.invoiceNo,
            amount: inv.grandTotal,
            paidAmount: inv.paidAmount,
            outstandingAmount: inv.outstandingAmount,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: inv.outstandingAmount === 0 ? "PAID" : "OPEN",
            notes: `Auto-generated receivable for Tax Invoice ${inv.invoiceNo}`,
            createdById: approverId,
          },
        });
      }

      return inv;
    });

    await AuditService.logEvent({
      userId: approverId,
      action: "INVOICE_APPROVED",
      entityType: "GstInvoice",
      entityId: id,
      newValues: { status: "ISSUED", approvedBy: approverId },
    });

    return updated;
  }

  /**
   * Issue a draft invoice.
   */
  public static async issueInvoice(id: string, actorId: string, dueDate?: Date) {
    return this.approveInvoice(id, actorId);
  }

  /**
   * Void/Cancel a finalized invoice with reason.
   */
  public static async voidInvoice(id: string, reason: string, actorId: string) {
    const existing = await db.gstInvoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Invoice not found");

    if (existing.paidAmount > 0) {
      throw new BusinessRuleError(`Cannot void invoice ${existing.invoiceNo} because ₹${existing.paidAmount.toLocaleString("en-IN")} has already been collected against it. Please reverse payments first.`);
    }

    const updated = await db.$transaction(async (tx) => {
      const inv = await tx.gstInvoice.update({
        where: { id },
        data: {
          status: "CANCELLED",
          notes: existing.notes ? `${existing.notes} | VOIDED: ${reason}` : `VOIDED: ${reason}`,
        },
      });

      // Cancel corresponding receivable
      await tx.clientReceivable.updateMany({
        where: { referenceNo: existing.invoiceNo },
        data: { status: "CANCELLED", notes: `Cancelled due to voided Invoice ${existing.invoiceNo}: ${reason}` },
      });

      return inv;
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "INVOICE_VOIDED",
      entityType: "GstInvoice",
      entityId: id,
      newValues: { invoiceNo: existing.invoiceNo, status: "CANCELLED", reason },
    });

    return updated;
  }

  /**
   * Create Credit Note / Adjustment for an Invoice.
   */
  public static async createCreditNote(
    invoiceId: string,
    input: { amount: number; reason: string; taxRate?: number },
    actorId: string
  ) {
    const invoice = await db.gstInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundError("Invoice not found");

    const creditAmount = Math.min(invoice.outstandingAmount, Math.max(0, input.amount));
    const newOutstanding = Math.max(0, invoice.outstandingAmount - creditAmount);

    const updated = await db.$transaction(async (tx) => {
      const inv = await tx.gstInvoice.update({
        where: { id: invoiceId },
        data: {
          outstandingAmount: newOutstanding,
          status: newOutstanding === 0 && invoice.paidAmount > 0 ? "PAID" : invoice.status,
          notes: invoice.notes ? `${invoice.notes} | Credit Note: ₹${creditAmount} (${input.reason})` : `Credit Note: ₹${creditAmount} (${input.reason})`,
        },
      });

      await tx.clientReceivable.updateMany({
        where: { referenceNo: invoice.invoiceNo },
        data: {
          outstandingAmount: newOutstanding,
          status: newOutstanding === 0 ? "PAID" : "OPEN",
        },
      });

      return inv;
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "CREDIT_NOTE_CREATED",
      entityType: "GstInvoice",
      entityId: invoiceId,
      newValues: { invoiceNo: invoice.invoiceNo, creditAmount, reason: input.reason },
    });

    return updated;
  }

  /**
   * Search and filter invoices with server-side pagination.
   */
  public static async getInvoices(filter?: InvoiceFilterParams) {
    const where: any = {};

    if (filter?.status && filter.status !== "ALL") {
      where.status = filter.status;
    }
    if (filter?.clientId) where.clientId = filter.clientId;
    if (filter?.projectId) where.projectId = filter.projectId;
    if (filter?.quotationId) where.quotationId = filter.quotationId;

    if (filter?.startDate || filter?.endDate) {
      where.invoiceDate = {};
      if (filter.startDate) where.invoiceDate.gte = new Date(filter.startDate);
      if (filter.endDate) where.invoiceDate.lte = new Date(filter.endDate);
    }

    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { invoiceNo: { contains: q } },
        { customerName: { contains: q } },
        { customerGstin: { contains: q } },
        { client: { fullName: { contains: q } } },
        { project: { title: { contains: q } } },
      ];
    }

    const invoices = await db.gstInvoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, referenceNo: true, fullName: true, phone: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
        quotation: { select: { id: true, referenceNo: true, totalAmount: true } },
        items: true,
        payments: {
          select: { id: true, referenceNo: true, amount: true, paymentDate: true, paymentMethod: true, status: true },
        },
      },
    });

    const now = new Date();
    return invoices.map((inv) => {
      let dynamicStatus = inv.status;
      if (inv.status === "ISSUED" && inv.outstandingAmount > 0) {
        // Look up corresponding receivable due date
        // Mark dynamic overdue if needed
      }
      return {
        ...inv,
        isOverdue: inv.outstandingAmount > 0 && inv.status !== "CANCELLED",
      };
    });
  }

  /**
   * Get invoice by ID with complete relations.
   */
  public static async getInvoiceById(id: string) {
    const invoice = await db.gstInvoice.findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
        quotation: true,
        items: true,
        payments: true,
      },
    });

    if (!invoice) throw new NotFoundError("GST Invoice not found");
    return invoice;
  }

  /**
   * Generates GST summary metrics for tax reporting.
   */
  public static async getGstSummary(startDate?: Date | string, endDate?: Date | string) {
    const where: any = {
      status: { notIn: ["CANCELLED", "VOID", "DRAFT"] },
    };

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    const invoices = await db.gstInvoice.findMany({
      where,
      select: {
        id: true,
        taxableAmount: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        totalTax: true,
        grandTotal: true,
        customerGstin: true,
        isInterState: true,
      },
    });

    const summary = invoices.reduce(
      (acc, inv) => {
        acc.totalTaxableValue = this.roundMoney(acc.totalTaxableValue + inv.taxableAmount);
        acc.totalCgst = this.roundMoney(acc.totalCgst + inv.cgstAmount);
        acc.totalSgst = this.roundMoney(acc.totalSgst + inv.sgstAmount);
        acc.totalIgst = this.roundMoney(acc.totalIgst + inv.igstAmount);
        acc.totalTax = this.roundMoney(acc.totalTax + inv.totalTax);
        acc.totalGrandTotal = this.roundMoney(acc.totalGrandTotal + inv.grandTotal);

        if (inv.customerGstin) {
          acc.b2bInvoicesCount++;
          acc.b2bTaxableValue = this.roundMoney(acc.b2bTaxableValue + inv.taxableAmount);
        } else {
          acc.b2cInvoicesCount++;
          acc.b2cTaxableValue = this.roundMoney(acc.b2cTaxableValue + inv.taxableAmount);
        }

        return acc;
      },
      {
        totalTaxableValue: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        totalTax: 0,
        totalGrandTotal: 0,
        invoiceCount: invoices.length,
        b2bInvoicesCount: 0,
        b2bTaxableValue: 0,
        b2cInvoicesCount: 0,
        b2cTaxableValue: 0,
      }
    );

    return summary;
  }

  /**
   * Generates Invoice Dashboard KPI metrics.
   */
  public static async getInvoiceDashboardMetrics() {
    const [allInvoices, draftCount, pendingApprovalCount] = await Promise.all([
      db.gstInvoice.findMany({
        select: { grandTotal: true, paidAmount: true, outstandingAmount: true, status: true, invoiceDate: true },
      }),
      db.gstInvoice.count({ where: { status: "DRAFT" } }),
      db.gstInvoice.count({ where: { status: "PENDING_APPROVAL" } }),
    ]);

    const activeInvoices = allInvoices.filter((i) => i.status !== "CANCELLED" && i.status !== "DRAFT");
    const totalInvoiced = activeInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
    const totalCollected = activeInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalOutstanding = activeInvoices.reduce((sum, i) => sum + i.outstandingAmount, 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thisMonthInvoiced = activeInvoices
      .filter((i) => {
        const d = new Date(i.invoiceDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, i) => sum + i.grandTotal, 0);

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      thisMonthInvoiced,
      totalInvoicesCount: allInvoices.length,
      draftCount,
      pendingApprovalCount,
      issuedCount: activeInvoices.filter((i) => i.status === "ISSUED").length,
      paidCount: activeInvoices.filter((i) => i.status === "PAID").length,
    };
  }

  /**
   * Generates invoice PDF HTML and links it to the central Document repository (Prompt 13).
   */
  public static async generateAndLinkInvoiceDocument(invoiceId: string, actorId: string) {
    const invoice = await this.getInvoiceById(invoiceId);
    const company = await CompanyService.getCompanyProfile();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TAX INVOICE - ${invoice.invoiceNo}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; font-size: 12px; color: #1e293b; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #047857; padding-bottom: 15px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: bold; color: #047857; }
    .meta-table, .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .items-table th, .items-table td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    .items-table th { background-color: #f1f5f9; font-weight: bold; }
    .total-row { font-weight: bold; background-color: #f8fafc; }
    .footer { margin-top: 30px; font-size: 10px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${company.companyName}</div>
      <div>${company.legalName || ""}</div>
      <div>${company.addressLine || ""}, ${company.city || ""} ${company.postalCode || ""}</div>
      <div>GSTIN: <strong>${company.gstin || "29ABCDE1234F1ZH"}</strong> | Email: ${company.email || ""}</div>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; color: #047857;">TAX INVOICE</h2>
      <div><strong>Invoice No:</strong> ${invoice.invoiceNo}</div>
      <div><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</div>
      <div><strong>Place of Supply:</strong> ${invoice.placeOfSupply}</div>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td><strong>Billed To:</strong> ${invoice.customerName}</td>
      <td><strong>Client GSTIN:</strong> ${invoice.customerGstin || "N/A"}</td>
    </tr>
    <tr>
      <td><strong>Customer Address:</strong> ${invoice.customerAddress || "N/A"}</td>
      <td><strong>Tax Type:</strong> ${invoice.isInterState ? "IGST (Inter-State)" : "CGST + SGST (Intra-State)"}</td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>HSN/SAC</th>
        <th>Qty</th>
        <th>Rate (₹)</th>
        <th>Discount (₹)</th>
        <th>Taxable Value (₹)</th>
        <th>GST Rate</th>
        <th>Tax Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items
        .map(
          (item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.description}</td>
          <td>${item.hsnSacCode || "995476"}</td>
          <td>${item.quantity} ${item.unitKey}</td>
          <td>${item.unitRate.toLocaleString("en-IN")}</td>
          <td>${item.discount.toLocaleString("en-IN")}</td>
          <td>${item.taxableValue.toLocaleString("en-IN")}</td>
          <td>${item.gstRate}%</td>
          <td>${(item.cgstAmount + item.sgstAmount + item.igstAmount).toLocaleString("en-IN")}</td>
        </tr>`
        )
        .join("")}
      <tr class="total-row">
        <td colspan="6" style="text-align: right;">Subtotal Taxable Amount:</td>
        <td colspan="3">₹${invoice.taxableAmount.toLocaleString("en-IN")}</td>
      </tr>
      ${
        invoice.isInterState
          ? `<tr class="total-row"><td colspan="6" style="text-align: right;">IGST Total:</td><td colspan="3">₹${invoice.igstAmount.toLocaleString("en-IN")}</td></tr>`
          : `<tr class="total-row"><td colspan="6" style="text-align: right;">CGST Total:</td><td colspan="3">₹${invoice.cgstAmount.toLocaleString("en-IN")}</td></tr>
             <tr class="total-row"><td colspan="6" style="text-align: right;">SGST Total:</td><td colspan="3">₹${invoice.sgstAmount.toLocaleString("en-IN")}</td></tr>`
      }
      <tr class="total-row" style="font-size: 14px; color: #047857;">
        <td colspan="6" style="text-align: right;">GRAND TOTAL:</td>
        <td colspan="3">₹${invoice.grandTotal.toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    This is a computer-generated tax invoice. Thank you for doing business with ${company.companyName}!
  </div>
</body>
</html>
    `;

    const fileBuffer = Buffer.from(htmlContent, "utf-8");
    const doc = await DocumentService.createDocument({
      name: `Tax Invoice ${invoice.invoiceNo}`,
      description: `Official generated tax invoice document for ${invoice.customerName}`,
      type: "INVOICE",
      category: "FINANCE",
      createdById: actorId,
      projectId: invoice.projectId || undefined,
      clientId: invoice.clientId || undefined,
      sourceType: "GST_INVOICE",
      sourceId: invoice.id,
      entityType: "GST_INVOICE",
      entityId: invoice.id,
      fileBuffer,
      originalFileName: `Tax_Invoice_${invoice.invoiceNo}.html`,
      mimeType: "text/html",
      tags: ["Invoice", "GST", "Official"],
    });

    return { invoice, document: doc, htmlContent };
  }
}
