import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { NotificationService } from "@/modules/notifications/notification.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;

    const result = await NotificationService.markAllAsRead(session.userId, category);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
