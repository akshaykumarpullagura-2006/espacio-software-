import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, NotFoundError } from "@/lib/errors";
import { InventoryCalculationService } from "@/modules/inventory/inventory-calculation.service";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId") || undefined;

    const material = await db.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundError("Material not found");

    const summary = await InventoryCalculationService.calculateStockSummary(id, warehouseId);
    const projectBreakdown = await InventoryCalculationService.calculateProjectSiteStock(id, id);

    const warehouseBreakdowns = await db.stockBalance.findMany({
      where: { materialId: id },
      include: {
        warehouse: { select: { warehouseCode: true, name: true, type: true } },
        location: { select: { code: true, zone: true } },
      },
    });

    return successResponse({
      material: {
        id: material.id,
        materialCode: material.materialCode,
        name: material.name,
        baseUnitKey: material.baseUnitKey,
        reorderLevel: material.reorderLevel,
        minStock: material.minStock,
        maxStock: material.maxStock,
      },
      stockSummary: summary,
      warehouseBreakdowns,
    });
  } catch (error: any) {
    return errorResponse(error);
  }
}
