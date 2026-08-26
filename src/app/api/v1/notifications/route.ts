import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { NotificationService } from "@/modules/notifications/notification.service";
import { NotificationEngine } from "@/modules/notifications/notification-engine";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;
    const isReadParam = searchParams.get("isRead");
    const isRead = isReadParam !== null ? isReadParam === "true" : undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const data = await NotificationService.getUserNotifications({
      userId: session.userId,
      category,
      priority,
      isRead,
      search,
      page,
      limit,
    });
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const result = await NotificationEngine.publishEvent({
      eventId: body.eventId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      eventType: body.eventType || "SYSTEM_ALERT",
      category: body.category || "SYSTEM",
      priority: body.priority || "NORMAL",
      actorId: session.userId,
      entityType: body.entityType,
      entityId: body.entityId,
      title: body.title,
      message: body.message,
      actionUrl: body.actionUrl,
      targetUserId: body.targetUserId,
      targetRole: body.targetRole,
    });

    return successResponse(result, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
