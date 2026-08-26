import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { EmployeeService } from "@/modules/employees/employee.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : new Date().getMonth() + 1;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : new Date().getFullYear();

    const summary = await EmployeeService.getMonthlyFinancialSummary(id, month, year, session.userId);
    return successResponse(summary);
  } catch (err) {
    return errorResponse(err);
  }
}
