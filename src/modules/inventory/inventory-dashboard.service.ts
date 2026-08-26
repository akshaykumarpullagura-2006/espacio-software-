import { db } from "@/lib/db";

export interface InventoryDashboardMetrics {
  totalMaterials: number;
  totalWarehouses: number;
  totalPhysicalStockValue: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  pendingTransfersCount: number;
  recentMovements: any[];
  categoryDistribution: { categoryKey: string; count: number }[];
}

export class InventoryDashboardService {
  public static async getMetrics(): Promise<InventoryDashboardMetrics> {
    const [
      totalMaterials,
      totalWarehouses,
      materials,
      pendingTransfersCount,
      recentMovements,
      categories,
    ] = await Promise.all([
      db.material.count({ where: { status: "ACTIVE" } }),
      db.warehouse.count({ where: { status: "ACTIVE" } }),
      db.material.findMany({
        where: { status: "ACTIVE" },
        include: { balances: true },
      }),
      db.stockTransfer.count({ where: { status: { in: ["REQUESTED", "IN_TRANSIT"] } } }),
      db.stockMovement.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          material: { select: { materialCode: true, name: true } },
          warehouse: { select: { name: true } },
          project: { select: { referenceNo: true, title: true } },
        },
      }),
      db.materialCategoryConfig.findMany({ where: { isActive: true } }),
    ]);

    let totalPhysicalStockValue = 0;
    let lowStockItemsCount = 0;
    let outOfStockItemsCount = 0;

    const categoryMap = new Map<string, number>();

    for (const m of materials) {
      const physicalStock = m.balances.reduce((acc, b) => acc + b.physicalStock, 0);
      const reservedStock = m.balances.reduce((acc, b) => acc + b.reservedStock, 0);
      const availableStock = Math.max(0, physicalStock - reservedStock);

      const cost = m.standardCost || m.purchaseCost || 0;
      totalPhysicalStockValue += physicalStock * cost;

      if (availableStock <= 0) {
        outOfStockItemsCount++;
      } else if (availableStock <= m.reorderLevel) {
        lowStockItemsCount++;
      }

      categoryMap.set(m.categoryKey, (categoryMap.get(m.categoryKey) || 0) + 1);
    }

    const categoryDistribution = categories.map((c) => ({
      categoryKey: c.name,
      count: categoryMap.get(c.key) || 0,
    }));

    return {
      totalMaterials,
      totalWarehouses,
      totalPhysicalStockValue: Math.round(totalPhysicalStockValue * 100) / 100,
      lowStockItemsCount,
      outOfStockItemsCount,
      pendingTransfersCount,
      recentMovements,
      categoryDistribution,
    };
  }
}
