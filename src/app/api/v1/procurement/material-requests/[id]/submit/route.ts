import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { MaterialRequestService } from "@/modules/procurement/material-request.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "material_requests:write", "SUBMIT_MATERIAL_REQUEST");

    const { id } = await params;
    const updated = await MaterialRequestService.submitMaterialRequest(id, session.userId);

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
