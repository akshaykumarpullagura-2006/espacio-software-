import { db } from "@/lib/db";

export class VendorConfigService {
  public static async getVendorCategories() {
    return db.vendorCategoryConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  public static async getPaymentTerms() {
    return db.paymentTermsConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }
}
