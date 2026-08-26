import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ExpenseService } from "@/modules/expenses/expense.service";
import { rejectExpenseSchema } from "@/validators/expense.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.requireAdmin(session.userId, "ADMIN_REJECTED_EXPENSE");

    const { id } = await params;
    const body = await req.json();
    const parsed = rejectExpenseSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid rejection payload", parsed.error.format());
    }

    const rejected = await ExpenseService.rejectExpense(id, parsed.data, session.userId);
    return successResponse(rejected);
  } catch (err) {
    return errorResponse(err);
  }
}
