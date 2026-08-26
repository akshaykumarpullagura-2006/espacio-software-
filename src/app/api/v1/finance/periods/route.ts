import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { PeriodLockService } from "@/modules/finance/period-lock.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const locks = await PeriodLockService.getPeriodLocks();
    return ApiResponse.success(locks);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch period locks", 500);
  }
}
