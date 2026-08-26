import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { CreateWarrantyIssueInput, HandoverProjectInput } from "@/validators/project.schema";

export class WarrantyService {
  /**
   * Complete formal project handover and transition project to Warranty lifecycle
   */
  public static async completeHandover(projectId: string, input: HandoverProjectInput, userId?: string) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { qualityChecks: true, client: true },
    });
    if (!project) throw new NotFoundError("Project record not found");

    const hasPassedQc = project.qualityChecks.some((qc) => qc.passed);
    if (!hasPassedQc) {
      throw new BusinessRuleError(
        "Cannot complete Project Handover without a recorded and PASSED Quality Check inspection."
      );
    }

    const durationMonths = input.warrantyDurationMonths || input.durationMonths || 12;
    const handoverDate = input.handoverDate ? new Date(input.handoverDate) : new Date();
    const warrantyStartDate = handoverDate;
    const warrantyEndDate = new Date(handoverDate);
    warrantyEndDate.setMonth(warrantyEndDate.getMonth() + durationMonths);

    const updated = await db.project.update({
      where: { id: projectId },
      data: {
        stage: "PROJECT_HANDOVER",
        status: "COMPLETED",
        handoverStatus: "COMPLETED",
        handoverDate,
        handoverNotes: input.notes || null,
        handoverSignoffBy: input.handoverSignoffBy || (input.clientConfirmed ? project.client?.fullName : null),
        warrantyStatus: "ACTIVE",
        warrantyStartDate,
        warrantyEndDate,
        warrantyDurationMonths: durationMonths,
        actualCompletionDate: handoverDate,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "PROJECT_HANDOVER_COMPLETED",
      entityType: "Project",
      entityId: projectId,
      newValues: {
        handoverDate,
        warrantyDurationMonths: durationMonths,
        warrantyEndDate,
        clientConfirmed: input.clientConfirmed,
      },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: projectId,
      type: "STATUS_CHANGE",
      title: `Project Handover Completed & ${durationMonths}-Month Warranty Activated`,
      description: input.notes || undefined,
    });

    return updated;
  }

  /**
   * Initialize warranty period on a project
   */
  public static async initializeWarranty(projectId: string, durationMonths: number = 12) {
    const handoverDate = new Date();
    const warrantyEndDate = new Date();
    warrantyEndDate.setMonth(warrantyEndDate.getMonth() + durationMonths);

    return db.project.update({
      where: { id: projectId },
      data: {
        warrantyStatus: "ACTIVE",
        warrantyStartDate: handoverDate,
        handoverDate,
        warrantyEndDate,
        warrantyDurationMonths: durationMonths,
      },
    });
  }

  /**
   * Log a new warranty issue or service request
   */
  public static async logIssue(projectId: string, input: any, userId?: string) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError("Project record not found");

    let issueNo: string;
    try {
      issueNo = await IdGeneratorService.generate("WAR");
    } catch {
      issueNo = `WAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const priority = input.priority || input.severity || "MEDIUM";

    const issue = await db.warrantyIssue.create({
      data: {
        issueNo,
        projectId,
        title: input.title || input.description || "Warranty Complaint",
        description: input.description,
        priority,
        status: "OPEN",
        notes: input.notes || null,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "WARRANTY_ISSUE_LOGGED",
      entityType: "Project",
      entityId: projectId,
      newValues: { issueNo, title: issue.title, priority },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: projectId,
      type: "WARRANTY",
      title: `Warranty Issue Logged: ${issueNo} (${issue.title})`,
      description: input.description,
    });

    return issue;
  }

  public static async logWarrantyIssue(projectId: string, input: any, userId?: string) {
    return this.logIssue(projectId, input, userId);
  }

  /**
   * Resolve a recorded warranty issue
   */
  public static async resolveIssue(issueId: string, notes?: string, userId?: string) {
    const issue = await db.warrantyIssue.findUnique({ where: { id: issueId } });
    if (!issue) throw new NotFoundError("Warranty Issue record not found");

    const resolutionNotes = notes || "Resolved during service visit";

    const updated = await db.warrantyIssue.update({
      where: { id: issueId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionNotes,
        notes: notes ? `${issue.notes || ""}\nResolution: ${notes}`.trim() : issue.notes,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "WARRANTY_ISSUE_RESOLVED",
      entityType: "Project",
      entityId: issue.projectId,
      newValues: { issueNo: issue.issueNo, status: "RESOLVED", resolutionNotes },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: issue.projectId,
      type: "WARRANTY",
      title: `Warranty Issue Resolved: ${issue.issueNo}`,
      description: resolutionNotes,
    });

    return updated;
  }

  public static async resolveWarrantyIssue(issueId: string, notes?: string, userId?: string) {
    return this.resolveIssue(issueId, notes, userId);
  }
}
