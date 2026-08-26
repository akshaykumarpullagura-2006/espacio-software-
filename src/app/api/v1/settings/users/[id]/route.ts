import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { UserManagementService } from "@/modules/settings/user-management.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;

    if (session.userId !== id) {
      await RbacService.requireAdmin(session.userId, "VIEW_USER_DETAILS");
    }

    const user = await UserManagementService.getUserById(id);
    return successResponse(user);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();

    if (body.deactivate) {
      await RbacService.requireSuperAdmin(session.userId, "DEACTIVATE_USER");
      const deactivated = await UserManagementService.deactivateUser(id, session.userId);
      return successResponse(deactivated);
    }

    if (body.reactivate) {
      await RbacService.requireSuperAdmin(session.userId, "REACTIVATE_USER");
      const reactivated = await UserManagementService.reactivateUser(id, session.userId);
      return successResponse(reactivated);
    }

    // Role, access level, status changes, or editing other users requires Super Admin
    if (body.roleName || body.accessLevel || body.status || body.newPassword || session.userId !== id) {
      await RbacService.requireSuperAdmin(session.userId, "UPDATE_USER_ACCOUNT");
    }

    const updated = await UserManagementService.updateUser(id, body, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
