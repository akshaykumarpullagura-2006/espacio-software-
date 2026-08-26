import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { LeadService } from "@/modules/leads/lead.service";
import { linkClientSchema } from "@/validators/lead.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:write", "LINK_CLIENT_TO_LEAD");

    const { id } = await params;
    const body = await req.json();
    const parsed = linkClientSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid client link payload", parsed.error.format());
    }

    const result = await LeadService.linkExistingClient(id, parsed.data.clientId, session.userId);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
