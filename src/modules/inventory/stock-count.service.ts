import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { InventoryCalculationService } from "./inventory-calculation.service";
import { CreateStockCountInput } from "@/validators/inventory.schema";

export class StockCountService {
  public static async createStockCount(input: CreateStockCountInput, userId?: string) {
    const warehouse = await db.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new NotFoundError("Warehouse record not found");

    const countNo = await IdGeneratorService.generate("STC");

    const itemsData = [];

    for (const item of input.items) {
      const material = await db.material.findUnique({ where: { id: item.materialId } });
      if (!material) continue;

      const summary = await InventoryCalculationService.calculateStockSummary(material.id, warehouse.id);
      const systemQuantity = summary.physicalStock;
      const difference = InventoryCalculationService.roundQuantity(item.countedQuantity - systemQuantity);

      itemsData.push({
        materialId: material.id,
        systemQuantity,
        countedQuantity: item.countedQuantity,
        difference,
        notes: item.notes ? item.notes.trim() : null,
      });
    }

    const stockCount = await db.stockCount.create({
      data: {
        countNo,
        warehouseId: warehouse.id,
        status: "REVIEW_PENDING",
        notes: input.notes ? input.notes.trim() : null,
        createdById: userId ?? null,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: { include: { material: { select: { materialCode: true, name: true, baseUnitKey: true } } } },
        warehouse: { select: { warehouseCode: true, name: true } },
      },
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_COUNT_CREATED",
      entityType: "StockCount",
      entityId: stockCount.id,
      newValues: { countNo: stockCount.countNo, warehouse: warehouse.name, totalItems: itemsData.length },
    });

    return stockCount;
  }

  public static async approveStockCount(id: string, userId?: string) {
    const count = await db.stockCount.findUnique({
      where: { id },
      include: {
        items: { include: { material: true } },
        warehouse: { select: { name: true } },
      },
    });

    if (!count) throw new NotFoundError("Stock count record not found");
    if (count.status === "APPROVED") {
      throw new BusinessRuleError("Stock count has already been approved.");
    }

    await db.$transaction(async (tx) => {
      for (const item of count.items) {
        if (item.difference === 0) continue;

        const movementType = item.difference > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
        const absQty = Math.abs(item.difference);

        // Adjust stock balance
        const balance = await tx.stockBalance.findUnique({
          where: { materialId_warehouseId: { materialId: item.materialId, warehouseId: count.warehouseId } },
        });

        const newPhysical = InventoryCalculationService.roundQuantity(
          (balance?.physicalStock ?? 0) + item.difference
        );
        const newAvailable = InventoryCalculationService.roundQuantity(
          Math.max(0, newPhysical - (balance?.reservedStock ?? 0))
        );

        await tx.stockBalance.upsert({
          where: { materialId_warehouseId: { materialId: item.materialId, warehouseId: count.warehouseId } },
          update: { physicalStock: newPhysical, availableStock: newAvailable },
          create: {
            materialId: item.materialId,
            warehouseId: count.warehouseId,
            physicalStock: newPhysical,
            availableStock: newAvailable,
          },
        });

        // Record stock movement adjustment
        const movementNo = await IdGeneratorService.generate("STM");
        await tx.stockMovement.create({
          data: {
            movementNo,
            materialId: item.materialId,
            warehouseId: count.warehouseId,
            movementType,
            quantity: absQty,
            unitKey: item.material.baseUnitKey,
            referenceType: "STOCK_COUNT",
            referenceId: count.id,
            runningBalance: newPhysical,
            reason: `Physical stock count discrepancy adjustment (${count.countNo})`,
            createdById: userId ?? null,
          },
        });
      }

      await tx.stockCount.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: userId ?? null,
          approvedAt: new Date(),
        },
      });
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_COUNT_APPROVED",
      entityType: "StockCount",
      entityId: id,
      newValues: { countNo: count.countNo, status: "APPROVED" },
    });

    return db.stockCount.findUnique({
      where: { id },
      include: { items: { include: { material: true } } },
    });
  }

  public static async getStockCounts(warehouseId?: string) {
    const where: Record<string, unknown> = {};
    if (warehouseId) where.warehouseId = warehouseId;

    return db.stockCount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        warehouse: { select: { warehouseCode: true, name: true } },
        items: { include: { material: { select: { materialCode: true, name: true } } } },
      },
    });
  }
}
