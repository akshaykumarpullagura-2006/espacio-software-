import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { MaterialRequestService } from "../src/modules/procurement/material-request.service";
import { PurchaseOrderService } from "../src/modules/procurement/purchase-order.service";
import { GoodsReceiptService } from "../src/modules/procurement/goods-receipt.service";
import { ProcurementCalculationService } from "../src/modules/procurement/procurement-calculation.service";
import { VendorService } from "../src/modules/vendors/vendor.service";

describe("Purchase Orders & Procurement Management Module Tests", () => {
  let sampleUserId: string;
  let sampleVendorId: string;
  let testMRId: string;
  let testPOId: string;

  beforeAll(async () => {
    const user = await db.user.findFirst();
    if (!user) throw new Error("No sample user found");
    sampleUserId = user.id;

    // Reset ALLOW_SELF_APPROVAL to false initially
    await db.setting.upsert({
      where: { key: "ALLOW_SELF_APPROVAL" },
      update: { value: "false" },
      create: { key: "ALLOW_SELF_APPROVAL", value: "false", category: "FINANCE" },
    });

    // Find or create sample vendor
    let vendor = await db.vendor.findFirst({ where: { status: "ACTIVE" } });
    if (!vendor) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      vendor = await VendorService.createVendor(
        {
          name: `Procurement Vendor ${suffix}`,
          categoryKey: "PLYWOOD",
          phone: `+91 91111 ${suffix}`,
          paymentTermsKey: "DAYS_30",
        },
        sampleUserId
      );
    }
    sampleVendorId = vendor.id;
  });

  it("calculates line totals and PO grand totals accurately", () => {
    const line1 = ProcurementCalculationService.calculateLineTotal({
      quantity: 50,
      rate: 2400,
      discount: 3000,
      taxRate: 18,
    });
    // Gross = 120000. Subtotal = 117000. Tax (18%) = 21060. Line Total = 138060.
    expect(line1.subtotal).toBe(117000);
    expect(line1.taxAmount).toBe(21060);
    expect(line1.lineTotal).toBe(138060);

    const totals = ProcurementCalculationService.calculatePOTotals({
      items: [{ quantity: 50, rate: 2400, discount: 3000, taxRate: 18 }],
      discount: 5000,
      tax: 0,
      shippingCharges: 2500,
    });
    // Subtotal = 138060. Grand Total = 138060 - 5000 + 2500 = 135560
    expect(totals.grandTotal).toBe(135560);
  });

  it("creates a Material Request with server-generated MR-YYYY-XXXX reference", async () => {
    const mr = await MaterialRequestService.createMaterialRequest(
      {
        requiredDate: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
        priority: "HIGH",
        purposeKey: "PROJECT_EXECUTION",
        notes: "Urgent Plywood Requisition",
        items: [
          {
            materialName: "Test BWP Plywood 19mm",
            requestedQuantity: 100,
            unitKey: "BUNDLE",
            estimatedRate: 2400,
          },
        ],
      },
      sampleUserId
    );

    expect(mr).toBeDefined();
    expect(mr.referenceNo).toMatch(/^MR-\d{4}-\d{4}$/);
    expect(mr.status).toBe("DRAFT");
    expect(mr.items).toHaveLength(1);

    testMRId = mr.id;
  });

  it("submits and approves a Material Request", async () => {
    const submitted = await MaterialRequestService.submitMaterialRequest(testMRId, sampleUserId);
    expect(submitted.status).toBe("SUBMITTED");

    // Temporarily enable self-approval setting for test run
    await db.setting.upsert({
      where: { key: "ALLOW_SELF_APPROVAL" },
      update: { value: "true" },
      create: { key: "ALLOW_SELF_APPROVAL", value: "true", category: "FINANCE" },
    });

    const approved = await MaterialRequestService.approveMaterialRequest(testMRId, sampleUserId);
    expect(approved).toBeDefined();
    if (!approved) throw new Error("MR approval failed");
    expect(approved.status).toBe("APPROVED");
    expect(approved.items[0].approvedQuantity).toBe(100);

    // Reset ALLOW_SELF_APPROVAL back to false for test suite safety
    await db.setting.update({
      where: { key: "ALLOW_SELF_APPROVAL" },
      data: { value: "false" },
    });
  });

  it("issues a Purchase Order (PO-YYYY-XXXX) linked to Vendor and Material Request", async () => {
    const po = await PurchaseOrderService.createPurchaseOrder(
      {
        vendorId: sampleVendorId,
        materialRequestId: testMRId,
        poDate: new Date().toISOString().split("T")[0],
        paymentTermsKey: "DAYS_30",
        currency: "INR",
        discount: 0,
        tax: 0,
        shippingCharges: 0,
        items: [
          {
            materialName: "Test BWP Plywood 19mm",
            quantity: 60,
            unitKey: "BUNDLE",
            rate: 2400,
            discount: 1000,
            taxRate: 18,
          },
        ],
      },
      sampleUserId
    );

    expect(po).toBeDefined();
    expect(po.referenceNo).toMatch(/^PO-\d{4}-\d{4}$/);
    expect(po.grandTotal).toBeGreaterThan(0);
    expect(po.status).toBe("DRAFT");

    // Verify MR partial ordering status update
    const mr = await MaterialRequestService.getMaterialRequestById(testMRId);
    expect(mr.status).toBe("PARTIALLY_ORDERED");

    testPOId = po.id;
  });

  it("approves and sends a Purchase Order to vendor", async () => {
    // Temporarily enable self-approval setting for test run
    await db.setting.upsert({
      where: { key: "ALLOW_SELF_APPROVAL" },
      update: { value: "true" },
      create: { key: "ALLOW_SELF_APPROVAL", value: "true", category: "FINANCE" },
    });

    const approved = await PurchaseOrderService.approvePurchaseOrder(testPOId, sampleUserId);
    expect(approved.status).toBe("APPROVED");

    const sent = await PurchaseOrderService.sendPurchaseOrder(testPOId, sampleUserId);
    expect(sent.status).toBe("SENT");

    // Reset ALLOW_SELF_APPROVAL back to false for test suite safety
    await db.setting.update({
      where: { key: "ALLOW_SELF_APPROVAL" },
      data: { value: "false" },
    });
  });

  it("records a Goods Receipt Note (GRN-YYYY-XXXX) with accepted vs short quantity breakdown", async () => {
    const po = await PurchaseOrderService.getPurchaseOrderById(testPOId);
    const poItem = po.items[0];

    const grn = await GoodsReceiptService.createGoodsReceipt(
      {
        purchaseOrderId: testPOId,
        deliveryReference: "DC-TEST-101",
        items: [
          {
            purchaseOrderItemId: poItem.id,
            receivedQuantity: 40,
            acceptedQuantity: 40,
            rejectedQuantity: 0,
            damagedQuantity: 0,
            shortQuantity: 20,
          },
        ],
      },
      sampleUserId
    );

    expect(grn).toBeDefined();
    expect(grn.referenceNo).toMatch(/^GRN-\d{4}-\d{4}$/);

    // Verify PO status updated to PARTIALLY_RECEIVED
    const updatedPO = await PurchaseOrderService.getPurchaseOrderById(testPOId);
    expect(updatedPO.status).toBe("PARTIALLY_RECEIVED");
    expect(updatedPO.items[0].receivedQuantity).toBe(40);
    expect(updatedPO.items[0].pendingQuantity).toBe(20);
  });

  it("enforces over-receiving protection when attempted delivery exceeds pending PO quantity", async () => {
    const po = await PurchaseOrderService.getPurchaseOrderById(testPOId);
    const poItem = po.items[0];

    // Disable over-receiving in settings
    await db.setting.upsert({
      where: { key: "ALLOW_OVER_RECEIVING" },
      update: { value: "false" },
      create: { key: "ALLOW_OVER_RECEIVING", value: "false", category: "PROCUREMENT" },
    });

    // Attempting to receive 30 when only 20 is pending
    await expect(
      GoodsReceiptService.createGoodsReceipt(
        {
          purchaseOrderId: testPOId,
          deliveryReference: "DC-EXCEEDED",
          items: [
            {
              purchaseOrderItemId: poItem.id,
              receivedQuantity: 30,
              acceptedQuantity: 30,
              rejectedQuantity: 0,
              damagedQuantity: 0,
              shortQuantity: 0,
            },
          ],
        },
        sampleUserId
      )
    ).rejects.toThrow(/exceeds the remaining PO pending quantity/i);
  });
});
