import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { CreateChangeOrderInput } from "@/validators/project.schema";

export class ChangeOrderService {
  /**
   * Create a new scope change order for a project
   */
  public static async createChangeOrder(projectId: string, input: CreateChangeOrderInput, userId?: string) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError("Project record not found");

    let referenceNo: string;
    try {
      referenceNo = await IdGeneratorService.generate("CO");
    } catch {
      referenceNo = `CO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const amount = input.additionalCost !== undefined ? input.additionalCost : (input.amount || 0);

    const changeOrder = await db.changeOrder.create({
      data: {
        referenceNo,
        projectId,
        title: input.title || "Scope Change Order",
        description: input.description,
        amount,
        status: "PENDING",
        scopeImpact: input.scopeImpact || null,
        timelineImpactDays: input.timelineImpactDays || 0,
        requestedById: userId ?? null,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "PROJECT_CHANGE_ORDER_CREATED",
      entityType: "Project",
      entityId: projectId,
      newValues: { referenceNo, amount, title: changeOrder.title },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: projectId,
      type: "CHANGE_ORDER",
      title: `Change Order Raised: ${referenceNo} (₹${amount.toLocaleString()})`,
      description: input.description,
    });

    return changeOrder;
  }

  /**
   * Approve a change order and atomically update project revised budget
   */
  public static async approveChangeOrder(changeOrderId: string, userId?: string) {
    const co = await db.changeOrder.findUnique({
      where: { id: changeOrderId },
      include: { project: true },
    });
    if (!co) throw new NotFoundError("Change Order not found");
    if (co.status === "APPROVED") throw new BusinessRuleError("Change Order is already approved");

    const currentRevised = co.project.revisedBudget || co.project.contractValue || 0;
    const newBudget = currentRevised + co.amount;

    const [updatedCo] = await db.$transaction([
      db.changeOrder.update({
        where: { id: changeOrderId },
        data: {
          status: "APPROVED",
          approvedById: userId ?? null,
          approvedAt: new Date(),
        },
      }),
      db.project.update({
        where: { id: co.projectId },
        data: { revisedBudget: newBudget },
      }),
    ]);

    await AuditService.logEvent({
      userId,
      action: "PROJECT_CHANGE_ORDER_APPROVED",
      entityType: "Project",
      entityId: co.projectId,
      newValues: { changeOrderId, referenceNo: co.referenceNo, newBudget, amount: co.amount },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: co.projectId,
      type: "CHANGE_ORDER",
      title: `Change Order Approved: ${co.referenceNo}`,
      description: `Revised project budget adjusted to ₹${newBudget.toLocaleString()} (+₹${co.amount.toLocaleString()}).`,
    });

    return updatedCo;
  }

  /**
   * Reject a change order
   */
  public static async rejectChangeOrder(changeOrderId: string, reason?: string, userId?: string) {
    const co = await db.changeOrder.findUnique({ where: { id: changeOrderId } });
    if (!co) throw new NotFoundError("Change Order not found");
    if (co.status === "APPROVED") throw new BusinessRuleError("Cannot reject an already approved change order");

    const updated = await db.changeOrder.update({
      where: { id: changeOrderId },
      data: {
        status: "REJECTED",
        description: reason ? `${co.description}\nRejection Reason: ${reason}` : co.description,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "PROJECT_CHANGE_ORDER_REJECTED",
      entityType: "Project",
      entityId: co.projectId,
      newValues: { changeOrderId, referenceNo: co.referenceNo, reason },
    });

    return updated;
  }
}
