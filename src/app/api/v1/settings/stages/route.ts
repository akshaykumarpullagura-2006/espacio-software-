import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { SettingsService } from "@/modules/settings/settings.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const stages = await SettingsService.getProjectStageSettings();
    return successResponse(stages);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    if (!Array.isArray(body.stages)) {
      return errorResponse(new Error("Array of stages is required"));
    }

    const updated = await SettingsService.updateProjectStageSettings(body.stages, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
