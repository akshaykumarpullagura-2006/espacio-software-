import { db } from "@/lib/db";
import { BusinessRuleError } from "@/lib/errors";

export interface StockQuantitySummary {
  materialId: string;
  warehouseId?: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  reorderLevel: number;
  reorderState: "NORMAL" | "LOW_STOCK" | "OUT_OF_STOCK";
}

export interface ProjectSiteMaterialSummary {
  projectId: string;
  materialId: string;
  materialName: string;
  unitKey: string;
  issuedQuantity: number;
  consumedQuantity: number;
  returnedQuantity: number;
  siteRemainingQuantity: number;
}

export class InventoryCalculationService {
  public static roundQuantity(value: number): number {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }

  /**
   * Calculates authoritative stock levels ($Available = Physical - Reserved$) for a material in a warehouse or globally.
   */
  public static async calculateStockSummary(
    materialId: string,
    warehouseId?: string
  ): Promise<StockQuantitySummary> {
    const material = await db.material.findUnique({ where: { id: materialId } });
    if (!material) throw new Error(`Material ID ${materialId} not found`);

    const where: Record<string, unknown> = { materialId };
    if (warehouseId) where.warehouseId = warehouseId;

    const balances = await db.stockBalance.findMany({ where });

    const physicalStock = this.roundQuantity(balances.reduce((acc, b) => acc + b.physicalStock, 0));
    const reservedStock = this.roundQuantity(balances.reduce((acc, b) => acc + b.reservedStock, 0));
    const availableStock = this.roundQuantity(Math.max(0, physicalStock - reservedStock));

    let reorderState: "NORMAL" | "LOW_STOCK" | "OUT_OF_STOCK" = "NORMAL";
    if (availableStock <= 0) {
      reorderState = "OUT_OF_STOCK";
    } else if (availableStock <= material.reorderLevel) {
      reorderState = "LOW_STOCK";
    }

    return {
      materialId: material.id,
      warehouseId,
      physicalStock,
      reservedStock,
      availableStock,
      reorderLevel: material.reorderLevel,
      reorderState,
    };
  }

  /**
   * Unit Conversion Engine.
   * Converts a quantity from purchase/alt unit to base stock unit using UnitConversionConfig or 1:1 fallback.
   */
  public static async convertQuantity(
    quantity: number,
    fromUnitKey: string,
    toUnitKey: string,
    materialId?: string
  ): Promise<number> {
    if (fromUnitKey === toUnitKey || quantity === 0) {
      return quantity;
    }

    // Lookup specific material conversion or global unit conversion rule
    const rule = await db.unitConversionConfig.findFirst({
      where: {
        fromUnitKey,
        toUnitKey,
        OR: [{ materialId: null }, ...(materialId ? [{ materialId }] : [])],
      },
      orderBy: { materialId: "desc" }, // Specific material rule takes precedence
    });

    if (rule) {
      return this.roundQuantity(quantity * rule.conversionFactor);
    }

    // Inverse conversion rule lookup
    const inverseRule = await db.unitConversionConfig.findFirst({
      where: {
        fromUnitKey: toUnitKey,
        toUnitKey: fromUnitKey,
        OR: [{ materialId: null }, ...(materialId ? [{ materialId }] : [])],
      },
      orderBy: { materialId: "desc" },
    });

    if (inverseRule && inverseRule.conversionFactor > 0) {
      return this.roundQuantity(quantity / inverseRule.conversionFactor);
    }

    // Default 1:1 fallback
    return quantity;
  }

  /**
   * Validates sufficient available stock before issuing or reserving.
   */
  public static validateAvailableStock(
    requestedQty: number,
    availableQty: number,
    allowNegativeStock: boolean = false
  ) {
    if (!allowNegativeStock && requestedQty > availableQty) {
      throw new BusinessRuleError(
        `Insufficient available stock (Requested: ${requestedQty}, Available: ${availableQty}).`
      );
    }
  }

  /**
   * Calculates Project Site Stock Breakdown:
   * Site Remaining = Issued - Consumed - Returned
   */
  public static async calculateProjectSiteStock(
    projectId: string,
    materialId?: string
  ): Promise<ProjectSiteMaterialSummary[]> {
    const where: Record<string, unknown> = { projectId };
    if (materialId) where.materialId = materialId;

    const movements = await db.stockMovement.findMany({
      where,
      include: { material: { select: { name: true, baseUnitKey: true } } },
    });

    const breakdownMap = new Map<string, ProjectSiteMaterialSummary>();

    for (const m of movements) {
      const mId = m.materialId;
      if (!breakdownMap.has(mId)) {
        breakdownMap.set(mId, {
          projectId,
          materialId: mId,
          materialName: m.material.name,
          unitKey: m.unitKey || m.material.baseUnitKey,
          issuedQuantity: 0,
          consumedQuantity: 0,
          returnedQuantity: 0,
          siteRemainingQuantity: 0,
        });
      }

      const item = breakdownMap.get(mId)!;
      if (m.movementType === "ISSUE") {
        item.issuedQuantity += m.quantity;
      } else if (m.movementType === "CONSUMPTION") {
        item.consumedQuantity += m.quantity;
      } else if (m.movementType === "RETURN_IN") {
        item.returnedQuantity += m.quantity;
      }

      item.siteRemainingQuantity = this.roundQuantity(
        Math.max(0, item.issuedQuantity - item.consumedQuantity - item.returnedQuantity)
      );
    }

    return Array.from(breakdownMap.values());
  }
}
