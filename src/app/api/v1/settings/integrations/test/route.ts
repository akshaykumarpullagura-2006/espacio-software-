import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { IntegrationsService } from "@/modules/settings/integrations.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const hasPermission = await RbacService.hasPermission(session.userId, "settings:integrations");
    const isSuperAdmin = await RbacService.isUserSuperAdmin(session.userId);
    if (!hasPermission && !isSuperAdmin) {
      throw new ForbiddenError("Forbidden: Insufficient permissions to test integrations");
    }

    const body = await req.json().catch(() => ({}));
    const target = body.target || "GOOGLE_DRIVE";

    if (target === "GOOGLE_DRIVE") {
      const result = await IntegrationsService.testGoogleDriveConnection(session.userId);
      return successResponse(result, { message: result.message });
    }

    throw new ValidationError(`Unsupported integration test target "${target}"`);
  } catch (err) {
    return errorResponse(err);
  }
}
