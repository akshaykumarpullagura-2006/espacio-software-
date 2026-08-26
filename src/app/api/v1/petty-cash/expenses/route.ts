import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PettyCashService } from "@/modules/petty-cash/petty-cash.service";
import { recordPettyExpenseSchema } from "@/validators/petty-cash.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "petty_cash:read", "GET_PETTY_EXPENSES_LIST");

    const { searchParams } = new URL(req.url);
    const advanceId = searchParams.get("advanceId") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const categoryKey = searchParams.get("categoryKey") || undefined;
    const paymentMethod = searchParams.get("paymentMethod") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await PettyCashService.getPettyExpenses({
      advanceId,
      employeeId,
      categoryKey,
      paymentMethod,
      projectId,
      status,
      search,
      page,
      limit,
    });

    return successResponse(result.expenses, result.pagination);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "petty_cash:record_expense", "RECORD_PETTY_EXPENSE");

    const body = await req.json();
    const parsed = recordPettyExpenseSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid petty expense payload", parsed.error.format());
    }

    const expense = await PettyCashService.recordPettyExpense(parsed.data, session.userId);

    return successResponse(expense, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
