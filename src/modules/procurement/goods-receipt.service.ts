import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { ProcurementCalculationService } from "./procurement-calculation.service";
import { InventoryCalculationService } from "../inventory/inventory-calculation.service";
import { CreateGoodsReceiptInput } from "@/validators/procurement.schema";

export interface GoodsReceiptFilterParams {
  purchaseOrderId?: string;
  vendorId?: string;
  projectId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class GoodsReceiptService {
  public static async createGoodsReceipt(input: CreateGoodsReceiptInput, userId: string) {
    const po = await db.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: { items: true, vendor: true, project: true },
    });
    if (!po) throw new NotFoundError("Associated Purchase Order not found");

    if (po.status === "CANCELLED" || po.status === "CLOSED") {
      throw new BusinessRuleError(`Cannot record Goods Receipt against ${po.status} Purchase Order ${po.referenceNo}.`);
    }

    // Check Over-Receiving Setting
    const setting = await db.setting.findUnique({ where: { key: "ALLOW_OVER_RECEIVING" } });
    const allowOverReceiving = setting?.value === "true";

    // Validate each receipt item
    for (const itemInput of input.items) {
      const poItem = po.items.find((i) => i.id === itemInput.purchaseOrderItemId);
      if (!poItem) {
        throw new BusinessRuleError(`Purchase Order item ID ${itemInput.purchaseOrderItemId} not found in ${po.referenceNo}.`);
      }

      ProcurementCalculationService.validateReceivingQuantity(
        poItem.quantity,
        poItem.receivedQuantity,
        itemInput.receivedQuantity,
        allowOverReceiving
      );
    }

    const referenceNo = await IdGeneratorService.generate("GRN");
    const receivedDate = input.receivedDate ? new Date(input.receivedDate) : new Date();

    // Determine target warehouse for inventory receipt
    let targetWarehouse: any = null;
    if (input.destinationWarehouseId && input.destinationWarehouseId.trim() !== "") {
      targetWarehouse = await db.warehouse.findUnique({ where: { id: input.destinationWarehouseId } });
    } else if (po.projectId) {
      // Find project site store or default godown
      targetWarehouse = await db.warehouse.findFirst({
        where: { projectId: po.projectId, status: "ACTIVE" },
      });
    }

    if (!targetWarehouse) {
      targetWarehouse = await db.warehouse.findFirst({
        where: { type: "MAIN_GODOWN", status: "ACTIVE" },
      });
    }

    // Execute in ACID Transaction
    const result = await db.$transaction(async (tx) => {
      const grn = await tx.goodsReceipt.create({
        data: {
          referenceNo,
          purchaseOrderId: po.id,
          vendorId: po.vendorId,
          projectId: po.projectId,
          receivedDate,
          receivedById: userId,
          deliveryReference: input.deliveryReference ? input.deliveryReference.trim() : null,
          notes: input.notes ? input.notes.trim() : null,
          status: "ACCEPTED",
          items: {
            create: input.items.map((itemInput) => {
              const poItem = po.items.find((i) => i.id === itemInput.purchaseOrderItemId)!;
              return {
                purchaseOrderItemId: poItem.id,
                orderedQuantity: poItem.quantity,
                receivedQuantity: itemInput.receivedQuantity,
                acceptedQuantity: itemInput.acceptedQuantity,
                rejectedQuantity: itemInput.rejectedQuantity || 0,
                damagedQuantity: itemInput.damagedQuantity || 0,
                shortQuantity: itemInput.shortQuantity || 0,
                rejectionReason: itemInput.rejectionReason ? itemInput.rejectionReason.trim() : null,
              };
            }),
          },
        },
        include: { items: true },
      });

      let materialOffset = 0;
      let movementOffset = 0;

      // Update PurchaseOrderItem received and pending quantities
      for (const itemInput of input.items) {
        const poItem = po.items.find((i) => i.id === itemInput.purchaseOrderItemId)!;
        const newReceived = poItem.receivedQuantity + itemInput.receivedQuantity;
        const newAccepted = poItem.acceptedQuantity + itemInput.acceptedQuantity;
        const newRejected = poItem.rejectedQuantity + (itemInput.rejectedQuantity || 0);
        const newPending = Math.max(0, poItem.quantity - newReceived);

        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: {
            receivedQuantity: newReceived,
            acceptedQuantity: newAccepted,
            rejectedQuantity: newRejected,
            pendingQuantity: newPending,
          },
        });

        // INVENTORY STOCK INGESTION (Only for accepted items)
        if (targetWarehouse && itemInput.acceptedQuantity > 0) {
          // Find or create matching Material Master record
          let material = await tx.material.findFirst({
            where: { name: { contains: poItem.materialName } },
          });

          if (!material) {
            const matCode = await IdGeneratorService.generate("MAT", materialOffset++);
            material = await tx.material.create({
              data: {
                materialCode: matCode,
                name: poItem.materialName,
                categoryKey: "OTHER",
                baseUnitKey: poItem.unitKey || "NOS",
                trackInventory: true,
                createdById: userId,
              },
            });
          }

          if (material.trackInventory) {
            // Update StockBalance
            const existingBalance = await tx.stockBalance.findUnique({
              where: { materialId_warehouseId: { materialId: material.id, warehouseId: targetWarehouse.id } },
            });

            const currentPhysical = existingBalance ? existingBalance.physicalStock : 0;
            const currentReserved = existingBalance ? existingBalance.reservedStock : 0;
            const newPhysical = InventoryCalculationService.roundQuantity(currentPhysical + itemInput.acceptedQuantity);
            const newAvailable = InventoryCalculationService.roundQuantity(Math.max(0, newPhysical - currentReserved));

            await tx.stockBalance.upsert({
              where: { materialId_warehouseId: { materialId: material.id, warehouseId: targetWarehouse.id } },
              update: {
                physicalStock: newPhysical,
                availableStock: newAvailable,
              },
              create: {
                materialId: material.id,
                warehouseId: targetWarehouse.id,
                physicalStock: newPhysical,
                reservedStock: 0,
                availableStock: newAvailable,
              },
            });

            // Create StockMovement entry
            const movementNo = await IdGeneratorService.generate("STM", movementOffset++);
            await tx.stockMovement.create({
              data: {
                movementNo,
                materialId: material.id,
                warehouseId: targetWarehouse.id,
                movementType: "RECEIPT",
                quantity: itemInput.acceptedQuantity,
                unitKey: poItem.unitKey || material.baseUnitKey,
                referenceType: "GOODS_RECEIPT",
                referenceId: grn.id,
                goodsReceiptId: grn.id,
                projectId: po.projectId || undefined,
                runningBalance: newPhysical,
                reason: `Goods Receipt ${referenceNo} accepted for PO ${po.referenceNo}`,
                createdById: userId,
              },
            });
          }
        }
      }


