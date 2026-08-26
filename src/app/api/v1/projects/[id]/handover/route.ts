import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { WarrantyService } from "@/modules/projects/warranty.service";
import { handoverProjectSchema } from "@/validators/project.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:handover", "COMPLETE_PROJECT_HANDOVER");

    const { id } = await params;
    const body = await req.json();
    const parsed = handoverProjectSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid handover payload", parsed.error.format());
    }

    const updated = await WarrantyService.completeHandover(id, parsed.data, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
