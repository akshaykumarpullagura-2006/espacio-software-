import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ClientService } from "@/modules/clients/client.service";
import { errorResponse, successResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "clients:archive", "CHANGE_CLIENT_STATUS");

    const { id } = await params;
    const body = await req.json();

    if (!body.status || !["ACTIVE", "INACTIVE", "PROSPECT", "CUSTOMER"].includes(body.status)) {
      throw new ValidationError("Invalid status value");
    }

    const updated = await ClientService.changeStatus(id, body.status, session.userId);
    return successResponse(updated, { message: `Client status changed to ${body.status}` });
  } catch (error) {
    return errorResponse(error);
  }
}
