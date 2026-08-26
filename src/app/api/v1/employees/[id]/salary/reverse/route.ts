import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { EmployeeService } from "@/modules/employees/employee.service";
import { ReverseSalarySchema } from "@/validators/employee.schema";
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
    const paymentId = body.paymentId;
    if (!paymentId) {
      return errorResponse(new Error("paymentId is required for reversal"));
    }

    const validated = ReverseSalarySchema.parse(body);

    const reversed = await EmployeeService.reverseSalaryPayment(paymentId, validated.reason, session.userId);
    return successResponse(reversed);
  } catch (err) {
    return errorResponse(err);
  }
}
