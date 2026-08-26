import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { CreateQualityCheckInput } from "@/validators/project.schema";

export class QualityCheckService {
  /**
   * Record a quality check inspection with checklist items, scoring, and corrective actions
   */
  public static async recordQualityCheck(projectId: string, input: CreateQualityCheckInput, userId?: string) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    });
    if (!project) throw new NotFoundError("Project record not found");

    const status = input.status || (input.passed ? "PASSED" : "FAILED");
    const passed = status === "PASSED";

    let score = input.score;
    if (score === undefined) {
      if (input.checklist && input.checklist.length > 0) {
        const passedItems = input.checklist.filter((item) => item.passed).length;
        score = Number(((passedItems / input.checklist.length) * 100).toFixed(1));
      } else {
        score = passed ? 100 : 50;
      }
    }

    const checklistJson = input.checklist ? JSON.stringify(input.checklist) : null;
    const issues = input.issues || input.issuesFound || null;
    const correctiveAction = input.correctiveAction || null;

    const previousChecksCount = await db.qualityCheck.count({ where: { projectId } });

    const qc = await db.qualityCheck.create({
      data: {
        projectId,
        inspectedById: userId ?? null,
        passed,
        score,
        status,
        checklistJson,
        issues,
        correctiveAction,
        recheckCount: previousChecksCount,
        notes: input.notes || issues || null,
        checkDate: new Date(),
      },
    });

    // Update project qualityStatus
    await db.project.update({
      where: { id: projectId },
      data: { qualityStatus: status },
    });

    // If inspection FAILED, automatically generate a corrective action Task
    if (!passed && (issues || correctiveAction)) {
      let taskNo: string;
      try {
        taskNo = await IdGeneratorService.generate("TSK");
      } catch {
        taskNo = `TSK-${Date.now()}`;
      }

      const creatorId = userId || (await db.user.findFirst({ select: { id: true } }))?.id;
      if (creatorId) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);

        await db.task.create({
          data: {
            referenceNo: taskNo,
            title: `Quality Corrective Action: ${project.title}`,
            description: `Quality Inspection failed with score ${score}%. Corrective Action Required: ${correctiveAction || issues}`,
            projectId,
            clientId: project.clientId,
            priority: "HIGH",
            status: "TODO",
            dueAt: dueDate,
            createdById: creatorId,
          },
        }).catch(() => {});
      }
    }

    await AuditService.logEvent({
      userId,
      action: "PROJECT_QUALITY_CHECK_COMPLETED",
      entityType: "Project",
      entityId: projectId,
      newValues: {
        qualityCheckId: qc.id,
        status: qc.status,
        passed: qc.passed,
        score: qc.score,
        issues: qc.issues,
      },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: projectId,
      type: "QUALITY_CHECK",
      title: `Quality Check ${passed ? "PASSED" : "FAILED"} (Score: ${score}%)`,
      description: issues ? `Issues noted: ${issues}` : undefined,
    });

    return qc;
  }
}
