import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { UserManagementService } from "@/modules/settings/user-management.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.requireAdmin(session.userId, "VIEW_USERS_LIST");

    const users = await UserManagementService.getUsers();
    return successResponse(users);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.requireSuperAdmin(session.userId, "CREATE_USER");

    const body = await req.json();
    const created = await UserManagementService.createUser(body, session.userId);
    return successResponse(created, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
