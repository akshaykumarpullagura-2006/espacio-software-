import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { ReminderService } from "@/modules/notifications/reminder.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const data = await ReminderService.getUserReminders({
      userId: session.userId,
      status,
      priority,
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
    const reminder = await ReminderService.createReminder({
      userId: session.userId,
      title: body.title,
      description: body.description,
      dueAt: new Date(body.dueAt),
      priority: body.priority,
      entityType: body.entityType,
      entityId: body.entityId,
      actionUrl: body.actionUrl,
      createdById: session.userId,
    });

    return successResponse(reminder, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
