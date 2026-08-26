import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { TaskService } from "@/modules/tasks/task.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const task = await TaskService.getTaskById(id);
    return successResponse(task);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();

    if (body.status) {
      const updated = await TaskService.updateTaskStatus(id, body.status, session.userId);
      return successResponse(updated);
    }

    if (body.assigneeId) {
      const updated = await TaskService.reassignTask(id, body.assigneeId, session.userId);
      return successResponse(updated);
    }

    const task = await TaskService.getTaskById(id);
    return successResponse(task);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const result = await TaskService.updateTaskStatus(id, "CANCELLED", session.userId);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
