import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { PeriodLockService } from "@/modules/finance/period-lock.service";
import { periodLockSchema } from "@/validators/finance.schema";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = periodLockSchema.parse(body);

    const lock = await PeriodLockService.closePeriod(validated, currentUser.id);
    return ApiResponse.success(lock);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to close financial period", 400);
  }
}
