import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { ActivityService } from "../activity/activity.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { ScheduleFollowUpInput, CompleteFollowUpInput } from "@/validators/lead.schema";

export class LeadFollowUpService {
  public static async scheduleFollowUp(leadId: string, input: ScheduleFollowUpInput, userId?: string) {
    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundError("Lead not found");

    const dateVal = input.scheduledAt || input.followUpDate;
    if (!dateVal) {
      throw new ValidationError("Follow-up date is required");
    }

    const scheduledDate = new Date(dateVal);
    if (isNaN(scheduledDate.getTime())) {
      throw new ValidationError("Invalid follow-up date");
    }

    const assignedToId = input.assignedToId || lead.assignedToId || userId || null;
    const type = input.type || "CALL";

    const followUp = await db.leadFollowUp.create({
      data: {
        leadId,
        followUpDate: scheduledDate,
        type,
        notes: input.notes,
        status: "PENDING",
        assignedToId,
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Auto-advance lead stage to FOLLOW_UP_SCHEDULED if currently NEW, NOT_CONTACTED, or CONTACTED
    if (lead.stage === "NEW" || lead.stage === "NOT_CONTACTED" || lead.stage === "CONTACTED") {
      await db.lead.update({
        where: { id: leadId },
        data: { stage: "FOLLOW_UP_SCHEDULED" },
      });

      await db.leadStageHistory.create({
        data: {
          leadId,
          fromStage: lead.stage,
          toStage: "FOLLOW_UP_SCHEDULED",
          changedById: userId || null,
          notes: `Follow-up (${type}) scheduled for ${scheduledDate.toLocaleDateString()}`,
        },
      });
    }

    await AuditService.logEvent({
      userId,
      action: "FOLLOWUP_SCHEDULED",
      entityType: "LeadFollowUp",
      entityId: followUp.id,
      newValues: {
        leadId,
        followUpDate: followUp.followUpDate,
        type: followUp.type,
        notes: followUp.notes,
        assignedToId,
      },
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: leadId,
      type: type === "EMAIL" ? "EMAIL" : type === "MEETING" || type === "SITE_VISIT" ? "MEETING" : "CALL",
      title: `Follow-up Scheduled (${type})`,
      description: `${input.notes} — Scheduled for ${scheduledDate.toLocaleString("en-IN")}`,
    });

    if (assignedToId) {
      await NotificationService.create({
        userId: assignedToId,
        type: "FOLLOW_UP_REMINDER",
        title: `Follow-up Due: ${lead.clientName}`,
        message: `${type} follow-up scheduled for lead ${lead.clientName} (${lead.referenceNo}) on ${scheduledDate.toLocaleDateString()}.`,
        entityType: "Lead",
        entityId: lead.id,
        actionUrl: `/leads`,
      });
    }

    return followUp;
  }

  public static async completeFollowUp(followUpId: string, input: CompleteFollowUpInput, userId?: string) {
    const followUp = await db.leadFollowUp.findUnique({
      where: { id: followUpId },
      include: { lead: true },
    });
    if (!followUp) throw new NotFoundError("Follow-up record not found");

    const updated = await db.leadFollowUp.update({
      where: { id: followUpId },
      data: {
        status: "COMPLETED",
        outcomeNotes: input.outcomeNotes,
        completedAt: new Date(),
      },
    });

    await AuditService.logEvent({
      userId,
      action: "FOLLOWUP_COMPLETED",
      entityType: "LeadFollowUp",
      entityId: followUpId,
      newValues: { outcomeNotes: input.outcomeNotes, completedAt: updated.completedAt },
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: followUp.leadId,
      type: followUp.type === "EMAIL" ? "EMAIL" : followUp.type === "MEETING" || followUp.type === "SITE_VISIT" ? "MEETING" : "CALL",
      title: `Follow-up Completed (${followUp.type})`,
      description: `Outcome: ${input.outcomeNotes}`,
    });

    // Optional next follow-up scheduling
    if (input.nextFollowUpDate) {
      await this.scheduleFollowUp(
        followUp.leadId,
        {
          followUpDate: input.nextFollowUpDate,
          type: input.nextFollowUpType || "CALL",
          notes: input.nextFollowUpNotes || "Follow-up",
        },
        userId
      );
    }

    return updated;
  }

  public static async cancelFollowUp(followUpId: string, reason?: string, userId?: string) {
    const followUp = await db.leadFollowUp.findUnique({ where: { id: followUpId } });
    if (!followUp) throw new NotFoundError("Follow-up not found");

    const updated = await db.leadFollowUp.update({
      where: { id: followUpId },
      data: {
        status: "CANCELLED",
        outcomeNotes: reason || "Cancelled",
      },
    });

    await AuditService.logEvent({
      userId,
      action: "FOLLOWUP_CANCELLED",
      entityType: "LeadFollowUp",
      entityId: followUpId,
      newValues: { reason },
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: followUp.leadId,
      type: "CALL",
      title: `Follow-up Cancelled`,
      description: reason ? `Reason: ${reason}` : undefined,
    });

    return updated;
  }
}
