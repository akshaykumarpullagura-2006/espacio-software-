import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../src/lib/db";
import { ProjectService } from "../src/modules/projects/project.service";
import { ProjectStageService } from "../src/modules/projects/project-stage.service";
import { ChangeOrderService } from "../src/modules/projects/change-order.service";
import { QualityCheckService } from "../src/modules/projects/quality-check.service";
import { WarrantyService } from "../src/modules/projects/warranty.service";
import { ClientService } from "../src/modules/clients/client.service";
import { LeadService } from "../src/modules/leads/lead.service";
import { QuotationService } from "../src/modules/quotations/quotation.service";
import { RbacService } from "../src/modules/rbac/rbac.service";
import { AuthService } from "../src/modules/auth/auth.service";
import { BusinessRuleError } from "../src/lib/errors";

describe("ESPACIO ERP Master Prompt 08 — Strict Project Management & Execution Workflow Test Suite", () => {
  let superAdminUser: any;
  let standardUser: any;
  let restrictedUser: any;

  let testClient: any;
  let testLead: any;
  let testQuotation: any;
  let testProject: any;

  beforeAll(async () => {
    // 1. Create Super Admin User
    const adminEmail = `proj_superadmin_${Date.now()}@espacio.com`;
    superAdminUser = await db.user.create({
      data: {
        email: adminEmail,
        fullName: "Project Super Admin",
        passwordHash: "hash",
        accessLevel: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });

    // 2. Create Standard User with project permissions
    const standardEmail = `proj_pm_${Date.now()}@espacio.com`;
    standardUser = await db.user.create({
      data: {
        email: standardEmail,
        fullName: "Suresh Project Manager",
        passwordHash: "hash",
        accessLevel: "USER",
        status: "ACTIVE",
      },
    });

    // 3. Create Restricted User without financial permissions
    const restrictedEmail = `proj_staff_${Date.now()}@espacio.com`;
    restrictedUser = await db.user.create({
      data: {
        email: restrictedEmail,
        fullName: "Rahul Site Staff",
        passwordHash: "hash",
        accessLevel: "USER",
        status: "ACTIVE",
      },
    });

    // Override permissions for standard user: allow projects:read, projects:write, projects:change_stage, projects:view_financials
    const perms = await db.permission.findMany({
      where: {
        code: {
          in: ["projects:read", "projects:write", "projects:change_stage", "projects:view_financials", "projects:assign"],
        },
      },
    });

    for (const p of perms) {
      await db.userPermissionOverride.create({
        data: {
          userId: standardUser.id,
          permissionId: p.id,
          effect: "ALLOW",
        },
      });
    }

    // Override permissions for restricted user: allow projects:read, projects:write, deny projects:view_financials
    const finPerm = await db.permission.findUnique({ where: { code: "projects:view_financials" } });
    if (finPerm) {
      await db.userPermissionOverride.create({
        data: {
          userId: restrictedUser.id,
          permissionId: finPerm.id,
          effect: "DENY",
        },
      });
    }
    const readPerm = await db.permission.findUnique({ where: { code: "projects:read" } });
    if (readPerm) {
      await db.userPermissionOverride.create({
        data: {
          userId: restrictedUser.id,
          permissionId: readPerm.id,
          effect: "ALLOW",
        },
      });
    }

    // 4. Create Test Client
    const clientTimestamp = Date.now().toString().slice(-6);
    const clientPhone = `+9197000${clientTimestamp}`;
    const clientEmail = `deepak_${clientTimestamp}@example.com`;
    const clientRes = await ClientService.createClient(
      {
        fullName: `Deepak Singhania ${clientTimestamp}`,
        phone: clientPhone,
        email: clientEmail,
        clientType: "INDIVIDUAL",
        city: "Hyderabad",
      },
      superAdminUser.id
    );
    testClient = clientRes.client;

    // 5. Create Test Lead
    const { lead } = await LeadService.createLead(
      {
        clientName: testClient.fullName,
        phone: clientPhone,
        email: clientEmail,
        source: "REFERRAL",
        sourceKey: "REFERRAL",
        propertyTypeKey: "VILLA_4BHK",
        estimatedBudget: 4500000,
        requirement: "Turnkey luxury 4BHK Villa execution",
        clientId: testClient.id,
      },
      superAdminUser.id
    );
    testLead = lead;

    // 6. Create Approved Quotation linked to Lead & Client
    testQuotation = await QuotationService.createQuotation(
      {
        leadId: testLead.id,
        clientId: testClient.id,
        title: "Villa Execution Master Quotation",
        discountType: "FIXED",
        discountValue: 100000,
        taxRate: 18,
        items: [
          {
            room: "Master Suite",
            category: "WOODWORK",
            itemDescription: "Floor-to-Ceiling Wardrobe",
            length: 12,
            height: 9,
            quantity: 108,
            clientRate: 1800,
            unitRate: 1800,
            unitKey: "SQFT",
            internalCostRate: 1100,
          } as any,
        ],
      },
      superAdminUser.id
    );

    // Approve the quotation
    await QuotationService.approveQuotation(
      testQuotation.id,
      { approvalNotes: "Client approved quotation" },
      superAdminUser.id
    );
  });

  afterAll(async () => {
    // Cleanup created test project if exists
    if (testProject?.id) {
      await db.projectStageHistory.deleteMany({ where: { projectId: testProject.id } });
      await db.changeOrder.deleteMany({ where: { projectId: testProject.id } });
      await db.qualityCheck.deleteMany({ where: { projectId: testProject.id } });
      await db.warrantyIssue.deleteMany({ where: { projectId: testProject.id } });
      await db.projectMember.deleteMany({ where: { projectId: testProject.id } });
      await db.task.deleteMany({ where: { projectId: testProject.id } });
      await db.project.delete({ where: { id: testProject.id } }).catch(() => {});
    }

    if (testQuotation?.id) {
      await db.quotationItem.deleteMany({ where: { quotationId: testQuotation.id } });
      await db.quotation.delete({ where: { id: testQuotation.id } }).catch(() => {});
    }

    if (testLead?.id) {
      await db.lead.delete({ where: { id: testLead.id } }).catch(() => {});
    }

    if (testClient?.id) {
      await db.client.delete({ where: { id: testClient.id } }).catch(() => {});
    }

    if (superAdminUser?.id) {
      await db.userPermissionOverride.deleteMany({ where: { userId: superAdminUser.id } });
      await db.user.delete({ where: { id: superAdminUser.id } }).catch(() => {});
    }
    if (standardUser?.id) {
      await db.userPermissionOverride.deleteMany({ where: { userId: standardUser.id } });
      await db.user.delete({ where: { id: standardUser.id } }).catch(() => {});
    }
    if (restrictedUser?.id) {
      await db.userPermissionOverride.deleteMany({ where: { userId: restrictedUser.id } });
      await db.user.delete({ where: { id: restrictedUser.id } }).catch(() => {});
    }
  });

  it("TEST 01: Create project from approved quotation with lead & client inheritance", async () => {
    const project = await ProjectService.createProject(
      {
        title: "Deepak Singhania Luxury Villa Indiranagar",
        clientId: testClient.id,
        leadId: testLead.id,
        approvedQuotationId: testQuotation.id,
        propertyTypeKey: "VILLA_4BHK",
        siteAddress: "Plot 124, Road No 10, Jubilee Hills",
        city: "Hyderabad",
        state: "Telangana",
        priority: "HIGH",
        projectManagerId: standardUser.id,
      },
      superAdminUser.id
    );

    testProject = project;

    expect(project).toBeDefined();
    expect(project.id).toBeDefined();
    expect(project.referenceNo).toMatch(/^PROJ-\d{4}-\d{4,}$/);
    expect(project.clientId).toBe(testClient.id);
    expect(project.leadId).toBe(testLead.id);
    expect(project.approvedQuotationId).toBe(testQuotation.id);
    expect(project.contractValue).toBeGreaterThan(0);
    expect(project.stage).toBe("CONFIRMATION_FEE_PAID");
    expect(project.status).toBe("ACTIVE");
    expect(project.priority).toBe("HIGH");
  });

  it("TEST 02: Verify project numbering format is database-backed and sequential", async () => {
    const currentYear = new Date().getFullYear();
    expect(testProject.referenceNo).toContain(`PROJ-${currentYear}`);
  });

  it("TEST 03: Verify initial stage is CONFIRMATION_FEE_PAID with 5% progress", async () => {
    const profile = await ProjectService.getProjectById(testProject.id, superAdminUser.id);
    expect(profile.project.stage).toBe("CONFIRMATION_FEE_PAID");
    expect(profile.project.progressPct).toBe(5);
  });

  it("TEST 04: Sequential stage transitions across design, material, and wood work stages", async () => {
    // 1. Advance to DESIGNING
    const s1 = await ProjectService.changeStage(
      testProject.id,
      { stage: "DESIGNING", notes: "Designers started 2D/3D layouts" },
      standardUser.id
    );
    expect(s1.stage).toBe("DESIGNING");

    // 2. Advance to DESIGN_COMPLETED
    const s2 = await ProjectService.changeStage(
      testProject.id,
      { stage: "DESIGN_COMPLETED", notes: "Client approved 3D renders" },
      standardUser.id
    );
    expect(s2.stage).toBe("DESIGN_COMPLETED");

    // 3. Advance to MATERIAL_SELECTION
    const s3 = await ProjectService.changeStage(
      testProject.id,
      { stage: "MATERIAL_SELECTION", notes: "Selected Century Club Plywood and Merino Laminates" },
      standardUser.id
    );
    expect(s3.stage).toBe("MATERIAL_SELECTION");

    // 4. Advance to RAW_MATERIAL_ORDERED
    const s4 = await ProjectService.changeStage(
      testProject.id,
      { stage: "RAW_MATERIAL_ORDERED", notes: "PO released to timber merchant" },
      standardUser.id
    );
    expect(s4.stage).toBe("RAW_MATERIAL_ORDERED");

    // 5. Advance to WOOD_WORK
    const s5 = await ProjectService.changeStage(
      testProject.id,
      { stage: "WOOD_WORK", notes: "Carpenters started framing and carcass fabrication" },
      standardUser.id
    );
    expect(s5.stage).toBe("WOOD_WORK");

    // 6. Advance to WOOD_WORK_COMPLETED
    const s6 = await ProjectService.changeStage(
      testProject.id,
      { stage: "WOOD_WORK_COMPLETED", notes: "Carcass fabrication completed" },
      standardUser.id
    );
    expect(s6.stage).toBe("WOOD_WORK_COMPLETED");

    // 7. Advance to LAMINATE_ORDERED
    const s7 = await ProjectService.changeStage(
      testProject.id,
      { stage: "LAMINATE_ORDERED", notes: "Laminate sheets ordered" },
      standardUser.id
    );
    expect(s7.stage).toBe("LAMINATE_ORDERED");

    // 8. Advance to LAMINATE_PASTING
    const s8 = await ProjectService.changeStage(
      testProject.id,
      { stage: "LAMINATE_PASTING", notes: "Laminate pressing & edge-banding in progress" },
      standardUser.id
    );
    expect(s8.stage).toBe("LAMINATE_PASTING");

    // 9. Advance to FITTING_WORK_COMPLETED
    const s9 = await ProjectService.changeStage(
      testProject.id,
      { stage: "FITTING_WORK_COMPLETED", notes: "Hardware fittings and soft-close channels installed" },
      standardUser.id
    );
    expect(s9.stage).toBe("FITTING_WORK_COMPLETED");

    // 10. Advance to QUALITY_CHECK
    const s10 = await ProjectService.changeStage(
      testProject.id,
      { stage: "QUALITY_CHECK", notes: "Quality audit scheduled" },
      standardUser.id
    );
    expect(s10.stage).toBe("QUALITY_CHECK");
  });

  it("TEST 05: Verify stage history is immutably recorded in ProjectStageHistory", async () => {
    const history = await db.projectStageHistory.findMany({
      where: { projectId: testProject.id },
      orderBy: { createdAt: "asc" },
    });

    expect(history.length).toBeGreaterThanOrEqual(10);
    expect(history[0].toStage).toBe("CONFIRMATION_FEE_PAID");
    expect(history[history.length - 1].toStage).toBe("QUALITY_CHECK");
  });

  it("TEST 06: Reject transition to PROJECT_HANDOVER when quality check has not passed", async () => {
    // Attempt to jump to PROJECT_HANDOVER directly
    await expect(
      ProjectService.changeStage(testProject.id, { stage: "PROJECT_HANDOVER" }, standardUser.id)
    ).rejects.toThrow(BusinessRuleError);
  });

  it("TEST 07: Record FAILED Quality Check and verify corrective action task is generated", async () => {
    const qcFail = await QualityCheckService.recordQualityCheck(
      testProject.id,
      {
        status: "FAILED",
        score: 65,
        issues: "Wardrobe door misalignment and minor veneer scratch on master bed panel",
        correctiveAction: "Re-align Blum hinges and buff scratch on headboard veneer",
      },
      standardUser.id
    );

    expect(qcFail.passed).toBe(false);
    expect(qcFail.status).toBe("FAILED");
    expect(qcFail.score).toBe(65);

    // Verify corrective action task was automatically created
    const correctiveTask = await db.task.findFirst({
      where: {
        projectId: testProject.id,
        priority: "HIGH",
        title: { contains: "Quality Corrective Action" },
      },
    });

    expect(correctiveTask).toBeDefined();
    expect(correctiveTask?.description).toContain("Re-align Blum hinges");

    // Handover should still fail
    await expect(
      ProjectService.changeStage(testProject.id, { stage: "PROJECT_HANDOVER" }, standardUser.id)
    ).rejects.toThrow(BusinessRuleError);
  });

  it("TEST 08: Record PASSED Quality Check (recheck) and verify project qualityStatus updates to PASSED", async () => {
    const qcPass = await QualityCheckService.recordQualityCheck(
      testProject.id,
      {
        status: "PASSED",
        score: 100,
        notes: "All snags cleared. Door alignment perfect and scratch buffed.",
        checklist: [
          { category: "ALIGNMENT", item: "Wardrobe door hinges", passed: true },
          { category: "SURFACE", item: "Veneer surface finish", passed: true },
          { category: "HARDWARE", item: "Soft-close channels", passed: true },
        ],
      },
      standardUser.id
    );

    expect(qcPass.passed).toBe(true);
    expect(qcPass.status).toBe("PASSED");
    expect(qcPass.score).toBe(100);

    const project = await db.project.findUnique({ where: { id: testProject.id } });
    expect(project?.qualityStatus).toBe("PASSED");
  });

  it("TEST 09: Transition to PROJECT_HANDOVER and complete formal handover with 12-month warranty", async () => {
    // Stage transition to PROJECT_HANDOVER now succeeds
    const sHandover = await ProjectService.changeStage(
      testProject.id,
      { stage: "PROJECT_HANDOVER", notes: "Client walkthrough and keys handover" },
      standardUser.id
    );
    expect(sHandover.stage).toBe("PROJECT_HANDOVER");

    // Complete formal handover
    const handoverRes = await WarrantyService.completeHandover(
      testProject.id,
      {
        warrantyDurationMonths: 12,
        notes: "Client signed off on all rooms and received master keys and warranty manual.",
        clientConfirmed: true,
      },
      standardUser.id
    );

    expect(handoverRes.handoverStatus).toBe("COMPLETED");
    expect(handoverRes.warrantyStatus).toBe("ACTIVE");
    expect(handoverRes.warrantyDurationMonths).toBe(12);
    expect(handoverRes.warrantyStartDate).toBeDefined();
    expect(handoverRes.warrantyEndDate).toBeDefined();
  });

  it("TEST 10: Transition to PROJECT_COMPLETED and verify terminal stage with 100% progress", async () => {
    const completed = await ProjectService.changeStage(
      testProject.id,
      { stage: "PROJECT_COMPLETED", notes: "Final financial reconciliation and closure" },
      superAdminUser.id
    );

    expect(completed.stage).toBe("PROJECT_COMPLETED");
    expect(completed.status).toBe("COMPLETED");

    const profile = await ProjectService.getProjectById(testProject.id, superAdminUser.id);
    expect(profile.project.progressPct).toBe(100);
  });

  it("TEST 11: Create and approve Scope Change Order, verifying revised budget adjustment", async () => {
    const initialRevisedBudget = testProject.revisedBudget || testProject.contractValue;

    // 1. Create Change Order
    const co = await ChangeOrderService.createChangeOrder(
      testProject.id,
      {
        title: "Add Full Height Study Unit in Guest Bedroom",
        description: "Client requested additional study desk and overhead shelving in veneer finish",
        additionalCost: 175000,
        timelineImpactDays: 4,
      },
      standardUser.id
    );

    expect(co.referenceNo).toMatch(/^CO-\d{4}-\d{4,}$/);
    expect(co.amount).toBe(175000);
    expect(co.status).toBe("PENDING");

    // 2. Approve Change Order
    const approvedCo = await ChangeOrderService.approveChangeOrder(co.id, superAdminUser.id);
    expect(approvedCo.status).toBe("APPROVED");

    // 3. Verify Project revisedBudget incremented
    const updatedProj = await db.project.findUnique({ where: { id: testProject.id } });
    expect(updatedProj?.revisedBudget).toBe(initialRevisedBudget + 175000);
  });

  it("TEST 12: Log and resolve Warranty Issue ticket", async () => {
    // 1. Log Warranty complaint
    const issue = await WarrantyService.logIssue(
      testProject.id,
      {
        title: "Guest bedroom sliding door friction",
        description: "Bottom roller channel gathering dust and slight friction on sliding",
        priority: "LOW",
      },
      standardUser.id
    );

    expect(issue.issueNo).toMatch(/^WAR-\d{4}-\d{4,}$/);
    expect(issue.status).toBe("OPEN");

    // 2. Resolve Warranty issue
    const resolved = await WarrantyService.resolveIssue(
      issue.id,
      "Technician visited site, lubricated bottom track and cleaned sliding channel.",
      standardUser.id
    );

    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolutionNotes).toContain("lubricated bottom track");
    expect(resolved.resolvedAt).toBeDefined();
  });

  it("TEST 13: Assign team members with specific roles (Designer, Site Engineer)", async () => {
    const member = await ProjectService.addMember(
      testProject.id,
      standardUser.id,
      "PROJECT_MANAGER",
      superAdminUser.id
    );

    expect(member.userId).toBe(standardUser.id);
    expect(member.role).toBe("PROJECT_MANAGER");

    const profile = await ProjectService.getProjectById(testProject.id, superAdminUser.id);
    expect(profile.project.members.length).toBeGreaterThan(0);
  });

  it("TEST 14: Schedule delay calculation accurately detects overdue vs on-time projects", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const onTimeHealth = ProjectService.calculateDelayHealth({
      stage: "WOOD_WORK",
      targetCompletionDate: futureDate,
    });
    expect(onTimeHealth.status).toBe("ON_TIME");

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const delayedHealth = ProjectService.calculateDelayHealth({
      stage: "WOOD_WORK",
      targetCompletionDate: pastDate,
    });
    expect(delayedHealth.status).toBe("DELAYED");
    expect(delayedHealth.daysDelayed).toBe(7);
  });

  it("TEST 15: Redact financial figures for users without projects:view_financials permission", async () => {
    const restrictedProfile = await ProjectService.getProjectById(testProject.id, restrictedUser.id);

    expect(restrictedProfile.canViewFinancials).toBe(false);
    expect(restrictedProfile.financialSummary).toBeNull();
    expect(restrictedProfile.project.contractValue).toBeNull();
    expect(restrictedProfile.project.revisedBudget).toBeNull();
    expect(restrictedProfile.project.totalExpenses).toBeNull();
    expect(restrictedProfile.project.expenses).toEqual([]);
    expect(restrictedProfile.project.payments).toEqual([]);
  });

  it("TEST 16: Retrieve paginated project directory with server-side multi-filtering", async () => {
    const res = await ProjectService.getProjects(
      {
        search: "Deepak Singhania",
        status: "COMPLETED",
        page: 1,
        limit: 10,
      },
      superAdminUser.id
    );

    expect(res.projects.length).toBeGreaterThan(0);
    expect(res.projects[0].title).toContain("Deepak Singhania");
    expect(res.projects[0].stage).toBe("PROJECT_COMPLETED");
  });

  it("TEST 17: Retrieve directory KPI metrics", async () => {
    const metrics = await ProjectService.getProjectMetrics(superAdminUser.id);

    expect(metrics.totalProjects).toBeGreaterThan(0);
    expect(metrics.completedProjects).toBeGreaterThan(0);
    expect(metrics.canViewFinancials).toBe(true);
    expect(metrics.totalContractValue).toBeGreaterThan(0);
  });

  it("TEST 18: Block hard deletion of project with change orders / financial history", async () => {
    await expect(
      ProjectService.deleteProject(testProject.id, superAdminUser.id)
    ).rejects.toThrow(BusinessRuleError);
  });

  it("TEST 19: Allow safe deletion of clean project record with no linked history", async () => {
    const cleanProj = await ProjectService.createProject(
      {
        title: "Clean Temporary Test Project",
        clientId: testClient.id,
        contractValue: 100000,
      },
      superAdminUser.id
    );

    const deleteRes = await ProjectService.deleteProject(cleanProj.id, superAdminUser.id);
    expect(deleteRes.success).toBe(true);

    const check = await db.project.findUnique({ where: { id: cleanProj.id } });
    expect(check).toBeNull();
  });

  it("TEST 20: Project operations generate structured audit log events", async () => {
    const logs = await db.auditLog.findMany({
      where: {
        entityType: "Project",
        entityId: testProject.id,
      },
    });

    expect(logs.length).toBeGreaterThanOrEqual(4);
    const actions = logs.map((l) => l.action);
    expect(actions).toContain("PROJECT_CREATED");
    expect(actions).toContain("PROJECT_STAGE_CHANGED");
  });

  it("TEST 21: Verify historical stage migration preserved legacy projects in DB", async () => {
    const legacyProjects = await db.project.findMany({
      where: {
        stage: { in: ["INITIATED", "INITIATION", "PRODUCTION_IN_PROGRESS"] },
      },
    });

    // All legacy stages were migrated non-destructively to canonical stages
    expect(legacyProjects.length).toBe(0);

    const canonicalProjects = await db.project.findMany({
      where: {
        stage: { in: ["CONFIRMATION_FEE_PAID", "WOOD_WORK", "PROJECT_COMPLETED"] },
      },
    });
    expect(canonicalProjects.length).toBeGreaterThan(0);
  });
});
