import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { CalendarService } from "@/modules/calendar/calendar.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : defaultStart;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : defaultEnd;

    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const events = await CalendarService.getCalendarEvents({
      startDate,
      endDate,
      category,
      search,
    });

    return successResponse(events);
  } catch (err) {
    return errorResponse(err);
  }
}
