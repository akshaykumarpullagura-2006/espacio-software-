import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { LeadFollowUpService } from "@/modules/leads/followup.service";
import { completeFollowUpSchema } from "@/validators/lead.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; followUpId: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:manage_followups", "UPDATE_FOLLOWUP");

    const { followUpId } = await params;
    const body = await req.json();

    if (body.action === "cancel") {
      const cancelled = await LeadFollowUpService.cancelFollowUp(followUpId, body.reason, session.userId);
      return successResponse(cancelled);
    }

    const parsed = completeFollowUpSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid follow-up completion payload", parsed.error.format());
    }

    const completed = await LeadFollowUpService.completeFollowUp(followUpId, parsed.data, session.userId);
    return successResponse(completed);
  } catch (err) {
    return errorResponse(err);
  }
}
