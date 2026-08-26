import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { NotificationService } from "@/modules/notifications/notification.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const data = await NotificationService.getUserPreferences(session.userId);
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
    const { category, channel, isEnabled } = body;

    const result = await NotificationService.updatePreference(
      session.userId,
      category,
      channel,
      Boolean(isEnabled)
    );
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
