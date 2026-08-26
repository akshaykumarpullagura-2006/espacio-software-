import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NotificationService } from "./notification.service";
import { DeliveryService } from "./delivery.service";

export interface DomainEvent {
  eventId: string;
  eventType: string;
  category: "CRM" | "PROJECTS" | "FINANCE" | "PROCUREMENT" | "INVENTORY" | "TASKS" | "SYSTEM" | "REPORTS";
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  actorId?: string;
  entityType?: string;
  entityId?: string;
  title: string;
  message: string;
  actionUrl?: string;
  targetUserId?: string;
  targetRole?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationEngine {
  /**
   * Central domain event publisher and notification dispatcher.
   */
  public static async publishEvent(event: DomainEvent): Promise<{ publishedCount: number }> {
    try {
      const recipientIds = await this.resolveRecipients(event);
      if (recipientIds.length === 0) {
        logger.info(`[NOTIFICATION_ENGINE] No recipients found for event ${event.eventType} (${event.eventId})`);
        return { publishedCount: 0 };
      }

      let publishedCount = 0;

      for (const recipientId of recipientIds) {
        // Skip notifying actor if actor is the recipient (unless it's a test/self-reminder)
        if (event.actorId && event.actorId === recipientId && recipientIds.length > 1) {
          continue;
        }

        // Idempotency check: prevent duplicate notifications for exact eventId + recipientId
        const existingNotif = await db.notification.findFirst({
          where: {
            userId: recipientId,
            eventId: event.eventId,
          },
        });

        if (existingNotif) {
          continue;
        }

        // Check user preferences for channel filtering
        const userPrefs = await db.notificationPreference.findMany({
          where: { userId: recipientId, category: event.category },
        });

        const inAppPref = userPrefs.find((p) => p.channel === "IN_APP");
        const isInAppEnabled = inAppPref ? inAppPref.isEnabled : true;

        if (!isInAppEnabled) {
          continue;
        }

        // Create in-app notification
        const notification = await NotificationService.create({
          userId: recipientId,
          type: event.eventType,
          category: event.category,
          priority: event.priority ?? "NORMAL",
          title: event.title,
          message: event.message,
          entityType: event.entityType,
          entityId: event.entityId,
          actionUrl: event.actionUrl,
          eventId: event.eventId,
          actorId: event.actorId,
        });

        publishedCount++;

        // Trigger external delivery channel handling
        const enabledChannels = userPrefs
          .filter((p) => p.isEnabled && p.channel !== "IN_APP")
          .map((p) => p.channel);

        if (enabledChannels.length > 0) {
          await DeliveryService.deliver({
            notificationId: notification.id,
            recipientId,
            title: event.title,
            body: event.message,
            channels: enabledChannels,
          });
        }
      }

      return { publishedCount };
    } catch (error: any) {
      logger.error(`[NOTIFICATION_ENGINE] Error processing event ${event.eventType}: ${error?.message}`);
      // Return 0 without throwing so source business transaction remains intact
      return { publishedCount: 0 };
    }
  }

  /**
   * Resolves recipient user IDs based on targetUserId, targetRole, entity project members, or fallbacks.
   */
  private static async resolveRecipients(event: DomainEvent): Promise<string[]> {
    const recipients = new Set<string>();

    if (event.targetUserId) {
      recipients.add(event.targetUserId);
    }

    if (event.targetRole) {
      const usersWithRole = await db.userRole.findMany({
        where: {
          role: {
            name: {
              equals: event.targetRole,
            },
          },
          user: {
            status: "ACTIVE",
          },
        },
        select: { userId: true },
      });

      for (const ur of usersWithRole) {
        recipients.add(ur.userId);
      }
    }

    // Resolve project members if event is related to a project
    if (event.entityType === "PROJECT" && event.entityId && !event.targetUserId && !event.targetRole) {
      const members = await db.projectMember.findMany({
        where: { projectId: event.entityId },
        select: { userId: true },
      });
      for (const m of members) {
        recipients.add(m.userId);
      }
    }

    // Fallback: If no recipient resolved, select default active system admins/users
    if (recipients.size === 0 && !event.targetUserId) {
      const activeUsers = await db.user.findMany({
        where: { status: "ACTIVE" },
        take: 5,
        select: { id: true },
      });
      for (const u of activeUsers) {
        recipients.add(u.id);
      }
    }

    return Array.from(recipients);
  }
}
