import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PettyCashService } from "@/modules/petty-cash/petty-cash.service";
import { settleAdvanceSchema } from "@/validators/petty-cash.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "petty_cash:read", "GET_SETTLEMENTS_LIST");

    const settlements = await PettyCashService.getSettlements();

    return successResponse(settlements);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "petty_cash:settle", "SETTLE_ADVANCE");

    const body = await req.json();
    const parsed = settleAdvanceSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid settlement payload", parsed.error.format());
    }

    const settlement = await PettyCashService.settleAdvance(parsed.data, session.userId);

    return successResponse(settlement, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
