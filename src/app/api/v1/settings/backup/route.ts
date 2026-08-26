import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { BackupService } from "@/modules/settings/backup.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const [status, history] = await Promise.all([
      BackupService.getBackupStatus(),
      BackupService.getBackupHistory(),
    ]);

    return successResponse({ status, history });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json().catch(() => ({}));

    if (body.action === "TEST_BACKUP") {
      const result = await BackupService.testBackup(session.userId);
      return successResponse(result);
    }

    const log = await BackupService.runBackup(session.userId);
    return successResponse(log, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
