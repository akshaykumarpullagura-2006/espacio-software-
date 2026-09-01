import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { LeadFollowUpService } from "@/modules/leads/followup.service";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError, NotFoundError } from "@/lib/errors";
import { ActivityService } from "@/modules/activity/activity.service";
import { AuditService } from "@/modules/audit/audit.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) {
      throw new AuthError("Unauthorized");
    }

    const { id } = await params;
    const body = await req.json();
    const { action, type, outcomeNotes, newDate, notes } = body;

    if (!action) {
      throw new ValidationError("Action is required (complete, reschedule)");
    }

    if (type === "TASK") {
      const task = await db.task.findUnique({ where: { id } });
      if (!task) throw new NotFoundError("Task not found");

      if (action === "complete") {
        const updated = await db.task.update({
          where: { id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        await ActivityService.record({
          userId: session.userId,
          entityType: "Task",
          entityId: id,
          type: "TASK",
          title: `Task Completed: ${task.title}`,
          description: outcomeNotes || "Completed from Command Center",
        });

        await AuditService.logEvent({
          userId: session.userId,
          action: "TASK_COMPLETED",
          entityType: "Task",
          entityId: id,
          newValues: { status: "COMPLETED", outcomeNotes },
        });

        return successResponse(updated);
      } else if (action === "reschedule") {
        if (!newDate) throw new ValidationError("New date is required for reschedule");
        const updated = await db.task.update({
          where: { id },
          data: {
            dueAt: new Date(newDate),
          },
        });

        await ActivityService.record({
          userId: session.userId,
          entityType: "Task",
          entityId: id,
          type: "TASK",
          title: `Task Rescheduled: ${task.title}`,
          description: `Due date changed to ${new Date(newDate).toLocaleDateString("en-IN")}`,
        });

        return successResponse(updated);
      }
    } else {
      // LeadFollowUp
      if (action === "complete") {
        const completed = await LeadFollowUpService.completeFollowUp(
          id,
          {
            outcomeNotes: outcomeNotes || "Completed from Command Center",
          },
          session.userId
        );
        return successResponse(completed);
      } else if (action === "reschedule") {
        if (!newDate) throw new ValidationError("New date is required for reschedule");
        const followUp = await db.leadFollowUp.findUnique({
          where: { id },
          include: { lead: true },
        });
        if (!followUp) throw new NotFoundError("Follow-up not found");

        const updated = await db.leadFollowUp.update({
          where: { id },
          data: {
            followUpDate: new Date(newDate),
            notes: notes || followUp.notes,
          },
        });

        await ActivityService.record({
          userId: session.userId,
          entityType: "Lead",
          entityId: followUp.leadId,
          type: "CALL",
          title: `Follow-up Rescheduled`,
          description: `Rescheduled to ${new Date(newDate).toLocaleDateString("en-IN")}: ${notes || followUp.notes}`,
        });

        await AuditService.logEvent({
          userId: session.userId,
          action: "FOLLOWUP_RESCHEDULED",
          entityType: "LeadFollowUp",
          entityId: id,
          newValues: { followUpDate: newDate, notes },
        });

        return successResponse(updated);
      }
    }

    throw new ValidationError(`Unknown action: ${action}`);
  } catch (err) {
    return errorResponse(err);
  }
}
