import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { TaskService } from "@/modules/tasks/task.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const data = await TaskService.getTeamWorkSummary(session.userId);
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}
