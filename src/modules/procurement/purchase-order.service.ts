import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { ProcurementCalculationService } from "./procurement-calculation.service";
import { CreatePurchaseOrderInput, RevisePurchaseOrderInput } from "@/validators/procurement.schema";

export interface POFilterParams {
  vendorId?: string;
  projectId?: string;
  materialRequestId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class PurchaseOrderService {
  public static async createPurchaseOrder(input: CreatePurchaseOrderInput, userId: string) {
    const vendor = await db.vendor.findUnique({ where: { id: input.vendorId } });
    if (!vendor) throw new NotFoundError("Selected vendor record not found");

    if (vendor.status === "BLOCKED") {
      throw new BusinessRuleError(`Vendor ${vendor.name} is currently BLOCKED and cannot receive purchase orders.`);
    }

    if (vendor.status === "INACTIVE") {
      throw new BusinessRuleError(`Vendor ${vendor.name} is INACTIVE and cannot receive new purchase orders.`);
    }

    if (!input.items || input.items.length === 0) {
      throw new BusinessRuleError("At least one PO item is required.");
    }

    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new BusinessRuleError(`Item quantity must be greater than 0 (${item.materialName}).`);
      }
      if (item.rate < 0) {
        throw new BusinessRuleError(`Item rate cannot be negative (${item.materialName}).`);
      }
    }

    const referenceNo = await IdGeneratorService.generate("PO");

    // Calculate line totals and PO totals
    const lineCalculations = input.items.map((item) =>
      ProcurementCalculationService.calculateLineTotal({
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        taxRate: item.taxRate,
      })
    );

    const totals = ProcurementCalculationService.calculatePOTotals({
      items: input.items.map((item) => ({
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        taxRate: item.taxRate,
      })),
      discount: input.discount,
      tax: input.tax,
      shippingCharges: input.shippingCharges,
    });

    // Commercial Vendor Snapshot
    const vendorSnapshot = JSON.stringify({
      id: vendor.id,
      referenceNo: vendor.referenceNo,
      name: vendor.name,
      legalName: vendor.legalName,
      contactPerson: vendor.contactPerson,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      gstin: vendor.gstin,
      paymentTermsKey: input.paymentTermsKey || vendor.paymentTermsKey,
    });

    const poDate = input.poDate ? new Date(input.poDate) : new Date();
    const expectedDeliveryDate = input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null;

