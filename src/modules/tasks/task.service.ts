import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { NotificationEngine } from "../notifications/notification-engine";

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  type?:
    | "GENERAL"
    | "PROJECT"
    | "FOLLOW_UP"
    | "SITE_VISIT"
    | "DESIGN"
    | "PROCUREMENT"
    | "PRODUCTION"
    | "QUALITY_CHECK"
    | "HANDOVER"
    | "PAYMENT_FOLLOW_UP"
    | "ADMIN"
    | "APPROVAL"
    | "FINANCE"
    | "INVENTORY"
    | "CLIENT"
    | "INTERNAL";
  assigneeId?: string;
  createdById: string;
  projectId?: string;
  clientId?: string;
  leadId?: string;
  sourceType?: string;
  sourceId?: string;
  actionUrl?: string;
  startDate?: Date;
  dueAt?: Date;
  estimatedMinutes?: number;
  tags?: string[];
  parentTaskId?: string;
  checklists?: string[]; // Array of checklist item titles
  blockingTaskIds?: string[]; // Array of task IDs this task is blocked by
}

export interface GetTasksFilter {
  assigneeId?: string;
  createdById?: string;
  status?: string; // TODO, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED
  priority?: string;
  type?: string;
  projectId?: string;
  clientId?: string;
  leadId?: string;
  search?: string;
  isOverdue?: boolean;
  unassignedOnly?: boolean;
  page?: number;
  limit?: number;
}

export class TaskService {
  public static async createTask(input: CreateTaskInput) {
    let referenceNo: string;
    try {
      referenceNo = await IdGeneratorService.generate("TSK");
    } catch {
      const year = new Date().getFullYear();
      const count = await db.task.count();
      referenceNo = `TSK-${year}-${(count + 1).toString().padStart(4, "0")}`;
    }

    if (input.startDate && input.dueAt && input.dueAt < input.startDate) {
      throw new ValidationError("Task due date must be on or after start date");
    }

    const tagsJson = JSON.stringify(input.tags ?? []);
    const initialStatus = input.blockingTaskIds && input.blockingTaskIds.length > 0 ? "BLOCKED" : "TODO";

    const task = await db.task.create({
      data: {
        referenceNo,
        title: input.title,
        description: input.description ?? null,
        status: initialStatus,
        priority: input.priority ?? "NORMAL",
        type: input.type ?? "GENERAL",
        assigneeId: input.assigneeId ?? null,
        createdById: input.createdById,
        projectId: input.projectId ?? null,
        clientId: input.clientId ?? null,
        leadId: input.leadId ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        actionUrl: input.actionUrl ?? null,
        startDate: input.startDate ?? null,
        dueAt: input.dueAt ?? null,
        estimatedMinutes: input.estimatedMinutes ?? null,
        tags: tagsJson,
        parentTaskId: input.parentTaskId ?? null,
      },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
      },
    });

    // Create checklists if provided
    if (input.checklists && input.checklists.length > 0) {
      await db.taskChecklist.createMany({
        data: input.checklists.map((title) => ({
          taskId: task.id,
          title,
        })),
      });
    }

    // Create dependencies if provided
    if (input.blockingTaskIds && input.blockingTaskIds.length > 0) {
      await db.taskDependency.createMany({
        data: input.blockingTaskIds.map((blockingTaskId) => ({
          dependentTaskId: task.id,
          blockingTaskId,
        })),
      });
    }

    // Audit log
    await AuditService.logEvent({
      userId: input.createdById,
      action: "TASK_CREATED",
      entityType: "Task",
      entityId: task.id,
      newValues: { referenceNo: task.referenceNo, title: task.title, assigneeId: task.assigneeId },
    });

