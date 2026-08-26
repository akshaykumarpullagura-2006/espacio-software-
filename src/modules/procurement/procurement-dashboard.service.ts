import { db } from "@/lib/db";
import { ProcurementCalculationService } from "./procurement-calculation.service";

export interface ProcurementDashboardSummary {
  openMaterialRequests: number;
  pendingMRApprovals: number;
  openPurchaseOrders: number;
  ordersAwaitingDelivery: number;
  overdueDeliveries: number;
  committedSpend: number;
}

export class ProcurementDashboardService {
  public static async getSummary(): Promise<ProcurementDashboardSummary> {
    const today = new Date();

    const [
      openMaterialRequests,
      pendingMRApprovals,
      openPurchaseOrders,
      ordersAwaitingDelivery,
      overdueDeliveries,
      activePOs,
    ] = await Promise.all([
      db.materialRequest.count({
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "PARTIALLY_ORDERED"] } },
      }),
      db.materialRequest.count({
        where: { status: "SUBMITTED" },
      }),
      db.purchaseOrder.count({
        where: { status: { in: ["APPROVED", "SENT", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"] } },
      }),
      db.purchaseOrder.count({
        where: { status: { in: ["SENT", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"] } },
      }),
      db.purchaseOrder.count({
        where: {
          status: { in: ["APPROVED", "SENT", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"] },
          expectedDeliveryDate: { lt: today },
        },
      }),
      db.purchaseOrder.findMany({
        where: { status: { in: ["APPROVED", "SENT", "ACKNOWLEDGED", "PARTIALLY_RECEIVED", "RECEIVED"] } },
        select: { grandTotal: true },
      }),
    ]);

    const committedSpend = ProcurementCalculationService.roundCurrency(
      activePOs.reduce((acc, po) => acc + po.grandTotal, 0)
    );

    return {
      openMaterialRequests,
      pendingMRApprovals,
      openPurchaseOrders,
      ordersAwaitingDelivery,
      overdueDeliveries,
      committedSpend,
    };
  }
}
