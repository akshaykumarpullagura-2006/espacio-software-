import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { GoogleDriveService } from "@/modules/documents/google-drive.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(_req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const reconciliation = await GoogleDriveService.reconcileDriveFiles();
    return successResponse(reconciliation);
  } catch (err) {
    return errorResponse(err);
  }
}
