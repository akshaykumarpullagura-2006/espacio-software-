import { NextRequest } from "next/server";
import { CommandRegistry } from "@/modules/search/command-registry";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || undefined;

    const commands = await CommandRegistry.getAccessibleCommands(session.userId, query);
    return successResponse(commands);
  } catch (err) {
    return errorResponse(err);
  }
}
