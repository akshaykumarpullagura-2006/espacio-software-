import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ProjectCostService } from "@/modules/expenses/project-cost.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "expenses:read", "GET_PROJECT_COST_SHEETS");

    const data = await ProjectCostService.calculateProjectCostSheets();
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}
