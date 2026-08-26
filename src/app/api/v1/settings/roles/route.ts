import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";
import { AuditService } from "@/modules/audit/audit.service";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.requireAdmin(session.userId, "VIEW_ROLES");

    const roles = await db.role.findMany({
      orderBy: { name: "asc" },
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });

    const permissions = await db.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });

    return successResponse({ roles, permissions });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.requireSuperAdmin(session.userId, "MODIFY_ROLE_PERMISSIONS");

    const body = await req.json();
    const { roleId, permissionIds } = body;

    if (!roleId || !Array.isArray(permissionIds)) {
      return errorResponse(new Error("roleId and array of permissionIds are required"));
    }

    // Replace permissions for role
    await db.rolePermission.deleteMany({ where: { roleId } });

    if (permissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: permissionIds.map((pId: string) => ({ roleId, permissionId: pId })),
      });
    }

    await AuditService.logEvent({
      userId: session.userId,
      action: "PERMISSION_CHANGED",
      entityType: "Role",
      entityId: roleId,
      newValues: { permissionCount: permissionIds.length },
    });

    const updatedRole = await db.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: { include: { permission: true } } },
    });

    return successResponse(updatedRole);
  } catch (err) {
    return errorResponse(err);
  }
}
