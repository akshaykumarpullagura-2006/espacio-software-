import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ApprovalsService } from "@/modules/approvals/approvals.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(_req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    // Privileged endpoint: requires ADMIN
    await RbacService.requireAdmin(session.userId, "VIEW_PENDING_APPROVALS");

    const data = await ApprovalsService.getPendingApprovals();
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}
