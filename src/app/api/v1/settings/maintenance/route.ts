import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { SystemHealthService } from "@/modules/settings/system-health.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ForbiddenError } from "@/lib/errors";

export async function GET() {
  try {
    const health = await SystemHealthService.getSystemHealth();
    return successResponse(health.maintenanceMode);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const isSuperAdmin = await RbacService.isUserSuperAdmin(session.userId);
    if (!isSuperAdmin) {
      throw new ForbiddenError("Forbidden: Only Super Administrators can toggle maintenance mode");
    }

    const body = await req.json();
    const updated = await SystemHealthService.setMaintenanceMode(body.enabled, body.message, body.allowedRoles, session.userId);
    return successResponse(updated, { message: "Maintenance mode updated successfully" });
  } catch (err) {
    return errorResponse(err);
  }
}
