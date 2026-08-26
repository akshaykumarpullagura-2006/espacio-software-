import { db } from "@/lib/db";

export class PaymentConfigService {
  public static async getPaymentMethods() {
    return db.paymentMethodConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }
}
