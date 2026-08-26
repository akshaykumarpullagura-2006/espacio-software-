import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ProjectService } from "@/modules/projects/project.service";
import { addProjectMemberSchema } from "@/validators/project.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:write", "ADD_PROJECT_MEMBER");

    const { id } = await params;
    const body = await req.json();
    const parsed = addProjectMemberSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid team member payload", parsed.error.format());
    }

    const member = await ProjectService.addMember(id, parsed.data.userId, parsed.data.role, session.userId);
    return successResponse(member, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
