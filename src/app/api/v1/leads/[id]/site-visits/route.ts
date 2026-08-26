import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { SiteVisitService } from "@/modules/leads/site-visit.service";
import { scheduleSiteVisitSchema } from "@/validators/lead.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:manage_followups", "SCHEDULE_SITE_VISIT");

    const { id } = await params;
    const body = await req.json();
    const parsed = scheduleSiteVisitSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid site visit payload", parsed.error.format());
    }

    const siteVisit = await SiteVisitService.scheduleSiteVisit(id, parsed.data, session.userId);
    return successResponse(siteVisit, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
