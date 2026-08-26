import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { FinancialLedgerService } from "@/modules/finance/financial-ledger.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { searchParams } = new URL(req.url);
    const direction = (searchParams.get("direction") as any) || undefined;
    const sourceType = searchParams.get("sourceType") || undefined;
    const financialAccountId = searchParams.get("financialAccountId") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const vendorId = searchParams.get("vendorId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const data = await FinancialLedgerService.getLedgerEntries({
      direction,
      sourceType,
      financialAccountId,
      clientId,
      vendorId,
      projectId,
      search,
      page,
      limit,
    });

    return ApiResponse.success(data);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch financial ledger", 500);
  }
}
