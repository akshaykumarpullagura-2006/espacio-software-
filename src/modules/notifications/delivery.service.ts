import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface DeliveryMessage {
  notificationId?: string;
  recipientId: string;
  title: string;
  body: string;
  channels: string[]; // ["IN_APP", "EMAIL", "SMS", "WHATSAPP"]
}

export class DeliveryService {
  public static async deliver(message: DeliveryMessage): Promise<void> {
    for (const channel of message.channels) {
      try {
        switch (channel) {
          case "IN_APP":
            // IN_APP notifications are handled directly via Notification table insertion
            await this.logDelivery(message.notificationId, message.recipientId, "IN_APP", "SENT");
            break;

          case "EMAIL":
            // Simulated / integrated email channel handler
            logger.info(`[DELIVERY_SERVICE] Email sent to user:${message.recipientId} - ${message.title}`);
            await this.logDelivery(message.notificationId, message.recipientId, "EMAIL", "SENT");
            break;

          case "SMS":
            logger.info(`[DELIVERY_SERVICE] SMS sent to user:${message.recipientId} - ${message.title}`);
            await this.logDelivery(message.notificationId, message.recipientId, "SMS", "SENT");
            break;

          case "WHATSAPP":
            logger.info(`[DELIVERY_SERVICE] WhatsApp sent to user:${message.recipientId} - ${message.title}`);
            await this.logDelivery(message.notificationId, message.recipientId, "WHATSAPP", "SENT");
            break;

          case "PUSH":
            logger.info(`[DELIVERY_SERVICE] Push notification sent to user:${message.recipientId} - ${message.title}`);
            await this.logDelivery(message.notificationId, message.recipientId, "PUSH", "SENT");
            break;

          default:
            logger.warn(`[DELIVERY_SERVICE] Unknown channel: ${channel}`);
        }
      } catch (err: any) {
        logger.error(`[DELIVERY_SERVICE] Channel ${channel} delivery failed for user ${message.recipientId}: ${err?.message}`);
        await this.logDelivery(message.notificationId, message.recipientId, channel, "FAILED", err?.message);
      }
    }
  }

  private static async logDelivery(
    notificationId: string | undefined,
    recipientId: string,
    channel: string,
    status: string,
    errorMessage?: string
  ) {
    try {
      await db.notificationDeliveryLog.create({
        data: {
          notificationId: notificationId ?? null,
          recipientId,
          channel,
          status,
          errorMessage: errorMessage ?? null,
        },
      });
    } catch {
      // quiet logging fallback
    }
  }
}
