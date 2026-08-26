import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { WarrantyService } from "@/modules/projects/warranty.service";
import { createWarrantyIssueSchema } from "@/validators/project.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:warranty", "LOG_WARRANTY_ISSUE");

    const { id } = await params;
    const body = await req.json();

    if (body.action === "resolve" && body.issueId && body.resolutionNotes) {
      const resolved = await WarrantyService.resolveWarrantyIssue(body.issueId, body.resolutionNotes, session.userId);
      return successResponse(resolved);
    }

    const parsed = createWarrantyIssueSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid warranty issue payload", parsed.error.format());
    }

    const issue = await WarrantyService.logWarrantyIssue(id, parsed.data, session.userId);
    return successResponse(issue, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
