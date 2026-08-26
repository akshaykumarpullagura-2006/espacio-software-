import { db } from "@/lib/db";
import { BusinessRuleError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { RbacService } from "../rbac/rbac.service";
import { VendorPerformanceService } from "./vendor-performance.service";
import {
  CreateVendorInput,
  UpdateVendorInput,
  AddVendorContactInput,
  LogVendorRatingInput,
  BlockVendorInput,
  DetectDuplicateVendorInput,
  UpdateVendorBankInput,
  DeactivateVendorInput,
} from "@/validators/vendor.schema";

export interface VendorFilterParams {
  categoryKey?: string;
  status?: string;
  city?: string;
  paymentTermsKey?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class VendorService {
  /**
   * DUPLICATE VENDOR DETECTION
   * Checks for potential matches by GSTIN, phone, email, or company name before creation.
   */
  public static async detectDuplicates(input: DetectDuplicateVendorInput) {
    const conditions: Array<Record<string, unknown>> = [];
    if (input.phone && input.phone.trim() !== "") {
      conditions.push({ phone: input.phone.trim() });
    }
    if (input.gstin && input.gstin.trim() !== "") {
      conditions.push({ gstin: input.gstin.trim() });
    }
    if (input.email && input.email.trim() !== "") {
      conditions.push({ email: input.email.trim() });
    }
    if (input.name && input.name.trim() !== "") {
      const name = input.name.trim();
      conditions.push({ name: { contains: name } });
      conditions.push({ legalName: { contains: name } });
    }

    if (conditions.length === 0) return [];

    const duplicates = await db.vendor.findMany({
      where: { OR: conditions },
      select: {
        id: true,
        referenceNo: true,
        name: true,
        legalName: true,
        phone: true,
        email: true,
        gstin: true,
        categoryKey: true,
        status: true,
      },
      take: 10,
    });

    return duplicates.map((d) => {
      const matchReasons: string[] = [];
      if (input.phone && d.phone === input.phone.trim()) matchReasons.push("Exact Phone match");
      if (input.gstin && d.gstin && d.gstin.toLowerCase() === input.gstin.trim().toLowerCase()) matchReasons.push("Exact GSTIN match");
      if (input.email && d.email && d.email.toLowerCase() === input.email.trim().toLowerCase()) matchReasons.push("Exact Email match");
      if (input.name && d.name.toLowerCase().includes(input.name.trim().toLowerCase())) matchReasons.push("Similar Vendor Name");

      return {
        ...d,
        matchReasons,
      };
    });
  }

  public static async createVendor(input: CreateVendorInput, userId?: string) {
    // Check for potential duplicate phone or GSTIN
    const existing = await db.vendor.findFirst({
      where: {
        OR: [
          { phone: input.phone.trim() },
          ...(input.gstin && input.gstin.trim() !== "" ? [{ gstin: input.gstin.trim() }] : []),
        ],
      },
    });

    if (existing) {
      throw new BusinessRuleError(
        `A vendor with phone ${input.phone} or GSTIN ${input.gstin} already exists (${existing.referenceNo} - ${existing.name}).`
      );
    }

    const referenceNo = await IdGeneratorService.generate("VEN");

    const vendor = await db.vendor.create({
      data: {
        referenceNo,
        name: input.name.trim(),
        legalName: input.legalName ? input.legalName.trim() : null,
        categoryKey: input.categoryKey,
        contactPerson: input.contactPerson ? input.contactPerson.trim() : null,
        phone: input.phone.trim(),
        email: input.email ? input.email.trim() : null,
        website: input.website ? input.website.trim() : null,
        address: input.address ? input.address.trim() : null,
        city: input.city ? input.city.trim() : null,
        state: input.state ? input.state.trim() : null,
        postalCode: input.postalCode ? input.postalCode.trim() : null,
        gstin: input.gstin ? input.gstin.trim() : null,
        pan: input.pan ? input.pan.trim() : null,
        paymentTermsKey: input.paymentTermsKey || "DAYS_30",
        creditLimit: input.creditLimit ?? 0,
        notes: input.notes ? input.notes.trim() : null,
        bankName: input.bankName ? input.bankName.trim() : null,
        bankAccountNo: input.bankAccountNo ? input.bankAccountNo.trim() : null,
        bankIfsc: input.bankIfsc ? input.bankIfsc.trim().toUpperCase() : null,
        status: "ACTIVE",
        createdById: userId ?? null,
      },
    });

    // Seed primary contact if contactPerson or phone provided
    if (input.contactPerson || input.phone) {
      await db.vendorContact.create({
        data: {
          vendorId: vendor.id,
          name: input.contactPerson || input.name,
          designation: "Primary Contact",
          phone: input.phone,
          email: input.email || null,
          isPrimary: true,
        },
      });
    }

    await AuditService.logEvent({
      userId,
      action: "VENDOR_CREATED",
      entityType: "Vendor",
      entityId: vendor.id,
      newValues: { referenceNo: vendor.referenceNo, name: vendor.name, categoryKey: vendor.categoryKey },
    });

    await ActivityService.record({
      userId,
      entityType: "Vendor",
      entityId: vendor.id,
      type: "VENDOR",
      title: `Vendor ${vendor.referenceNo} Registered`,
      description: `Registered supplier ${vendor.name} (${vendor.categoryKey}) with ${vendor.paymentTermsKey} terms.`,
    });

    return vendor;
  }

  public static async updateVendor(id: string, input: UpdateVendorInput, userId?: string) {
    const vendor = await db.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundError("Vendor record not found");

    const updated = await db.vendor.update({
      where: { id },
      data: {
        name: input.name ? input.name.trim() : undefined,
        legalName: input.legalName !== undefined ? input.legalName : undefined,
        categoryKey: input.categoryKey || undefined,
        contactPerson: input.contactPerson !== undefined ? input.contactPerson : undefined,
        phone: input.phone ? input.phone.trim() : undefined,
        email: input.email !== undefined ? input.email : undefined,
        website: input.website !== undefined ? input.website : undefined,
        address: input.address !== undefined ? input.address : undefined,
        city: input.city !== undefined ? input.city : undefined,
        state: input.state !== undefined ? input.state : undefined,
        postalCode: input.postalCode !== undefined ? input.postalCode : undefined,
        gstin: input.gstin !== undefined ? input.gstin : undefined,
        pan: input.pan !== undefined ? input.pan : undefined,
        paymentTermsKey: input.paymentTermsKey || undefined,
        creditLimit: input.creditLimit !== undefined ? input.creditLimit : undefined,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "VENDOR_UPDATED",
      entityType: "Vendor",
      entityId: updated.id,
      oldValues: { name: vendor.name, phone: vendor.phone },
      newValues: { name: updated.name, phone: updated.phone },
    });

    return updated;
  }

  public static async updateBankDetails(id: string, input: UpdateVendorBankInput, userId?: string) {
    const vendor = await db.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundError("Vendor record not found");

    if (userId) {
      const hasBankEdit = await RbacService.hasPermission(userId, "vendors:bank_details:edit");
      const isSuper = await RbacService.isUserSuperAdmin(userId);
      if (!hasBankEdit && !isSuper) {
        throw new ForbiddenError("Insufficient permissions to update vendor bank details");
      }
    }

    const mask = (acc?: string | null) => {
      if (!acc) return "N/A";
      if (acc.length <= 4) return "****";
      return "****" + acc.slice(-4);
    };

    const oldMasked = mask(vendor.bankAccountNo);
    const newMasked = mask(input.bankAccountNo);

    const updated = await db.vendor.update({
      where: { id },
      data: {
        bankName: input.bankName.trim(),
        bankAccountNo: input.bankAccountNo.trim(),
        bankIfsc: input.bankIfsc.trim().toUpperCase(),
      },
    });

    await AuditService.logEvent({
      userId,
      action: "VENDOR_BANK_CHANGED",
      entityType: "Vendor",
      entityId: updated.id,
      oldValues: { bankName: vendor.bankName, accountMasked: oldMasked },
      newValues: { bankName: updated.bankName, accountMasked: newMasked, reason: input.changeReason },
    });

    await ActivityService.record({
      userId,
      entityType: "Vendor",
      entityId: updated.id,
      type: "FINANCE",
      title: `Vendor ${updated.referenceNo} Bank Details Updated`,
      description: `Bank account updated (${updated.bankName}, Account: ${newMasked}). Reason: ${input.changeReason}`,
    });

    return updated;
  }

  public static async blockVendor(id: string, input: BlockVendorInput, userId?: string) {
    const vendor = await db.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundError("Vendor record not found");

    const updated = await db.vendor.update({
      where: { id },
      data: {
        status: "BLOCKED",
        blockedReason: input.reason.trim(),
      },
    });

    await AuditService.logEvent({
      userId,
      action: "VENDOR_BLOCKED",
      entityType: "Vendor",
      entityId: updated.id,
      newValues: { referenceNo: updated.referenceNo, reason: input.reason },
    });

    await ActivityService.record({
      userId,
      entityType: "Vendor",
      entityId: updated.id,
      type: "STATUS_CHANGE",
      title: `Vendor ${updated.referenceNo} Blocked`,
      description: `Blocked from procurement due to: ${input.reason}`,
    });

    return updated;
  }

  public static async deactivateVendor(id: string, input: DeactivateVendorInput, userId?: string) {
    const vendor = await db.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundError("Vendor record not found");

    const updated = await db.vendor.update({
      where: { id },
      data: {
        status: "INACTIVE",
        notes: vendor.notes ? `${vendor.notes}\n[Deactivated]: ${input.reason}` : `[Deactivated]: ${input.reason}`,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "VENDOR_DEACTIVATED",
      entityType: "Vendor",
      entityId: updated.id,
      newValues: { referenceNo: updated.referenceNo, reason: input.reason },
    });

    await ActivityService.record({
      userId,
      entityType: "Vendor",
      entityId: updated.id,
      type: "STATUS_CHANGE",
      title: `Vendor ${updated.referenceNo} Deactivated`,
      description: `Deactivated with reason: ${input.reason}`,
    });

    return updated;
  }

  public static async addContact(input: AddVendorContactInput, userId?: string) {
    const vendor = await db.vendor.findUnique({ where: { id: input.vendorId } });
    if (!vendor) throw new NotFoundError("Vendor record not found");

    if (input.isPrimary) {
      // Unset existing primary contacts
      await db.vendorContact.updateMany({
        where: { vendorId: input.vendorId },
        data: { isPrimary: false },
      });
    }

    const contact = await db.vendorContact.create({
      data: {
        vendorId: input.vendorId,
        name: input.name.trim(),
        designation: input.designation ? input.designation.trim() : null,
        phone: input.phone.trim(),
        alternatePhone: input.alternatePhone ? input.alternatePhone.trim() : null,
        email: input.email ? input.email.trim() : null,
        isPrimary: input.isPrimary,
        notes: input.notes ? input.notes.trim() : null,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "VENDOR_CONTACT_CREATED",
      entityType: "VendorContact",
      entityId: contact.id,
      newValues: { vendorId: vendor.id, name: contact.name, isPrimary: contact.isPrimary },
    });

    return contact;
  }

  public static async logRating(input: LogVendorRatingInput, userId?: string) {
    const vendor = await db.vendor.findUnique({ where: { id: input.vendorId } });
    if (!vendor) throw new NotFoundError("Vendor record not found");

    const rating = await db.vendorRating.create({
      data: {
        vendorId: input.vendorId,
        qualityRating: input.qualityRating,
        deliveryRating: input.deliveryRating ?? input.qualityRating,
        purchaseOrderRef: input.purchaseOrderRef || null,
        notes: input.notes || null,
        reviewerId: userId ?? null,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "VENDOR_RATED",
      entityType: "VendorRating",
      entityId: rating.id,
      newValues: { vendorId: vendor.id, qualityRating: rating.qualityRating },
    });

    return rating;
  }

  public static async getVendors(params: VendorFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.categoryKey) where.categoryKey = params.categoryKey;
    if (params.status) where.status = params.status;
    if (params.city) where.city = params.city;
    if (params.paymentTermsKey) where.paymentTermsKey = params.paymentTermsKey;

    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { name: { contains: q } },
        { legalName: { contains: q } },
        { contactPerson: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { gstin: { contains: q } },
      ];
    }

    const [total, vendors] = await Promise.all([
      db.vendor.count({ where }),
      db.vendor.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
          ratings: { select: { qualityRating: true } },
          pos: { select: { grandTotal: true, status: true } },
          expenses: { where: { status: { in: ["APPROVED", "PAID"] } }, select: { amount: true } },
          vendorPayables: {
            where: { status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
            select: { outstandingAmount: true },
          },
        },
      }),
    ]);

    const items = vendors.map((v) => {
      let totalPurchases = 0;
      for (const po of v.pos) {
        if (po.status !== "CANCELLED") totalPurchases += po.grandTotal;
      }
      for (const exp of v.expenses) {
        totalPurchases += exp.amount;
      }
      totalPurchases = VendorPerformanceService.roundCurrency(totalPurchases);

      let qualityRating = 4.5;
      if (v.ratings.length > 0) {
        const qSum = v.ratings.reduce((acc, r) => acc + r.qualityRating, 0);
        qualityRating = VendorPerformanceService.roundCurrency(qSum / v.ratings.length);
      }

      // Canonical outstanding from vendorPayables
      let totalOutstanding = 0;
      for (const payable of v.vendorPayables) {
        totalOutstanding += payable.outstandingAmount;
      }
      totalOutstanding = VendorPerformanceService.roundCurrency(totalOutstanding);

      const primaryContact = v.contacts[0] || null;

      return {
        ...v,
        totalPurchases,
        totalOutstanding,
        qualityRating,
        primaryContact,
      };
    });

    return {
      vendors: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getVendorById(id: string, actorId?: string) {
    const vendor = await db.vendor.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { isPrimary: "desc" } },
        ratings: { orderBy: { createdAt: "desc" } },
        pos: { orderBy: { createdAt: "desc" } },
        expenses: { where: { status: { in: ["APPROVED", "PAID"] } }, orderBy: { expenseDate: "desc" } },
        vendorPayables: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!vendor) throw new NotFoundError("Vendor record not found");

    const metrics = await VendorPerformanceService.calculateVendorMetrics(vendor.id);

    // Bank masking check
    let canViewBank = false;
    if (actorId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasBankPerm = await RbacService.hasPermission(actorId, "vendors:bank_details:view");
      canViewBank = isSuper || hasBankPerm;
    }

    return {
      ...vendor,
      bankAccountNo: canViewBank ? vendor.bankAccountNo : (vendor.bankAccountNo ? `****${vendor.bankAccountNo.slice(-4)}` : null),
      bankIfsc: canViewBank ? vendor.bankIfsc : (vendor.bankIfsc ? `${vendor.bankIfsc.slice(0, 4)}****` : null),
      metrics,
    };
  }

  /**
   * VENDOR 360° PROFILE AGGREGATION
   */
  public static async getVendor360(id: string, actorId?: string) {
    const vendor = await db.vendor.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { isPrimary: "desc" } },
        ratings: { orderBy: { createdAt: "desc" } },
        pos: {
          orderBy: { poDate: "desc" },
          include: {
            items: true,
            project: { select: { id: true, referenceNo: true, title: true } },
          },
        },
        goodsReceipts: {
          orderBy: { receivedDate: "desc" },
          include: {
            purchaseOrder: { select: { id: true, referenceNo: true } },
            project: { select: { id: true, referenceNo: true, title: true } },
            items: { include: { purchaseOrderItem: { select: { materialName: true, unitKey: true } } } },
          },
        },
        vendorPayables: {
          orderBy: { createdAt: "desc" },
        },
        vendorPayments: {
          orderBy: { paymentDate: "desc" },
          include: {
            financialAccount: { select: { id: true, name: true, accountCode: true } },
          },
        },
        vendorMaterials: {
          include: { material: true },
        },
        expenses: {
          where: { status: { in: ["APPROVED", "PAID"] } },
          orderBy: { expenseDate: "desc" },
        },
      },
    });

    if (!vendor) throw new NotFoundError("Vendor record not found");

    const metrics = await VendorPerformanceService.calculateVendorMetrics(vendor.id);

    // Canonical financials
    let totalPurchases = 0;
    for (const po of vendor.pos) {
      if (po.status !== "CANCELLED") totalPurchases += po.grandTotal;
    }
    for (const exp of vendor.expenses) {
      totalPurchases += exp.amount;
    }
    totalPurchases = VendorPerformanceService.roundCurrency(totalPurchases);

    let totalPaid = 0;
    for (const pay of vendor.vendorPayments) {
      if (pay.status === "VERIFIED") totalPaid += pay.amount;
    }
    totalPaid = VendorPerformanceService.roundCurrency(totalPaid);

    let totalOutstanding = 0;
    for (const payable of vendor.vendorPayables) {
      if (payable.status !== "PAID" && payable.status !== "CANCELLED") {
        totalOutstanding += payable.outstandingAmount;
      }
    }
    totalOutstanding = VendorPerformanceService.roundCurrency(totalOutstanding);

    // Unique Projects Supplied
    const projectMap = new Map<string, { id: string; referenceNo: string; title: string; poCount: number; totalValue: number }>();
    for (const po of vendor.pos) {
      if (po.project) {
        const existing = projectMap.get(po.project.id) || {
          id: po.project.id,
          referenceNo: po.project.referenceNo,
          title: po.project.title,
          poCount: 0,
          totalValue: 0,
        };
        existing.poCount += 1;
        if (po.status !== "CANCELLED") existing.totalValue += po.grandTotal;
        projectMap.set(po.project.id, existing);
      }
    }
    const projectsSupplied = Array.from(projectMap.values());

    // Materials Supplied
    const materialMap = new Map<string, { name: string; totalOrdered: number; totalReceived: number; unitKey: string }>();
    for (const po of vendor.pos) {
      for (const item of po.items) {
        const key = item.materialName.toLowerCase();
        const existing = materialMap.get(key) || {
          name: item.materialName,
          totalOrdered: 0,
          totalReceived: 0,
          unitKey: item.unitKey,
        };
        existing.totalOrdered += item.quantity;
        existing.totalReceived += item.receivedQuantity;
        materialMap.set(key, existing);
      }
    }
    const materialsSupplied = Array.from(materialMap.values());

    // Check bank view permissions
    let canViewBank = false;
    if (actorId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasBankPerm = await RbacService.hasPermission(actorId, "vendors:bank_details:view");
      canViewBank = isSuper || hasBankPerm;
    }

    const maskedBank = {
      bankName: vendor.bankName,
      bankAccountNo: canViewBank ? vendor.bankAccountNo : (vendor.bankAccountNo ? `****${vendor.bankAccountNo.slice(-4)}` : null),
      bankIfsc: canViewBank ? vendor.bankIfsc : (vendor.bankIfsc ? `${vendor.bankIfsc.slice(0, 4)}****` : null),
      isMasked: !canViewBank,
    };

    return {
      ...vendor,
      bankDetails: maskedBank,
      bankAccountNo: maskedBank.bankAccountNo,
      bankIfsc: maskedBank.bankIfsc,
      summary: {
        totalPurchases,
        totalPaid,
        totalOutstanding,
        ordersCount: vendor.pos.length,
        receiptsCount: vendor.goodsReceipts.length,
        payablesCount: vendor.vendorPayables.length,
        paymentsCount: vendor.vendorPayments.length,
      },
      metrics,
      projectsSupplied,
      materialsSupplied,
    };
  }
}
