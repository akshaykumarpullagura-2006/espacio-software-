import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { InventoryCalculationService } from "./inventory-calculation.service";
import { CreateStockTransferInput } from "@/validators/inventory.schema";

export class StockTransferService {
  public static async createTransfer(input: CreateStockTransferInput, userId?: string) {
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new BusinessRuleError("Source and destination warehouses cannot be the same.");
    }

    const fromWarehouse = await db.warehouse.findUnique({ where: { id: input.fromWarehouseId } });
    if (!fromWarehouse) throw new NotFoundError("Source warehouse not found");

    const toWarehouse = await db.warehouse.findUnique({ where: { id: input.toWarehouseId } });
    if (!toWarehouse) throw new NotFoundError("Destination warehouse not found");

    const transferNo = await IdGeneratorService.generate("STT");

    const transfer = await db.stockTransfer.create({
      data: {
        transferNo,
        fromWarehouseId: fromWarehouse.id,
        toWarehouseId: toWarehouse.id,
        projectId: input.projectId || null,
        status: "REQUESTED",
        notes: input.notes ? input.notes.trim() : null,
        requestedById: userId ?? null,
        items: {
          create: input.items.map((item) => ({
            materialId: item.materialId,
            requestedQuantity: item.requestedQuantity,
            unitKey: item.unitKey || "NOS",
          })),
        },
      },
      include: { items: { include: { material: true } } },
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_TRANSFER_CREATED",
      entityType: "StockTransfer",
      entityId: transfer.id,
      newValues: { transferNo: transfer.transferNo, from: fromWarehouse.name, to: toWarehouse.name },
    });

