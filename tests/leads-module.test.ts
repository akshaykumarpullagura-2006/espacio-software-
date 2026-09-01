import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../src/lib/db";
import { LeadService } from "../src/modules/leads/lead.service";
import { DuplicateDetectionService } from "../src/modules/leads/duplicate-detection.service";
import { LeadFollowUpService } from "../src/modules/leads/followup.service";
import { SiteVisitService } from "../src/modules/leads/site-visit.service";
import { LeadConversionService } from "../src/modules/leads/conversion.service";
import { InactivityDetectionService } from "../src/modules/leads/inactivity.service";
import { CrmConfigService } from "../src/modules/config/crm-config.service";

describe("ESPACIO ERP — Lead Management Production Test Suite", () => {
  let adminUser: any;
  let testLeadId: string;
  const testPhone = "9876543210";
  const testEmail = "lead.test.client@espacio.in";

  beforeAll(async () => {
    adminUser = await db.user.findFirst({ where: { accessLevel: "ADMIN", status: "ACTIVE" } });
    if (!adminUser) {
      adminUser = await db.user.create({
        data: {
          email: "lead.admin@espacio.in",
          passwordHash: "dummyhash",
          fullName: "Lead Admin User",
          accessLevel: "ADMIN",
          status: "ACTIVE",
        },
      });
    }

    // Clean any previous test leads with this phone
    const existing = await db.lead.findMany({ where: { phone: testPhone } });
    for (const l of existing) {
      await db.leadFollowUp.deleteMany({ where: { leadId: l.id } });
      await db.leadSiteVisit.deleteMany({ where: { leadId: l.id } });
      await db.leadStageHistory.deleteMany({ where: { leadId: l.id } });
      await db.quotation.deleteMany({ where: { leadId: l.id } });
      await db.project.deleteMany({ where: { leadId: l.id } });
      await db.lead.delete({ where: { id: l.id } });
    }

    const leadResult = await LeadService.createLead(
      {
        clientName: "Sunil Kapoor",
        phone: testPhone,
        email: testEmail,
        location: "Banjara Hills, Hyderabad",
        propertyTypeKey: "VILLA",
        budget: 4500000,
        source: "WEBSITE",
        priority: "HIGH",
        tags: "Luxury, Villa, Urgent",
        notes: "Full interior execution for 4BHK Villa",
        assignedToId: adminUser.id,
      },
      adminUser.id
    );
    testLeadId = leadResult.lead.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    const leads = await db.lead.findMany({ where: { phone: testPhone } });
    for (const l of leads) {
      await db.leadFollowUp.deleteMany({ where: { leadId: l.id } });
      await db.leadSiteVisit.deleteMany({ where: { leadId: l.id } });
      await db.leadStageHistory.deleteMany({ where: { leadId: l.id } });
      await db.quotation.deleteMany({ where: { leadId: l.id } });
      await db.project.deleteMany({ where: { leadId: l.id } });
      await db.lead.delete({ where: { id: l.id } });
    }
  });

  it("1. Successfully creates a new Lead with auto-generated reference number and sets stage to NEW", async () => {
    const lead = await db.lead.findUnique({ where: { id: testLeadId } });

    expect(lead).toBeDefined();
    expect(lead?.id).toBeDefined();
    expect(lead?.referenceNo).toMatch(/^LEAD-\d{4}-\d+/);
    expect(lead?.clientName).toBe("Sunil Kapoor");
    expect(lead?.phone).toBe(testPhone);
    expect(lead?.stage).toBe("NEW");
    expect(lead?.estimatedBudget).toBe(4500000);
  });

  it("2. Real-time Duplicate Detection flags matching phone number with high match confidence", async () => {
    const dupCheck = await DuplicateDetectionService.checkDuplicates({
      phone: testPhone,
      email: "another.email@example.com",
      clientName: "Sunil Kapoor",
      location: "Banjara Hills",
    });

    expect(dupCheck.isDuplicate).toBe(true);
    expect(dupCheck.score).toBeGreaterThanOrEqual(80);
    expect(dupCheck.matches.length).toBeGreaterThan(0);
    expect(dupCheck.matches[0].phone).toBe(testPhone);
  });

  it("3. Schedules a CRM follow-up and auto-advances lead stage to FOLLOW_UP_SCHEDULED", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const followUp = await LeadFollowUpService.scheduleFollowUp(
      testLeadId,
      {
        followUpDate: tomorrow.toISOString(),
        type: "CALL",
        notes: "Initial scope discussion and floorplan review",
      },
      adminUser.id
    );

    expect(followUp).toBeDefined();
    expect(followUp.status).toBe("PENDING");
    expect(followUp.type).toBe("CALL");

    const updatedLead = await db.lead.findUnique({ where: { id: testLeadId } });
    expect(updatedLead?.stage).toBe("FOLLOW_UP_SCHEDULED");
  });

  it("4. Completes CRM follow-up with recorded outcome notes", async () => {
    const followUps = await db.leadFollowUp.findMany({ where: { leadId: testLeadId } });
    expect(followUps.length).toBeGreaterThan(0);

    const completed = await LeadFollowUpService.completeFollowUp(
      followUps[0].id,
      {
        outcomeNotes: "Client reviewed 2D layout and agreed for on-site consultation.",
      },
      adminUser.id
    );

    expect(completed.status).toBe("COMPLETED");
    expect(completed.outcomeNotes).toContain("agreed for on-site consultation");
  });

  it("5. Schedules and completes a Site Visit inspection", async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 3);

    const visit = await SiteVisitService.scheduleSiteVisit(
      testLeadId,
      {
        visitDate: nextWeek.toISOString(),
        location: "Banjara Hills, Hyderabad",
        notes: "Measure master bedroom and kitchen wall offsets",
      },
      adminUser.id
    );

    expect(visit).toBeDefined();
    expect(visit.status).toBe("SCHEDULED");

    const completedVisit = await SiteVisitService.completeSiteVisit(
      visit.id,
      {
        outcomeNotes: "Site measurements completed. Client requested Italian marble finish.",
      },
      adminUser.id
    );

    expect(completedVisit.status).toBe("COMPLETED");
    expect(completedVisit.outcomeNotes).toContain("Site measurements completed");
  });

  it("6. Enforces stage progression validation (Won requires approved quotation, Lost requires reason)", async () => {
    // Attempting WON without quotation should fail with BusinessRuleError
    await expect(
      LeadService.changeStatus(testLeadId, { status: "WON" }, adminUser.id)
    ).rejects.toThrow();

    // Attempting LOST without loss reason should fail
    await expect(
      LeadService.changeStatus(testLeadId, { status: "LOST" }, adminUser.id)
    ).rejects.toThrow();

    // Successfully changing to NEGOTIATION
    const negLead = await LeadService.changeStatus(
      testLeadId,
      { status: "NEGOTIATION", notes: "Negotiating discount and payment terms" },
      adminUser.id
    );
    expect(negLead.stage).toBe("NEGOTIATION");
  });

  it("7. Lead to Project conversion works when Lead is WON and transitions to PROJECT_CREATED", async () => {
    // Create dummy approved quotation for lead
    const quote = await db.quotation.create({
      data: {
        referenceNo: `QUOT-TEST-${Date.now()}`,
        leadId: testLeadId,
        title: "Villa Complete Fitout",
        subtotal: 4200000,
        taxAmount: 756000,
        totalAmount: 4956000,
        status: "APPROVED",
      },
    });

    // Mark as WON
    await LeadService.changeStatus(testLeadId, { status: "WON" }, adminUser.id);
    const wonLead = await db.lead.findUnique({ where: { id: testLeadId } });
    expect(wonLead?.stage).toBe("WON");

    // Convert Lead to Project
    const conversionResult = await LeadConversionService.convertLeadToProject(testLeadId, adminUser.id);
    expect(conversionResult.project).toBeDefined();
    expect(conversionResult.project.referenceNo).toMatch(/^PROJ-\d{4}-\d+/);
    expect(conversionResult.project.contractValue).toBe(4956000);

    const convertedLead = await db.lead.findUnique({ where: { id: testLeadId } });
    expect(convertedLead?.stage).toBe("PROJECT_CREATED");
  });

  it("8. Computes Lead Source ROI telemetry with zero mock calculations", async () => {
    const roi = await LeadService.getLeadSourceRoi();
    expect(roi).toBeDefined();
    expect(roi.summary).toBeDefined();
    expect(typeof roi.summary.totalLeads).toBe("number");
    expect(typeof roi.summary.totalWon).toBe("number");
    expect(typeof roi.summary.totalRevenue).toBe("number");
    expect(Array.isArray(roi.sources)).toBe(true);

    const websiteSource = roi.sources.find((s) => s.sourceKey === "WEBSITE");
    expect(websiteSource).toBeDefined();
    expect(websiteSource?.totalLeads).toBeGreaterThanOrEqual(1);
    expect(websiteSource?.wonLeads).toBeGreaterThanOrEqual(1);
  });

  it("9. Inactivity detection evaluates inactive leads and triggers alerts without errors", async () => {
    const result = await InactivityDetectionService.checkInactiveLeads();
    expect(result).toBeDefined();
    expect(typeof result.inactiveCount).toBe("number");
    expect(Array.isArray(result.notificationsSent)).toBe(true);
  });
});
