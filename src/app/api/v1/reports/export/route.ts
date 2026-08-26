import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { ReportsService } from "@/modules/reports/reports.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const body = await req.json();
    const { reportKey, format, filter } = body;

    if (!reportKey) {
      return ApiResponse.error("reportKey is required", 400);
    }

    const exportFormat = format === "JSON" ? "JSON" : "CSV";
    const result = await ReportsService.exportReport(reportKey, exportFormat, filter || {}, user.id);

    return new NextResponse(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to export report", 500);
  }
}
