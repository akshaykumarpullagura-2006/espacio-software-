import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { ReminderService } from "@/modules/notifications/reminder.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();

    let snoozeDate: Date;
    if (body.snoozedUntil) {
      snoozeDate = new Date(body.snoozedUntil);
    } else if (typeof body.minutes === "number") {
      snoozeDate = new Date(Date.now() + body.minutes * 60 * 1000);
    } else {
      // Default snooze: 1 hour (60 mins)
      snoozeDate = new Date(Date.now() + 60 * 60 * 1000);
    }

    if (isNaN(snoozeDate.getTime())) {
      throw new ValidationError("Invalid snooze date provided");
    }

    const result = await ReminderService.snoozeReminder(id, session.userId, snoozeDate);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
