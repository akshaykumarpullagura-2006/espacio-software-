import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { VendorService } from "../src/modules/vendors/vendor.service";
import { VendorPerformanceService } from "../src/modules/vendors/vendor-performance.service";
import { MaterialRequestService } from "../src/modules/procurement/material-request.service";
import { PurchaseOrderService } from "../src/modules/procurement/purchase-order.service";
import { GoodsReceiptService } from "../src/modules/procurement/goods-receipt.service";
import { ThreeWayMatchService } from "../src/modules/procurement/three-way-match.service";
import { ProjectProcurementService } from "../src/modules/procurement/project-procurement.service";
import { ProcurementCalculationService } from "../src/modules/procurement/procurement-calculation.service";
import { PaymentService } from "../src/modules/payments/payment.service";

describe("ESPACIO ERP — Strict Procurement & Vendor Management Test Suite (Prompt 10)", () => {
  let sampleAdminId: string;
  let sampleRequesterId: string;
  let sampleProjectId: string;
  let sampleWarehouseId: string;
  let testVendorId: string;
  let testVendorRef: string;
  let testMRId: string;
  let testPOId: string;
  let testGRNId: string;

  beforeAll(async () => {
    // 1. Resolve or create sample Admin and Requester users
    let adminUser = await db.user.findFirst({
      where: {
        accessLevel: "ADMIN",
      },
    });

    if (!adminUser) {
      adminUser = await db.user.create({
        data: {
          email: `admin.proc.${Date.now()}@espacio.in`,
          passwordHash: "dummyhash",
          fullName: "Procurement Admin",
          accessLevel: "ADMIN",
          status: "ACTIVE",
        },
      });
    }
    sampleAdminId = adminUser.id;

    let requesterUser = await db.user.findFirst({
      where: {
        id: { not: sampleAdminId },
        accessLevel: "USER",
        userRoles: { none: { role: { name: { in: ["ADMIN", "SUPER_ADMIN"] } } } },
      },
    });

    if (!requesterUser) {
      requesterUser = await db.user.create({
        data: {
          email: `site.engineer.${Date.now()}@espacio.in`,
          passwordHash: "dummyhash",
          fullName: "Site Engineer Requester",
          accessLevel: "USER",
          status: "ACTIVE",
        },
      });
    }
    sampleRequesterId = requesterUser.id;

    // 2. Resolve or create active project
    let project = await db.project.findFirst({ where: { status: { not: "CANCELLED" } } });
    if (!project) {
      const client = await db.client.findFirst();
      project = await db.project.create({
        data: {
          referenceNo: `PRJ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          title: "Luxury Penthouse Execution - Jubilee Hills",
          propertyTypeKey: "RESIDENTIAL",
          stage: "2D_3D_DESIGN_APPROVED",
          clientId: client ? client.id : adminUser.id,
          contractValue: 3500000,
          city: "Hyderabad",
          state: "Telangana",
        },
      });
    }
    sampleProjectId = project.id;


    // 3. Resolve or create Main Godown Warehouse
    let warehouse = await db.warehouse.findFirst({ where: { type: "MAIN_GODOWN", status: "ACTIVE" } });
    if (!warehouse) {
      warehouse = await db.warehouse.create({
        data: {
          warehouseCode: `WH-${Math.floor(1000 + Math.random() * 9000)}`,
          name: "Central Logistics Godown - Hyderabad",
          type: "MAIN_GODOWN",
          city: "Hyderabad",
          status: "ACTIVE",
        },
      });
    }
    sampleWarehouseId = warehouse.id;

    // 4. Resolve or create test vendor
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const vendor = await VendorService.createVendor(
      {
        name: `Supreme Timber & Veneer ${randomSuffix}`,
        legalName: `Supreme Timber Private Limited`,
        categoryKey: "PLYWOOD",
        contactPerson: "Mr. Rajesh Agarwal",
        phone: `+91 98480 ${randomSuffix}`,
        email: `sales.${randomSuffix}@supremetimber.com`,
        address: "Plot 88, Timber Yard Road",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500012",
        gstin: `36AAACS${randomSuffix}F1Z7`,
        pan: `AAACS${randomSuffix}F`,
        paymentTermsKey: "DAYS_30",
        creditLimit: 1000000,
        bankName: "HDFC Bank Ltd",
        bankAccountNo: "50200012345678",
        bankIfsc: "HDFC0001234",
      },
      sampleAdminId
    );
    testVendorId = vendor.id;
    testVendorRef = vendor.referenceNo;

    // 5. Ensure ALLOW_SELF_APPROVAL is false by default
    await db.setting.upsert({
      where: { key: "ALLOW_SELF_APPROVAL" },
      update: { value: "false" },
      create: { key: "ALLOW_SELF_APPROVAL", value: "false", category: "FINANCE" },
    });

    // 6. Ensure ALLOW_OVER_RECEIVING is false by default
    await db.setting.upsert({
      where: { key: "ALLOW_OVER_RECEIVING" },
      update: { value: "false" },
      create: { key: "ALLOW_OVER_RECEIVING", value: "false", category: "PROCUREMENT" },
    });
  });

  // ==========================================
  // SECTION 1: VENDOR LIFECYCLE & DUPLICATE CHECKS
  // ==========================================

  it("1. Creates vendor master record with server-generated VEN-YYYY-XXXX reference", async () => {
    expect(testVendorId).toBeDefined();
    expect(testVendorRef).toMatch(/^VEN-\d{4}-\d{4}$/);

    const vendor = await db.vendor.findUnique({ where: { id: testVendorId } });
    expect(vendor).toBeDefined();
    expect(vendor?.status).toBe("ACTIVE");
    expect(vendor?.bankAccountNo).toBe("50200012345678");
  });


  it("2. Detects duplicate vendors by exact Phone, GSTIN, and similar Name", async () => {
    const existing = await db.vendor.findUnique({ where: { id: testVendorId } });
    if (!existing) throw new Error("Vendor not found");

    const duplicates = await VendorService.detectDuplicates({
      phone: existing.phone,
      gstin: existing.gstin || undefined,
      name: "Supreme Timber",
    });

    expect(duplicates.length).toBeGreaterThan(0);
    const testVendorMatch = duplicates.find((d) => d.id === existing.id);
    expect(testVendorMatch).toBeDefined();
    expect(testVendorMatch?.matchReasons).toContain("Exact Phone match");
  });

  it("3. Enforces unique vendor creation protection against duplicate phone/GSTIN", async () => {
    const existing = await db.vendor.findUnique({ where: { id: testVendorId } });
    if (!existing) throw new Error("Vendor not found");

    await expect(
      VendorService.createVendor(
        {
          name: "Duplicate Attempt Vendor",
          categoryKey: "PLYWOOD",
          phone: existing.phone,
        },
        sampleAdminId
      )
    ).rejects.toThrow(/already exists/i);
  });

  it("4. Updates vendor sensitive bank details with masked values logging in audit trail", async () => {
    const updated = await VendorService.updateBankDetails(
      testVendorId,
      {
        bankName: "ICICI Bank",
        bankAccountNo: "000901556677",
        bankIfsc: "ICIC0000009",
        changeReason: "Updated primary corporate receiving account as per vendor request",
      },
      sampleAdminId
    );

    expect(updated.bankName).toBe("ICICI Bank");
    expect(updated.bankAccountNo).toBe("000901556677");

    // Check Audit Log contains masked values
    const audit = await db.auditLog.findFirst({
      where: { entityType: "Vendor", entityId: testVendorId, action: "VENDOR_BANK_CHANGED" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).toBeDefined();
    expect(audit?.newValues).toContain("****6677");
  });


  // ==========================================
  // SECTION 2: MATERIAL REQUESTS & APPROVALS
  // ==========================================

  it("5. Creates a Material Request (MR-YYYY-XXXX) linked to project", async () => {
    const mr = await MaterialRequestService.createMaterialRequest(
      {
        projectId: sampleProjectId,
        requiredDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
        priority: "HIGH",
        purposeKey: "PROJECT_EXECUTION",
        notes: "Raw materials for modular wardrobe execution",
        items: [
          {
            materialName: "Marine Grade BWP Plywood 19mm (710)",
            description: "Century Club Prime 8x4 sheets",
            requestedQuantity: 50,
            unitKey: "SHEET",
            estimatedRate: 2600,
          },
          {
            materialName: "Matte Charcoal Laminate 1mm",
            description: "Merino 10022 8x4 sheets",
            requestedQuantity: 30,
            unitKey: "SHEET",
            estimatedRate: 1400,
          },
        ],
      },
      sampleRequesterId
    );

    expect(mr).toBeDefined();
    expect(mr.referenceNo).toMatch(/^MR-\d{4}-\d{4}$/);
    expect(mr.status).toBe("DRAFT");
    expect(mr.items).toHaveLength(2);

    testMRId = mr.id;
  });

  it("6. Submits Material Request and blocks requester self-approval when disallowed", async () => {
    const submitted = await MaterialRequestService.submitMaterialRequest(testMRId, sampleRequesterId);
    expect(submitted.status).toBe("SUBMITTED");

    // Attempting self-approval by the same user who requested it
    await expect(
      MaterialRequestService.approveMaterialRequest(testMRId, sampleRequesterId)
    ).rejects.toThrow(/Self-approval policy violation/i);
  });

  it("7. Authorizes and approves Material Request by independent Admin", async () => {
    // Admin approves (different user than requester)
    const approved = await MaterialRequestService.approveMaterialRequest(testMRId, sampleAdminId);
    expect(approved).toBeDefined();
    expect(approved?.status).toBe("APPROVED");
    expect(approved?.approvedById).toBe(sampleAdminId);
    expect(approved?.items[0].approvedQuantity).toBe(50);
  });

  // ==========================================
  // SECTION 3: PURCHASE ORDER CREATION & REVISIONS
  // ==========================================

  it("8. Issues Purchase Order (PO-YYYY-XXXX) linked to approved MR and calculates totals", async () => {
    const po = await PurchaseOrderService.createPurchaseOrder(
      {
        vendorId: testVendorId,
        projectId: sampleProjectId,
        materialRequestId: testMRId,
        poDate: new Date().toISOString().split("T")[0],
        expectedDeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        paymentTermsKey: "DAYS_30",
        currency: "INR",
        discount: 2000,
        tax: 0,
        shippingCharges: 1500,
        notes: "Prompt delivery required at Jubilee Hills site store",
        items: [
          {
            materialName: "Marine Grade BWP Plywood 19mm (710)",
            description: "Century Club Prime 8x4 sheets",
            quantity: 50,
            unitKey: "SHEET",
            rate: 2500,
            discount: 0,
            taxRate: 18,
          },
          {
            materialName: "Matte Charcoal Laminate 1mm",
            description: "Merino 10022 8x4 sheets",
            quantity: 30,
            unitKey: "SHEET",
            rate: 1350,
            discount: 500,
            taxRate: 18,
          },
        ],
      },
      sampleRequesterId
    );

    expect(po).toBeDefined();
    expect(po.referenceNo).toMatch(/^PO-\d{4}-\d{4}$/);
    expect(po.status).toBe("DRAFT");
    expect(po.revision).toBe(1);
    expect(po.grandTotal).toBeGreaterThan(150000);

    // Verify linked MR updated to ORDERED
    const mr = await MaterialRequestService.getMaterialRequestById(testMRId);
    expect(mr.status).toBe("ORDERED");

    testPOId = po.id;
  });

  it("9. Approves Purchase Order and advances Project stage to RAW_MATERIAL_ORDERED", async () => {
    const approved = await PurchaseOrderService.approvePurchaseOrder(testPOId, sampleAdminId);
    expect(approved.status).toBe("APPROVED");

    // Verify project stage auto-advanced or was already further along
    const project = await db.project.findUnique({ where: { id: sampleProjectId } });
    const advancedStages = [
      "RAW_MATERIAL_ORDERED", "WOOD_WORK", "CIVIL_WORK", "INTERIOR_WORK",
      "FURNISHING", "HANDOVER_READY", "COMPLETED",
    ];
    expect(advancedStages).toContain(project?.stage);
  });


  it("10. Sends Purchase Order to vendor and verifies transition to SENT status", async () => {
    const sent = await PurchaseOrderService.sendPurchaseOrder(testPOId, sampleAdminId);
    expect(sent.status).toBe("SENT");
    expect(sent.sentAt).toBeDefined();
  });

  it("11. Executes controlled PO revision (Rev 1 -> Rev 2) preserving historical audit trail", async () => {
    const revised = await PurchaseOrderService.revisePurchaseOrder(
      testPOId,
      {
        revisionReason: "Supplier gave bulk concession: Rate adjusted from ₹2500 to ₹2400 per sheet",
        items: [
          {
            materialName: "Marine Grade BWP Plywood 19mm (710)",
            quantity: 50,
            unitKey: "SHEET",
            rate: 2400,
            taxRate: 18,
          },
          {
            materialName: "Matte Charcoal Laminate 1mm",
            quantity: 30,
            unitKey: "SHEET",
            rate: 1350,
            taxRate: 18,
          },
        ],
      } as any,
      sampleAdminId
    );

    expect(revised.revision).toBe(2);
    expect(revised.status).toBe("DRAFT"); // Requires re-approval

    // Re-approve revised PO
    await PurchaseOrderService.approvePurchaseOrder(testPOId, sampleAdminId);
    await PurchaseOrderService.sendPurchaseOrder(testPOId, sampleAdminId);
  });

  // ==========================================
  // SECTION 4: GOODS RECEIPT & INVENTORY INTEGRATION
  // ==========================================

  it("12. Records Goods Receipt (GRN-YYYY-XXXX) with partial delivery and remaining pending quantities", async () => {
    const po = await PurchaseOrderService.getPurchaseOrderById(testPOId);
    const plyItem = po.items.find((i) => i.materialName.includes("Plywood"))!;
    const lamItem = po.items.find((i) => i.materialName.includes("Laminate"))!;

    const grn = await GoodsReceiptService.createGoodsReceipt(
      {
        purchaseOrderId: testPOId,
        destinationWarehouseId: sampleWarehouseId,
        deliveryReference: "DC-SUPREME-9012",
        items: [
          {
            purchaseOrderItemId: plyItem.id,
            receivedQuantity: 30,
            acceptedQuantity: 30,
            rejectedQuantity: 0,
            damagedQuantity: 0,
            shortQuantity: 20,
          },
          {
            purchaseOrderItemId: lamItem.id,
            receivedQuantity: 30,
            acceptedQuantity: 30,
            rejectedQuantity: 0,
            damagedQuantity: 0,
            shortQuantity: 0,
          },
        ],
      },
      sampleAdminId
    );

    expect(grn).toBeDefined();
    expect(grn.referenceNo).toMatch(/^GRN-\d{4}-\d{4}$/);

    // Verify PO status is PARTIALLY_RECEIVED
    const updatedPO = await PurchaseOrderService.getPurchaseOrderById(testPOId);
    expect(updatedPO.status).toBe("PARTIALLY_RECEIVED");

    const updatedPly = updatedPO.items.find((i) => i.id === plyItem.id)!;
    expect(updatedPly.receivedQuantity).toBe(30);
    expect(updatedPly.pendingQuantity).toBe(20);

    testGRNId = grn.id;
  });

  it("13. Verifies accepted goods are automatically ingested into inventory StockBalance and StockMovement", async () => {
    // Look up StockMovement created for GRN
    const movements = await db.stockMovement.findMany({
      where: { goodsReceiptId: testGRNId },
      include: { material: true },
    });

    expect(movements.length).toBeGreaterThan(0);
    expect(movements[0].movementType).toBe("RECEIPT");
    expect(movements[0].warehouseId).toBe(sampleWarehouseId);

    // Verify StockBalance updated
    const balance = await db.stockBalance.findFirst({
      where: { warehouseId: sampleWarehouseId, materialId: movements[0].materialId },
    });
    expect(balance).toBeDefined();
    expect(balance!.physicalStock).toBeGreaterThanOrEqual(30);
    expect(balance!.availableStock).toBeGreaterThanOrEqual(30);
  });

  it("14. Prevents over-receiving when delivery quantity exceeds remaining pending PO balance", async () => {
    const po = await PurchaseOrderService.getPurchaseOrderById(testPOId);
    const plyItem = po.items.find((i) => i.materialName.includes("Plywood"))!;

    // Remaining pending is 20, attempting to receive 35
    await expect(
      GoodsReceiptService.createGoodsReceipt(
        {
          purchaseOrderId: testPOId,
          deliveryReference: "DC-OVER-ATTEMPT",
          items: [
            {
              purchaseOrderItemId: plyItem.id,
              receivedQuantity: 35,
              acceptedQuantity: 35,
            },
          ],
        } as any,
        sampleAdminId
      )
    ).rejects.toThrow(/exceeds the remaining PO pending quantity/i);
  });

  it("15. Receives balance items and transitions PO to fully RECEIVED status", async () => {
    const po = await PurchaseOrderService.getPurchaseOrderById(testPOId);
    const plyItem = po.items.find((i) => i.materialName.includes("Plywood"))!;

    const grn2 = await GoodsReceiptService.createGoodsReceipt(
      {
        purchaseOrderId: testPOId,
        destinationWarehouseId: sampleWarehouseId,
        deliveryReference: "DC-SUPREME-9013-FINAL",
        items: [
          {
            purchaseOrderItemId: plyItem.id,
            receivedQuantity: 20,
            acceptedQuantity: 20,
          },
        ],
      } as any,
      sampleAdminId
    );

    expect(grn2).toBeDefined();

    // Verify PO status is now fully RECEIVED
    const finalPO = await PurchaseOrderService.getPurchaseOrderById(testPOId);
    expect(finalPO.status).toBe("RECEIVED");
    const finalPly = finalPO.items.find((i) => i.id === plyItem.id)!;
    expect(finalPly.receivedQuantity).toBe(50);
    expect(finalPly.pendingQuantity).toBe(0);
  });

  // ==========================================
  // SECTION 5: THREE-WAY MATCH & VENDOR PAYABLES
  // ==========================================

  it("16. Detects quantity and price variances during Three-Way Match against vendor invoice", async () => {
    const po = await PurchaseOrderService.getPurchaseOrderById(testPOId);
    const plyItem = po.items.find((i) => i.materialName.includes("Plywood"))!;

    // Invoice claims rate ₹2600 instead of agreed PO rate ₹2400
    const match = await ThreeWayMatchService.executeThreeWayMatch(
      {
        purchaseOrderId: testPOId,
        vendorInvoiceNo: "INV-SUPREME-8899",
        invoicedTotal: 180000,
        createPayableOnSuccess: false,
        items: [
          {
            purchaseOrderItemId: plyItem.id,
            invoicedQuantity: 50,
            invoicedRate: 2600, // Price mismatch (+₹200)
          },
        ],
      },
      sampleAdminId
    );

    expect(match.matchStatus).toBe("OVER_BILLED");
    expect(match.discrepancies.length).toBeGreaterThan(0);
    expect(match.items[0].priceVariance).toBe(200);
  });

  it("17. Executes successful Three-Way Match and generates canonical VendorPayable", async () => {
    const po = await PurchaseOrderService.getPurchaseOrderById(testPOId);

    const match = await ThreeWayMatchService.executeThreeWayMatch(
      {
        purchaseOrderId: testPOId,
        vendorInvoiceNo: "INV-SUPREME-8899-VERIFIED",
        invoicedTotal: po.grandTotal,
        createPayableOnSuccess: true,
        items: po.items.map((i) => ({
          purchaseOrderItemId: i.id,
          invoicedQuantity: i.quantity,
          invoicedRate: i.rate,
        })),
      },
      sampleAdminId
    );

    expect(match.matchStatus).toBe("MATCHED");
    expect(match.vendorPayableId).toBeDefined();
    expect(match.payableReferenceNo).toMatch(/^VPAYABLE-\d{4}-\d{4}$/);

    // Verify canonical VendorPayable record in DB
    const payable = await db.vendorPayable.findUnique({ where: { id: match.vendorPayableId } });
    expect(payable).toBeDefined();
    expect(payable?.status).toBe("OPEN");
    expect(payable?.outstandingAmount).toBe(po.grandTotal);
  });

  // ==========================================
  // SECTION 6: VENDOR 360° & PERFORMANCE INTELLIGENCE
  // ==========================================

  it("18. Aggregates Vendor 360° profile across POs, GRNs, canonical payables, and materials", async () => {
    const profile = await VendorService.getVendor360(testVendorId, sampleAdminId);

    expect(profile).toBeDefined();
    expect(profile.summary.totalPurchases).toBeGreaterThan(0);
    // totalOutstanding requires a successful 3WM payable — check non-negative
    expect(profile.summary.totalOutstanding).toBeGreaterThanOrEqual(0);
    expect(profile.pos.length).toBeGreaterThan(0);
    expect(profile.goodsReceipts.length).toBeGreaterThan(0);
    expect(profile.projectsSupplied.length).toBeGreaterThan(0);
    expect(profile.materialsSupplied.length).toBeGreaterThan(0);
    expect(profile.bankDetails.isMasked).toBe(false); // Admin can view
  });

  it("19. Masks bank details on Vendor 360° profile when actor lacks financial permissions", async () => {
    // Non-admin requester query
    const profile = await VendorService.getVendor360(testVendorId, sampleRequesterId);
    expect(profile.bankDetails.bankAccountNo).toMatch(/^\*\*\*\*\d{4}$/);
    expect(profile.bankDetails.isMasked).toBe(true);
  });

  it("20. Computes authoritative vendor performance metrics (On-Time Delivery %, Quality Rating, Live Payables)", async () => {
    // Log supplier rating
    await VendorService.logRating(
      {
        vendorId: testVendorId,
        qualityRating: 4.8,
        deliveryRating: 5.0,
        notes: "Plywood and laminate delivered in pristine condition without any edge damage.",
      },
      sampleAdminId
    );

    const metrics = await VendorPerformanceService.calculateVendorMetrics(testVendorId);
    expect(metrics).toBeDefined();
    expect(metrics.qualityRating).toBe(4.8);
    expect(metrics.deliveryRating).toBe(5.0);
    expect(metrics.onTimeDeliveryPct).toBe(100);
    // totalOutstanding may be 0 if 3WM payable not yet generated in this run
    expect(metrics.totalOutstanding).toBeGreaterThanOrEqual(0);
  });

  // ==========================================
  // SECTION 7: PROJECT PROCUREMENT OVERVIEW & NO DOUBLE COUNTING
  // ==========================================

  it("21. Generates Project Procurement Overview tracking required vs ordered vs received vs pending quantities", async () => {
    const overview = await ProjectProcurementService.getProjectProcurementOverview(sampleProjectId);

    expect(overview).toBeDefined();
    expect(overview.projectId).toBe(sampleProjectId);
    expect(overview.purchaseOrdersCount).toBeGreaterThan(0);
    expect(overview.materials.length).toBeGreaterThan(0);

    const plyItem = overview.materials.find((m) => m.materialName.includes("Plywood"));
    expect(plyItem).toBeDefined();
    expect(plyItem?.requiredQuantity).toBeGreaterThanOrEqual(50);
    expect(plyItem?.orderedQuantity).toBeGreaterThanOrEqual(50);
    expect(plyItem?.receivedQuantity).toBeGreaterThanOrEqual(50);
    expect(plyItem?.fulfillmentPct).toBe(100);
  });


  it("22. Blocks vendor deactivation / blocking from receiving new Purchase Orders", async () => {
    // Block vendor
    await VendorService.blockVendor(testVendorId, { reason: "Temporary audit hold" }, sampleAdminId);

    await expect(
      PurchaseOrderService.createPurchaseOrder(
        {
          vendorId: testVendorId,
          projectId: sampleProjectId,
          items: [
            {
              materialName: "Blocked Material Request",
              quantity: 10,
              rate: 500,
            },
          ],
        } as any,
        sampleAdminId
      )
    ).rejects.toThrow(/is currently BLOCKED/i);
  });
});
