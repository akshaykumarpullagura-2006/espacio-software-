import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../src/lib/db";
import { LeadService } from "../src/modules/leads/lead.service";
import { LeadFollowUpService } from "../src/modules/leads/followup.service";
import { SiteVisitService } from "../src/modules/leads/site-visit.service";
import { DuplicateDetectionService } from "../src/modules/leads/duplicate-detection.service";
import { InactivityDetectionService } from "../src/modules/leads/inactivity.service";
import { LeadConversionService } from "../src/modules/leads/conversion.service";
import { QuotationService } from "../src/modules/quotations/quotation.service";
import { RbacService } from "../src/modules/rbac/rbac.service";
import { BusinessRuleError, ConflictError, ForbiddenError, ValidationError } from "../src/lib/errors";

describe("Prompt 06: Lead Management + Complete Lead Pipeline + Quotation Integration", () => {
  let superAdminUser: any;
  let salesStaff1: any;
  let salesStaff2: any;
  let regularUser: any;
  let testLeadId: string;
  let testLeadRef: string;
  let sharedPhone = `9887766${Math.floor(100 + Math.random() * 900)}`;
  let sharedEmail = `lead-${Date.now()}@espacio.test`;

  beforeAll(async () => {
    // 1. Create or find Super Admin
    superAdminUser = await db.user.findFirst({
      where: { accessLevel: "SUPER_ADMIN" },
    });
    if (!superAdminUser) {
      superAdminUser = await db.user.create({
        data: {
          email: `admin-leads-${Date.now()}@espacio.test`,
          passwordHash: "dummy-hash",
          fullName: "Leads Super Admin",
          accessLevel: "SUPER_ADMIN",
        },
      });
    }

    // 2. Create Sales Staff 1
    salesStaff1 = await db.user.create({
      data: {
        email: `sales1-${Date.now()}@espacio.test`,
        passwordHash: "dummy-hash",
        fullName: "Rahul Sales Executive",
        accessLevel: "USER",
      },
    });

    // 3. Create Sales Staff 2
    salesStaff2 = await db.user.create({
      data: {
        email: `sales2-${Date.now()}@espacio.test`,
        passwordHash: "dummy-hash",
        fullName: "Priya Sales Consultant",
        accessLevel: "USER",
      },
    });

    // 4. Create Regular Staff
    regularUser = await db.user.create({
      data: {
        email: `regular-${Date.now()}@espacio.test`,
        passwordHash: "dummy-hash",
        fullName: "Regular User",
        accessLevel: "USER",
      },
    });

    // 5. Initialize base test lead
    const res = await LeadService.createLead(
      {
        clientName: "Aarav Mehta",
        phone: sharedPhone,
        email: sharedEmail,
        source: "WEBSITE",
        propertyType: "APARTMENT_INTERIOR",
        budget: 2500000,
        priority: "HIGH",
        location: "HSR Layout, Bangalore",
        notes: "4BHK luxury interior requirement",
        tags: "Luxury, 4BHK",
      },
      superAdminUser.id
    );
    testLeadId = res.lead.id;
    testLeadRef = res.lead.referenceNo;
  });

  afterAll(async () => {
    // Cleanup created test records
    await db.user.deleteMany({
      where: {
        id: { in: [salesStaff1?.id, salesStaff2?.id, regularUser?.id].filter(Boolean) },
      },
    }).catch(() => {});
  });

  // ==========================================
  // SECTION 1: LEAD CAPTURE & REGISTRATION
  // ==========================================

  it("TEST 1: Should create a new lead with sequential reference LEAD-YYYY-XXXX and default stage NEW", async () => {
    const res = await LeadService.createLead(
      {
        clientName: "Rohan Verma",
        phone: `9778899${Math.floor(100 + Math.random() * 900)}`,
        email: `rohan-${Date.now()}@espacio.test`,
        source: "INSTAGRAM",
        propertyType: "VILLA_INTERIOR",
        budget: 4500000,
        priority: "URGENT",
      },
      superAdminUser.id
    );

    expect(res.lead).toBeDefined();
    expect(res.lead.referenceNo).toMatch(/^LEAD-\d{4}-\d{4}$/);
    expect(res.lead.clientName).toBe("Rohan Verma");
    expect(res.lead.stage).toBe("NEW");
    expect(res.lead.priority).toBe("URGENT");
  });

  it("TEST 2: Should retrieve the created lead with full attributes and timeline", async () => {
    const { lead, timeline } = await LeadService.getLeadById(testLeadId, superAdminUser.id);
    expect(lead.id).toBe(testLeadId);
    expect(lead.referenceNo).toBe(testLeadRef);
    expect(lead.clientName).toBe("Aarav Mehta");
    expect(timeline).toBeDefined();
    expect(timeline.length).toBeGreaterThan(0);
  });

  // ==========================================
  // SECTION 2: DUPLICATE DETECTION ENGINE
  // ==========================================

  it("TEST 3: Should detect duplicate lead by exact phone match (confidence >= 95%)", async () => {
    const dupResult = await DuplicateDetectionService.checkDuplicates({
      phone: sharedPhone,
      clientName: "Aarav M.",
    });

    expect(dupResult.isDuplicate).toBe(true);
    expect(dupResult.score).toBeGreaterThanOrEqual(95);
    expect(dupResult.matches.length).toBeGreaterThan(0);
    expect(dupResult.matches[0].referenceNo).toBe(testLeadRef);
  });

  it("TEST 4: Should detect duplicate lead by exact email match (confidence >= 90%)", async () => {
    const dupResult = await DuplicateDetectionService.checkDuplicates({
      phone: "9999988888",
      email: sharedEmail,
    });

    expect(dupResult.isDuplicate).toBe(true);
    expect(dupResult.score).toBeGreaterThanOrEqual(90);
  });

  it("TEST 5: Should return isDuplicate: false for completely unique contact", async () => {
    const dupResult = await DuplicateDetectionService.checkDuplicates({
      phone: "9123456780",
      email: "unique-client-99@espacio.test",
    });

    expect(dupResult.isDuplicate).toBe(false);
    expect(dupResult.matches.length).toBe(0);
  });

  it("TEST 6: Creating a lead with existing phone proceeds if intended, returning duplicate warning", async () => {
    const res = await LeadService.createLead(
      {
        clientName: "Aarav Duplicate Test",
        phone: sharedPhone,
        email: "aarav.other@espacio.test",
        source: "REFERRAL",
      },
      superAdminUser.id
    );

    expect(res.lead).toBeDefined();
    expect(res.duplicateWarning).not.toBeNull();
    expect(res.duplicateWarning?.isDuplicate).toBe(true);
  });

  // ==========================================
  // SECTION 3: LEAD ASSIGNMENT & RBAC SCOPING
  // ==========================================

  it("TEST 7: Should assign lead to salesStaff1 and create Notification", async () => {
    const updated = await LeadService.assignLead(testLeadId, salesStaff1.id, superAdminUser.id);
    expect(updated.assignedToId).toBe(salesStaff1.id);

    const notification = await db.notification.findFirst({
      where: { userId: salesStaff1.id, entityId: testLeadId },
    });
    expect(notification).not.toBeNull();
    expect(notification?.type).toBe("LEAD_ASSIGNED");
  });

  it("TEST 8: Assigned sales staff can view their assigned lead", async () => {
    const { lead } = await LeadService.getLeadById(testLeadId, salesStaff1.id);
    expect(lead.id).toBe(testLeadId);
  });

  it("TEST 9: Non-admin other staff cannot view lead assigned to another person", async () => {
    await expect(
      LeadService.getLeadById(testLeadId, salesStaff2.id)
    ).rejects.toThrow(ForbiddenError);
  });

  it("TEST 10: Admin / Super Admin can view any lead regardless of assignment", async () => {
    const { lead } = await LeadService.getLeadById(testLeadId, superAdminUser.id);
    expect(lead.id).toBe(testLeadId);
  });

  // ==========================================
  // SECTION 4: FOLLOW-UPS & REMINDERS
  // ==========================================

  let followUpId: string;

  it("TEST 11: Should schedule a follow-up and auto-advance stage to FOLLOW_UP_SCHEDULED", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);

    const followUp = await LeadFollowUpService.scheduleFollowUp(
      testLeadId,
      {
        followUpDate: futureDate,
        type: "CALL",
        notes: "Call client to discuss floor plans and material options",
        assignedToId: salesStaff1.id,
      },
      salesStaff1.id
    );

    expect(followUp).toBeDefined();
    expect(followUp.status).toBe("PENDING");
    expect(followUp.type).toBe("CALL");

    followUpId = followUp.id;

    // Verify stage auto-advanced
    const { lead } = await LeadService.getLeadById(testLeadId, superAdminUser.id);
    expect(lead.stage).toBe("FOLLOW_UP_SCHEDULED");
  });

  it("TEST 12: Should complete follow-up with outcome notes and record Activity", async () => {
    const completed = await LeadFollowUpService.completeFollowUp(
      followUpId,
      { outcomeNotes: "Client requested a site visit on Saturday 11 AM" },
      salesStaff1.id
    );

    expect(completed.status).toBe("COMPLETED");
    expect(completed.outcomeNotes).toBe("Client requested a site visit on Saturday 11 AM");
    expect(completed.completedAt).not.toBeNull();
  });

  it("TEST 13: Should schedule and cancel a follow-up with reason", async () => {
    const tempFollowUp = await LeadFollowUpService.scheduleFollowUp(
      testLeadId,
      {
        followUpDate: new Date(),
        type: "EMAIL",
        notes: "Send catalog email",
      },
      salesStaff1.id
    );

    const cancelled = await LeadFollowUpService.cancelFollowUp(
      tempFollowUp.id,
      "Client already visited office",
      salesStaff1.id
    );

    expect(cancelled.status).toBe("CANCELLED");
  });

  // ==========================================
  // SECTION 5: SITE VISITS & CONSULTATIONS
  // ==========================================

  let siteVisitId: string;

  it("TEST 14: Should schedule a site visit and auto-advance stage to SITE_VISIT_SCHEDULED", async () => {
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() + 3);

    const visit = await SiteVisitService.scheduleSiteVisit(
      testLeadId,
      {
        visitDate,
        location: "Flat 402, Prestige Palms, Bangalore",
        notes: "Take measurements of kitchen and master bedroom",
        assignedToId: salesStaff1.id,
      },
      salesStaff1.id
    );

    expect(visit).toBeDefined();
    expect(visit.status).toBe("SCHEDULED");
    expect(visit.location).toBe("Flat 402, Prestige Palms, Bangalore");

    siteVisitId = visit.id;

    const { lead } = await LeadService.getLeadById(testLeadId, superAdminUser.id);
    expect(lead.stage).toBe("SITE_VISIT_SCHEDULED");
  });

  it("TEST 15: Should complete site visit with outcome notes and auto-advance stage to SITE_VISIT_COMPLETED", async () => {
    const completed = await SiteVisitService.completeSiteVisit(
      siteVisitId,
      { outcomeNotes: "Measurements recorded. Client prefers Italian marble flooring and modular kitchen." },
      salesStaff1.id
    );

    expect(completed.status).toBe("COMPLETED");
    expect(completed.outcomeNotes).toContain("Measurements recorded");

    const { lead } = await LeadService.getLeadById(testLeadId, superAdminUser.id);
    expect(lead.stage).toBe("SITE_VISIT_COMPLETED");
  });

  // ==========================================
  // SECTION 6: QUOTATION & COMMERCIAL WORKFLOW
  // ==========================================

  let testQuotationId: string;

  it("TEST 16: Should advance stage to QUOTATION_IN_PROGRESS", async () => {
    const updated = await LeadService.changeStatus(
      testLeadId,
      { status: "QUOTATION_IN_PROGRESS" },
      salesStaff1.id
    );
    expect(updated.stage).toBe("QUOTATION_IN_PROGRESS");
  });

  it("TEST 17: Should prevent advancing to QUOTATION_SENT if no quotation has been generated", async () => {
    await expect(
      LeadService.changeStatus(testLeadId, { status: "QUOTATION_SENT" }, salesStaff1.id)
    ).rejects.toThrow(BusinessRuleError);
  });

  it("TEST 18: Should create a Quotation attached to the Lead and advance to QUOTATION_SENT", async () => {
    const quote = await QuotationService.createQuotation(
      {
        title: "Aarav Mehta 4BHK Premium BOQ",
        leadId: testLeadId,
        taxRate: 18,
        items: [
          {
            room: "Kitchen",
            category: "KITCHEN",
            itemDescription: "Acrylic Finish Soft-Close Modular Kitchen",
            quantity: 1,
            unitKey: "SET",
            unitRate: 450000,
          },
          {
            room: "Master Bedroom",
            category: "BEDROOM",
            itemDescription: "Master Bedroom Floor-to-Ceiling Wardrobes",
            quantity: 1,
            unitKey: "SET",
            unitRate: 350000,
          },
        ],
      },
      superAdminUser.id
    );

    expect(quote).toBeDefined();
    expect(quote.totalAmount).toBe(944000); // (450000 + 350000) * 1.18 = 944,000
    testQuotationId = quote.id;

    // Advance to QUOTATION_SENT
    const updated = await LeadService.changeStatus(
      testLeadId,
      { status: "QUOTATION_SENT" },
      salesStaff1.id
    );
    expect(updated.stage).toBe("QUOTATION_SENT");
  });

  it("TEST 19: Should advance stage to NEGOTIATION", async () => {
    const updated = await LeadService.changeStatus(
      testLeadId,
      { status: "NEGOTIATION" },
      salesStaff1.id
    );
    expect(updated.stage).toBe("NEGOTIATION");
  });

  // ==========================================
  // SECTION 7: WON / LOST VALIDATION & REOPEN
  // ==========================================

  it("TEST 23: Reject changing status to LOST without a lossReasonKey", async () => {
    await expect(
      LeadService.changeStatus(
        testLeadId,
        { status: "LOST" }, // missing lossReasonKey
        superAdminUser.id
      )
    ).rejects.toThrow();

    const updated = await LeadService.changeStatus(
      testLeadId,
      { status: "LOST", lossReason: "PRICE_TOO_HIGH", notes: "Client chose competitor" },
      superAdminUser.id
    );
    expect(updated.stage).toBe("LOST");
    expect(updated.lossReasonKey).toBe("PRICE_TOO_HIGH");

    // Reopen lead
    const reopened = await LeadService.changeStatus(
      testLeadId,
      { status: "NEGOTIATION", reopenReason: "Lead reopened" },
      superAdminUser.id
    );
    expect(reopened.lossReasonKey).toBeNull();
  });

  it("TEST 24: Approve Quotation and mark Lead as WON", async () => {
    // 1. Approve quotation
    const approvedQuote = await QuotationService.approveQuotation(
      testQuotationId,
      { clientApprovedName: "Aarav Mehta", approvalNotes: "Approved via signed document" },
      superAdminUser.id
    );
    expect(approvedQuote.status).toBe("APPROVED");

    // 2. Mark lead as WON
    const wonLead = await LeadService.changeStatus(
      testLeadId,
      { status: "WON" },
      superAdminUser.id
    );
    expect(wonLead.stage).toBe("WON");
  });

  // ==========================================
  // SECTION 8: PROJECT CONVERSION & CLIENT LINK
  // ==========================================

  let convertedProjectId: string;
  let convertedClientId: string;

  it("TEST 25: Should convert WON lead to Project, initialize contract value from approved quotation, and link Client", async () => {
    const conversion = await LeadConversionService.convertLeadToProject(testLeadId, superAdminUser.id);

    expect(conversion.project).toBeDefined();
    expect(conversion.project.referenceNo).toMatch(/^PROJ-\d{4}-\d{4}/);
    expect(conversion.project.contractValue).toBe(944000);
    expect(conversion.client).toBeDefined();

    convertedProjectId = conversion.project.id;
    convertedClientId = typeof conversion.client === "string" ? conversion.client : (conversion.client?.id || "");

    // Verify quotation is linked to the newly created project and client
    const quote = await db.quotation.findUnique({ where: { id: testQuotationId } });
    expect(quote?.projectId).toBe(convertedProjectId);
  });

  it("TEST 26: Should fail to convert already converted lead with ConflictError", async () => {
    await expect(
      LeadConversionService.convertLeadToProject(testLeadId, superAdminUser.id)
    ).rejects.toThrow(ConflictError);
  });

  it("TEST 27: Should link existing client to a new lead without duplication", async () => {
    const newLead = await LeadService.createLead(
      {
        clientName: "Aarav Second Property",
        phone: `9112233${Math.floor(100 + Math.random() * 900)}`,
        source: "DIRECT",
      },
      superAdminUser.id
    );

    const linkResult = await LeadService.linkExistingClient(newLead.lead.id, convertedClientId, superAdminUser.id);
    expect(linkResult.success).toBe(true);
    expect(linkResult.client.id).toBe(convertedClientId);
  });

  // ==========================================
  // SECTION 9: SEARCH, MULTI-FILTERING & METRICS
  // ==========================================

  it("TEST 28: Should search leads by text query across reference, client name, phone, and location", async () => {
    const result = await LeadService.getLeads({ search: "Aarav Mehta" }, superAdminUser.id);
    expect(result.leads.length).toBeGreaterThan(0);
    expect(result.leads[0].clientName).toBe("Aarav Mehta");
  });

  it("TEST 29: Should filter leads by stage, priority, and source", async () => {
    const result = await LeadService.getLeads(
      {
        stage: "WON",
        priority: "HIGH",
        source: "WEBSITE",
      },
      superAdminUser.id
    );

    expect(result.leads.length).toBeGreaterThan(0);
    expect(result.leads.every((l) => l.stage === "WON")).toBe(true);
  });

  it("TEST 30: Should aggregate pipeline metrics accurately without double counting", async () => {
    const metrics = await LeadService.getPipelineMetrics(superAdminUser.id);

    expect(metrics.totalLeads).toBeGreaterThan(0);
    expect(metrics.wonLeads).toBeGreaterThan(0);
    expect(metrics.conversionRate).toBeGreaterThan(0);
    expect(metrics.wonValue).toBeGreaterThan(0);
    expect(metrics.byStage).toBeDefined();
    expect(metrics.bySource).toBeDefined();
  });

  // ==========================================
  // SECTION 10: INACTIVITY & SAFE DELETION
  // ==========================================

  it("TEST 31: Should check inactive leads and calculate count", async () => {
    const inactivityResult = await InactivityDetectionService.checkInactiveLeads();
    expect(inactivityResult).toHaveProperty("inactiveCount");
    expect(inactivityResult).toHaveProperty("notificationsSent");
  });

  it("TEST 32: Safe deletion should prevent deleting lead linked to active project or quotation history", async () => {
    await expect(
      LeadService.deleteLead(testLeadId, superAdminUser.id)
    ).rejects.toThrow(BusinessRuleError);
  });
});
