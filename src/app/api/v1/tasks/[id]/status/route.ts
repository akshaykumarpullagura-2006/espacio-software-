import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { TaskService } from "@/modules/tasks/task.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();

    if (!body.status) {
      throw new ValidationError("Status parameter is required");
    }

    const updated = await TaskService.updateTaskStatus(id, body.status, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