    const po = await db.purchaseOrder.create({
      data: {
        referenceNo,
        vendorId: vendor.id,
        projectId: input.projectId && input.projectId.trim() !== "" ? input.projectId : null,
        materialRequestId: input.materialRequestId && input.materialRequestId.trim() !== "" ? input.materialRequestId : null,
        poDate,
        expectedDeliveryDate,
        paymentTermsKey: input.paymentTermsKey || vendor.paymentTermsKey,
        currency: input.currency || "INR",
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        shippingCharges: totals.shippingCharges,
        grandTotal: totals.grandTotal,
        status: "DRAFT",
        revision: 1,
        vendorSnapshot,
        notes: input.notes ? input.notes.trim() : null,
        createdById: userId,
        items: {
          create: input.items.map((item, idx) => ({
            materialName: item.materialName.trim(),
            description: item.description ? item.description.trim() : null,
            quantity: item.quantity,
            unitKey: item.unitKey || "NOS",
            rate: item.rate,
            discount: item.discount || 0,
            taxRate: item.taxRate || 0,
            lineTotal: lineCalculations[idx].lineTotal,
            receivedQuantity: 0,
            acceptedQuantity: 0,
            rejectedQuantity: 0,
            pendingQuantity: item.quantity,
            expectedDeliveryDate: item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate) : expectedDeliveryDate,
          })),
        },
      },
      include: { items: true, vendor: true },
    });

    // Update MaterialRequest ordered quantity if linked
    if (input.materialRequestId) {
      const mr = await db.materialRequest.findUnique({
        where: { id: input.materialRequestId },
        include: { items: true },
      });

      if (mr) {
        for (const poItem of po.items) {
          const mrItem = mr.items.find((i) => i.materialName.toLowerCase() === poItem.materialName.toLowerCase());
          if (mrItem) {
            await db.materialRequestItem.update({
              where: { id: mrItem.id },
              data: { orderedQuantity: mrItem.orderedQuantity + poItem.quantity },
            });
          }
        }

        // Re-check MR overall ordering status
        const updatedMR = await db.materialRequest.findUnique({
          where: { id: mr.id },
          include: { items: true },
        });
        if (updatedMR) {
          const totalRequested = updatedMR.items.reduce((acc, i) => acc + i.requestedQuantity, 0);
          const totalOrdered = updatedMR.items.reduce((acc, i) => acc + i.orderedQuantity, 0);

          let newStatus = updatedMR.status;
          if (totalOrdered >= totalRequested) {
            newStatus = "ORDERED";
          } else if (totalOrdered > 0) {
            newStatus = "PARTIALLY_ORDERED";
          }

          if (newStatus !== updatedMR.status) {
            await db.materialRequest.update({
              where: { id: mr.id },
              data: { status: newStatus },
            });
          }
        }
      }
    }

    await AuditService.logEvent({
      userId,
      action: "PURCHASE_ORDER_CREATED",
      entityType: "PurchaseOrder",
      entityId: po.id,
      newValues: { referenceNo: po.referenceNo, vendorName: vendor.name, grandTotal: po.grandTotal },
    });

    await ActivityService.record({
      userId,
      entityType: "PurchaseOrder",
      entityId: po.id,
      type: "PROCUREMENT",
      title: `Purchase Order ${po.referenceNo} Created`,
      description: `Issued PO to ${vendor.name} for ₹${po.grandTotal.toLocaleString("en-IN")}.`,
    });

    return po;
  }

  public static async approvePurchaseOrder(id: string, userId: string) {
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, vendor: true, project: true },
    });
    if (!po) throw new NotFoundError("Purchase order record not found");

    if (po.status !== "DRAFT" && po.status !== "PENDING_APPROVAL") {
      throw new BusinessRuleError(`Purchase order ${po.referenceNo} is in ${po.status} status and cannot be approved.`);
    }

    if (po.vendor.status === "BLOCKED" || po.vendor.status === "INACTIVE") {
      throw new BusinessRuleError(`Cannot approve PO for ${po.vendor.status} vendor (${po.vendor.name}).`);
    }

    // Check Self-Approval Setting
    const setting = await db.setting.findUnique({ where: { key: "ALLOW_SELF_APPROVAL" } });
    const allowSelfApproval = setting?.value === "true";

    if (!allowSelfApproval && po.createdById === userId) {
      throw new BusinessRuleError("Self-approval policy violation: You cannot approve your own Purchase Order.");
    }

    const updated = await db.purchaseOrder.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: { items: true, vendor: true },
    });

    // Check Project Stage Transition Rule: "RAW_MATERIAL_ORDERED" stage progression
    if (po.projectId && po.project) {
      const currentStage = po.project.stage;
      if (
        currentStage === "ADVANCE_RECEIVED" ||
        currentStage === "2D_3D_DESIGN_APPROVED" ||
        currentStage === "CONFIRMATION_FEE_PAID" ||
        currentStage === "INITIATED"
      ) {
        await db.project.update({
          where: { id: po.projectId },
          data: { stage: "RAW_MATERIAL_ORDERED" },
        });

        await db.projectStageHistory.create({
          data: {
            projectId: po.projectId,
            fromStage: currentStage,
            toStage: "RAW_MATERIAL_ORDERED",
            changedById: userId,
            notes: `Stage automatically updated to RAW_MATERIAL_ORDERED upon approval of ${po.referenceNo}.`,
          },
        });
      }
    }

    await AuditService.logEvent({
      userId,
      action: "PURCHASE_ORDER_APPROVED",
      entityType: "PurchaseOrder",
      entityId: po.id,
      newValues: { referenceNo: po.referenceNo, approvedById: userId },
    });

    await ActivityService.record({
      userId,
      entityType: "PurchaseOrder",
      entityId: po.id,
      type: "STATUS_CHANGE",
      title: `Purchase Order ${po.referenceNo} Approved`,
      description: `Approved purchase order for ${po.vendor.name} (₹${po.grandTotal.toLocaleString("en-IN")}).`,
    });

    return updated;
  }

  public static async sendPurchaseOrder(id: string, userId: string) {
    const po = await db.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundError("Purchase order record not found");

    if (po.status !== "APPROVED") {
      throw new BusinessRuleError(`Purchase order ${po.referenceNo} must be APPROVED before sending to supplier.`);
    }

    const updated = await db.purchaseOrder.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await AuditService.logEvent({
      userId,
      action: "PURCHASE_ORDER_SENT",
      entityType: "PurchaseOrder",
      entityId: po.id,
      newValues: { referenceNo: po.referenceNo, sentAt: updated.sentAt },
    });

    return updated;
  }

  /**
   * CONTROLLED PO REVISION WORKFLOW
   * Increments PO revision number, captures historical snapshot, recalculates financials,
   * updates line items while protecting already-received quantities.
   */
  public static async revisePurchaseOrder(id: string, input: RevisePurchaseOrderInput, userId: string) {
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, vendor: true },
    });

    if (!po) throw new NotFoundError("Purchase order record not found");

    if (po.status === "CLOSED" || po.status === "CANCELLED") {
      throw new BusinessRuleError(`Cannot revise purchase order ${po.referenceNo} in ${po.status} status.`);
    }

    // Capture complete snapshot of current PO before revision
    const previousSnapshot = {
      revision: po.revision,
      status: po.status,
      grandTotal: po.grandTotal,
      subtotal: po.subtotal,
      tax: po.tax,
      discount: po.discount,
      shippingCharges: po.shippingCharges,
      items: po.items.map((i) => ({
        materialName: i.materialName,
        quantity: i.quantity,
        rate: i.rate,
        receivedQuantity: i.receivedQuantity,
        lineTotal: i.lineTotal,
      })),
    };

    // Calculate new totals
    const lineCalculations = input.items.map((item) =>
      ProcurementCalculationService.calculateLineTotal({
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        taxRate: item.taxRate,
      })
    );

    const totals = ProcurementCalculationService.calculatePOTotals({
      items: input.items.map((item) => ({
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        taxRate: item.taxRate,
      })),
      discount: input.discount ?? po.discount,
      tax: input.tax ?? po.tax,
      shippingCharges: input.shippingCharges ?? po.shippingCharges,
    });

    const nextRevision = po.revision + 1;

    const revisedPO = await db.$transaction(async (tx) => {
      // 1. Delete old items and insert revised items
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: po.id } });

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          revision: nextRevision,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          shippingCharges: totals.shippingCharges,
          grandTotal: totals.grandTotal,
          paymentTermsKey: input.paymentTermsKey || po.paymentTermsKey,
          expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : po.expectedDeliveryDate,
          notes: input.notes ? `${po.notes || ""}\n[Rev ${nextRevision}]: ${input.revisionReason}` : po.notes,
          status: "DRAFT", // Require re-approval after significant revision
          items: {
            create: input.items.map((item, idx) => ({
              materialName: item.materialName.trim(),
              description: item.description ? item.description.trim() : null,
              quantity: item.quantity,
              unitKey: item.unitKey || "NOS",
              rate: item.rate,
              discount: item.discount || 0,
              taxRate: item.taxRate || 0,
              lineTotal: lineCalculations[idx].lineTotal,
              receivedQuantity: 0,
              acceptedQuantity: 0,
              rejectedQuantity: 0,
              pendingQuantity: item.quantity,
              expectedDeliveryDate: item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate) : po.expectedDeliveryDate,
            })),
          },
        },
        include: { items: true, vendor: true },
      });

      return updated;
    });

    await AuditService.logEvent({
      userId,
      action: "PURCHASE_ORDER_REVISED",
      entityType: "PurchaseOrder",
      entityId: po.id,
      oldValues: previousSnapshot,
      newValues: {
        revision: nextRevision,
        grandTotal: revisedPO.grandTotal,
        reason: input.revisionReason,
      },
    });

    await ActivityService.record({
      userId,
      entityType: "PurchaseOrder",
      entityId: po.id,
      type: "PROCUREMENT",
      title: `Purchase Order ${po.referenceNo} Revised (Rev ${nextRevision})`,
      description: `Revision created: ${input.revisionReason}. Total: ₹${revisedPO.grandTotal.toLocaleString("en-IN")}.`,
    });

    return revisedPO;
  }

  public static async cancelPurchaseOrder(id: string, reason: string, userId: string) {
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundError("Purchase order record not found");

    if (po.status === "CLOSED" || po.status === "CANCELLED") {
      throw new BusinessRuleError(`Purchase order ${po.referenceNo} is already ${po.status}.`);
    }

    const updated = await db.purchaseOrder.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledReason: reason.trim(),
      },
    });

    // Revert Material Request ordered quantity if linked
    if (po.materialRequestId) {
      const mr = await db.materialRequest.findUnique({
        where: { id: po.materialRequestId },
        include: { items: true },
      });

      if (mr) {
        for (const item of po.items) {
          const mrItem = mr.items.find((i) => i.materialName.toLowerCase() === item.materialName.toLowerCase());
          if (mrItem) {
            await db.materialRequestItem.update({
              where: { id: mrItem.id },
              data: { orderedQuantity: Math.max(0, mrItem.orderedQuantity - item.quantity) },
            });
          }
        }
      }
    }

    await AuditService.logEvent({
      userId,
      action: "PURCHASE_ORDER_CANCELLED",
      entityType: "PurchaseOrder",
      entityId: po.id,
      newValues: { referenceNo: po.referenceNo, reason },
    });

    return updated;
  }

  public static async getPurchaseOrders(params: POFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.vendorId) where.vendorId = params.vendorId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.materialRequestId) where.materialRequestId = params.materialRequestId;
    if (params.status) where.status = params.status;

    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { vendor: { name: { contains: q } } },
        { notes: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      db.purchaseOrder.count({ where }),
      db.purchaseOrder.findMany({
        where,
        orderBy: { poDate: "desc" },
        skip,
        take: limit,
        include: {
          vendor: { select: { referenceNo: true, name: true, phone: true, categoryKey: true } },
          project: { select: { referenceNo: true, title: true } },
          items: true,
          receipts: { select: { referenceNo: true, receivedDate: true, status: true } },
        },
      }),
    ]);

    return {
      purchaseOrders: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getPurchaseOrderById(id: string) {
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        project: { select: { id: true, referenceNo: true, title: true, stage: true } },
        materialRequest: { select: { id: true, referenceNo: true, status: true } },
        items: true,
        receipts: {
          include: {
            items: true,
            receivedBy: { select: { fullName: true } },
          },
        },
      },
    });

    if (!po) throw new NotFoundError("Purchase order record not found");

    return po;
  }

  /**
   * FORMAL PURCHASE ORDER PDF DATA GENERATOR
   */
  public static async getPurchaseOrderPdfData(id: string) {
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        project: { select: { id: true, referenceNo: true, title: true, city: true, state: true } },
        items: true,
      },
    });

    if (!po) throw new NotFoundError("Purchase order record not found");

    const company = {
      name: "ESPACIO INTERIORS PRIVATE LIMITED",
      tagline: "Turnkey Architecture & Interior Execution",
      address: "Plot 14, Financial District, Gachibowli, Hyderabad, Telangana 500032",
      gstin: "36AAACE1234F1Z5",
      phone: "+91 40 2345 6789",
      email: "procurement@espacio.in",
      website: "https://espacio.in",
    };

    return {
      company,
      purchaseOrder: {
        id: po.id,
        poNumber: po.referenceNo,
        revision: po.revision,
        poDate: po.poDate,
        expectedDeliveryDate: po.expectedDeliveryDate,
        paymentTerms: po.paymentTermsKey,
        currency: po.currency,
        status: po.status,
        subtotal: po.subtotal,
        discount: po.discount,
        tax: po.tax,
        shippingCharges: po.shippingCharges,
        grandTotal: po.grandTotal,
        notes: po.notes,
      },
      vendor: {
        id: po.vendor.id,
        referenceNo: po.vendor.referenceNo,
        name: po.vendor.name,
        legalName: po.vendor.legalName,
        contactPerson: po.vendor.contactPerson,
        phone: po.vendor.phone,
        email: po.vendor.email,
        address: po.vendor.address,
        city: po.vendor.city,
        state: po.vendor.state,
        gstin: po.vendor.gstin,
      },
      project: po.project,
      items: po.items.map((i, idx) => ({
        sNo: idx + 1,
        materialName: i.materialName,
        description: i.description,
        quantity: i.quantity,
        unit: i.unitKey,
        rate: i.rate,
        discount: i.discount,
        taxRate: i.taxRate,
        lineTotal: i.lineTotal,
      })),
    };
  }
}
