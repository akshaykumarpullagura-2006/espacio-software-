import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { InventoryCalculationService } from "./inventory-calculation.service";
import { CreateMaterialInput } from "@/validators/inventory.schema";

export interface MaterialFilterParams {
  categoryKey?: string;
  brandKey?: string;
  status?: string;
  materialType?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class MaterialService {
  public static async createMaterial(input: CreateMaterialInput, userId?: string) {
    if (input.sku && input.sku.trim() !== "") {
      const existingSku = await db.material.findUnique({ where: { sku: input.sku.trim() } });
      if (existingSku) {
        throw new BusinessRuleError(`Material with SKU ${input.sku} already exists (${existingSku.materialCode} - ${existingSku.name}).`);
      }
    }

    const materialCode = await IdGeneratorService.generate("MAT");

    const material = await db.material.create({
      data: {
        materialCode,
        sku: input.sku ? input.sku.trim() : null,
        name: input.name.trim(),
        categoryKey: input.categoryKey,
        subcategoryKey: input.subcategoryKey || null,
        brandKey: input.brandKey || null,
        description: input.description ? input.description.trim() : null,
        modelVariant: input.modelVariant ? input.modelVariant.trim() : null,
        baseUnitKey: input.baseUnitKey || "NOS",
        purchaseUnitKey: input.purchaseUnitKey || input.baseUnitKey || "NOS",
        saleUnitKey: input.saleUnitKey || null,
        minStock: input.minStock ?? 0,
        reorderLevel: input.reorderLevel ?? 0,
        maxStock: input.maxStock ?? null,
        purchaseCost: input.purchaseCost ?? 0,
        standardCost: input.standardCost ?? input.purchaseCost ?? 0,
        sellingPrice: input.sellingPrice ?? null,
        trackInventory: input.trackInventory ?? true,
        trackBatch: input.trackBatch ?? false,
        trackSerial: input.trackSerial ?? false,
        materialType: input.materialType || "STOCK",
        defaultVendorId: input.defaultVendorId || null,
        notes: input.notes ? input.notes.trim() : null,
        createdById: userId ?? null,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "MATERIAL_CREATED",
      entityType: "Material",
      entityId: material.id,
      newValues: { materialCode: material.materialCode, name: material.name, categoryKey: material.categoryKey },
    });

    await ActivityService.record({
      userId,
      entityType: "Material",
      entityId: material.id,
      type: "INVENTORY",
      title: `Material ${material.materialCode} Registered`,
      description: `Registered material ${material.name} (${material.categoryKey}) with reorder level ${material.reorderLevel} ${material.baseUnitKey}.`,
    });

    return material;
  }

  public static async updateMaterial(id: string, input: Partial<CreateMaterialInput>, userId?: string) {
    const material = await db.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundError("Material record not found");

    if (input.sku && input.sku.trim() !== "" && input.sku.trim() !== material.sku) {
      const existingSku = await db.material.findUnique({ where: { sku: input.sku.trim() } });
      if (existingSku) {
        throw new BusinessRuleError(`Material with SKU ${input.sku} already exists.`);
      }
    }

    const updated = await db.material.update({
      where: { id },
      data: {
        sku: input.sku !== undefined ? (input.sku ? input.sku.trim() : null) : undefined,
        name: input.name ? input.name.trim() : undefined,
        categoryKey: input.categoryKey || undefined,
        subcategoryKey: input.subcategoryKey !== undefined ? input.subcategoryKey : undefined,
        brandKey: input.brandKey !== undefined ? input.brandKey : undefined,
        description: input.description !== undefined ? input.description : undefined,
        modelVariant: input.modelVariant !== undefined ? input.modelVariant : undefined,
        baseUnitKey: input.baseUnitKey || undefined,
        purchaseUnitKey: input.purchaseUnitKey !== undefined ? input.purchaseUnitKey : undefined,
        saleUnitKey: input.saleUnitKey !== undefined ? input.saleUnitKey : undefined,
        minStock: input.minStock !== undefined ? input.minStock : undefined,
        reorderLevel: input.reorderLevel !== undefined ? input.reorderLevel : undefined,
        maxStock: input.maxStock !== undefined ? input.maxStock : undefined,
        purchaseCost: input.purchaseCost !== undefined ? input.purchaseCost : undefined,
        standardCost: input.standardCost !== undefined ? input.standardCost : undefined,
        sellingPrice: input.sellingPrice !== undefined ? input.sellingPrice : undefined,
        trackInventory: input.trackInventory !== undefined ? input.trackInventory : undefined,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "MATERIAL_UPDATED",
      entityType: "Material",
      entityId: updated.id,
      oldValues: { name: material.name, categoryKey: material.categoryKey },
      newValues: { name: updated.name, categoryKey: updated.categoryKey },
    });

    return updated;
  }

  public static async deactivateMaterial(id: string, status: "INACTIVE" | "DISCONTINUED" | "ARCHIVED", userId?: string) {
    const material = await db.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundError("Material record not found");

    const updated = await db.material.update({
      where: { id },
      data: { status },
    });

    await AuditService.logEvent({
      userId,
      action: "MATERIAL_DEACTIVATED",
      entityType: "Material",
      entityId: id,
      newValues: { materialCode: material.materialCode, status },
    });

    return updated;
  }

  public static async getMaterials(params: MaterialFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.categoryKey) where.categoryKey = params.categoryKey;
    if (params.brandKey) where.brandKey = params.brandKey;
    if (params.status) where.status = params.status;
    if (params.materialType) where.materialType = params.materialType;

    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim();
      where.OR = [
        { materialCode: { contains: q } },
        { sku: { contains: q } },
        { name: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const [total, materials] = await Promise.all([
      db.material.count({ where }),
      db.material.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        include: {
          balances: { include: { warehouse: { select: { name: true, warehouseCode: true } } } },
        },
      }),
    ]);

    const items = materials.map((m) => {
      const physicalStock = m.balances.reduce((acc, b) => acc + b.physicalStock, 0);
      const reservedStock = m.balances.reduce((acc, b) => acc + b.reservedStock, 0);
      const availableStock = Math.max(0, physicalStock - reservedStock);

      let reorderState: "NORMAL" | "LOW_STOCK" | "OUT_OF_STOCK" = "NORMAL";
      if (availableStock <= 0) {
        reorderState = "OUT_OF_STOCK";
      } else if (availableStock <= m.reorderLevel) {
        reorderState = "LOW_STOCK";
      }

      return {
        ...m,
        physicalStock,
        reservedStock,
        availableStock,
        reorderState,
      };
    });

    // Apply low stock / out of stock post filtering if requested
    let filteredItems = items;
    if (params.lowStockOnly) {
      filteredItems = items.filter((i) => i.reorderState === "LOW_STOCK" || i.reorderState === "OUT_OF_STOCK");
    } else if (params.outOfStockOnly) {
      filteredItems = items.filter((i) => i.reorderState === "OUT_OF_STOCK");
    }

    return {
      materials: filteredItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getMaterialById(id: string) {
    const material = await db.material.findUnique({
      where: { id },
      include: {
        balances: {
          include: { warehouse: { select: { id: true, warehouseCode: true, name: true, type: true } } },
        },
        vendorMaterials: {
          include: { vendor: { select: { id: true, referenceNo: true, name: true, phone: true } } },
        },
        unitConversions: true,
        movements: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            warehouse: { select: { name: true } },
            project: { select: { referenceNo: true, title: true } },
          },
        },
      },
    });

    if (!material) throw new NotFoundError("Material master record not found");

    const stockSummary = await InventoryCalculationService.calculateStockSummary(material.id);

    return {
      ...material,
      stockSummary,
    };
  }
}
