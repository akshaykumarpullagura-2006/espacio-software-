import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { SiteVisitService } from "@/modules/leads/site-visit.service";
import { completeSiteVisitSchema } from "@/validators/lead.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; visitId: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:manage_followups", "UPDATE_SITE_VISIT");

    const { visitId } = await params;
    const body = await req.json();

    if (body.action === "cancel") {
      const cancelled = await SiteVisitService.cancelSiteVisit(visitId, body.reason, session.userId);
      return successResponse(cancelled);
    }

    const parsed = completeSiteVisitSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid site visit completion payload", parsed.error.format());
    }

    const completed = await SiteVisitService.completeSiteVisit(visitId, parsed.data, session.userId);
    return successResponse(completed);
  } catch (err) {
    return errorResponse(err);
  }
}