    return transfer;
  }

  public static async approveTransfer(id: string, userId?: string) {
    const transfer = await db.stockTransfer.findUnique({
      where: { id },
      include: { items: { include: { material: true } } },
    });

    if (!transfer) throw new NotFoundError("Stock transfer record not found");
    if (transfer.status !== "REQUESTED" && transfer.status !== "DRAFT") {
      throw new BusinessRuleError(`Stock transfer in stage ${transfer.status} cannot be approved.`);
    }

    // Validate available stock in source warehouse for all items
    for (const item of transfer.items) {
      const summary = await InventoryCalculationService.calculateStockSummary(item.materialId, transfer.fromWarehouseId);
      InventoryCalculationService.validateAvailableStock(item.requestedQuantity, summary.availableStock);
    }

    const updated = await db.stockTransfer.update({
      where: { id },
      data: {
        status: "IN_TRANSIT",
        approvedById: userId ?? null,
        approvedAt: new Date(),
        items: {
          updateMany: transfer.items.map((item) => ({
            where: { id: item.id },
            data: { transferredQuantity: item.requestedQuantity },
          })),
        },
      },
      include: { items: true },
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_TRANSFER_APPROVED",
      entityType: "StockTransfer",
      entityId: id,
      newValues: { transferNo: transfer.transferNo, status: "IN_TRANSIT" },
    });

    return updated;
  }

  public static async receiveTransfer(id: string, userId?: string) {
    const transfer = await db.stockTransfer.findUnique({
      where: { id },
      include: {
        items: { include: { material: true } },
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
      },
    });

    if (!transfer) throw new NotFoundError("Stock transfer record not found");
    if (transfer.status !== "IN_TRANSIT" && transfer.status !== "APPROVED") {
      throw new BusinessRuleError(`Stock transfer in stage ${transfer.status} cannot be received.`);
    }

    // Pre-generate all movement numbers OUTSIDE the transaction to avoid unique constraint
    // conflicts caused by the IdGenerator reading the same max sequence while uncommitted.
    const movementNos: { outNo: string; inNo: string }[] = [];
    for (let i = 0; i < transfer.items.length; i++) {
      const outNo = await IdGeneratorService.generate("STM", i * 2);
      const inNo = await IdGeneratorService.generate("STM", i * 2 + 1);
      movementNos.push({ outNo, inNo });
    }

    await db.$transaction(async (tx) => {
      for (let idx = 0; idx < transfer.items.length; idx++) {
        const item = transfer.items[idx];
        const qty = item.transferredQuantity || item.requestedQuantity;
        const { outNo: stmOutNo, inNo: stmInNo } = movementNos[idx];

        // 1. TRANSFER_OUT from source warehouse
        const sourceBal = await tx.stockBalance.findUnique({
          where: { materialId_warehouseId: { materialId: item.materialId, warehouseId: transfer.fromWarehouseId } },
        });

        const newSourcePhysical = InventoryCalculationService.roundQuantity(
          (sourceBal?.physicalStock ?? 0) - qty
        );
        const newSourceAvailable = InventoryCalculationService.roundQuantity(
          Math.max(0, newSourcePhysical - (sourceBal?.reservedStock ?? 0))
        );

        await tx.stockBalance.upsert({
          where: { materialId_warehouseId: { materialId: item.materialId, warehouseId: transfer.fromWarehouseId } },
          update: { physicalStock: newSourcePhysical, availableStock: newSourceAvailable },
          create: {
            materialId: item.materialId,
            warehouseId: transfer.fromWarehouseId,
            physicalStock: newSourcePhysical,
            availableStock: newSourceAvailable,
          },
        });

        await tx.stockMovement.create({
          data: {
            movementNo: stmOutNo,
            materialId: item.materialId,
            warehouseId: transfer.fromWarehouseId,
            movementType: "TRANSFER_OUT",
            quantity: qty,
            unitKey: item.unitKey,
            referenceType: "STOCK_TRANSFER",
            referenceId: transfer.id,
            runningBalance: newSourcePhysical,
            reason: `Transfer OUT ${transfer.transferNo} to ${transfer.toWarehouse.name}`,
            createdById: userId ?? null,
          },
        });

        // 2. TRANSFER_IN to destination warehouse
        const destBal = await tx.stockBalance.findUnique({
          where: { materialId_warehouseId: { materialId: item.materialId, warehouseId: transfer.toWarehouseId } },
        });

        const newDestPhysical = InventoryCalculationService.roundQuantity(
          (destBal?.physicalStock ?? 0) + qty
        );
        const newDestAvailable = InventoryCalculationService.roundQuantity(
          Math.max(0, newDestPhysical - (destBal?.reservedStock ?? 0))
        );

        await tx.stockBalance.upsert({
          where: { materialId_warehouseId: { materialId: item.materialId, warehouseId: transfer.toWarehouseId } },
          update: { physicalStock: newDestPhysical, availableStock: newDestAvailable },
          create: {
            materialId: item.materialId,
            warehouseId: transfer.toWarehouseId,
            physicalStock: newDestPhysical,
            availableStock: newDestAvailable,
          },
        });

        await tx.stockMovement.create({
          data: {
            movementNo: stmInNo,
            materialId: item.materialId,
            warehouseId: transfer.toWarehouseId,
            movementType: "TRANSFER_IN",
            quantity: qty,
            unitKey: item.unitKey,
            referenceType: "STOCK_TRANSFER",
            referenceId: transfer.id,
            runningBalance: newDestPhysical,
            reason: `Transfer IN ${transfer.transferNo} from ${transfer.fromWarehouse.name}`,
            createdById: userId ?? null,
          },
        });

        // Update item received quantity
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { receivedQuantity: qty },
        });
      }

      // Update transfer status
      await tx.stockTransfer.update({
        where: { id },
        data: {
          status: "RECEIVED",
          receivedById: userId ?? null,
          receivedAt: new Date(),
        },
      });
    });

    await AuditService.logEvent({
      userId,
      action: "STOCK_TRANSFER_RECEIVED",
      entityType: "StockTransfer",
      entityId: id,
      newValues: { transferNo: transfer.transferNo, status: "RECEIVED" },
    });

    return db.stockTransfer.findUnique({ where: { id }, include: { items: true } });
  }

  public static async getTransfers(status?: string, warehouseId?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (warehouseId) {
      where.OR = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
    }

    return db.stockTransfer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        fromWarehouse: { select: { warehouseCode: true, name: true } },
        toWarehouse: { select: { warehouseCode: true, name: true } },
        items: { include: { material: { select: { materialCode: true, name: true } } } },
      },
    });
  }
}
