import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { FinancialCalculationService } from "@/modules/payments/financial-calculation.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "payments:read", "GET_CLIENT_RECEIVABLES");

    const data = await FinancialCalculationService.calculateClientReceivables();
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}
