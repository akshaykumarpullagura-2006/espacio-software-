import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ClientService } from "@/modules/clients/client.service";
import { errorResponse, successResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "clients:write", "LINK_LEAD_TO_CLIENT");

    const { id } = await params;
    const body = await req.json();

    if (!body.leadId) {
      throw new ValidationError("leadId is required");
    }

    const result = await ClientService.linkLead(id, body.leadId, session.userId);
    return successResponse(result, { message: result.message });
  } catch (error) {
    return errorResponse(error);
  }
}
