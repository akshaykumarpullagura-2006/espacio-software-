import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ClientService } from "@/modules/clients/client.service";
import { updateClientSchema } from "@/validators/client.schema";
import { errorResponse, successResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "clients:read", "VIEW_CLIENT_PROFILE");

    const { id } = await params;
    const clientProfile = await ClientService.getClientById(id, session.userId);

    return successResponse(clientProfile);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "clients:write", "UPDATE_CLIENT");

    const { id } = await params;
    const body = await req.json();
    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid update payload", parsed.error.format());
    }

    const updated = await ClientService.updateClient(id, parsed.data, session.userId);
    return successResponse(updated, { message: "Client updated successfully" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "clients:delete", "DELETE_CLIENT");

    const { id } = await params;
    const res = await ClientService.deleteClient(id, session.userId);

    return successResponse(res, { message: res.message });
  } catch (error) {
    return errorResponse(error);
  }
}
