import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { FinancialAccountService } from "@/modules/finance/financial-account.service";
import { createFinancialAccountSchema } from "@/validators/finance.schema";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const accounts = await FinancialAccountService.getAccounts();
    return ApiResponse.success(accounts);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch financial accounts", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = createFinancialAccountSchema.parse(body);

    const account = await FinancialAccountService.createAccount(validated, currentUser.id);
    return ApiResponse.created(account);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to create financial account", 400);
  }
}
