import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { WarrantyService } from "@/modules/projects/warranty.service";
import { resolveWarrantyIssueSchema } from "@/validators/project.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; issueId: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:warranty", "RESOLVE_WARRANTY_ISSUE");

    const { issueId } = await params;
    const body = await req.json();
    const parsed = resolveWarrantyIssueSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid resolution payload", parsed.error.format());
    }

    const resolved = await WarrantyService.resolveWarrantyIssue(issueId, parsed.data.resolutionNotes, session.userId);
    return successResponse(resolved);
  } catch (err) {
    return errorResponse(err);
  }
}
