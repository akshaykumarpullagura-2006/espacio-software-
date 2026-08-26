import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { MaterialRequestService } from "@/modules/procurement/material-request.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "material_requests:reject", "REJECT_MATERIAL_REQUEST");

    const { id } = await params;
    const body = await req.json();
    if (!body.reason || body.reason.trim() === "") {
      throw new ValidationError("Rejection reason is required");
    }

    const rejected = await MaterialRequestService.rejectMaterialRequest(id, body.reason, session.userId);

    return successResponse(rejected);
  } catch (error) {
    return errorResponse(error);
  }
}
