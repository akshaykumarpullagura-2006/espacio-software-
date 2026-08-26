import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ProjectService } from "@/modules/projects/project.service";
import { createProjectSchema, projectFilterSchema } from "@/validators/project.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:read", "GET_PROJECTS_LIST");

    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams.entries());
    const parsedFilters = projectFilterSchema.safeParse(rawParams);

    const filters = parsedFilters.success ? parsedFilters.data : {};
    const data = await ProjectService.getProjects(filters, session.userId);

    return successResponse(data.projects, data.pagination);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:write", "CREATE_PROJECT");

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid project payload", parsed.error.format());
    }

    const project = await ProjectService.createProject(parsed.data, session.userId);
    return successResponse(project, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