      // Check overall PO status (RECEIVED vs PARTIALLY_RECEIVED)
      const updatedPoItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
      const totalOrdered = updatedPoItems.reduce((acc, i) => acc + i.quantity, 0);
      const totalReceived = updatedPoItems.reduce((acc, i) => acc + i.receivedQuantity, 0);

      let newPOStatus = po.status;
      if (totalReceived >= totalOrdered) {
        newPOStatus = "RECEIVED";
      } else if (totalReceived > 0) {
        newPOStatus = "PARTIALLY_RECEIVED";
      }

      if (newPOStatus !== po.status) {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: newPOStatus },
        });
      }

      // Update MaterialRequest received quantities if linked
      if (po.materialRequestId) {
        const mr = await tx.materialRequest.findUnique({
          where: { id: po.materialRequestId },
          include: { items: true },
        });

        if (mr) {
          for (const itemInput of input.items) {
            const poItem = po.items.find((i) => i.id === itemInput.purchaseOrderItemId)!;
            const mrItem = mr.items.find((i) => i.materialName.toLowerCase() === poItem.materialName.toLowerCase());
            if (mrItem) {
              await tx.materialRequestItem.update({
                where: { id: mrItem.id },
                data: { receivedQuantity: mrItem.receivedQuantity + itemInput.acceptedQuantity },
              });
            }
          }
        }
      }

      return grn;
    });

    await AuditService.logEvent({
      userId,
      action: "GOODS_RECEIPT_CREATED",
      entityType: "GoodsReceipt",
      entityId: result.id,
      newValues: {
        referenceNo: result.referenceNo,
        purchaseOrderRef: po.referenceNo,
        vendorName: po.vendor.name,
        targetWarehouse: targetWarehouse ? targetWarehouse.name : "None",
      },
    });

    await ActivityService.record({
      userId,
      entityType: "GoodsReceipt",
      entityId: result.id,
      type: "PROCUREMENT",
      title: `Goods Receipt ${result.referenceNo} Recorded`,
      description: `Received delivery for PO ${po.referenceNo} from ${po.vendor.name}. Stock updated in ${targetWarehouse ? targetWarehouse.name : "Inventory"}.`,
    });

    return result;
  }

  public static async getGoodsReceipts(params: GoodsReceiptFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.purchaseOrderId) where.purchaseOrderId = params.purchaseOrderId;
    if (params.vendorId) where.vendorId = params.vendorId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.status) where.status = params.status;

    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { deliveryReference: { contains: q } },
        { purchaseOrder: { referenceNo: { contains: q } } },
        { vendor: { name: { contains: q } } },
      ];
    }

    const [total, items] = await Promise.all([
      db.goodsReceipt.count({ where }),
      db.goodsReceipt.findMany({
        where,
        orderBy: { receivedDate: "desc" },
        skip,
        take: limit,
        include: {
          purchaseOrder: { select: { referenceNo: true, grandTotal: true } },
          vendor: { select: { referenceNo: true, name: true } },
          project: { select: { referenceNo: true, title: true } },
          receivedBy: { select: { fullName: true } },
          items: {
            include: {
              purchaseOrderItem: { select: { materialName: true, unitKey: true, rate: true } },
            },
          },
        },
      }),
    ]);

    return {
      receipts: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getGoodsReceiptById(id: string) {
    const grn = await db.goodsReceipt.findUnique({
      where: { id },
      include: {
        purchaseOrder: { select: { id: true, referenceNo: true, grandTotal: true, status: true } },
        vendor: { select: { id: true, referenceNo: true, name: true, phone: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
        receivedBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: {
            purchaseOrderItem: { select: { materialName: true, unitKey: true, rate: true } },
          },
        },
        stockMovements: {
          include: {
            material: { select: { materialCode: true, name: true } },
            warehouse: { select: { warehouseCode: true, name: true } },
          },
        },
      },
    });

    if (!grn) throw new NotFoundError("Goods receipt note not found");

    return grn;
  }
}
