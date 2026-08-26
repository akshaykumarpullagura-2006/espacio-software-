import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../src/lib/db";
import { NotificationEngine } from "../src/modules/notifications/notification-engine";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { ReminderService } from "../src/modules/notifications/reminder.service";
import { DeliveryService } from "../src/modules/notifications/delivery.service";

describe("Module 14 — Notifications, Alerts, Reminders & Attention Center Tests", () => {
  let testUserId: string;
  let adminRoleId: string;

  beforeAll(async () => {
    // Create test user
    const user = await db.user.create({
      data: {
        email: `notif_test_${Date.now()}@espacio.com`,
        passwordHash: "hashedpassword123",
        fullName: "Notification Test Admin",
        status: "ACTIVE",
      },
    });
    testUserId = user.id;

    // Create or retrieve role
    let role = await db.role.findFirst({ where: { name: "ADMIN" } });
    if (!role) {
      role = await db.role.create({
        data: { name: "ADMIN", description: "Admin Role" },
      });
    }
    adminRoleId = role.id;

    await db.userRole.create({
      data: { userId: testUserId, roleId: adminRoleId },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await db.notificationDeliveryLog.deleteMany({ where: { recipientId: testUserId } });
    await db.notification.deleteMany({ where: { userId: testUserId } });
    await db.reminder.deleteMany({ where: { userId: testUserId } });
    await db.notificationPreference.deleteMany({ where: { userId: testUserId } });
    await db.userRole.deleteMany({ where: { userId: testUserId } });
    await db.user.delete({ where: { id: testUserId } });
  });

  it("1. publishes domain events and creates in-app notifications with category and priority", async () => {
    const eventId = `evt_test_${Date.now()}`;
    const result = await NotificationEngine.publishEvent({
      eventId,
      eventType: "PAYMENT_OVERDUE",
      category: "FINANCE",
      priority: "HIGH",
      title: "Client Payment Overdue",
      message: "Payment of ₹50,000 for PROJ-2026-0001 is overdue.",
      targetUserId: testUserId,
      actionUrl: "/finance/payments",
    });

    expect(result.publishedCount).toBeGreaterThanOrEqual(1);

    const userNotifs = await NotificationService.getUserNotifications({
      userId: testUserId,
      category: "FINANCE",
    });

    expect(userNotifs.totalCount).toBeGreaterThanOrEqual(1);
    const notif = userNotifs.notifications.find((n) => n.eventId === eventId);
    expect(notif).toBeDefined();
    expect(notif?.category).toBe("FINANCE");
    expect(notif?.priority).toBe("HIGH");
    expect(notif?.title).toBe("Client Payment Overdue");
    expect(notif?.actionUrl).toBe("/finance/payments");
  });

  it("2. enforces idempotency duplicate protection for identical event IDs", async () => {
    const duplicateEventId = `evt_dup_${Date.now()}`;
    
    // First publication
    const res1 = await NotificationEngine.publishEvent({
      eventId: duplicateEventId,
      eventType: "STOCK_LOW",
      category: "INVENTORY",
      priority: "URGENT",
      title: "Low Stock Alert",
      message: "Material MAT-001 is below reorder level.",
      targetUserId: testUserId,
    });
    expect(res1.publishedCount).toBe(1);

    // Second duplicate publication
    const res2 = await NotificationEngine.publishEvent({
      eventId: duplicateEventId,
      eventType: "STOCK_LOW",
      category: "INVENTORY",
      priority: "URGENT",
      title: "Low Stock Alert",
      message: "Material MAT-001 is below reorder level.",
      targetUserId: testUserId,
    });
    expect(res2.publishedCount).toBe(0);

    const notifs = await db.notification.findMany({
      where: { userId: testUserId, eventId: duplicateEventId },
    });
    expect(notifs.length).toBe(1);
  });

  it("3. creates personal reminders with REM-YYYY-XXXX reference format", async () => {
    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Due tomorrow
    const reminder = await ReminderService.createReminder({
      userId: testUserId,
      title: "Review Purchase Order PO-2026-0004",
      description: "Check delivery status with vendor",
      dueAt,
      priority: "HIGH",
      actionUrl: "/procurement/purchase-orders",
    });

    expect(reminder.referenceNo).toMatch(/^REM-\d{4}-\d{4}$/);
    expect(reminder.status).toBe("PENDING");
    expect(reminder.title).toBe("Review Purchase Order PO-2026-0004");
  });

  it("4. evaluates overdue pending reminders automatically", async () => {
    const pastDue = new Date(Date.now() - 10000); // 10 seconds in the past
    const overdueReminder = await ReminderService.createReminder({
      userId: testUserId,
      title: "Overdue Task",
      dueAt: pastDue,
      priority: "URGENT",
    });

    const result = await ReminderService.getUserReminders({ userId: testUserId });
    const updated = result.reminders.find((r) => r.id === overdueReminder.id);
    expect(updated?.status).toBe("OVERDUE");
  });

  it("5. snoozes reminder updating snoozedUntil without corrupting business dueAt", async () => {
    const dueAt = new Date(Date.now() - 10000);
    const reminder = await ReminderService.createReminder({
      userId: testUserId,
      title: "Snooze Test Reminder",
      dueAt,
      priority: "NORMAL",
    });

    const snoozedUntil = new Date(Date.now() + 3600000); // 1 hour from now
    const snoozed = await ReminderService.snoozeReminder(reminder.id, testUserId, snoozedUntil);

    expect(snoozed.status).toBe("PENDING");
    expect(snoozed.snoozedUntil).toEqual(snoozedUntil);
    expect(snoozed.dueAt).toEqual(dueAt); // Original dueAt remains untouched!
  });

  it("6. respects user notification channel preferences", async () => {
    // Disable IN_APP channel for CRM category
    await NotificationService.updatePreference(testUserId, "CRM", "IN_APP", false);

    const eventId = `evt_crm_${Date.now()}`;
    const result = await NotificationEngine.publishEvent({
      eventId,
      eventType: "LEAD_ASSIGNED",
      category: "CRM",
      title: "New Lead Assigned",
      message: "Lead LEAD-2026-0001 assigned to you.",
      targetUserId: testUserId,
    });

    expect(result.publishedCount).toBe(0);

    const notif = await db.notification.findFirst({
      where: { userId: testUserId, eventId },
    });
    expect(notif).toBeNull();
  });

  it("7. handles channel delivery and logs safely without throwing", async () => {
    await DeliveryService.deliver({
      notificationId: undefined,
      recipientId: testUserId,
      title: "Channel Delivery Test",
      body: "Test Body",
      channels: ["EMAIL", "SMS", "PUSH"],
    });

    const logs = await db.notificationDeliveryLog.findMany({
      where: { recipientId: testUserId },
    });

    expect(logs.length).toBeGreaterThanOrEqual(3);
  });
});
