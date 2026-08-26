import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { TaskService } from "@/modules/tasks/task.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const templates = await TaskService.getTaskTemplates();
    return successResponse(templates);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();

    if (body.action === "APPLY_TO_PROJECT") {
      const createdTasks = await TaskService.createTasksFromTemplate(
        body.templateId,
        body.projectId,
        session.userId
      );
      return successResponse(createdTasks, undefined, 201);
    }

    const template = await TaskService.createTaskTemplate(
      body.name,
      body.type || "PROJECT",
      body.description,
      body.items || []
    );
    return successResponse(template, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
