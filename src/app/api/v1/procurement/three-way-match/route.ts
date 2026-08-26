import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { threeWayMatchSchema } from "@/validators/procurement.schema";
import { ThreeWayMatchService } from "@/modules/procurement/three-way-match.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = threeWayMatchSchema.parse(body);

    const result = await ThreeWayMatchService.executeThreeWayMatch(validated, user.id);
    return ApiResponse.success(result, { message: `Three-way match completed with status: ${result.matchStatus}` });
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to perform three-way match", 400);
  }
}
