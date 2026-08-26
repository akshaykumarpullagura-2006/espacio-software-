import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { TaskService } from "@/modules/tasks/task.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    if (!body.projectId || !body.stage) {
      throw new ValidationError("projectId and stage are required");
    }

    const tasks = await TaskService.generateStageTasks(body.projectId, body.stage, session.userId);
    return successResponse(tasks, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
