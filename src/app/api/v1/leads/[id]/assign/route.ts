import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { LeadService } from "@/modules/leads/lead.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:assign", "ASSIGN_LEAD");

    const { id } = await params;
    const body = await req.json();

    if (!body.assignedToId || typeof body.assignedToId !== "string") {
      throw new ValidationError("assignedToId is required");
    }

    const updated = await LeadService.assignLead(id, body.assignedToId, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
