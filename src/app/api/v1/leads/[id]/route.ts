import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { LeadService } from "@/modules/leads/lead.service";
import { updateLeadSchema } from "@/validators/lead.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:read", "GET_LEAD_DETAILS");

    const { id } = await params;
    const data = await LeadService.getLeadById(id, session.userId);
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:write", "UPDATE_LEAD");

    const { id } = await params;
    const body = await req.json();
    const parsed = updateLeadSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid lead update payload", parsed.error.format());
    }

    const updated = await LeadService.updateLead(id, parsed.data, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:delete", "DELETE_LEAD");

    const { id } = await params;
    const result = await LeadService.deleteLead(id, session.userId);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
