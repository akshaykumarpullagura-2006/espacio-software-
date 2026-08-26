import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { CreateMaterialRequestInput } from "@/validators/procurement.schema";

export interface MaterialRequestFilterParams {
  projectId?: string;
  requesterId?: string;
  status?: string;
  priority?: string;
  purposeKey?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class MaterialRequestService {
  public static async createMaterialRequest(input: CreateMaterialRequestInput, userId: string) {
    const referenceNo = await IdGeneratorService.generate("MR");

    const req = await db.materialRequest.create({
      data: {
        referenceNo,
        requesterId: userId,
        projectId: input.projectId && input.projectId.trim() !== "" ? input.projectId : null,
        requiredDate: new Date(input.requiredDate),
        priority: input.priority || "MEDIUM",
        purposeKey: input.purposeKey || "PROJECT_EXECUTION",
        status: "DRAFT",
        notes: input.notes ? input.notes.trim() : null,
        createdById: userId,
        items: {
          create: input.items.map((item) => ({
            materialName: item.materialName.trim(),
            description: item.description ? item.description.trim() : null,
            requestedQuantity: item.requestedQuantity,
            approvedQuantity: 0,
            orderedQuantity: 0,
            receivedQuantity: 0,
            unitKey: item.unitKey || "NOS",
            estimatedRate: item.estimatedRate ?? null,
            notes: item.notes ? item.notes.trim() : null,
          })),
        },
      },
      include: { items: true },
    });

    await AuditService.logEvent({
      userId,
      action: "MATERIAL_REQUEST_CREATED",
      entityType: "MaterialRequest",
      entityId: req.id,
      newValues: { referenceNo: req.referenceNo, priority: req.priority, itemsCount: req.items.length },
    });

    await ActivityService.record({
      userId,
      entityType: "MaterialRequest",
      entityId: req.id,
      type: "PROCUREMENT",
      title: `Material Request ${req.referenceNo} Created`,
      description: `Created material request for ${req.items.length} items (${req.priority} priority).`,
    });

    return req;
  }

  public static async submitMaterialRequest(id: string, userId: string) {
    const mr = await db.materialRequest.findUnique({ where: { id } });
    if (!mr) throw new NotFoundError("Material request record not found");

    if (mr.status !== "DRAFT") {
      throw new BusinessRuleError(`Material request ${mr.referenceNo} is currently in ${mr.status} status and cannot be submitted.`);
    }

    const updated = await db.materialRequest.update({
      where: { id },
      data: { status: "SUBMITTED" },
      include: { items: true },
    });

    await AuditService.logEvent({
      userId,
      action: "MATERIAL_REQUEST_SUBMITTED",
      entityType: "MaterialRequest",
      entityId: updated.id,
      newValues: { referenceNo: updated.referenceNo, status: "SUBMITTED" },
    });

    await ActivityService.record({
      userId,
      entityType: "MaterialRequest",
      entityId: updated.id,
      type: "STATUS_CHANGE",
      title: `Material Request ${updated.referenceNo} Submitted`,
      description: `Submitted for procurement approval.`,
    });

    return updated;
  }

  public static async approveMaterialRequest(id: string, userId: string) {
    const mr = await db.materialRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!mr) throw new NotFoundError("Material request record not found");

    if (mr.status !== "SUBMITTED" && mr.status !== "DRAFT" && mr.status !== "UNDER_REVIEW") {
      throw new BusinessRuleError(`Material request ${mr.referenceNo} cannot be approved from ${mr.status} status.`);
    }

    // Check Self-Approval Setting
    const setting = await db.setting.findUnique({ where: { key: "ALLOW_SELF_APPROVAL" } });
    const allowSelfApproval = setting?.value === "true";

    if (!allowSelfApproval && mr.requesterId === userId) {
      throw new BusinessRuleError("Self-approval policy violation: You cannot approve your own Material Request.");
    }

    // Update items approvedQuantity = requestedQuantity
    await db.$transaction([
      ...mr.items.map((item) =>
        db.materialRequestItem.update({
          where: { id: item.id },
          data: { approvedQuantity: item.requestedQuantity },
        })
      ),
      db.materialRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: userId,
          approvedAt: new Date(),
        },
      }),
    ]);

    const approved = await db.materialRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    await AuditService.logEvent({
      userId,
      action: "MATERIAL_REQUEST_APPROVED",
      entityType: "MaterialRequest",
      entityId: id,
      newValues: { referenceNo: mr.referenceNo, approvedById: userId },
    });

    await ActivityService.record({
      userId,
      entityType: "MaterialRequest",
      entityId: id,
      type: "STATUS_CHANGE",
      title: `Material Request ${mr.referenceNo} Approved`,
      description: `Approved for vendor PO generation.`,
    });

    return approved;
  }

  public static async rejectMaterialRequest(id: string, reason: string, userId: string) {
    const mr = await db.materialRequest.findUnique({ where: { id } });
    if (!mr) throw new NotFoundError("Material request record not found");

    const updated = await db.materialRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason.trim(),
      },
    });

    await AuditService.logEvent({
      userId,
      action: "MATERIAL_REQUEST_REJECTED",
      entityType: "MaterialRequest",
      entityId: id,
      newValues: { referenceNo: mr.referenceNo, reason },
    });

    return updated;
  }

  public static async getMaterialRequests(params: MaterialRequestFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.projectId) where.projectId = params.projectId;
    if (params.requesterId) where.requesterId = params.requesterId;
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;
    if (params.purposeKey) where.purposeKey = params.purposeKey;

    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { notes: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      db.materialRequest.count({ where }),
      db.materialRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          requester: { select: { fullName: true, email: true } },
          project: { select: { referenceNo: true, title: true } },
          items: true,
        },
      }),
    ]);

    return {
      materialRequests: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getMaterialRequestById(id: string) {
    const mr = await db.materialRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, fullName: true, email: true, phone: true } },
        project: { select: { id: true, referenceNo: true, title: true, stage: true } },
        items: true,
        pos: {
          select: { id: true, referenceNo: true, grandTotal: true, status: true, vendor: { select: { name: true } } },
        },
      },
    });

    if (!mr) throw new NotFoundError("Material request record not found");

    return mr;
  }
}
