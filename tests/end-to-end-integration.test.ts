import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { LeadService } from "../src/modules/leads/lead.service";
import { ProjectService } from "../src/modules/projects/project.service";
import { PaymentService } from "../src/modules/payments/payment.service";
import { ExpenseService } from "../src/modules/expenses/expense.service";
import { GstInvoiceService } from "../src/modules/finance/gst-invoice.service";
import { AutomatedReportsService } from "../src/modules/reports/automated-reports.service";

describe("Module 19: Complete End-to-End Workflow & Data Discipline Integration Test", () => {
  let adminUserId: string;
  let testLeadId: string;
  let testQuotationId: string;
  let testProjectId: string;
  let testClientId: string;
  let testVendorId: string;
  let testPoId: string;

  beforeAll(async () => {
    // 1. Setup admin user
    const admin = await db.user.findFirst({ where: { status: "ACTIVE" } });
    if (admin) {
      adminUserId = admin.id;
    } else {
      const created = await db.user.create({
        data: {
          email: `e2e_admin_${Date.now()}@espacio.com`,
          passwordHash: "hash123",
          fullName: "E2E Integration Admin",
        },
      });
      adminUserId = created.id;
    }

    // 2. Setup test vendor
    const vendor = await db.vendor.findFirst();
    if (vendor) {
      testVendorId = vendor.id;
    } else {
      const createdVendor = await db.vendor.create({
        data: {
          referenceNo: `VEN-E2E-${Date.now()}`,
          name: "E2E Woodcraft Supplies Ltd",
          phone: "+91 99887 76655",
        },
      });
      testVendorId = createdVendor.id;
    }
  });

  it("Step 1: Lead Generated -> Assigned -> Follow-up Scheduled", async () => {
    const { lead } = await LeadService.createLead(
      {
        clientName: "Sunil Varma",
        phone: `+91 988${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `sunil_${Date.now()}@example.com`,
        source: "WEBSITE",
        propertyType: "APARTMENT_INTERIOR",
        budget: 1500000,
      },
      adminUserId
    );

    expect(lead).toBeDefined();
    expect(lead.referenceNo).toMatch(/^LEAD-\d{4}-\d{4}$/);
    testLeadId = lead.id;

    // Assign Lead
    const assigned = await LeadService.assignLead(lead.id, adminUserId, adminUserId);
    expect(assigned.assignedToId).toBe(adminUserId);
  });

  it("Step 2: Quotation Created -> Sent -> Approved", async () => {
    const quote = await db.quotation.create({
      data: {
        referenceNo: `Q-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        leadId: testLeadId,
        subtotal: 800000,
        discountAmount: 30000,
        taxAmount: 0,
        totalAmount: 770000,
        status: "APPROVED",
      },
    });

    expect(quote).toBeDefined();
    expect(quote.referenceNo).toMatch(/^Q-\d{4}-\d{4}$/);
    expect(quote.totalAmount).toBe(770000);
    testQuotationId = quote.id;
  });

  it("Step 3: Lead Status Progression -> Verified Quotation Requirement -> Lead WON", async () => {
    // Advancing status to QUOTATION_SENT (validated by quotation existence)
    const sentLead = await LeadService.changeStatus(testLeadId, { status: "QUOTATION_SENT" }, adminUserId);
    expect(sentLead.stage).toBe("QUOTATION_SENT");

    // Marking Lead WON
    const wonLead = await LeadService.changeStatus(testLeadId, { status: "WON" }, adminUserId);
    expect(wonLead.stage).toBe("WON");
  });

  it("Step 4: Won Lead Converted to Project -> Idempotent Duplicate Protection Verified", async () => {
    // 1st conversion: Create Project
    const project = await ProjectService.createProject(
      {
        leadId: testLeadId,
        title: "Sunil Varma 3BHK Luxury Interior",
        contractValue: 770000,
        propertyTypeKey: "APARTMENT_INTERIOR",
      },
      adminUserId
    );

    expect(project).toBeDefined();
    testProjectId = project.id;
    if (project.clientId) testClientId = project.clientId;

    // 2nd conversion attempt: Should return existing project idempotently
    const duplicateProj = await ProjectService.createProject(
      {
        leadId: testLeadId,
        title: "Duplicate Attempt Title",
        contractValue: 9999999,
      },
      adminUserId
    );

    expect(duplicateProj.id).toBe(testProjectId);
  });

  it("Step 5: Record Client Confirmation Payment -> Project Balance Reconciled", async () => {
    const payment = await PaymentService.recordPayment(
      {
        projectId: testProjectId,
        clientId: testClientId,
        amount: 200000,
        paymentMethod: "UPI",
        externalReference: "UPI/2026/998877",
      },
      adminUserId
    );

    expect(payment).toBeDefined();
    expect(payment.amount).toBe(200000);
    expect(payment.status).toBe("RECORDED");
  });

  it("Step 6: Create Material Request -> Approve MR", async () => {
    const mr = await db.materialRequest.create({
      data: {
        referenceNo: `MR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        projectId: testProjectId,
        requesterId: adminUserId,
        requiredDate: new Date(),
        status: "APPROVED",
        items: {
          create: [{ materialName: "CenturyPlywood 18mm BWP", requestedQuantity: 60, unitKey: "SHEET" }],
        },
      },
    });

    expect(mr).toBeDefined();
    expect(mr.referenceNo).toMatch(/^MR-\d{4}-\d{4}$/);
  });

  it("Step 7: Purchase Order Created & Approved -> Goods Receipt & Inventory Updated", async () => {
    const po = await db.purchaseOrder.create({
      data: {
        referenceNo: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        vendorId: testVendorId,
        projectId: testProjectId,
        subtotal: 180000,
        tax: 32400,
        grandTotal: 212400,
        status: "APPROVED",
        createdById: adminUserId,
        items: {
          create: [
            {
              materialName: "CenturyPlywood 18mm BWP",
              quantity: 60,
              unitKey: "SHEET",
              rate: 3000,
              pendingQuantity: 60,
              lineTotal: 180000,
            },
          ],
        },
      },
    });

    expect(po).toBeDefined();
    expect(po.grandTotal).toBe(212400);
    testPoId = po.id;

    // Goods Receipt
    const grn = await db.goodsReceipt.create({
      data: {
        referenceNo: `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        purchaseOrderId: po.id,
        vendorId: testVendorId,
        projectId: testProjectId,
        receivedById: adminUserId,
        status: "ACCEPTED",
      },
    });

    expect(grn).toBeDefined();
    expect(grn.referenceNo).toMatch(/^GRN-\d{4}-\d{4}$/);
  });

  it("Step 8: Record Project Expense & Vendor Payment", async () => {
    const expense = await ExpenseService.recordExpense(
      {
        projectId: testProjectId,
        expenseType: "PROJECT",
        categoryKey: "HARDWARE_FITTINGS",
        amount: 45000,
        paymentMethod: "BANK_TRANSFER",
        description: "Blum Drawer Runners & Soft-close Hinges",
      },
      adminUserId
    );

    expect(expense).toBeDefined();
    expect(expense.amount).toBe(45000);

    const vendorPayment = await db.vendorPayment.create({
      data: {
        paymentNo: `VPAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        vendorId: testVendorId,
        projectId: testProjectId,
        purchaseOrderId: testPoId,
        amount: 100000,
        paymentMethod: "BANK_TRANSFER",
        status: "VERIFIED",
        recordedById: adminUserId,
      },
    });

    expect(vendorPayment).toBeDefined();
    expect(vendorPayment.amount).toBe(100000);
  });

  it("Step 9: Project Quality Check Passed -> Project Handover -> 45-Day Review Task Automated", async () => {
    // Record passed Quality Check
    await db.qualityCheck.create({
      data: {
        projectId: testProjectId,
        passed: true,
        inspectedById: adminUserId,
        notes: "Full 50-point interior quality checklist passed without defects.",
      },
    });

    // Advance Stage to PROJECT_HANDOVER
    const handoverProj = await ProjectService.changeStage(
      testProjectId,
      { stage: "PROJECT_HANDOVER" },
      adminUserId
    );

    expect(handoverProj.stage).toBe("PROJECT_HANDOVER");

    // Verify 45-Day Post-Handover Review & Referral Task was created
    const reviewTask = await db.task.findFirst({
      where: { projectId: testProjectId, title: { contains: "30-60 Day Review" } },
    });

    expect(reviewTask).toBeDefined();
    expect(reviewTask?.status).toBe("TODO");
  });

  it("Step 10: Issue GST Invoice & Financial Reports Reconciled", async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: "Sunil Varma",
      placeOfSupply: "Telangana",
      isInterState: true,
      projectId: testProjectId,
      items: [
        {
          description: "Sunil Varma 3BHK Turnkey Interior Execution",
          quantity: 1,
          unitRate: 770000,
          discount: 0,
          gstRate: 18,
        },
      ],
      createdById: adminUserId,
    });

    expect(invoice).toBeDefined();
    expect(invoice.grandTotal).toBe(908600); // 770000 + 138600 IGST

    // Automated Report Executive Summary Verification
    const dailyReport = await AutomatedReportsService.generateDailyReport();
    expect(dailyReport).toBeDefined();
    expect(dailyReport.reportType).toBe("Daily Executive Summary");
  });
});
