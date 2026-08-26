import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PettyCashCalculationService } from "@/modules/petty-cash/petty-cash-calculation.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "petty_cash:read", "GET_ADVANCE_DETAIL");

    const { id } = await params;
    const summary = await PettyCashCalculationService.calculateAdvanceSummary(id);

    return successResponse(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
