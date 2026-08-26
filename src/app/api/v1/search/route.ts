import { NextRequest } from "next/server";
import { SearchService } from "@/modules/search/search.service";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) {
      throw new AuthError("Unauthorized search request");
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const moduleFilter = searchParams.get("module") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const result = await SearchService.globalSearch(session.userId, query, {
      module: moduleFilter,
      limit,
      offset,
    });

    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
