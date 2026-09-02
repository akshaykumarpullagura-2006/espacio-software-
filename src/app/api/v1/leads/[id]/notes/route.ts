import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ActivityService } from "@/modules/activity/activity.service";
import { AuditService } from "@/modules/audit/audit.service";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, NotFoundError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:write", "ADD_LEAD_NOTE");

    const { id } = await params;
    const body = await req.json();
    const noteText = typeof body.note === "string" ? body.note.trim() : "";
    const cardStage = typeof body.cardStage === "string" ? body.cardStage.trim() : null;

    if (!noteText) {
      throw new ValidationError("Note content cannot be empty.");
    }

    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundError("Lead not found");

    // Append to lead's general notes or create activity
    const timestampStr = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const actor = await db.user.findUnique({
      where: { id: session.userId },
      select: { fullName: true, email: true },
    });
    const actorName = actor?.fullName || actor?.email || "Staff";

    const titlePrefix = cardStage ? `[${cardStage}] Note Added` : "Note Added";

    // Record activity log with metadata
    const activity = await ActivityService.record({
      userId: session.userId,
      entityType: "Lead",
      entityId: lead.id,
      type: "NOTE",
      title: `${titlePrefix} by ${actorName}`,
      description: noteText,
      metadata: cardStage ? { cardStage, author: actorName, timestamp: new Date().toISOString() } : undefined,
    });

    // Also update lead's notes field for quick reference
    const updatedNotes = lead.notes
      ? `${lead.notes}\n\n[${timestampStr} - ${actorName}${cardStage ? ` - ${cardStage}` : ""}]: ${noteText}`
      : `[${timestampStr} - ${actorName}${cardStage ? ` - ${cardStage}` : ""}]: ${noteText}`;

    await db.lead.update({
      where: { id: lead.id },
      data: { notes: updatedNotes },
    });

    await AuditService.logEvent({
      userId: session.userId,
      action: "LEAD_NOTE_ADDED",
      entityType: "Lead",
      entityId: lead.id,
      newValues: { cardStage, note: noteText, author: actorName },
    });

    return successResponse({
      activity,
      notes: updatedNotes,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
