import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { ClientService } from "@/modules/clients/client.service";
import { DuplicateClientDetectionService } from "@/modules/clients/duplicate-detection.service";
import { ClientFinancialService } from "@/modules/clients/client-financial.service";
import { LeadService } from "@/modules/leads/lead.service";
import { QuotationService } from "@/modules/quotations/quotation.service";
import { BusinessRuleError, ConflictError, ForbiddenError, ValidationError } from "@/lib/errors";

describe("ESPACIO ERP Master Prompt 07 — Strict Client Management & Client 360° Test Suite", () => {
  let superAdminUser: any;
  let standardUser: any;
  let testClientId1: string;
  let testClientRef1: string;
  let testClientId2: string;
  let testCleanClientId: string;
  let testLeadId: string;
  let testProjectId: string;
  let testQuotationId: string;

  beforeAll(async () => {
    // 1. Ensure Super-Admin exists
    superAdminUser = await db.user.findFirst({
      where: { accessLevel: "SUPER_ADMIN" },
    });

    if (!superAdminUser) {
      superAdminUser = await db.user.create({
        data: {
          email: `superadmin-clients-${Date.now()}@espacio.test`,
          fullName: "Super Admin Clients Tester",
          passwordHash: "dummyhash",
          accessLevel: "SUPER_ADMIN",
        },
      });
    }

    // 2. Ensure Standard User without financial permissions exists
    standardUser = await db.user.create({
      data: {
        email: `standard-clients-${Date.now()}@espacio.test`,
        fullName: "Standard Staff Tester",
        passwordHash: "dummyhash",
        accessLevel: "USER",
      },
    });
  });

  // ==========================================
  // SECTION 1: CLIENT CREATION & VALIDATION
  // ==========================================

  it("TEST 01: Create Individual client with unique sequential ID CLI-YYYY-XXXX", async () => {
    const timestamp = Date.now().toString().slice(-6);
    const phone = `+91 99000${timestamp}`;

    const { client, duplicateWarning } = await ClientService.createClient(
      {
        fullName: `Vikram Malhotra ${timestamp}`,
        phone,
        email: `vikram_${timestamp}@example.com`,
        clientType: "INDIVIDUAL",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560038",
        country: "India",
        tags: "VIP, Luxury",
      },
      superAdminUser.id
    );

    testClientId1 = client.id;
    testClientRef1 = client.referenceNo;

    expect(client).toBeDefined();
    expect(client.referenceNo).toMatch(/^CLI-\d{4}-\d{4}$/);
    expect(client.fullName).toContain("Vikram Malhotra");
    expect(client.clientType).toBe("INDIVIDUAL");
    expect(client.status).toBe("ACTIVE");
  });

  it("TEST 02: Create Corporate client with GSTIN, PAN, and Company Name", async () => {
    const timestamp = Date.now().toString().slice(-6);
    const phone = `+91 98111${timestamp}`;

    const { client } = await ClientService.createClient(
      {
        fullName: `Pooja Hegde ${timestamp}`,
        companyName: "Prestige Developers Pvt Ltd",
        phone,
        email: `pooja_${timestamp}@prestige.com`,
        clientType: "BUSINESS",
        gstin: "29ABCDE1234F1Z5",
        pan: "ABCDE1234F",
        city: "Bengaluru",
        state: "Karnataka",
        billingAddress: "Level 10, Prestige Falcon Tower, MG Road, Bengaluru",
        preferredContactMethod: "EMAIL",
      },
      superAdminUser.id
    );

    testClientId2 = client.id;

    expect(client).toBeDefined();
    expect(client.referenceNo).toMatch(/^CLI-\d{4}-\d{4}$/);
    expect(client.companyName).toBe("Prestige Developers Pvt Ltd");
    expect(client.gstin).toBe("29ABCDE1234F1Z5");
    expect(client.clientType).toBe("BUSINESS");
  });

  it("TEST 03: Reject duplicate phone number on client creation", async () => {
    const existing = await db.client.findUnique({ where: { id: testClientId1 } });

    await expect(
      ClientService.createClient(
        {
          fullName: "Duplicate User",
          phone: existing!.phone,
          clientType: "INDIVIDUAL",
        },
        superAdminUser.id
      )
    ).rejects.toThrow(ConflictError);
  });

  // ==========================================
  // SECTION 2: DUPLICATE DETECTION SERVICE
  // ==========================================

  it("TEST 04: Detect duplicate by exact phone number", async () => {
    const existing = await db.client.findUnique({ where: { id: testClientId1 } });

    const result = await DuplicateClientDetectionService.checkDuplicates({
      phone: existing!.phone,
    });

    expect(result.isDuplicate).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.matches.some((m) => m.id === testClientId1)).toBe(true);
  });

  it("TEST 05: Detect duplicate by exact email address", async () => {
    const existing = await db.client.findUnique({ where: { id: testClientId1 } });

    const result = await DuplicateClientDetectionService.checkDuplicates({
      email: existing!.email!,
    });

    expect(result.isDuplicate).toBe(true);
    expect(result.matches.some((m) => m.id === testClientId1)).toBe(true);
  });

  it("TEST 06: Detect duplicate by GSTIN", async () => {
    const result = await DuplicateClientDetectionService.checkDuplicates({
      gstin: "29ABCDE1234F1Z5",
    });

    expect(result.isDuplicate).toBe(true);
    expect(result.matches.some((m) => m.id === testClientId2)).toBe(true);
  });

  it("TEST 07: Detect duplicate by company name and client name", async () => {
    const result = await DuplicateClientDetectionService.checkDuplicates({
      companyName: "Prestige Developers",
    });

    expect(result.isDuplicate).toBe(true);
    expect(result.matches.some((m) => m.id === testClientId2)).toBe(true);
  });

  it("TEST 08: Return isDuplicate: false when no duplicate attributes match", async () => {
    const result = await DuplicateClientDetectionService.checkDuplicates({
      phone: "+91 8888899999",
      email: "completely_unique_client_999@espacio.com",
    });

    expect(result.isDuplicate).toBe(false);
    expect(result.matches.length).toBe(0);
  });

  // ==========================================
  // SECTION 3: CLIENT 360° DATA AGGREGATION
  // ==========================================

  it("TEST 09: Fetch complete Client 360° profile", async () => {
    const profile = await ClientService.getClientById(testClientId1, superAdminUser.id);

    expect(profile).toBeDefined();
    expect(profile.client.id).toBe(testClientId1);
    expect(profile.client.referenceNo).toBe(testClientRef1);
    expect(profile.leads).toBeDefined();
    expect(profile.quotations).toBeDefined();
    expect(profile.projects).toBeDefined();
    expect(profile.financialSummary).toBeDefined();
  });

  it("TEST 10: Link Lead to Client and aggregate under 360° profile", async () => {
    const timestamp = Date.now().toString().slice(-6);

    // Create a lead
    const { lead } = await LeadService.createLead(
      {
        clientName: "Vikram Malhotra",
        phone: `+91 99000${timestamp}`,
        email: `lead_${timestamp}@example.com`,
        source: "INSTAGRAM",
        sourceKey: "INSTAGRAM",
        propertyTypeKey: "VILLA_4BHK",
        estimatedBudget: 3500000,
        requirement: "Turnkey luxury villa interiors",
      },
      superAdminUser.id
    );
    testLeadId = lead.id;

    // Link lead to client
    const linkRes = await ClientService.linkLead(testClientId1, lead.id, superAdminUser.id);
    expect(linkRes.success).toBe(true);

    // Verify lead is present in client profile
    const profile = await ClientService.getClientById(testClientId1, superAdminUser.id);
    expect(profile.leads.some((l: any) => l.id === lead.id)).toBe(true);
  });

  it("TEST 11: Create Quotation and Project linked to Client and verify 360° aggregation", async () => {
    // 1. Create Quotation linked to Client
    const quotation = await QuotationService.createQuotation(
      {
        clientId: testClientId1,
        leadId: testLeadId,
        title: "Vikram Malhotra Villa BOQ",
        taxRate: 18,
        items: [
          {
            room: "Living Room",
            category: "LIVING_ROOM",
            itemDescription: "Italian Marble TV Unit & Wall Paneling",
            quantity: 1,
            unitKey: "SET",
            unitRate: 1000000,
          },
        ],
      },
      superAdminUser.id
    );
    testQuotationId = quotation.id;

    // Approve quotation
    await QuotationService.approveQuotation(
      quotation.id,
      { clientApprovedName: "Vikram Malhotra", approvalNotes: "Client signed contract" },
      superAdminUser.id
    );

    // 2. Create Project in DB linked to Client
    const project = await db.project.create({
      data: {
        referenceNo: `PROJ-${Date.now().toString().slice(-6)}`,
        clientId: testClientId1,
        title: "Malhotra Luxury Villa Indiranagar",
        propertyTypeKey: "VILLA_4BHK",
        siteAddress: "Plot 88, 12th Main, Indiranagar, Bangalore",
        contractValue: 1180000,
        revisedBudget: 1180000,
        stage: "PRODUCTION_IN_PROGRESS",
      },
    });
    testProjectId = project.id;

    // 3. Create Payment in DB linked to Client and Project
    await db.clientPayment.create({
      data: {
        referenceNo: `PAY-${Date.now().toString().slice(-6)}`,
        clientId: testClientId1,
        projectId: project.id,
        amount: 500000,
        paymentMethod: "BANK_TRANSFER",
        status: "VERIFIED",
      },
    });

    // 4. Create Project Expense
    await db.expense.create({
      data: {
        referenceNo: `EXP-${Date.now().toString().slice(-6)}`,
        projectId: project.id,
        expenseType: "PROJECT",
        categoryKey: "MATERIAL",
        description: "Plywood & Hardware delivery",
        amount: 150000,
        paymentMethod: "BANK_TRANSFER",
        status: "APPROVED",
      },
    });

    // 5. Fetch Client 360° Profile
    const profile = await ClientService.getClientById(testClientId1, superAdminUser.id);
    expect(profile.quotations.some((q: any) => q.id === quotation.id)).toBe(true);
    expect(profile.projects.some((p: any) => p.id === project.id)).toBe(true);
    expect(profile.payments.some((pay: any) => pay.amount === 500000)).toBe(true);
    expect(profile.expenses.some((exp: any) => exp.amount === 150000)).toBe(true);
  });

  // ==========================================
  // SECTION 4: FINANCIAL PRIVACY & ACCURACY
  // ==========================================

  it("TEST 12: Financial Summary accurately calculates totals and project breakdown", async () => {
    const fin = await ClientFinancialService.getClientFinancialSummary(testClientId1, true);

    expect(fin.canViewFinancials).toBe(true);
    expect(fin.totalProjectValue).toBe(1180000);
    expect(fin.totalReceived).toBe(500000);
    expect(fin.totalOutstanding).toBe(680000); // 1,180,000 - 500,000 = 680,000
    expect(fin.projectBreakdowns.length).toBeGreaterThan(0);
    expect(fin.projectBreakdowns[0].paymentProgressPct).toBe(42); // 500k / 1180k = 42%
  });

  it("TEST 13: Redact financial numbers when user lacks clients:view_financials", async () => {
    const fin = await ClientFinancialService.getClientFinancialSummary(testClientId1, false);

    expect(fin.canViewFinancials).toBe(false);
    expect(fin.totalProjectValue).toBeNull();
    expect(fin.totalReceived).toBeNull();
    expect(fin.totalOutstanding).toBeNull();
    expect(fin.projectBreakdowns.length).toBe(0);
  });

  // ==========================================
  // SECTION 5: INTERNAL NOTES & TIMELINE
  // ==========================================

  it("TEST 14: Add confidential internal note to client", async () => {
    const note = await ClientService.addNote(
      testClientId1,
      {
        title: "Communication Preference",
        description: "Client prefers evening calls after 6 PM or WhatsApp updates.",
      },
      superAdminUser.id
    );

    expect(note).toBeDefined();
    expect(note.title).toBe("Communication Preference");

    const profile = await ClientService.getClientById(testClientId1, superAdminUser.id);
    expect(profile.internalNotes.some((n: any) => n.title === "Communication Preference")).toBe(true);
  });

  it("TEST 15: Unified timeline aggregates activity across Client and linked entities", async () => {
    const profile = await ClientService.getClientById(testClientId1, superAdminUser.id);

    expect(profile.timeline.length).toBeGreaterThan(0);
    expect(profile.timeline.some((t: any) => t.actorName !== undefined)).toBe(true);
  });

  // ==========================================
  // SECTION 6: CLIENT DIRECTORY & METRICS
  // ==========================================

  it("TEST 16: Retrieve paginated client directory with multi-filtering", async () => {
    const res = await ClientService.getClients(
      {
        search: "Vikram",
        status: "ACTIVE",
        clientType: "INDIVIDUAL",
        page: 1,
        limit: 10,
      },
      superAdminUser.id
    );

    expect(res.clients.length).toBeGreaterThan(0);
    expect(res.clients[0].fullName).toContain("Vikram Malhotra");
    expect(res.canViewFinancials).toBe(true);
  });

  it("TEST 17: Retrieve directory KPI metrics", async () => {
    const metrics = await ClientService.getClientMetrics(superAdminUser.id);

    expect(metrics.totalClients).toBeGreaterThanOrEqual(2);
    expect(metrics.activeClients).toBeGreaterThanOrEqual(1);
    expect(metrics.canViewFinancials).toBe(true);
    expect(metrics.clientsWithOutstandingCount).toBeGreaterThanOrEqual(1);
  });

  // ==========================================
  // SECTION 7: UPDATES, ARCHIVING & SAFE DELETION
  // ==========================================

  it("TEST 18: Update client details", async () => {
    const updated = await ClientService.updateClient(
      testClientId1,
      {
        address: "New Address Indiranagar Stage 2",
        tags: "VIP, Ultra Luxury, Repeat Customer",
      },
      superAdminUser.id
    );

    expect(updated.address).toBe("New Address Indiranagar Stage 2");
    expect(updated.tags).toBe("VIP, Ultra Luxury, Repeat Customer");
  });

  it("TEST 19: Change client status (archive / deactivate)", async () => {
    const deactivated = await ClientService.changeStatus(testClientId1, "INACTIVE", superAdminUser.id);
    expect(deactivated.status).toBe("INACTIVE");

    // Reactivate
    const reactivated = await ClientService.changeStatus(testClientId1, "ACTIVE", superAdminUser.id);
    expect(reactivated.status).toBe("ACTIVE");
  });

  it("TEST 20: Block deletion of client with historical records (projects/payments/leads)", async () => {
    await expect(
      ClientService.deleteClient(testClientId1, superAdminUser.id)
    ).rejects.toThrow(BusinessRuleError);
  });

  it("TEST 21: Allow deletion of clean client record with no linked history", async () => {
    const timestamp = Date.now().toString().slice(-6);
    const { client } = await ClientService.createClient(
      {
        fullName: "Temporary Test Client",
        phone: `+91 91111${timestamp}`,
        clientType: "INDIVIDUAL",
      },
      superAdminUser.id
    );

    const res = await ClientService.deleteClient(client.id, superAdminUser.id);
    expect(res.success).toBe(true);

    const check = await db.client.findUnique({ where: { id: client.id } });
    expect(check).toBeNull();
  });
});
