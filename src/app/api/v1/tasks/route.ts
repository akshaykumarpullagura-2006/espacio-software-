import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { TaskService } from "@/modules/tasks/task.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const assigneeId = searchParams.get("assigneeId") || undefined;
    const createdById = searchParams.get("createdById") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const type = searchParams.get("type") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const leadId = searchParams.get("leadId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const data = await TaskService.getTasks({
      assigneeId,
      createdById,
      status,
      priority,
      type,
      projectId,
      clientId,
      leadId,
      search,
      page,
      limit,
    });
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const task = await TaskService.createTask({
      title: body.title,
      description: body.description,
      priority: body.priority,
      type: body.type,
      assigneeId: body.assigneeId || undefined,
      createdById: session.userId,
      projectId: body.projectId || undefined,
      clientId: body.clientId || undefined,
      leadId: body.leadId || undefined,
      sourceType: body.sourceType || undefined,
      sourceId: body.sourceId || undefined,
      actionUrl: body.actionUrl || undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      estimatedMinutes: body.estimatedMinutes ? parseInt(body.estimatedMinutes, 10) : undefined,
      tags: body.tags || [],
      parentTaskId: body.parentTaskId || undefined,
      checklists: body.checklists || [],
      blockingTaskIds: body.blockingTaskIds || [],
    });

    return successResponse(task, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
