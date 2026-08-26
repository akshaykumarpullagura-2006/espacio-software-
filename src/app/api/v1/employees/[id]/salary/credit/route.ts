import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { EmployeeService } from "@/modules/employees/employee.service";
import { CreditSalarySchema } from "@/validators/employee.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();
    const validated = CreditSalarySchema.parse(body);

    const payment = await EmployeeService.creditSalary(id, validated, session.userId);
    return successResponse(payment, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
