import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { ExpenseConfigService } from "@/modules/expenses/expense-config.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;

    const categories = await ExpenseConfigService.getExpenseCategories(type);
    return successResponse({ categories });
  } catch (err) {
    return errorResponse(err);
  }
}
