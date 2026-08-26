import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { ProjectProcurementService } from "@/modules/procurement/project-procurement.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const { id } = await params;
    const overview = await ProjectProcurementService.getProjectProcurementOverview(id);
    return ApiResponse.success(overview);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch project procurement overview", 400);
  }
}
