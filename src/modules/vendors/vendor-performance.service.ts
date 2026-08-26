import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export interface VendorMetrics {
  vendorId: string;
  referenceNo: string;
  name: string;
  categoryKey: string;
  status: string;
  totalPurchases: number;
  totalPaid: number;
  totalOutstanding: number;
  ordersCount: number;
  receiptsCount: number;
  qualityRating: number;
  deliveryRating: number;
  onTimeDeliveryPct: number;
  responseTimeStatus: string;
}

export interface GlobalVendorSummary {
  totalVendors: number;
  activeVendorsCount: number;
  totalPurchases: number;
  totalPaid: number;
  totalOutstandingPayables: number;
  averageQualityRating: number;
  totalOrdersCount: number;
}

export class VendorPerformanceService {
  public static roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Authoritative performance & financial calculation engine for a specific vendor.
   */
  public static async calculateVendorMetrics(vendorId: string): Promise<VendorMetrics> {
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      include: {
        pos: { select: { id: true, grandTotal: true, status: true, expectedDeliveryDate: true, createdAt: true } },
        expenses: {
          where: { status: { in: ["APPROVED", "PAID"] } },
          select: { amount: true },
        },
        goodsReceipts: {
          select: { id: true, receivedDate: true, purchaseOrderId: true },
        },
        vendorPayables: {
          where: { status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
          select: { outstandingAmount: true },
        },
        vendorPayments: {
          where: { status: "VERIFIED" },
          select: { amount: true },
        },
        ratings: { select: { qualityRating: true, deliveryRating: true } },
      },
    });

    if (!vendor) throw new NotFoundError("Vendor record not found");

    let totalPurchases = 0;
    for (const po of vendor.pos) {
      if (po.status !== "CANCELLED") {
        totalPurchases += po.grandTotal;
      }
    }
    for (const exp of vendor.expenses) {
      totalPurchases += exp.amount;
    }
    totalPurchases = this.roundCurrency(totalPurchases);

    let totalPaid = 0;
    for (const pay of vendor.vendorPayments) {
      totalPaid += pay.amount;
    }
    totalPaid = this.roundCurrency(totalPaid);

    let totalOutstanding = 0;
    for (const payable of vendor.vendorPayables) {
      totalOutstanding += payable.outstandingAmount;
    }
    totalOutstanding = this.roundCurrency(totalOutstanding);

    // Calculate quality rating average
    let avgQuality = 4.5;
    let avgDelivery = 4.5;
    if (vendor.ratings.length > 0) {
      const qSum = vendor.ratings.reduce((acc, r) => acc + r.qualityRating, 0);
      avgQuality = this.roundCurrency(qSum / vendor.ratings.length);

      const dRatings = vendor.ratings.filter((r) => r.deliveryRating !== null);
      if (dRatings.length > 0) {
        const dSum = dRatings.reduce((acc, r) => acc + (r.deliveryRating || 4.5), 0);
        avgDelivery = this.roundCurrency(dSum / dRatings.length);
      }
    }

    // Calculate On-Time Delivery Rate
    let onTimeCount = 0;
    let totalDeliveriesWithDueDate = 0;

    for (const grn of vendor.goodsReceipts) {
      const matchedPO = vendor.pos.find((p) => p.id === grn.purchaseOrderId);
      if (matchedPO && matchedPO.expectedDeliveryDate) {
        totalDeliveriesWithDueDate++;
        if (grn.receivedDate <= matchedPO.expectedDeliveryDate) {
          onTimeCount++;
        }
      }
    }

    const onTimeDeliveryPct =
      totalDeliveriesWithDueDate > 0
        ? this.roundCurrency((onTimeCount / totalDeliveriesWithDueDate) * 100)
        : 100;

    const ordersCount = vendor.pos.length;
    const receiptsCount = vendor.goodsReceipts.length;
    const responseTimeStatus = vendor.ratings.length > 0 ? "Fast (< 24 hrs)" : "Standard";

    return {
      vendorId: vendor.id,
      referenceNo: vendor.referenceNo,
      name: vendor.name,
      categoryKey: vendor.categoryKey,
      status: vendor.status,
      totalPurchases,
      totalPaid,
      totalOutstanding,
      ordersCount,
      receiptsCount,
      qualityRating: avgQuality,
      deliveryRating: avgDelivery,
      onTimeDeliveryPct,
      responseTimeStatus,
    };
  }

  /**
   * Aggregated global vendor metrics across ESPACIO ERP.
   */
  public static async calculateGlobalVendorSummary(): Promise<GlobalVendorSummary> {
    const vendors = await db.vendor.findMany({
      include: {
        pos: { select: { grandTotal: true, status: true } },
        expenses: { where: { status: { in: ["APPROVED", "PAID"] } }, select: { amount: true } },
        ratings: { select: { qualityRating: true } },
        vendorPayables: {
          where: { status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
          select: { outstandingAmount: true },
        },
        vendorPayments: {
          where: { status: "VERIFIED" },
          select: { amount: true },
        },
      },
    });

    const totalVendors = vendors.length;
    let activeVendorsCount = 0;
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalOutstandingPayables = 0;
    let totalRatingSum = 0;
    let ratedCount = 0;
    let totalOrdersCount = 0;

    for (const v of vendors) {
      if (v.status === "ACTIVE") activeVendorsCount++;

      for (const po of v.pos) {
        totalOrdersCount++;
        if (po.status !== "CANCELLED") totalPurchases += po.grandTotal;
      }
      for (const exp of v.expenses) {
        totalPurchases += exp.amount;
      }
      for (const pay of v.vendorPayments) {
        totalPaid += pay.amount;
      }
      for (const payable of v.vendorPayables) {
        totalOutstandingPayables += payable.outstandingAmount;
      }

      if (v.ratings.length > 0) {
        const qSum = v.ratings.reduce((acc, r) => acc + r.qualityRating, 0);
        totalRatingSum += qSum / v.ratings.length;
        ratedCount++;
      }
    }

    totalPurchases = this.roundCurrency(totalPurchases);
    totalPaid = this.roundCurrency(totalPaid);
    totalOutstandingPayables = this.roundCurrency(totalOutstandingPayables);
    const averageQualityRating = ratedCount > 0 ? this.roundCurrency(totalRatingSum / ratedCount) : 4.8;

    return {
      totalVendors,
      activeVendorsCount,
      totalPurchases,
      totalPaid,
      totalOutstandingPayables,
      averageQualityRating,
      totalOrdersCount,
    };
  }
}
