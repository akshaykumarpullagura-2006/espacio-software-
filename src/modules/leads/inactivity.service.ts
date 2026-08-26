import { db } from "@/lib/db";
import { SettingsService } from "../settings/settings.service";
import { NotificationService } from "../notifications/notification.service";

export class InactivityDetectionService {
  public static async checkInactiveLeads() {
    const thresholdSetting = await SettingsService.get("LEAD_INACTIVITY_THRESHOLD_DAYS", "7");
    const thresholdDays = parseInt(thresholdSetting, 10) || 7;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

    const inactiveLeads = await db.lead.findMany({
      where: {
        updatedAt: { lt: cutoffDate },
        stage: {
          notIn: ["WON", "LOST"],
        },
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    const notificationsSent: string[] = [];

    for (const lead of inactiveLeads) {
      if (lead.assignedToId) {
        await NotificationService.create({
          userId: lead.assignedToId,
          type: "SYSTEM_ALERT",
          title: `Inactive Lead: ${lead.referenceNo}`,
          message: `Lead ${lead.clientName} (${lead.referenceNo}) has been inactive for over ${thresholdDays} days.`,
          entityType: "Lead",
          entityId: lead.id,
        });
        notificationsSent.push(lead.id);
      }
    }

    return { inactiveCount: inactiveLeads.length, notificationsSent };
  }
}
