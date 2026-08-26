import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { InventoryCalculationService } from "./inventory-calculation.service";
import { CreateStockReservationInput } from "@/validators/inventory.schema";

export interface ReservationFilterParams {
  materialId?: string;
  warehouseId?: string;
  projectId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class StockReservationService {
  public static async createReservation(input: CreateStockReservationInput, userId?: string) {
    const material = await db.material.findUnique({ where: { id: input.materialId } });
    if (!material) throw new NotFoundError("Material record not found");

    const warehouse = await db.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new NotFoundError("Warehouse record not found");

    if (input.projectId) {
      const project = await db.project.findUnique({ where: { id: input.projectId } });
      if (!project) throw new NotFoundError("Project record not found");
    }

    const summary = await InventoryCalculationService.calculateStockSummary(material.id, warehouse.id);
    if (input.reservedQuantity > summary.availableStock) {
      throw new BusinessRuleError(
        `Insufficient available stock to reserve. Requested: ${input.reservedQuantity}, Available: ${summary.availableStock} ${material.baseUnitKey}.`
      );
    }

    const reservationNo = await IdGeneratorService.generate("RES");

    const reservation = await db.$transaction(async (tx) => {
      const existingBalance = await tx.stockBalance.findUnique({
        where: { materialId_warehouseId: { materialId: material.id, warehouseId: warehouse.id } },
      });

      const newReserved = InventoryCalculationService.roundQuantity(
        (existingBalance?.reservedStock ?? 0) + input.reservedQuantity
      );
      const newPhysical = existingBalance?.physicalStock ?? 0;
      const newAvailable = InventoryCalculationService.roundQuantity(Math.max(0, newPhysical - newReserved));

      await tx.stockBalance.upsert({
        where: { materialId_warehouseId: { materialId: material.id, warehouseId: warehouse.id } },
        update: { reservedStock: newReserved, availableStock: newAvailable },
        create: { materialId: material.id, warehouseId: warehouse.id, physicalStock: 0, reservedStock: newReserved, availableStock: newAvailable },
      });

      return tx.stockReservation.create({
        data: {
          reservationNo,
          materialId: material.id,
          warehouseId: warehouse.id,
          projectId: input.projectId || null,
          reservedQuantity: input.reservedQuantity,
          status: "ACTIVE",
          reason: input.reason ? input.reason.trim() : null,
          createdById: userId ?? null,
        },
      });
    });

    await AuditService.logEvent({ userId, action: "STOCK_RESERVED", entityType: "StockReservation", entityId: reservation.id, newValues: { reservationNo: reservation.reservationNo, material: material.name, warehouse: warehouse.name, reservedQuantity: reservation.reservedQuantity } });
    await ActivityService.record({ userId, entityType: "StockReservation", entityId: reservation.id, type: "INVENTORY", title: `Stock Reserved: ${material.name}`, description: `Reserved ${input.reservedQuantity} ${material.baseUnitKey} of ${material.name} from ${warehouse.name}.` });

    return reservation;
  }

  public static async releaseReservation(id: string, resolution: "FULFILLED" | "CANCELLED", userId?: string) {
    const reservation = await db.stockReservation.findUnique({
      where: { id },
      include: { material: { select: { name: true, baseUnitKey: true } }, warehouse: { select: { name: true } } },
    });

    if (!reservation) throw new NotFoundError("Stock reservation not found");
    if (reservation.status !== "ACTIVE") {
      throw new BusinessRuleError(`Stock reservation ${reservation.reservationNo} is already ${reservation.status} and cannot be released again.`);
    }

    await db.$transaction(async (tx) => {
      const existingBalance = await tx.stockBalance.findUnique({
        where: { materialId_warehouseId: { materialId: reservation.materialId, warehouseId: reservation.warehouseId } },
      });

      const newReserved = InventoryCalculationService.roundQuantity(Math.max(0, (existingBalance?.reservedStock ?? 0) - reservation.reservedQuantity));
      const newPhysical = existingBalance?.physicalStock ?? 0;
      const newAvailable = InventoryCalculationService.roundQuantity(Math.max(0, newPhysical - newReserved));

      await tx.stockBalance.upsert({
        where: { materialId_warehouseId: { materialId: reservation.materialId, warehouseId: reservation.warehouseId } },
        update: { reservedStock: newReserved, availableStock: newAvailable },
        create: { materialId: reservation.materialId, warehouseId: reservation.warehouseId, physicalStock: 0, reservedStock: 0, availableStock: 0 },
      });

      await tx.stockReservation.update({ where: { id }, data: { status: resolution, updatedAt: new Date() } });
    });

    await AuditService.logEvent({ userId, action: "STOCK_RESERVATION_RELEASED", entityType: "StockReservation", entityId: id, newValues: { reservationNo: reservation.reservationNo, resolution, material: reservation.material.name, releasedQuantity: reservation.reservedQuantity } });

    return db.stockReservation.findUnique({ where: { id } });
  }

  public static async getReservations(params: ReservationFilterParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.materialId) where.materialId = params.materialId;
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.status) where.status = params.status;

    const [total, reservations] = await Promise.all([
      db.stockReservation.count({ where }),
      db.stockReservation.findMany({
        where, orderBy: { createdAt: "desc" }, skip, take: limit,
        include: {
          material: { select: { materialCode: true, name: true, baseUnitKey: true, categoryKey: true } },
          warehouse: { select: { warehouseCode: true, name: true } },
          project: { select: { referenceNo: true, title: true } },
        },
      }),
    ]);

    return { reservations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  public static async getReservationById(id: string) {
    const reservation = await db.stockReservation.findUnique({
      where: { id },
      include: {
        material: { select: { materialCode: true, name: true, baseUnitKey: true } },
        warehouse: { select: { warehouseCode: true, name: true } },
        project: { select: { referenceNo: true, title: true } },
      },
    });
    if (!reservation) throw new NotFoundError("Stock reservation not found");
    return reservation;
  }
}
