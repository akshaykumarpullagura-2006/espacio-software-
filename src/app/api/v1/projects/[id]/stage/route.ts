import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ProjectService } from "@/modules/projects/project.service";
import { changeProjectStageSchema } from "@/validators/project.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    // Check either permission
    const hasPerm =
      (await RbacService.hasPermission(session.userId, "projects:change_stage")) ||
      (await RbacService.hasPermission(session.userId, "projects:stage_change"));

    if (!hasPerm) {
      await RbacService.authorize(session.userId, "projects:change_stage", "CHANGE_PROJECT_STAGE");
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = changeProjectStageSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid stage payload", parsed.error.format());
    }

    const updated = await ProjectService.changeStage(id, parsed.data, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
