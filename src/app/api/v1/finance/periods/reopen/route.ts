import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { PeriodLockService } from "@/modules/finance/period-lock.service";
import { z } from "zod";

const reopenSchema = z.object({
  periodKey: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = reopenSchema.parse(body);

    const lock = await PeriodLockService.reopenPeriod(validated.periodKey, currentUser.id);
    return ApiResponse.success(lock);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to reopen financial period", 400);
  }
}
