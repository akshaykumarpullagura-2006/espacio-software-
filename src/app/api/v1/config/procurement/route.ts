import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { ProcurementConfigService } from "@/modules/procurement/procurement-config.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const [purposes, units] = await Promise.all([
      ProcurementConfigService.getRequestPurposes(),
      ProcurementConfigService.getUnits(),
    ]);

    return successResponse({ purposes, units });
  } catch (error) {
    return errorResponse(error);
  }
}
