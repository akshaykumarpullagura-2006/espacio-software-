import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ProjectService } from "@/modules/projects/project.service";
import { createProjectTaskSchema } from "@/validators/project.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:write", "CREATE_PROJECT_TASK");

    const { id } = await params;
    const body = await req.json();
    const parsed = createProjectTaskSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid project task payload", parsed.error.format());
    }

    const task = await ProjectService.createProjectTask(id, parsed.data, session.userId);
    return successResponse(task, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
