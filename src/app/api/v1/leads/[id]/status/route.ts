import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { LeadService } from "@/modules/leads/lead.service";
import { changeStatusSchema } from "@/validators/lead.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:write", "CHANGE_LEAD_STATUS");

    const { id } = await params;
    const body = await req.json();
    const parsed = changeStatusSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid status transition payload", parsed.error.format());
    }

    const updated = await LeadService.changeStatus(id, parsed.data, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
