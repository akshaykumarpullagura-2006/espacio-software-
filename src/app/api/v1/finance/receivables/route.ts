import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { ReceivableService } from "@/modules/finance/receivable.service";
import { createReceivableSchema } from "@/validators/finance.schema";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const status = searchParams.get("status") || undefined;
    const overdueOnly = searchParams.get("overdueOnly") === "true";
    const search = searchParams.get("search") || undefined;

    const receivables = await ReceivableService.getReceivables({
      clientId,
      projectId,
      status,
      overdueOnly,
      search,
    });

    return ApiResponse.success(receivables);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch receivables", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = createReceivableSchema.parse(body);

    const receivable = await ReceivableService.createReceivable(validated, currentUser.id);
    return ApiResponse.created(receivable);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to create receivable", 400);
  }
}
