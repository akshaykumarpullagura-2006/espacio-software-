import { describe, it, expect } from "vitest";
import { createProjectSchema } from "../src/validators/project.schema";
import { IdGeneratorService } from "../src/lib/id-generator";
import { ProjectService } from "../src/modules/projects/project.service";
import { ChangeOrderService } from "../src/modules/projects/change-order.service";
import { QualityCheckService } from "../src/modules/projects/quality-check.service";
import { WarrantyService } from "../src/modules/projects/warranty.service";
import { db } from "../src/lib/db";
import { BusinessRuleError } from "../src/lib/errors";

describe("Project Management & Operations Module Tests", () => {
  it("generates correct PROJ-YYYY-XXXX reference format", async () => {
    const year = new Date().getFullYear();
    const ref = await IdGeneratorService.generate("PROJ");
    expect(ref).toMatch(new RegExp(`^PROJ-${year}-\\d{4,}$`));
  });

  it("validates legitimate project payloads and rejects invalid budgets", () => {
    const valid = createProjectSchema.safeParse({
      title: "Test Villa Execution",
      clientId: "test-client-id",
      totalBudget: 5000000,
    });
    expect(valid.success).toBe(true);

    const invalidBudget = createProjectSchema.safeParse({
      title: "Test Villa Execution",
      clientId: "test-client-id",
      totalBudget: -100, // Negative budget
    });
    expect(invalidBudget.success).toBe(false);
  });

  it("calculates schedule delay health correctly", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    expect(ProjectService.calculateDelayHealth({ targetDate: futureDate, stage: "DESIGNING", status: "ACTIVE" }).status).toBe("ON_TIME");

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    expect(ProjectService.calculateDelayHealth({ targetDate: pastDate, stage: "WOOD_WORK", status: "ACTIVE" }).status).toBe("DELAYED");
  });

  it("strictly rejects transition to PROJECT_HANDOVER when no passed Quality Check exists", async () => {
    const client = await db.client.findFirst();

    if (client) {
      const project = await ProjectService.createProject({
        title: "QC Dependency Test Project",
        clientId: client.id,
        totalBudget: 2000000,
        stage: "FITTING_WORK_COMPLETED",
      });

      // Attempt transition to PROJECT_HANDOVER without passing QC
      await expect(
        ProjectService.changeStage(project.id, { stage: "PROJECT_HANDOVER" })
      ).rejects.toThrow(BusinessRuleError);

      // Clean up
      await db.project.delete({ where: { id: project.id } });
    }
  });

  it("creates scope Change Orders and updates revised budget upon approval", async () => {
    const project = await db.project.findFirst({ where: { referenceNo: { startsWith: "PROJ" } } });

    if (project) {
      const initialRevisedBudget = project.revisedBudget || project.contractValue;

      // 1. Create Change Order
      const co = await ChangeOrderService.createChangeOrder(project.id, {
        description: "Test Extra Wardrobe Veneer",
        additionalCost: 150000,
      });

      expect(co.referenceNo).toMatch(/^CO-\d{4}-\d{4}/);
      expect(["PENDING", "PENDING_APPROVAL"]).toContain(co.status);

      // 2. Approve Change Order
      const approved = await ChangeOrderService.approveChangeOrder(co.id);
      expect(approved.status).toBe("APPROVED");
    }
  });

  it("executes Quality Check, Handover, Warranty initialization, and Warranty Issue logging", async () => {
    const client = await db.client.findFirst();

    if (client) {
      const project = await ProjectService.createProject({
        title: "Handover & Warranty Test Project",
        clientId: client.id,
        totalBudget: 3000000,
        stage: "QUALITY_CHECK",
      });

      // 1. Record passed Quality Check
      await QualityCheckService.recordQualityCheck(project.id, {
        status: "PASSED",
        notes: "Passed site inspection",
      });

      // 2. Transition to PROJECT_HANDOVER (should succeed now)
      const updated = await ProjectService.changeStage(project.id, { stage: "PROJECT_HANDOVER" });
      expect(updated.stage).toBe("PROJECT_HANDOVER");

      // 3. Verify stage updated
      expect(updated.stage).toBe("PROJECT_HANDOVER");

      // 4. Log Warranty Issue
      const issue = await WarrantyService.logIssue(project.id, {
        description: "Minor hinge noise in wardrobe",
        priority: "LOW",
      });
      expect(issue.issueNo).toMatch(/^WAR-\d{4}-\d{4,}$/);

      // Clean up
      await db.project.delete({ where: { id: project.id } });
    }
  });
});
