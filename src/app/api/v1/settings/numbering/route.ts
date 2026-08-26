import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { NumberingService } from "@/modules/settings/numbering.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ForbiddenError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const numbering = await NumberingService.getNumberingSettings();
    return successResponse(numbering);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const hasPermission = await RbacService.hasPermission(session.userId, "settings:numbering");
    const isSuperAdmin = await RbacService.isUserSuperAdmin(session.userId);
    if (!hasPermission && !isSuperAdmin) {
      throw new ForbiddenError("Forbidden: Insufficient permissions to update numbering configuration");
    }

    const body = await req.json();
    const updated = await NumberingService.updateNumberingSettings(body, session.userId);
    return successResponse(updated, { message: "Numbering configuration updated successfully" });
  } catch (err) {
    return errorResponse(err);
  }
}
