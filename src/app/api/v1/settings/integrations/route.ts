import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { IntegrationsService } from "@/modules/settings/integrations.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ForbiddenError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const hasPermission = await RbacService.hasPermission(session.userId, "settings:integrations");
    const isSuperAdmin = await RbacService.isUserSuperAdmin(session.userId);
    if (!hasPermission && !isSuperAdmin) {
      throw new ForbiddenError("Forbidden: Insufficient permissions to view integrations");
    }

    const [googleDrive, email] = await Promise.all([
      IntegrationsService.getGoogleDriveConfig(),
      IntegrationsService.getEmailConfig(),
    ]);

    return successResponse({
      googleDrive,
      email,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const hasPermission = await RbacService.hasPermission(session.userId, "settings:integrations");
    const isSuperAdmin = await RbacService.isUserSuperAdmin(session.userId);
    if (!hasPermission && !isSuperAdmin) {
      throw new ForbiddenError("Forbidden: Insufficient permissions to update integrations");
    }

    const body = await req.json();

    if (body.googleDrive) {
      await IntegrationsService.updateGoogleDriveConfig(body.googleDrive, session.userId);
    }
    if (body.email) {
      await IntegrationsService.updateEmailConfig(body.email, session.userId);
    }

    const [googleDrive, email] = await Promise.all([
      IntegrationsService.getGoogleDriveConfig(),
      IntegrationsService.getEmailConfig(),
    ]);

    return successResponse({ googleDrive, email }, { message: "Integrations updated successfully" });
  } catch (err) {
    return errorResponse(err);
  }
}