    // Notify assignee if assigned to another user
    if (task.assigneeId && task.assigneeId !== input.createdById) {
      await NotificationEngine.publishEvent({
        eventId: `evt_tsk_create_${task.id}`,
        eventType: "TASK_ASSIGNED",
        category: "TASKS",
        priority: task.priority as any,
        actorId: input.createdById,
        entityType: "Task",
        entityId: task.id,
        title: `Task Assigned: ${task.referenceNo}`,
        message: `You were assigned task "${task.title}".`,
        actionUrl: `/tasks?id=${task.id}`,
        targetUserId: task.assigneeId,
      });
    }

    return task;
  }

  public static async getTasks(filter: GetTasksFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.assigneeId) where.assigneeId = filter.assigneeId;
    if (filter.createdById) where.createdById = filter.createdById;
    if (filter.status && filter.status !== "ALL") where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.type) where.type = filter.type;
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.clientId) where.clientId = filter.clientId;
    if (filter.leadId) where.leadId = filter.leadId;

    if (filter.unassignedOnly) {
      where.assigneeId = null;
      if (!filter.status) {
        where.status = { notIn: ["COMPLETED", "CANCELLED"] };
      }
    }

    if (filter.isOverdue) {
      where.dueAt = { lt: new Date() };
      where.status = { notIn: ["COMPLETED", "CANCELLED"] };
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { title: { contains: q } },
        { description: { contains: q } },
        { tags: { contains: q } },
      ];
    }

    const [totalCount, rawTasks] = await Promise.all([
      db.task.count({ where }),
      db.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, fullName: true, email: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
          project: { select: { id: true, referenceNo: true, title: true } },
          client: { select: { id: true, referenceNo: true, fullName: true } },
          checklists: true,
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    const now = new Date();
    const tasks = rawTasks.map((t) => ({
      ...t,
      isOverdue:
        t.dueAt !== null &&
        new Date(t.dueAt) < now &&
        t.status !== "COMPLETED" &&
        t.status !== "CANCELLED",
    }));

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      tasks,
    };
  }

  public static async getTaskById(id: string) {
    const task = await db.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
        client: { select: { id: true, referenceNo: true, fullName: true } },
        lead: { select: { id: true, referenceNo: true, clientName: true } },
        checklists: { orderBy: { createdAt: "asc" } },
        subtasks: {
          include: { assignee: { select: { id: true, fullName: true } } },
        },
        dependencies: {
          include: { blockingTask: { select: { id: true, referenceNo: true, title: true, status: true } } },
        },
        blockedByTasks: {
          include: { dependentTask: { select: { id: true, referenceNo: true, title: true, status: true } } },
        },
      },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    return task;
  }

  public static async updateTaskStatus(id: string, status: string, actorId: string) {
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Task not found");
    }

    const isCompleted = status === "COMPLETED";
    const completedAt = isCompleted ? new Date() : null;

    const updated = await db.task.update({
      where: { id },
      data: {
        status,
        completedAt,
      },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Audit log
    await AuditService.logEvent({
      userId: actorId,
      action: "TASK_STATUS_CHANGED",
      entityType: "Task",
      entityId: id,
      newValues: { fromStatus: existing.status, toStatus: status },
    });

    // Dispatch notification
    if (isCompleted && updated.createdById !== actorId) {
      await NotificationEngine.publishEvent({
        eventId: `evt_tsk_comp_${id}`,
        eventType: "TASK_COMPLETED",
        category: "TASKS",
        actorId,
        entityType: "Task",
        entityId: id,
        title: `Task Completed: ${updated.referenceNo}`,
        message: `Task "${updated.title}" was completed.`,
        actionUrl: `/tasks?id=${id}`,
        targetUserId: updated.createdById,
      });
    }

    return updated;
  }

  public static async reassignTask(id: string, newAssigneeId: string, actorId: string) {
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Task not found");
    }

    const updated = await db.task.update({
      where: { id },
      data: { assigneeId: newAssigneeId },
      include: { assignee: { select: { id: true, fullName: true, email: true } } },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "TASK_REASSIGNED",
      entityType: "Task",
      entityId: id,
      newValues: { oldAssigneeId: existing.assigneeId, newAssigneeId },
    });

    if (newAssigneeId !== actorId) {
      await NotificationEngine.publishEvent({
        eventId: `evt_tsk_reassign_${id}_${Date.now()}`,
        eventType: "TASK_REASSIGNED",
        category: "TASKS",
        actorId,
        entityType: "Task",
        entityId: id,
        title: `Task Reassigned: ${updated.referenceNo}`,
        message: `Task "${updated.title}" was assigned to you.`,
        actionUrl: `/tasks?id=${id}`,
        targetUserId: newAssigneeId,
      });
    }

    return updated;
  }

  public static async addChecklistItem(taskId: string, title: string) {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError("Task not found");

    return db.taskChecklist.create({
      data: {
        taskId,
        title,
      },
    });
  }

  public static async toggleChecklistItem(checklistId: string, actorId: string) {
    const item = await db.taskChecklist.findUnique({ where: { id: checklistId } });
    if (!item) throw new NotFoundError("Checklist item not found");

    const nextState = !item.isCompleted;

    return db.taskChecklist.update({
      where: { id: checklistId },
      data: {
        isCompleted: nextState,
        completedById: nextState ? actorId : null,
        completedAt: nextState ? new Date() : null,
      },
    });
  }

  public static async getMyWorkSummary(userId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [dueToday, overdue, upcoming, blocked, recentlyCompleted] = await Promise.all([
      db.task.findMany({
        where: {
          assigneeId: userId,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueAt: { gte: startOfDay, lte: endOfDay },
        },
        include: { project: { select: { referenceNo: true, title: true } } },
        orderBy: { dueAt: "asc" },
      }),
      db.task.findMany({
        where: {
          assigneeId: userId,
          status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
          dueAt: { lt: startOfDay },
        },
        include: { project: { select: { referenceNo: true, title: true } } },
        orderBy: { dueAt: "asc" },
      }),
      db.task.findMany({
        where: {
          assigneeId: userId,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueAt: { gt: endOfDay, lte: next7Days },
        },
        include: { project: { select: { referenceNo: true, title: true } } },
        orderBy: { dueAt: "asc" },
      }),
      db.task.findMany({
        where: {
          assigneeId: userId,
          status: "BLOCKED",
        },
        include: { project: { select: { referenceNo: true, title: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      db.task.findMany({
        where: {
          assigneeId: userId,
          status: "COMPLETED",
        },
        include: { project: { select: { referenceNo: true, title: true } } },
        orderBy: { completedAt: "desc" },
        take: 10,
      }),
    ]);

    return {
      dueTodayCount: dueToday.length,
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
      blockedCount: blocked.length,
      dueToday,
      overdue,
      upcoming,
      blocked,
      recentlyCompleted,
    };
  }

  public static async updateTask(id: string, input: Partial<CreateTaskInput>, actorId: string) {
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Task not found");

    if (input.startDate && input.dueAt && input.dueAt < input.startDate) {
      throw new ValidationError("Task due date must be on or after start date");
    }

    const updated = await db.task.update({
      where: { id },
      data: {
        title: input.title ? input.title.trim() : undefined,
        description: input.description !== undefined ? input.description : undefined,
        priority: input.priority || undefined,
        type: input.type || undefined,
        assigneeId: input.assigneeId !== undefined ? input.assigneeId : undefined,
        projectId: input.projectId !== undefined ? input.projectId : undefined,
        clientId: input.clientId !== undefined ? input.clientId : undefined,
        leadId: input.leadId !== undefined ? input.leadId : undefined,
        startDate: input.startDate !== undefined ? input.startDate : undefined,
        dueAt: input.dueAt !== undefined ? input.dueAt : undefined,
        estimatedMinutes: input.estimatedMinutes !== undefined ? input.estimatedMinutes : undefined,
        tags: input.tags ? JSON.stringify(input.tags) : undefined,
      },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
      },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "TASK_UPDATED",
      entityType: "Task",
      entityId: id,
      newValues: { title: updated.title, priority: updated.priority },
    });

    return updated;
  }

  public static async blockTask(id: string, reason: string, actorId: string) {
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Task not found");

    const blockNote = `[BLOCKED on ${new Date().toISOString().slice(0, 10)}]: ${reason}`;
    const description = existing.description
      ? `${existing.description}\n\n${blockNote}`
      : blockNote;

    const updated = await db.task.update({
      where: { id },
      data: {
        status: "BLOCKED",
        description,
      },
      include: { assignee: { select: { id: true, fullName: true, email: true } } },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "TASK_BLOCKED",
      entityType: "Task",
      entityId: id,
      newValues: { reason, previousStatus: existing.status },
    });

    if (existing.assigneeId && existing.assigneeId !== actorId) {
      await NotificationEngine.publishEvent({
        eventId: `evt_tsk_blocked_${id}_${Date.now()}`,
        eventType: "TASK_BLOCKED",
        category: "TASKS",
        priority: "HIGH",
        actorId,
        entityType: "Task",
        entityId: id,
        title: `Task Blocked: ${updated.referenceNo}`,
        message: `Task "${updated.title}" was marked as BLOCKED: ${reason}`,
        actionUrl: `/tasks?id=${id}`,
        targetUserId: existing.assigneeId,
      });
    }

    return updated;
  }

  public static async unblockTask(id: string, actorId: string) {
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Task not found");

    const updated = await db.task.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
      },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "TASK_UNBLOCKED",
      entityType: "Task",
      entityId: id,
      newValues: { status: "IN_PROGRESS" },
    });

    return updated;
  }

  public static async reopenTask(id: string, reason: string, actorId: string) {
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Task not found");

    const reopenNote = `[REOPENED on ${new Date().toISOString().slice(0, 10)}]: ${reason}`;
    const description = existing.description
      ? `${existing.description}\n\n${reopenNote}`
      : reopenNote;

    const updated = await db.task.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        completedAt: null,
        description,
      },
      include: { assignee: { select: { id: true, fullName: true, email: true } } },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "TASK_REOPENED",
      entityType: "Task",
      entityId: id,
      newValues: { reason, previousStatus: existing.status },
    });

    if (existing.assigneeId && existing.assigneeId !== actorId) {
      await NotificationEngine.publishEvent({
        eventId: `evt_tsk_reopen_${id}_${Date.now()}`,
        eventType: "TASK_REOPENED",
        category: "TASKS",
        priority: "HIGH",
        actorId,
        entityType: "Task",
        entityId: id,
        title: `Task Reopened: ${updated.referenceNo}`,
        message: `Task "${updated.title}" was reopened: ${reason}`,
        actionUrl: `/tasks?id=${id}`,
        targetUserId: existing.assigneeId,
      });
    }

    return updated;
  }

  public static async deleteTask(id: string, actorId: string) {
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Task not found");

    // Soft delete/cancel to preserve audit & historical operational trace
    const cancelled = await db.task.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "TASK_CANCELLED",
      entityType: "Task",
      entityId: id,
      newValues: { referenceNo: existing.referenceNo, title: existing.title },
    });

    return cancelled;
  }

  /**
   * Idempotent Stage-Based Task Generation.
   * Generates standard workflow tasks when a project enters a stage (e.g. DESIGNING, QUALITY_CHECK, HANDOVER).
   * Checks if a task with the exact title already exists for that project before creating.
   */
  public static async generateStageTasks(projectId: string, stage: string, actorId: string) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, referenceNo: true, title: true, projectManagerId: true },
    });
    if (!project) throw new NotFoundError("Project not found");

    const stageTaskDefinitions: Record<string, { title: string; type: string; priority: "NORMAL" | "HIGH" | "URGENT"; checklists: string[] }[]> = {
      DESIGNING: [
        {
          title: "Prepare 2D & 3D Design Layouts",
          type: "DESIGN",
          priority: "HIGH",
          checklists: ["Verify site measurements", "Create 2D Floor Plan", "Prepare 3D Renderings"],
        },
        {
          title: "Internal Design & Engineering Review",
          type: "DESIGN",
          priority: "NORMAL",
          checklists: ["Structural feasibility check", "Material finish feasibility"],
        },
        {
          title: "Client Design Presentation & Approval",
          type: "DESIGN",
          priority: "HIGH",
          checklists: ["Present 3D renders to client", "Obtain client sign-off on design"],
        },
      ],
      MATERIAL_SELECTION: [
        {
          title: "Finalize Material & Finish Specifications",
          type: "PROJECT",
          priority: "HIGH",
          checklists: ["Confirm laminate shades", "Confirm hardware fittings (Hettich/Blum)", "Select edge banding color codes"],
        },
        {
          title: "Verify Vendor Pricing & Availability",
          type: "PROCUREMENT",
          priority: "NORMAL",
          checklists: ["Check stock with primary vendors", "Confirm lead times for specialized materials"],
        },
      ],
      PROCUREMENT: [
        {
          title: "Generate Purchase Requests & Orders",
          type: "PROCUREMENT",
          priority: "HIGH",
          checklists: ["Generate POs from BOQ requirement", "Obtain management PO approval", "Transmit POs to vendors"],
        },
        {
          title: "Track Goods Delivery & Site GRN",
          type: "PROCUREMENT",
          priority: "NORMAL",
          checklists: ["Follow up on delivery ETA", "Inspect physical goods on arrival", "Record Goods Receipt Note (GRN)"],
        },
      ],
      WOOD_WORK: [
        {
          title: "Carcass & Shutter Fabrication",
          type: "PRODUCTION",
          priority: "NORMAL",
          checklists: ["Cut plywood according to cutting list", "Apply edge-banding", "Assemble modular boxes"],
        },
        {
          title: "Hardware & Fitting Installation",
          type: "PRODUCTION",
          priority: "NORMAL",
          checklists: ["Install soft-close hinges", "Fit drawer tandem boxes", "Pre-drill handle locations"],
        },
      ],
      QUALITY_CHECK: [
        {
          title: "Dimensional Accuracy & Joinery Inspection",
          type: "QUALITY_CHECK",
          priority: "HIGH",
          checklists: ["Measure finished dimensions vs drawings", "Inspect joinery gaps and screws", "Verify edge-banding finish"],
        },
        {
          title: "Hardware Operation & Alignment Verification",
          type: "QUALITY_CHECK",
          priority: "HIGH",
          checklists: ["Test all door hinges and gaps", "Test drawer runner smoothness", "Check alignment of handles and locks"],
        },
      ],
      HANDOVER: [
        {
          title: "Prepare Final Handover Documentation",
          type: "HANDOVER",
          priority: "HIGH",
          checklists: ["Prepare warranty certificate", "Compile appliance user manuals", "Generate final statement of account"],
        },
        {
          title: "Conduct Client Walkthrough & Snag Resolution",
          type: "HANDOVER",
          priority: "URGENT",
          checklists: ["Perform joint site inspection with client", "Record snag list items (if any)", "Resolve all minor touch-ups"],
        },
        {
          title: "Sign Handover Certificate",
          type: "HANDOVER",
          priority: "HIGH",
          checklists: ["Obtain signed Handover Certificate", "Hand over all project keys and remotes"],
        },
      ],
    };

    const definitions = stageTaskDefinitions[stage];
    if (!definitions || definitions.length === 0) {
      return [];
    }

    const createdTasks = [];

    for (const def of definitions) {
      // Idempotency: Check if a task with the exact title already exists for this project
      const existing = await db.task.findFirst({
        where: {
          projectId,
          title: def.title,
        },
      });

      if (existing) {
        continue;
      }

      const task = await this.createTask({
        title: def.title,
        priority: def.priority,
        type: def.type as any,
        assigneeId: project.projectManagerId || undefined,
        createdById: actorId,
        projectId,
        checklists: def.checklists,
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7-day SLA
      });

      createdTasks.push(task);
    }

    return createdTasks;
  }

  public static async getUnassignedTasks(filter: { page?: number; limit?: number } = {}) {
    return this.getTasks({
      ...filter,
      unassignedOnly: true,
    });
  }

  public static async getTeamWorkSummary(managerUserId?: string) {
    const [totalTasks, openTasks, completedTasks, overdueTasks, unassignedTasks, blockedTasks] = await Promise.all([
      db.task.count(),
      db.task.count({ where: { status: { in: ["TODO", "IN_PROGRESS"] } } }),
      db.task.count({ where: { status: "COMPLETED" } }),
      db.task.count({ where: { dueAt: { lt: new Date() }, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } } }),
      db.task.count({ where: { assigneeId: null, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } } }),
      db.task.count({ where: { status: "BLOCKED" } }),
    ]);

    const tasksByPriority = await db.task.groupBy({
      by: ["priority"],
      where: { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
      _count: { id: true },
    });

    const tasksByType = await db.task.groupBy({
      by: ["type"],
      where: { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
      _count: { id: true },
    });

    return {
      totalTasks,
      openTasks,
      completedTasks,
      overdueTasks,
      unassignedTasks,
      blockedTasks,
      tasksByPriority: tasksByPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
      tasksByType: tasksByType.map((t) => ({ type: t.type, count: t._count.id })),
    };
  }

  /**
   * Automated Overdue Tasks Scanner.
   * Scans active tasks past due date and dispatches idempotent notifications.
   */
  public static async evaluateOverdueTasks(): Promise<number> {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const overdueTasks = await db.task.findMany({
      where: {
        dueAt: { lt: now },
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
        assigneeId: { not: null },
      },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
      },
    });

    let count = 0;
    for (const task of overdueTasks) {
      if (!task.assigneeId) continue;

      const res = await NotificationEngine.publishEvent({
        eventId: `evt_tsk_overdue_${task.id}_${todayStr}`,
        eventType: "TASK_OVERDUE",
        category: "TASKS",
        priority: "URGENT",
        actorId: task.createdById,
        entityType: "Task",
        entityId: task.id,
        title: `Task Overdue: ${task.referenceNo}`,
        message: `Task "${task.title}" is overdue (was due on ${task.dueAt?.toISOString().slice(0, 10)}).`,
        actionUrl: `/tasks?id=${task.id}`,
        targetUserId: task.assigneeId,
      });

      count += res.publishedCount;
    }

    return count;
  }

  public static async getTaskTemplates() {
    return db.taskTemplate.findMany({
      orderBy: { name: "asc" },
    });
  }

  public static async createTaskTemplate(name: string, type: string, description?: string, items?: any[]) {
    const templateItemsJson = JSON.stringify(items ?? []);
    return db.taskTemplate.create({
      data: {
        name,
        type,
        description: description ?? null,
        templateItemsJson,
      },
    });
  }

  public static async createTasksFromTemplate(templateId: string, projectId: string, createdById: string) {
    const template = await db.taskTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundError("Task template not found");

    let items: any[] = [];
    try {
      items = JSON.parse(template.templateItemsJson);
    } catch {
      items = [];
    }

    const createdTasks = [];
    for (const item of items) {
      const task = await this.createTask({
        title: item.title,
        description: item.description,
        priority: item.priority || "NORMAL",
        type: "PROJECT",
        createdById,
        projectId,
        estimatedMinutes: item.estimatedMinutes,
        checklists: item.checklists,
      });
      createdTasks.push(task);
    }

    return createdTasks;
  }
}
