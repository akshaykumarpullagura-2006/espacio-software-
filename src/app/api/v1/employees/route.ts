import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { EmployeeService } from "@/modules/employees/employee.service";
import { CreateEmployeeSchema } from "@/validators/employee.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department") || undefined;
    const designation = searchParams.get("designation") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const data = await EmployeeService.getEmployees(
      { department, designation, status, search, page, limit },
      session.userId
    );

    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const validated = CreateEmployeeSchema.parse(body);

    const employee = await EmployeeService.createEmployee(validated, session.userId);
    return successResponse(employee, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
