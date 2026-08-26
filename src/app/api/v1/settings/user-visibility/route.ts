import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { SettingsService } from "@/modules/settings/settings.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const targetUserId = req.nextUrl.searchParams.get("userId") || session.userId;

    if (targetUserId !== session.userId) {
      const isSuperAdmin = await RbacService.isUserSuperAdmin(session.userId);
      if (!isSuperAdmin) {
        throw new ForbiddenError("Forbidden: Only Super Administrators can view module visibility of other users");
      }
    }

    const visibility = await SettingsService.getUserModuleVisibility(targetUserId);
    return successResponse({ userId: targetUserId, visibleModules: visibility });
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
      throw new ForbiddenError("Forbidden: Only Super Administrators can configure user module visibility");
    }

    const body = await req.json();
    if (!body.userId || !Array.isArray(body.visibleModules)) {
      throw new ValidationError("Invalid input. userId and visibleModules array are required.");
    }

    const updated = await SettingsService.updateUserModuleVisibility(body.userId, body.visibleModules, session.userId);
    return successResponse({ userId: body.userId, visibleModules: updated }, { message: "User module visibility updated successfully" });
  } catch (err) {
    return errorResponse(err);
  }
}
