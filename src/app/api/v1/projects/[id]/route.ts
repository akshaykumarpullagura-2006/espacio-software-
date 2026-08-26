import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ProjectService } from "@/modules/projects/project.service";
import { updateProjectSchema } from "@/validators/project.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:read", "GET_PROJECT_DETAILS");

    const { id } = await params;
    const data = await ProjectService.getProjectById(id, session.userId);
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:write", "UPDATE_PROJECT");

    const { id } = await params;
    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid project update payload", parsed.error.format());
    }

    const updated = await ProjectService.updateProject(id, parsed.data, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:delete", "DELETE_PROJECT");

    const { id } = await params;
    const result = await ProjectService.deleteProject(id, session.userId);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
