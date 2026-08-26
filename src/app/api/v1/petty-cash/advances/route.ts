import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PettyCashService } from "@/modules/petty-cash/petty-cash.service";
import { issueAdvanceSchema } from "@/validators/petty-cash.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "petty_cash:read", "GET_ADVANCES_LIST");

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") || undefined;
    const status = searchParams.get("status") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await PettyCashService.getAdvances({
      employeeId,
      status,
      projectId,
      search,
      page,
      limit,
    });

    return successResponse(result.advances, result.pagination);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "petty_cash:write", "ISSUE_EMPLOYEE_ADVANCE");

    const body = await req.json();
    const parsed = issueAdvanceSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid advance payload", parsed.error.format());
    }

    const advance = await PettyCashService.issueAdvance(parsed.data, session.userId);

    return successResponse(advance, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
