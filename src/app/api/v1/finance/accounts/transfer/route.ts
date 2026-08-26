import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { FinancialAccountService } from "@/modules/finance/financial-account.service";
import { transferFundsSchema } from "@/validators/finance.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "financial_accounts:transfer", "TRANSFER_FINANCIAL_FUNDS");

    const body = await req.json();
    const parsed = transferFundsSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid fund transfer payload", parsed.error.format());
    }

    const transfer = await FinancialAccountService.transferFunds(parsed.data, session.userId);
    return successResponse(transfer, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
