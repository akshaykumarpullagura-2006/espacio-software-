import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { SettingsService } from "@/modules/settings/settings.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const preferences = await SettingsService.getBusinessPreferences();
    return successResponse(preferences);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const updated = await SettingsService.updateBusinessPreferences(body, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
