import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { InventoryCalculationService } from "./inventory-calculation.service";
import {
  IssueStockInput,
  ConsumeStockInput,
  ReturnStockInput,
  AdjustStockInput,
} from "@/validators/inventory.schema";

export interface MovementFilterParams {
  materialId?: string;
  warehouseId?: string;
  projectId?: string;
  movementType?: string;
  referenceType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class StockMovementService {
  /**
   * Internal helper: Updates StockBalance inside an ACID transaction and returns running physical balance.
   */
  private static async applyStockChange(
    tx: any,
    materialId: string,
    warehouseId: string,
    quantityChange: number,
    reservationChange: number = 0
  ): Promise<number> {
    const existing = await tx.stockBalance.findUnique({
      where: { materialId_warehouseId: { materialId, warehouseId } },
    });

    const currentPhysical = existing ? existing.physicalStock : 0;
    const currentReserved = existing ? existing.reservedStock : 0;

    const newPhysical = InventoryCalculationService.roundQuantity(currentPhysical + quantityChange);
    const newReserved = InventoryCalculationService.roundQuantity(Math.max(0, currentReserved + reservationChange));
    const newAvailable = InventoryCalculationService.roundQuantity(Math.max(0, newPhysical - newReserved));

    if (newPhysical < 0) {
      throw new BusinessRuleError(`Stock adjustment would result in negative physical stock (${newPhysical}).`);
    }

    await tx.stockBalance.upsert({
      where: { materialId_warehouseId: { materialId, warehouseId } },
      update: {
        physicalStock: newPhysical,
        reservedStock: newReserved,
        availableStock: newAvailable,
      },
      create: {
        materialId,
        warehouseId,
        physicalStock: newPhysical,
        reservedStock: newReserved,
        availableStock: newAvailable,
      },
    });

    return newPhysical;
  }

  /**
   * Record Opening Stock (`OPENING`)
   */
  public static async recordOpeningStock(
    materialId: string,
    warehouseId: string,
    quantity: number,
    unitKey: string = "NOS",
    userId?: string
  ) {
    const material = await db.material.findUnique({ where: { id: materialId } });
    if (!material) throw new NotFoundError("Material record not found");

    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new NotFoundError("Warehouse record not found");

    const movementNo = await IdGeneratorService.generate("STM");

    const movement = await db.$transaction(async (tx) => {
      const runningBalance = await this.applyStockChange(tx, material.id, warehouse.id, quantity, 0);

      return tx.stockMovement.create({
        data: {
          movementNo,
          materialId: material.id,
          warehouseId: warehouse.id,
          movementType: "OPENING",
          quantity,
          unitKey,
          referenceType: "OPENING_STOCK",
          runningBalance,
          reason: "Initial opening stock load",
          createdById: userId ?? null,
        },
      });
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_RECEIVED",
      entityType: "StockMovement",
      entityId: movement.id,
      newValues: { movementNo: movement.movementNo, material: material.name, quantity },
    });

    return movement;
  }

  /**
   * Ingest Goods Receipt accepted quantities from Procurement (`RECEIPT`).
   */
  public static async ingestGoodsReceipt(
    goodsReceiptId: string,
    destinationWarehouseId: string,
    userId?: string
  ) {
    const grn = await db.goodsReceipt.findUnique({
      where: { id: goodsReceiptId },
      include: {
        items: {
          include: {
            purchaseOrderItem: { select: { materialName: true, unitKey: true } },
          },
        },
        vendor: { select: { name: true } },
      },
    });

    if (!grn) throw new NotFoundError("Goods Receipt Note not found");

    const warehouse = await db.warehouse.findUnique({ where: { id: destinationWarehouseId } });
    if (!warehouse) throw new NotFoundError("Destination warehouse not found");

    const createdMovements = [];

    for (const item of grn.items) {
      if (item.acceptedQuantity <= 0) continue;

      // Find matching Material Master by materialName or create automatic link
      let material = await db.material.findFirst({
        where: { name: { contains: item.purchaseOrderItem.materialName } },
      });

      if (!material) {
        // Create automatic material master entry if not found
        const matCode = await IdGeneratorService.generate("MAT");
        material = await db.material.create({
          data: {
            materialCode: matCode,
            name: item.purchaseOrderItem.materialName,
            categoryKey: "OTHER",
            baseUnitKey: item.purchaseOrderItem.unitKey || "NOS",
            trackInventory: true,
            createdById: userId ?? null,
          },
        });
      }

      const movementNo = await IdGeneratorService.generate("STM");

      const movement = await db.$transaction(async (tx) => {
        const runningBalance = await this.applyStockChange(tx, material!.id, warehouse.id, item.acceptedQuantity, 0);

        return tx.stockMovement.create({
          data: {
            movementNo,
            materialId: material!.id,
            warehouseId: warehouse.id,
            movementType: "RECEIPT",
            quantity: item.acceptedQuantity,
            unitKey: item.purchaseOrderItem.unitKey || material!.baseUnitKey,
            referenceType: "GOODS_RECEIPT",
            referenceId: grn.id,
            goodsReceiptId: grn.id,
            projectId: grn.projectId || undefined,
            runningBalance,
            reason: `Goods Receipt ${grn.referenceNo} accepted from ${grn.vendor.name}`,
            createdById: userId ?? null,
          },
        });
      });

      createdMovements.push(movement);
    }

    await AuditService.logEvent({
      userId,
      action: "STOCK_RECEIVED",
      entityType: "GoodsReceipt",
      entityId: grn.id,
      newValues: { referenceNo: grn.referenceNo, destinationWarehouse: warehouse.name },
    });

    await ActivityService.record({
      userId,
      entityType: "Warehouse",
      entityId: warehouse.id,
      type: "INVENTORY",
      title: `Stock Received from ${grn.referenceNo}`,
      description: `Ingested accepted quantities into ${warehouse.name} from ${grn.vendor.name}.`,
    });

    return createdMovements;
  }

  /**
   * Issue Stock to Project Site (`ISSUE`).
   */
  public static async issueStock(input: IssueStockInput, userId?: string) {
    const material = await db.material.findUnique({ where: { id: input.materialId } });
    if (!material) throw new NotFoundError("Material record not found");

    const warehouse = await db.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new NotFoundError("Warehouse record not found");

    const project = await db.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new NotFoundError("Project record not found");

    // Validate available stock
    const summary = await InventoryCalculationService.calculateStockSummary(material.id, warehouse.id);
    InventoryCalculationService.validateAvailableStock(input.quantity, summary.availableStock);

    const movementNo = await IdGeneratorService.generate("STM");

    const movement = await db.$transaction(async (tx) => {
      // Reduce warehouse physical stock
      const runningBalance = await this.applyStockChange(tx, material.id, warehouse.id, -input.quantity, 0);

      return tx.stockMovement.create({
        data: {
          movementNo,
          materialId: material.id,
          warehouseId: warehouse.id,
          projectId: project.id,
          movementType: "ISSUE",
          quantity: input.quantity,
          unitKey: input.unitKey || material.baseUnitKey,
          referenceType: "PROJECT_ISSUE",
          referenceId: project.id,
          runningBalance,
          reason: input.purpose.trim(),
          notes: input.notes ? input.notes.trim() : null,
          createdById: userId ?? null,
        },
      });
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_ISSUED",
      entityType: "StockMovement",
      entityId: movement.id,
      newValues: { movementNo: movement.movementNo, project: project.referenceNo, quantity: input.quantity },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: project.id,
      type: "INVENTORY",
      title: `Material Issued to ${project.referenceNo}`,
      description: `Issued ${input.quantity} ${input.unitKey} of ${material.name} from ${warehouse.name}.`,
    });

    return movement;
  }

  /**
   * Log Site Material Consumption (`CONSUMPTION`).
   */
  public static async consumeStock(input: ConsumeStockInput, userId?: string) {
    const material = await db.material.findUnique({ where: { id: input.materialId } });
    if (!material) throw new NotFoundError("Material record not found");

    const project = await db.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new NotFoundError("Project record not found");

    const movementNo = await IdGeneratorService.generate("STM");

    // Fetch site store warehouse or main warehouse
    let warehouse = await db.warehouse.findFirst({ where: { projectId: project.id } });
    if (!warehouse) {
      warehouse = await db.warehouse.findFirst({ where: { status: "ACTIVE" } });
    }

    const movement = await db.stockMovement.create({
      data: {
        movementNo,
        materialId: material.id,
        warehouseId: warehouse!.id,
        projectId: project.id,
        movementType: "CONSUMPTION",
        quantity: input.quantity,
        unitKey: input.unitKey || material.baseUnitKey,
        referenceType: "PROJECT_CONSUMPTION",
        referenceId: project.id,
        runningBalance: 0,
        notes: input.notes ? input.notes.trim() : null,
        createdById: userId ?? null,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_CONSUMED",
      entityType: "StockMovement",
      entityId: movement.id,
      newValues: { movementNo: movement.movementNo, project: project.referenceNo, quantity: input.quantity },
    });

    return movement;
  }

  /**
   * Return unused material from Project Site to Warehouse (`RETURN_IN`).
   */
  public static async returnStock(input: ReturnStockInput, userId?: string) {
    const material = await db.material.findUnique({ where: { id: input.materialId } });
    if (!material) throw new NotFoundError("Material record not found");

    const warehouse = await db.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new NotFoundError("Warehouse record not found");

    const project = await db.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new NotFoundError("Project record not found");

    const movementNo = await IdGeneratorService.generate("STM");

    const movement = await db.$transaction(async (tx) => {
      // Increase destination warehouse stock
      const runningBalance = await this.applyStockChange(tx, material.id, warehouse.id, input.quantity, 0);

      return tx.stockMovement.create({
        data: {
          movementNo,
          materialId: material.id,
          warehouseId: warehouse.id,
          projectId: project.id,
          movementType: "RETURN_IN",
          quantity: input.quantity,
          unitKey: input.unitKey || material.baseUnitKey,
          referenceType: "PROJECT_RETURN",
          referenceId: project.id,
          runningBalance,
          reason: input.reason.trim(),
          notes: input.notes ? input.notes.trim() : null,
          createdById: userId ?? null,
        },
      });
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_RETURNED",
      entityType: "StockMovement",
      entityId: movement.id,
      newValues: { movementNo: movement.movementNo, project: project.referenceNo, quantity: input.quantity },
    });

    return movement;
  }

  /**
   * Authorized Physical Stock Adjustment (`ADJUSTMENT_IN` or `ADJUSTMENT_OUT`).
   */
  public static async adjustStock(input: AdjustStockInput, userId?: string) {
    const material = await db.material.findUnique({ where: { id: input.materialId } });
    if (!material) throw new NotFoundError("Material record not found");

    const warehouse = await db.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new NotFoundError("Warehouse record not found");

    const movementType = input.adjustmentType === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
    const delta = input.adjustmentType === "IN" ? input.quantity : -input.quantity;

    if (input.adjustmentType === "OUT") {
      const summary = await InventoryCalculationService.calculateStockSummary(material.id, warehouse.id);
      InventoryCalculationService.validateAvailableStock(input.quantity, summary.availableStock);
    }

    const movementNo = await IdGeneratorService.generate("STM");

    const movement = await db.$transaction(async (tx) => {
      const runningBalance = await this.applyStockChange(tx, material.id, warehouse.id, delta, 0);

      return tx.stockMovement.create({
        data: {
          movementNo,
          materialId: material.id,
          warehouseId: warehouse.id,
          movementType,
          quantity: input.quantity,
          unitKey: input.unitKey || material.baseUnitKey,
          referenceType: "STOCK_ADJUSTMENT",
          runningBalance,
          reason: input.reason.trim(),
          notes: input.notes ? input.notes.trim() : null,
          createdById: userId ?? null,
        },
      });
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_ADJUSTED",
      entityType: "StockMovement",
      entityId: movement.id,
      newValues: { movementNo: movement.movementNo, adjustmentType: input.adjustmentType, delta },
    });

    return movement;
  }

  /**
   * Record Damaged / Scrapped Stock (`DAMAGE` or `SCRAP`).
   * Permanently reduces physicalStock — cannot be reversed without a manual ADJUSTMENT_IN.
   */
  public static async recordDamage(
    input: {
      materialId: string;
      warehouseId: string;
      quantity: number;
      unitKey?: string;
      movementType: "DAMAGE" | "SCRAP";
      reason: string;
      notes?: string;
      batchNo?: string;
    },
    userId?: string
  ) {
    const material = await db.material.findUnique({ where: { id: input.materialId } });
    if (!material) throw new NotFoundError("Material record not found");

    const warehouse = await db.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new NotFoundError("Warehouse record not found");

    // Validate sufficient stock before damage/scrap
    const summary = await InventoryCalculationService.calculateStockSummary(material.id, warehouse.id);
    InventoryCalculationService.validateAvailableStock(input.quantity, summary.physicalStock);

    const movementNo = await IdGeneratorService.generate("STM");

    const movement = await db.$transaction(async (tx) => {
      const runningBalance = await this.applyStockChange(tx, material.id, warehouse.id, -input.quantity, 0);

      return tx.stockMovement.create({
        data: {
          movementNo,
          materialId: material.id,
          warehouseId: warehouse.id,
          movementType: input.movementType,
          quantity: input.quantity,
          unitKey: input.unitKey || material.baseUnitKey,
          referenceType: "STOCK_ADJUSTMENT",
          batchNo: input.batchNo || null,
          runningBalance,
          reason: input.reason.trim(),
          notes: input.notes ? input.notes.trim() : null,
          createdById: userId ?? null,
        },
      });
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_DAMAGED",
      entityType: "StockMovement",
      entityId: movement.id,
      newValues: {
        movementNo: movement.movementNo,
        movementType: input.movementType,
        material: material.name,
        quantity: input.quantity,
        warehouse: warehouse.name,
      },
    });

    await ActivityService.record({
      userId,
      entityType: "Warehouse",
      entityId: warehouse.id,
      type: "INVENTORY",
      title: `Stock ${input.movementType} Recorded`,
      description: `${input.quantity} ${input.unitKey || material.baseUnitKey} of ${material.name} marked as ${input.movementType.toLowerCase()} in ${warehouse.name}.`,
    });

    return movement;
  }

  public static async getMovements(params: MovementFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.materialId) where.materialId = params.materialId;
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.movementType) where.movementType = params.movementType;
    if (params.referenceType) where.referenceType = params.referenceType;

    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim();
      where.OR = [
        { movementNo: { contains: q } },
        { reason: { contains: q } },
        { material: { name: { contains: q } } },
      ];
    }

    const [total, movements] = await Promise.all([
      db.stockMovement.count({ where }),
      db.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          material: { select: { materialCode: true, name: true, categoryKey: true } },
          warehouse: { select: { warehouseCode: true, name: true } },
          project: { select: { referenceNo: true, title: true } },
        },
      }),
    ]);

    return {
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
