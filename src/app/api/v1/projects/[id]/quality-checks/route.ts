import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { QualityCheckService } from "@/modules/projects/quality-check.service";
import { createQualityCheckSchema } from "@/validators/project.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:quality_check", "RECORD_QUALITY_CHECK");

    const { id } = await params;
    const body = await req.json();
    const parsed = createQualityCheckSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid quality check payload", parsed.error.format());
    }

    const qc = await QualityCheckService.recordQualityCheck(id, parsed.data, session.userId);
    return successResponse(qc, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
