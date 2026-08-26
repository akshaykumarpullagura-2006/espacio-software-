import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { PettyCashConfigService } from "@/modules/petty-cash/petty-cash-config.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const categories = await PettyCashConfigService.getPettyCashCategories();
    return successResponse(categories);
  } catch (error) {
    return errorResponse(error);
  }
}
