import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { CrmConfigService } from "@/modules/config/crm-config.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const config = await CrmConfigService.getCrmConfig();
    return successResponse(config);
  } catch (err) {
    return errorResponse(err);
  }
}
