import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { CreateWarehouseInput } from "@/validators/inventory.schema";

export class WarehouseService {
  public static async createWarehouse(input: CreateWarehouseInput, userId?: string) {
    const warehouseCode = await IdGeneratorService.generate("WH");

    const warehouse = await db.warehouse.create({
      data: {
        warehouseCode,
        name: input.name.trim(),
        type: input.type || "MAIN_GODOWN",
        address: input.address ? input.address.trim() : null,
        city: input.city ? input.city.trim() : null,
        managerUserId: input.managerUserId || null,
        projectId: input.projectId || null,
        notes: input.notes ? input.notes.trim() : null,
        status: "ACTIVE",
      },
    });

    await AuditService.logEvent({
      userId,
      action: "WAREHOUSE_CREATED",
      entityType: "Warehouse",
      entityId: warehouse.id,
      newValues: { warehouseCode: warehouse.warehouseCode, name: warehouse.name, type: warehouse.type },
    });

    await ActivityService.record({
      userId,
      entityType: "Warehouse",
      entityId: warehouse.id,
      type: "INVENTORY",
      title: `Warehouse ${warehouse.warehouseCode} Registered`,
      description: `Created warehouse location ${warehouse.name} (${warehouse.type}).`,
    });

    return warehouse;
  }

  public static async updateWarehouse(id: string, input: Partial<CreateWarehouseInput>, userId?: string) {
    const warehouse = await db.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundError("Warehouse record not found");

    const updated = await db.warehouse.update({
      where: { id },
      data: {
        name: input.name ? input.name.trim() : undefined,
        type: input.type || undefined,
        address: input.address !== undefined ? input.address : undefined,
        city: input.city !== undefined ? input.city : undefined,
        managerUserId: input.managerUserId !== undefined ? input.managerUserId : undefined,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "WAREHOUSE_UPDATED",
      entityType: "Warehouse",
      entityId: updated.id,
      newValues: { warehouseCode: updated.warehouseCode, name: updated.name },
    });

    return updated;
  }

  public static async getWarehouses() {
    const warehouses = await db.warehouse.findMany({
      orderBy: { warehouseCode: "asc" },
      include: {
        project: { select: { referenceNo: true, title: true } },
        balances: {
          include: { material: { select: { materialCode: true, name: true, baseUnitKey: true } } },
        },
      },
    });

    return warehouses.map((w) => {
      const totalPhysicalStock = w.balances.reduce((acc, b) => acc + b.physicalStock, 0);
      const totalMaterialTypes = w.balances.length;

      return {
        ...w,
        totalPhysicalStock,
        totalMaterialTypes,
      };
    });
  }

  public static async getWarehouseById(id: string) {
    const warehouse = await db.warehouse.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, referenceNo: true, title: true } },
        locations: true,
        balances: {
          include: {
            material: { select: { id: true, materialCode: true, name: true, categoryKey: true, baseUnitKey: true, reorderLevel: true } },
          },
        },
        movements: {
          take: 30,
          orderBy: { createdAt: "desc" },
          include: { material: { select: { name: true } } },
        },
      },
    });

    if (!warehouse) throw new NotFoundError("Warehouse record not found");

    return warehouse;
  }
}
