import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.requireSuperAdmin(session.userId, "VIEW_USER_PERMISSIONS");

    const { id } = await params;
    const overrides = await RbacService.getUserPermissionOverrides(id);
    const effectivePermissions = await RbacService.getUserPermissions(id);
    const allPermissions = await db.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });

    return successResponse({
      overrides,
      effectivePermissions,
      allPermissions,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.requireSuperAdmin(session.userId, "SET_USER_PERMISSION_OVERRIDES");

    const { id } = await params;
    const body = await req.json();
    const overrides = Array.isArray(body.overrides) ? body.overrides : [];

    await RbacService.setUserPermissionOverrides(id, overrides, session.userId);

    const updatedPermissions = await RbacService.getUserPermissions(id);
    const updatedOverrides = await RbacService.getUserPermissionOverrides(id);

    return successResponse({
      message: "User permissions updated successfully",
      effectivePermissions: updatedPermissions,
      overrides: updatedOverrides,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
