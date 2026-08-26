import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { LeadConversionService } from "@/modules/leads/conversion.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:convert", "CONVERT_LEAD_TO_PROJECT");

    const { id } = await params;
    const project = await LeadConversionService.convertLeadToProject(id, session.userId);

    return successResponse(project, { message: "Lead converted to project successfully" });
  } catch (err) {
    return errorResponse(err);
  }
}
