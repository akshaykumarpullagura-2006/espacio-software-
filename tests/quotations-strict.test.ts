import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../src/lib/db";
import { QuotationService } from "../src/modules/quotations/quotation.service";
import { LeadService } from "../src/modules/leads/lead.service";
import { LeadConversionService } from "../src/modules/leads/conversion.service";
import { RbacService } from "../src/modules/rbac/rbac.service";
import { BusinessRuleError, ForbiddenError, NotFoundError } from "../src/lib/errors";

describe("Prompt 05: Quotation Management + BOQ + Pricing Engine + Client Approval", () => {
  let superAdminUser: any;
  let regularStaffUser: any;
  let testLead: any;
  let testProject: any;
  let testClient: any;

  beforeAll(async () => {
    // 1. Create or find Super Admin
    superAdminUser = await db.user.findFirst({
      where: { accessLevel: "SUPER_ADMIN" },
    });
    if (!superAdminUser) {
      superAdminUser = await db.user.create({
        data: {
          email: `admin-quote-${Date.now()}@espacio.test`,
          passwordHash: "dummy-hash",
          fullName: "Quotation Super Admin",
          accessLevel: "SUPER_ADMIN",
        },
      });
    }

    // 2. Create Regular Staff (Without quotations:approve or quotations:manage_pricing)
    regularStaffUser = await db.user.create({
      data: {
        email: `staff-quote-${Date.now()}@espacio.test`,
        passwordHash: "dummy-hash",
        fullName: "Regular Designer Staff",
        accessLevel: "USER",
      },
    });

    // Grant regularStaffUser base quotations:read and quotations:write
    let readPerm = await db.permission.findUnique({ where: { code: "quotations:read" } });
    if (!readPerm) {
      readPerm = await db.permission.create({
        data: { code: "quotations:read", module: "SALES", description: "View quotations" },
      });
    }
    let writePerm = await db.permission.findUnique({ where: { code: "quotations:write" } });
    if (!writePerm) {
      writePerm = await db.permission.create({
        data: { code: "quotations:write", module: "SALES", description: "Create quotations" },
      });
    }

    await db.userPermissionOverride.createMany({
      data: [
        { userId: regularStaffUser.id, permissionId: readPerm.id, effect: "ALLOW" },
        { userId: regularStaffUser.id, permissionId: writePerm.id, effect: "ALLOW" },
      ],
      skipDuplicates: true,
    });

    // 3. Create test lead
    const leadRes = await LeadService.createLead(
      {
        clientName: "Vikram Malhotra",
        phone: `+919876${Math.floor(100000 + Math.random() * 900000)}`,
        email: `vikram-${Date.now()}@example.test`,
        propertyLocation: "Indiranagar, Bangalore",
        propertyType: "VILLA_INTERIOR",
        budget: 500000,
        source: "WEBSITE",
      },
      superAdminUser.id
    );
    testLead = leadRes.lead;

    // 4. Create test client & project
    testClient = await db.client.create({
      data: {
        referenceNo: `CLI-TEST-${Date.now()}`,
        fullName: "Ananya Deshmukh",
        phone: `+919988${Math.floor(100000 + Math.random() * 900000)}`,
        email: `ananya-${Date.now()}@example.test`,
        address: "Koramangala 4th Block, Bangalore",
      },
    });

    testProject = await db.project.create({
      data: {
        referenceNo: `PROJ-TEST-${Date.now()}`,
        title: "Ananya Luxury Penthouse",
        clientId: testClient.id,
        propertyTypeKey: "APARTMENT_INTERIOR",
        siteAddress: "Koramangala, Bangalore",
        contractValue: 0,
        revisedBudget: 0,
      },
    });
  });

  afterAll(async () => {
    // Cleanup generated data
    await db.quotation.deleteMany({
      where: {
        OR: [
          { leadId: testLead?.id },
          { projectId: testProject?.id },
          { clientId: testClient?.id },
          { title: { contains: "Test" } },
        ],
      },
    });
  });

  // TEST 1, 2, 3, 4, 5, 6: Create draft quotation from Lead with room-wise BOQ and square-foot calculation
  it("TEST 1-6: Create draft quotation from Lead with multiple rooms, BOQ items, and sqft area calculations", async () => {
    const quote = await QuotationService.createQuotation(
      {
        title: "Vikram Villa Interior Estimate",
        leadId: testLead.id,
        discountType: null,
        taxRate: 0,
        adjustmentAmount: 0,
        items: [
          {
            room: "Living Room",
            category: "Woodwork & Carpentry",
            itemDescription: "TV Entertainment Unit with wall paneling",
            specifications: "18mm BWP Marine Plywood with 1mm Laminate",
            length: 10,
            height: 7,
            quantity: 70, // 10 * 7 = 70 sqft
            unitKey: "SQFT",
            unitRate: 1800, // 70 * 1800 = 126,000
            internalCostRate: 1200,
            discountAmount: 0,
          },
          {
            room: "Master Bedroom",
            category: "Woodwork & Carpentry",
            itemDescription: "Full height 3-door Wardrobe with internal drawers",
            specifications: "18mm BWP Plywood with soft close hinges",
            length: 8,
            height: 8,
            quantity: 64, // 8 * 8 = 64 sqft
            unitKey: "SQFT",
            unitRate: 2000, // 64 * 2000 = 128,000
            internalCostRate: 1400,
            discountAmount: 0,
          },
          {
            room: "Kitchen",
            category: "Modular Kitchen",
            itemDescription: "Base cabinets and wall hanging units",
            quantity: 1,
            unitKey: "LUMPSUM",
            unitRate: 150000,
            internalCostRate: 100000,
            discountAmount: 0,
          },
        ],
      },
      superAdminUser.id
    );

    expect(quote).toBeDefined();
    expect(quote.referenceNo).toMatch(/^Q-20\d{2}-\d{4}$/);
    expect(quote.status).toBe("DRAFT");
    expect(quote.revision).toBe(1);
    expect(quote.leadId).toBe(testLead.id);

    // Verify subtotal: 126,000 + 128,000 + 150,000 = 404,000
    expect(quote.subtotal).toBe(404000);
    expect(quote.totalAmount).toBe(404000);
    expect(quote.items.length).toBe(3);

    // Verify client snapshot
    const snapshot = JSON.parse(quote.clientSnapshot || "{}");
    expect(snapshot.clientName).toBe("Vikram Malhotra");
    expect(snapshot.source).toBe("LEAD");
  });

  // TEST 7, 8, 9, 10, 11, 12, 13: Financial Engine Verification (Prompt Section 46 Benchmark)
  it("TEST 7-13: Comprehensive Financial Engine Test (Prompt Section 46 Test Case)", async () => {
    // Financial Benchmark from Prompt 46:
    // Item 1: 70 sq.ft * ₹1,800 = ₹126,000
    // Item 2: 50 sq.ft * ₹2,000 = ₹100,000
    // Gross Subtotal: ₹226,000
    // Quotation Discount: ₹6,000
    // Taxable Amount: ₹220,000
    // Plus GST 18% = ₹39,600
    // Plus Manual Adjustment = ₹400
    // Grand Total = ₹260,000

    const calculation = QuotationService.calculateTotals(
      [
        {
          room: "Living Room",
          category: "Woodwork & Carpentry",
          itemDescription: "Item 1",
          quantity: 70,
          unitKey: "SQFT",
          unitRate: 1800,
          internalCostRate: 1200,
          discountAmount: 0,
        },
        {
          room: "Dining Area",
          category: "Woodwork & Carpentry",
          itemDescription: "Item 2",
          quantity: 50,
          unitKey: "SQFT",
          unitRate: 2000,
          internalCostRate: 1400,
          discountAmount: 0,
        },
      ],
      "FIXED",
      6000, // ₹6,000 discount
      18, // 18% GST
      400 // ₹400 manual adjustment
    );

    expect(calculation.subtotal).toBe(226000);
    expect(calculation.discountAmount).toBe(6000);
    expect(calculation.taxableAmount).toBe(220000);
    expect(calculation.taxAmount).toBe(39600); // 18% of 220,000 = 39,600
    expect(calculation.adjustmentAmount).toBe(400);
    expect(calculation.totalAmount).toBe(260000); // 220,000 + 39,600 + 400 = 260,000

    // Save and verify in database
    const quote = await QuotationService.createQuotation(
      {
        title: "Prompt 46 Financial Verification Quotation",
        projectId: testProject.id,
        discountType: "FIXED",
        discountValue: 6000,
        taxRate: 18,
        adjustmentAmount: 400,
        adjustmentReason: "Special Commercial Roundoff",
        items: [
          {
            room: "Living Room",
            category: "Woodwork",
            itemDescription: "Item 1",
            quantity: 70,
            unitKey: "SQFT",
            unitRate: 1800,
            internalCostRate: 1200,
            discountAmount: 0,
          },
          {
            room: "Dining Area",
            category: "Woodwork",
            itemDescription: "Item 2",
            quantity: 50,
            unitKey: "SQFT",
            unitRate: 2000,
            internalCostRate: 1400,
            discountAmount: 0,
          },
        ],
      },
      superAdminUser.id
    );

    expect(quote.subtotal).toBe(226000);
    expect(quote.discountAmount).toBe(6000);
    expect(quote.taxAmount).toBe(39600);
    expect(quote.adjustmentAmount).toBe(400);
    expect(quote.totalAmount).toBe(260000);
  });

  // TEST 14: Internal Cost Protection (Internal cost & margins strictly redacted in client-facing mode)
  it("TEST 14: Internal Cost Rates & Internal Notes are strictly redacted in client-facing view", async () => {
    const created = await QuotationService.createQuotation(
      {
        title: "Cost Redaction Test Quote",
        clientId: testClient.id,
        internalNotes: "CONFIDENTIAL: Internal production cost margin is 35%",
        items: [
          {
            room: "Living Room",
            category: "Woodwork",
            itemDescription: "Luxury Console",
            quantity: 1,
            unitKey: "NOS",
            unitRate: 50000,
            internalCostRate: 28000, // Sensitive internal cost
            discountAmount: 0,
          },
        ],
      },
      superAdminUser.id
    );

    // 1. Client-facing retrieval
    const clientFacing = await QuotationService.getQuotationById(created.id, undefined, true);
    expect(clientFacing.internalNotes).toBeUndefined();
    expect(clientFacing.items[0].internalCostRate).toBeUndefined();

    // 2. Regular staff without manage_pricing permission
    const staffView = await QuotationService.getQuotationById(created.id, regularStaffUser.id, false);
    expect(staffView.internalNotes).toBeUndefined();
    expect(staffView.items[0].internalCostRate).toBeUndefined();

    // 3. Super Admin view (has internal data)
    const adminView = await QuotationService.getQuotationById(created.id, superAdminUser.id, false);
    expect(adminView.internalNotes).toBe("CONFIDENTIAL: Internal production cost margin is 35%");
    expect(adminView.items[0].internalCostRate).toBe(28000);
  });

  // TEST 15: Quotation Revision Workflow (V1 -> V2 chaining)
  it("TEST 15: Revising a quotation increments version, preserves parent relation, and marks parent SUPERSEDED", async () => {
    const v1 = await QuotationService.createQuotation(
      {
        title: "Modular Interior Scope V1",
        leadId: testLead.id,
        items: [
          {
            room: "Bedroom",
            category: "Woodwork",
            itemDescription: "Base Wardrobe",
            quantity: 50,
            unitKey: "SQFT",
            unitRate: 1500,
            discountAmount: 0,
          },
        ],
      },
      superAdminUser.id
    );

    expect(v1.revision).toBe(1);

    // Create revision V2
    const v2 = await QuotationService.createRevision(v1.id, "Client requested upgraded laminates", superAdminUser.id);

    expect(v2.revision).toBe(2);
    expect(v2.parentQuotationId).toBe(v1.id);
    expect(v2.status).toBe("DRAFT");
    expect(v2.referenceNo).toContain("-V2");
    expect(v2.items.length).toBe(1);

    // Verify parent V1 is marked SUPERSEDED
    const parentV1 = await db.quotation.findUnique({ where: { id: v1.id } });
    expect(parentV1?.status).toBe("SUPERSEDED");
  });

  // TEST 16 & 17: Quotation Approval Workflow (Explicit Client / Manager Sign-Off)
  it("TEST 16-17: Approving quotation records approver details, locks editing, and transitions linked lead to WON", async () => {
    const quote = await QuotationService.createQuotation(
      {
        title: "Final Approval Target Quotation",
        leadId: testLead.id,
        discountType: "PERCENTAGE",
        discountValue: 5,
        items: [
          {
            room: "Living Room",
            category: "Woodwork",
            itemDescription: "Custom Bar Counter",
            quantity: 1,
            unitKey: "NOS",
            unitRate: 80000,
            discountAmount: 0,
          },
        ],
      },
      superAdminUser.id
    );

    // Move to SENT
    await QuotationService.updateStatus(quote.id, { status: "SENT", notes: "Sent to client via email" }, superAdminUser.id);

    // Approve
    const approved = await QuotationService.approveQuotation(
      quote.id,
      {
        clientApprovedName: "Vikram Malhotra",
        approvalNotes: "Client signed off on final BOQ",
      },
      superAdminUser.id
    );

    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedAt).toBeDefined();
    expect(approved.approvedById).toBe(superAdminUser.id);
    expect(approved.clientApprovedName).toBe("Vikram Malhotra");

    // Verify Lead is updated to WON with approved budget
    const updatedLead = await db.lead.findUnique({ where: { id: testLead.id } });
    expect(updatedLead?.stage).toBe("WON");
    expect(updatedLead?.estimatedBudget).toBe(approved.totalAmount);

    // Verify editing approved quotation is blocked
    await expect(
      QuotationService.updateQuotation(
        quote.id,
        {
          title: "Attempted Modification on Approved Quote",
        },
        superAdminUser.id
      )
    ).rejects.toThrow(BusinessRuleError);
  });

  // TEST 18: RBAC Permission Enforcement (Unauthorized users cannot approve)
  it("TEST 18: Users without quotations:approve permission are rejected", async () => {
    const draft = await QuotationService.createQuotation(
      {
        title: "Unauthorized Approval Test",
        clientId: testClient.id,
        items: [
          {
            room: "General",
            category: "Civil",
            itemDescription: "Tile installation",
            quantity: 100,
            unitKey: "SQFT",
            unitRate: 120,
            discountAmount: 0,
          },
        ],
      },
      superAdminUser.id
    );

    // Regular staff attempting to approve
    await expect(
      QuotationService.approveQuotation(
        draft.id,
        { clientApprovedName: "Unauthorized Signoff" },
        regularStaffUser.id
      )
    ).rejects.toThrow(ForbiddenError);
  });

  // TEST 19: Quotation Number Uniqueness & Database-Backed Sequential Numbering
  it("TEST 19: Sequential quotation numbers Q-YYYY-XXXX are generated safely without collisions", async () => {
    const q1 = await QuotationService.createQuotation(
      {
        title: "Sequential Quote 1",
        clientId: testClient.id,
        items: [{ room: "Room 1", category: "Trade", itemDescription: "Item 1", quantity: 1, unitKey: "NOS", unitRate: 1000, discountAmount: 0 }],
      },
      superAdminUser.id
    );

    const q2 = await QuotationService.createQuotation(
      {
        title: "Sequential Quote 2",
        clientId: testClient.id,
        items: [{ room: "Room 2", category: "Trade", itemDescription: "Item 2", quantity: 1, unitKey: "NOS", unitRate: 2000, discountAmount: 0 }],
      },
      superAdminUser.id
    );

    expect(q1.referenceNo).not.toBe(q2.referenceNo);
    expect(q1.referenceNo).toMatch(/^Q-20\d{2}-\d{4}$/);
    expect(q2.referenceNo).toMatch(/^Q-20\d{2}-\d{4}$/);
  });

  // TEST 20: Audit Logging Verification
  it("TEST 20: Quotation creation, revision, and approval generate structured audit logs", async () => {
    const quote = await QuotationService.createQuotation(
      {
        title: "Audit Log Test Quotation",
        clientId: testClient.id,
        items: [
          {
            room: "Living Room",
            category: "Painting",
            itemDescription: "Royal Luxury Emulsion",
            quantity: 500,
            unitKey: "SQFT",
            unitRate: 45,
            discountAmount: 0,
          },
        ],
      },
      superAdminUser.id
    );

    const auditLogs = await db.auditLog.findMany({
      where: {
        entityType: "Quotation",
        entityId: quote.id,
      },
    });

    expect(auditLogs.length).toBeGreaterThan(0);
    const creationLog = auditLogs.find((l) => l.action === "QUOTATION_CREATED");
    expect(creationLog).toBeDefined();
    expect(creationLog?.userId).toBe(superAdminUser.id);
  });

  // TEST 21: Lead to Project Conversion initializes Project budget from Approved Quotation
  it("TEST 21: Converting lead with approved quotation initializes Project contract value from quotation total", async () => {
    // 1. Create fresh lead
    const { lead } = await LeadService.createLead(
      {
        clientName: "Meera Nair",
        phone: `+919777${Math.floor(100000 + Math.random() * 900000)}`,
        email: `meera-${Date.now()}@example.test`,
        propertyLocation: "Whitefield, Bangalore",
        propertyType: "APARTMENT_INTERIOR",
        budget: 300000,
        source: "WEBSITE",
      },
      superAdminUser.id
    );

    // 2. Create and approve quotation for ₹4,50,000
    const quote = await QuotationService.createQuotation(
      {
        title: "Meera 3BHK Approved Quotation",
        leadId: lead.id,
        items: [
          {
            room: "Living Room",
            category: "Woodwork",
            itemDescription: "Full Interior Execution Package",
            quantity: 1,
            unitKey: "LUMPSUM",
            unitRate: 450000,
            discountAmount: 0,
          },
        ],
      },
      superAdminUser.id
    );

    await QuotationService.approveQuotation(quote.id, { clientApprovedName: "Meera Nair" }, superAdminUser.id);

    // 3. Convert lead to project
    const converted = await LeadConversionService.convertLeadToProject(lead.id, superAdminUser.id);

    expect(converted.project).toBeDefined();
    // Project contractValue must equal approved quotation amount (₹4,50,000), not initial lead estimate (₹3,00,000)
    expect(converted.project.contractValue).toBe(450000);
    expect(converted.project.revisedBudget).toBe(450000);

    // Quotation must now be linked to the newly created project
    const refreshedQuote = await db.quotation.findUnique({ where: { id: quote.id } });
    expect(refreshedQuote?.projectId).toBe(converted.project.id);
  });
});
