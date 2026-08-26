import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PettyCashService } from "@/modules/petty-cash/petty-cash.service";
import { createReconciliationSchema } from "@/validators/finance.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "petty_cash:reconcile", "RECONCILE_PETTY_CASH");

    const body = await req.json();
    const parsed = createReconciliationSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid reconciliation payload", parsed.error.format());
    }

    const reconciliation = await PettyCashService.reconcilePettyCash(parsed.data, session.userId);
    return successResponse(reconciliation, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
