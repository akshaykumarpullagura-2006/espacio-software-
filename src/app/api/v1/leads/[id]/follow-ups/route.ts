import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { LeadFollowUpService } from "@/modules/leads/followup.service";
import { scheduleFollowUpSchema } from "@/validators/lead.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:manage_followups", "SCHEDULE_FOLLOWUP");

    const { id } = await params;
    const body = await req.json();

    if (body.action === "complete" && body.followUpId) {
      const completed = await LeadFollowUpService.completeFollowUp(body.followUpId, { outcomeNotes: body.outcomeNotes || "Completed" }, session.userId);
      return successResponse(completed);
    }

    const parsed = scheduleFollowUpSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid follow-up payload", parsed.error.format());
    }

    const followUp = await LeadFollowUpService.scheduleFollowUp(id, parsed.data, session.userId);
    return successResponse(followUp, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
