import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { NotificationService } from "@/modules/notifications/notification.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ForbiddenError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const rules = await NotificationService.getNotificationRules();
    return successResponse(rules);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const permissions = await RbacService.getUserPermissions(session.userId);
    if (!permissions.includes("NOTIFICATION_RULES_MANAGE") && !permissions.includes("admin:all")) {
      throw new ForbiddenError("Insufficient permissions to manage notification rules");
    }

    const body = await req.json();
    const rule = await NotificationService.upsertNotificationRule(body);
    return successResponse(rule, undefined, body.id ? 200 : 201);
  } catch (err) {
    return errorResponse(err);
  }
}
