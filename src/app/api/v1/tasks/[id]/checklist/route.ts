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

    if (!body.title) {
      throw new ValidationError("Checklist item title is required");
    }

    const item = await TaskService.addChecklistItem(id, body.title);
    return successResponse(item, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    if (!body.checklistId) {
      throw new ValidationError("checklistId is required");
    }

    const item = await TaskService.toggleChecklistItem(body.checklistId, session.userId);
    return successResponse(item);
  } catch (err) {
    return errorResponse(err);
  }
}
