import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) {
      throw new AuthError("No active session");
    }

    const user = await AuthService.getCurrentUser(session.userId);
    return successResponse(user);
  } catch (err) {
    return errorResponse(err);
  }
}
