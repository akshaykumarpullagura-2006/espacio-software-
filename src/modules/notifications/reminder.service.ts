import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";

export interface CreateReminderInput {
  userId: string;
  title: string;
  description?: string;
  dueAt: Date;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  createdById?: string;
}

export interface GetRemindersFilter {
  userId: string;
  status?: string; // PENDING, COMPLETED, DISMISSED, OVERDUE, CANCELLED
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ReminderService {
  public static async createReminder(input: CreateReminderInput) {
    let referenceNo: string;
    try {
      referenceNo = await IdGeneratorService.generate("REM");
    } catch {
      const year = new Date().getFullYear();
      const count = await db.reminder.count();
      referenceNo = `REM-${year}-${(count + 1).toString().padStart(4, "0")}`;
    }

    return db.reminder.create({
      data: {
        referenceNo,
        userId: input.userId,
        title: input.title,
        description: input.description ?? null,
        dueAt: input.dueAt,
        priority: input.priority ?? "NORMAL",
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        actionUrl: input.actionUrl ?? null,
        status: "PENDING",
        createdById: input.createdById ?? input.userId,
      },
    });
  }

  public static async getUserReminders(filter: GetRemindersFilter) {
    // Background evaluator: auto-mark pending reminders overdue if past dueAt and not snoozed
    const now = new Date();
    await db.reminder.updateMany({
      where: {
        userId: filter.userId,
        status: "PENDING",
        dueAt: { lt: now },
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lt: now } },
        ],
      },
      data: { status: "OVERDUE" },
    });

    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { userId: filter.userId };

    if (filter.status && filter.status !== "ALL") {
      where.status = filter.status;
    }

    if (filter.priority) {
      where.priority = filter.priority;
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { title: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const [totalCount, overdueCount, reminders] = await Promise.all([
      db.reminder.count({ where }),
      db.reminder.count({ where: { userId: filter.userId, status: "OVERDUE" } }),
      db.reminder.findMany({
        where,
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      totalCount,
      overdueCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      reminders,
    };
  }

  public static async completeReminder(reminderId: string, userId: string) {
    const existing = await db.reminder.findFirst({
      where: { id: reminderId, userId },
    });

    if (!existing) {
      throw new NotFoundError("Reminder not found");
    }

    return db.reminder.update({
      where: { id: reminderId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  public static async dismissReminder(reminderId: string, userId: string) {
    const existing = await db.reminder.findFirst({
      where: { id: reminderId, userId },
    });

    if (!existing) {
      throw new NotFoundError("Reminder not found");
    }

    return db.reminder.update({
      where: { id: reminderId },
      data: {
        status: "DISMISSED",
        dismissedAt: new Date(),
      },
    });
  }

  public static async snoozeReminder(reminderId: string, userId: string, snoozedUntil: Date) {
    const existing = await db.reminder.findFirst({
      where: { id: reminderId, userId },
    });

    if (!existing) {
      throw new NotFoundError("Reminder not found");
    }

    // Snoozing updates personal reminder timing; leaves source entity business deadlines intact
    return db.reminder.update({
      where: { id: reminderId },
      data: {
        snoozedUntil,
        status: "PENDING", // reset from OVERDUE back to PENDING while snoozed
      },
    });
  }
}
