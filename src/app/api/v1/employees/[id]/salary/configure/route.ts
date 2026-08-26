import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { EmployeeService } from "@/modules/employees/employee.service";
import { ConfigureSalarySchema } from "@/validators/employee.schema";
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
    const validated = ConfigureSalarySchema.parse(body);

    const structure = await EmployeeService.configureSalary(id, validated, session.userId);
    return successResponse(structure, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
