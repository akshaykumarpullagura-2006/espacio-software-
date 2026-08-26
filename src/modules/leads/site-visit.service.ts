import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { ActivityService } from "../activity/activity.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { ScheduleSiteVisitInput, CompleteSiteVisitInput } from "@/validators/lead.schema";

export class SiteVisitService {
  public static async scheduleSiteVisit(leadId: string, input: ScheduleSiteVisitInput, userId?: string) {
    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundError("Lead not found");

    const visitDate = new Date(input.visitDate);
    if (isNaN(visitDate.getTime())) {
      throw new ValidationError("Invalid visit date provided");
    }

    const assignedToId = input.assignedToId || lead.assignedToId || null;
    const location = input.location || lead.location || null;

    const siteVisit = await db.leadSiteVisit.create({
      data: {
        leadId,
        visitDate,
        location,
        assignedToId,
        notes: input.notes || null,
        status: "SCHEDULED",
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Auto-advance lead stage to SITE_VISIT_SCHEDULED if currently in earlier stage
    if (lead.stage === "NEW" || lead.stage === "NOT_CONTACTED" || lead.stage === "CONTACTED" || lead.stage === "FOLLOW_UP_SCHEDULED") {
      await db.lead.update({
        where: { id: leadId },
        data: { stage: "SITE_VISIT_SCHEDULED" },
      });

      await db.leadStageHistory.create({
        data: {
          leadId,
          fromStage: lead.stage,
          toStage: "SITE_VISIT_SCHEDULED",
          changedById: userId || null,
          notes: `Auto-advanced on scheduling site visit for ${visitDate.toLocaleDateString()}`,
        },
      });
    }

    await AuditService.logEvent({
      userId,
      action: "SITE_VISIT_SCHEDULED",
      entityType: "LeadSiteVisit",
      entityId: siteVisit.id,
      newValues: {
        leadId,
        visitDate: siteVisit.visitDate,
        location: siteVisit.location,
        assignedToId,
      },
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: leadId,
      type: "SITE_VISIT",
      title: `Site Visit Scheduled`,
      description: `Scheduled for ${visitDate.toLocaleString("en-IN")}${location ? ` at ${location}` : ""}. ${input.notes ? `Notes: ${input.notes}` : ""}`,
    });

    if (assignedToId) {
      await NotificationService.create({
        userId: assignedToId,
        type: "SITE_VISIT_REMINDER",
        title: `Site Visit Scheduled: ${lead.clientName}`,
        message: `Site visit scheduled for lead ${lead.clientName} (${lead.referenceNo}) on ${visitDate.toLocaleDateString()}${location ? ` at ${location}` : ""}.`,
        entityType: "Lead",
        entityId: lead.id,
        actionUrl: `/leads`,
      });
    }

    return siteVisit;
  }

  public static async completeSiteVisit(visitId: string, input: CompleteSiteVisitInput, userId?: string) {
    const visit = await db.leadSiteVisit.findUnique({
      where: { id: visitId },
      include: { lead: true },
    });
    if (!visit) throw new NotFoundError("Site visit record not found");

    const updated = await db.leadSiteVisit.update({
      where: { id: visitId },
      data: {
        status: "COMPLETED",
        outcomeNotes: input.outcomeNotes,
        completedAt: new Date(),
      },
    });

    // Auto-advance lead stage to SITE_VISIT_COMPLETED if currently in SITE_VISIT_SCHEDULED
    if (visit.lead.stage === "SITE_VISIT_SCHEDULED") {
      await db.lead.update({
        where: { id: visit.leadId },
        data: { stage: "SITE_VISIT_COMPLETED" },
      });

      await db.leadStageHistory.create({
        data: {
          leadId: visit.leadId,
          fromStage: visit.lead.stage,
          toStage: "SITE_VISIT_COMPLETED",
          changedById: userId || null,
          notes: `Site visit completed. Outcome: ${input.outcomeNotes}`,
        },
      });
    }

    await AuditService.logEvent({
      userId,
      action: "SITE_VISIT_COMPLETED",
      entityType: "LeadSiteVisit",
      entityId: visitId,
      newValues: { outcomeNotes: input.outcomeNotes, completedAt: updated.completedAt },
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: visit.leadId,
      type: "SITE_VISIT",
      title: `Site Visit Completed`,
      description: `Outcome: ${input.outcomeNotes}`,
    });

    return updated;
  }

  public static async cancelSiteVisit(visitId: string, reason?: string, userId?: string) {
    const visit = await db.leadSiteVisit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundError("Site visit record not found");

    const updated = await db.leadSiteVisit.update({
      where: { id: visitId },
      data: {
        status: "CANCELLED",
        outcomeNotes: reason || "Cancelled",
      },
    });

    await AuditService.logEvent({
      userId,
      action: "SITE_VISIT_CANCELLED",
      entityType: "LeadSiteVisit",
      entityId: visitId,
      newValues: { reason },
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: visit.leadId,
      type: "SITE_VISIT",
      title: `Site Visit Cancelled`,
      description: reason ? `Reason: ${reason}` : undefined,
    });

    return updated;
  }
}
