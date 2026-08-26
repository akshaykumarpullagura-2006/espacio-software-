import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ClientService } from "@/modules/clients/client.service";
import { errorResponse, successResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "clients:read", "VIEW_CLIENT_METRICS");

    const metrics = await ClientService.getClientMetrics(session.userId);
    return successResponse(metrics);
  } catch (error) {
    return errorResponse(error);
  }
}
