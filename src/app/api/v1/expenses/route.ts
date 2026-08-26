import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ExpenseService } from "@/modules/expenses/expense.service";
import { recordExpenseSchema } from "@/validators/expense.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "expenses:read", "GET_EXPENSES_LIST");

    const { searchParams } = new URL(req.url);
    const expenseType = searchParams.get("expenseType") || undefined;
    const categoryKey = searchParams.get("categoryKey") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const paymentMethod = searchParams.get("paymentMethod") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const data = await ExpenseService.getExpenses({
      expenseType,
      categoryKey,
      projectId,
      paymentMethod,
      status,
      search,
      page,
      limit,
    });

    return successResponse(data.expenses, data.pagination);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "expenses:write", "RECORD_EXPENSE");

    const body = await req.json();
    const parsed = recordExpenseSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid expense payload", parsed.error.format());
    }

    const expense = await ExpenseService.recordExpense(parsed.data, session.userId);
    return successResponse(expense, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
