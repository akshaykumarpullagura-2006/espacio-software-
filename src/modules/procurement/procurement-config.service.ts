import { db } from "@/lib/db";

export class ProcurementConfigService {
  public static async getRequestPurposes() {
    return db.materialRequestPurposeConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  public static async getUnits() {
    return db.unitConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }
}
