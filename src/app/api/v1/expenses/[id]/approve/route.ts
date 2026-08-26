import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ExpenseService } from "@/modules/expenses/expense.service";
import { approveExpenseSchema } from "@/validators/expense.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.requireAdmin(session.userId, "ADMIN_APPROVED_EXPENSE");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = approveExpenseSchema.safeParse(body);

    const approved = await ExpenseService.approveExpense(id, parsed.success ? parsed.data : undefined, session.userId);
    return successResponse(approved);
  } catch (err) {
    return errorResponse(err);
  }
}
