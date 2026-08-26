import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { EmployeeService } from "@/modules/employees/employee.service";
import { UpdateEmployeeSchema } from "@/validators/employee.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const employee = await EmployeeService.getEmployeeById(id, session.userId);
    return successResponse(employee);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();

    if (body.deactivate) {
      const deactivated = await EmployeeService.deactivateEmployee(id, session.userId);
      return successResponse(deactivated);
    }

    if (body.reactivate) {
      const reactivated = await EmployeeService.reactivateEmployee(id, session.userId);
      return successResponse(reactivated);
    }

    const validated = UpdateEmployeeSchema.parse(body);
    const updated = await EmployeeService.updateEmployee(id, validated, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
