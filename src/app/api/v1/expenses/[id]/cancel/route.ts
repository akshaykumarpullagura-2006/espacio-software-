import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ExpenseService } from "@/modules/expenses/expense.service";
import { cancelExpenseSchema } from "@/validators/expense.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "expenses:cancel", "CANCEL_EXPENSE");

    const { id } = await params;
    const body = await req.json();
    const parsed = cancelExpenseSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid cancellation payload", parsed.error.format());
    }

    const cancelled = await ExpenseService.cancelExpense(id, parsed.data, session.userId);
    return successResponse(cancelled);
  } catch (err) {
    return errorResponse(err);
  }
}
