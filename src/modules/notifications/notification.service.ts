import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export interface CreateNotificationParams {
  userId: string;
  type: string;
  category?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  eventId?: string;
  actorId?: string;
  expiresAt?: Date;
}

export interface GetNotificationsFilter {
  userId: string;
  category?: string;
  priority?: string;
  isRead?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class NotificationService {
  public static async create(params: CreateNotificationParams) {
    if (params.eventId) {
      const existing = await db.notification.findFirst({
        where: {
          userId: params.userId,
          eventId: params.eventId,
        },
      });
      if (existing) {
        return existing;
      }
    }

    return db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        category: params.category ?? "SYSTEM",
        priority: params.priority ?? "NORMAL",
        title: params.title,
        message: params.message,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        actionUrl: params.actionUrl ?? null,
        eventId: params.eventId ?? null,
        actorId: params.actorId ?? null,
        expiresAt: params.expiresAt ?? null,
      },
    });
  }

  public static async notifyAdmins(params: Omit<CreateNotificationParams, "userId">) {
    const adminUsers = await db.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { accessLevel: "ADMIN" },
          { userRoles: { some: { role: { name: "ADMIN" } } } },
        ],
      },
      select: { id: true },
    });

    return Promise.all(
      adminUsers.map((admin) =>
        this.create({
          ...params,
          userId: admin.id,
        })
      )
    );
  }

  public static async getUserNotifications(filter: GetNotificationsFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {
      userId: filter.userId,
      dismissedAt: null,
    };

    if (filter.category && filter.category !== "ALL") {
      where.category = filter.category;
    }

    if (filter.priority) {
      where.priority = filter.priority;
    }

    if (typeof filter.isRead === "boolean") {
      where.isRead = filter.isRead;
    }

    if (filter.search && filter.search.trim()) {
      const query = filter.search.trim();
      where.OR = [
        { title: { contains: query } },
        { message: { contains: query } },
        { type: { contains: query } },
      ];
    }

    const [totalCount, unreadCount, notifications] = await Promise.all([
      db.notification.count({ where }),
      db.notification.count({ where: { userId: filter.userId, isRead: false, dismissedAt: null } }),
      db.notification.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      totalCount,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      notifications,
    };
  }

  public static async markAsRead(notificationId: string, userId: string) {
    const notif = await db.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notif) {
      throw new NotFoundError("Notification not found");
    }

    return db.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  public static async markAllAsRead(userId: string, category?: string) {
    const where: any = { userId, isRead: false };
    if (category && category !== "ALL") {
      where.category = category;
    }

    return db.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
  }

  public static async dismiss(notificationId: string, userId: string) {
    const notif = await db.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notif) {
      throw new NotFoundError("Notification not found");
    }

    return db.notification.update({
      where: { id: notificationId },
      data: { dismissedAt: new Date() },
    });
  }

  public static async getUserPreferences(userId: string) {
    return db.notificationPreference.findMany({
      where: { userId },
    });
  }

  public static async updatePreference(userId: string, category: string, channel: string, isEnabled: boolean) {
    return db.notificationPreference.upsert({
      where: {
        userId_category_channel: {
          userId,
          category,
          channel,
        },
      },
      create: {
        userId,
        category,
        channel,
        isEnabled,
      },
      update: {
        isEnabled,
      },
    });
  }

  public static async getNotificationRules() {
    return db.notificationRule.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  public static async upsertNotificationRule(data: {
    id?: string;
    name: string;
    eventType: string;
    category?: string;
    priority?: string;
    recipientType?: string;
    targetRole?: string;
    targetUserId?: string;
    channels?: string[];
    templateTitle: string;
    templateBody: string;
    isEnabled?: boolean;
    isSystemMandatory?: boolean;
    conditionJson?: string;
  }) {
    const channelsJson = JSON.stringify(data.channels ?? ["IN_APP"]);

    if (data.id) {
      return db.notificationRule.update({
        where: { id: data.id },
        data: {
          name: data.name,
          eventType: data.eventType,
          category: data.category ?? "SYSTEM",
          priority: data.priority ?? "NORMAL",
          recipientType: data.recipientType ?? "ROLE",
          targetRole: data.targetRole ?? null,
          targetUserId: data.targetUserId ?? null,
          channels: channelsJson,
          templateTitle: data.templateTitle,
          templateBody: data.templateBody,
          isEnabled: data.isEnabled ?? true,
          isSystemMandatory: data.isSystemMandatory ?? false,
          conditionJson: data.conditionJson ?? null,
        },
      });
    }

    return db.notificationRule.create({
      data: {
        name: data.name,
        eventType: data.eventType,
        category: data.category ?? "SYSTEM",
        priority: data.priority ?? "NORMAL",
        recipientType: data.recipientType ?? "ROLE",
        targetRole: data.targetRole ?? null,
        targetUserId: data.targetUserId ?? null,
        channels: channelsJson,
        templateTitle: data.templateTitle,
        templateBody: data.templateBody,
        isEnabled: data.isEnabled ?? true,
        isSystemMandatory: data.isSystemMandatory ?? false,
        conditionJson: data.conditionJson ?? null,
      },
    });
  }
}
