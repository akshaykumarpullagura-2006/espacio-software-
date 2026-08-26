import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { TaskService } from "../src/modules/tasks/task.service";
import { CalendarService } from "../src/modules/calendar/calendar.service";

describe("Module 15: Tasks, Calendar & Work Management", () => {
  let adminUserId: string;
  let testTaskId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Find or create test user
    const admin = await db.user.findFirst({ where: { status: "ACTIVE" } });
    if (admin) {
      adminUserId = admin.id;
    } else {
      const created = await db.user.create({
        data: {
          email: `admin_tasks_${Date.now()}@espacio.com`,
          passwordHash: "hash123",
          fullName: "Task Admin User",
        },
      });
      adminUserId = created.id;
    }

    // Create test project if needed
    const proj = await db.project.findFirst();
    if (proj) {
      testProjectId = proj.id;
    } else {
      const createdProj = await db.project.create({
        data: {
          referenceNo: `PROJ-${Date.now()}`,
          title: "Test Task Project",
          propertyTypeKey: "RESIDENTIAL",
        },
      });
      testProjectId = createdProj.id;
    }
  });

  it("1. Should create a task with TSK-YYYY-XXXX reference code, checklists & dependencies", async () => {
    const task = await TaskService.createTask({
      title: "Site Survey & Measurement Verification",
      description: "Verify dimensions before cutting raw materials",
      priority: "HIGH",
      type: "PROJECT",
      createdById: adminUserId,
      projectId: testProjectId,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      checklists: ["Measure Room A", "Measure Room B", "Sign off checklist"],
    });

    expect(task).toBeDefined();
    expect(task.referenceNo).toMatch(/^TSK-\d{4}-\d{4}$/);
    expect(task.title).toBe("Site Survey & Measurement Verification");
    expect(task.priority).toBe("HIGH");
    expect(task.status).toBe("TODO");

    testTaskId = task.id;

    // Verify checklists created
    const fetched = await TaskService.getTaskById(task.id);
    expect(fetched.checklists.length).toBe(3);
  });

  it("2. Should transition task status and record completedAt timestamp", async () => {
    const inProgress = await TaskService.updateTaskStatus(testTaskId, "IN_PROGRESS", adminUserId);
    expect(inProgress.status).toBe("IN_PROGRESS");
    expect(inProgress.completedAt).toBeNull();

    const completed = await TaskService.updateTaskStatus(testTaskId, "COMPLETED", adminUserId);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
  });

  it("3. Should reassign task to another user", async () => {
    const reassigned = await TaskService.reassignTask(testTaskId, adminUserId, adminUserId);
    expect(reassigned.assigneeId).toBe(adminUserId);
  });

  it("4. Should toggle task checklist item status", async () => {
    const task = await TaskService.getTaskById(testTaskId);
    const item = task.checklists[0];

    const toggled = await TaskService.toggleChecklistItem(item.id, adminUserId);
    expect(toggled.isCompleted).toBe(true);
    expect(toggled.completedById).toBe(adminUserId);
  });

  it("5. Should aggregate My Work summary for a user", async () => {
    const summary = await TaskService.getMyWorkSummary(adminUserId);
    expect(summary).toBeDefined();
    expect(typeof summary.dueTodayCount).toBe("number");
    expect(typeof summary.overdueCount).toBe("number");
    expect(Array.isArray(summary.recentlyCompleted)).toBe(true);
  });

  it("6. Should create a Task Template and generate tasks for a project", async () => {
    const template = await TaskService.createTaskTemplate(
      "Interior Execution Template",
      "PROJECT",
      "Standard workflow for interior execution",
      [
        { title: "Initial Measurement", priority: "HIGH" },
        { title: "Raw Material Requisition", priority: "NORMAL" },
      ]
    );

    expect(template.id).toBeDefined();
    expect(template.name).toBe("Interior Execution Template");

    const batch = await TaskService.createTasksFromTemplate(template.id, testProjectId, adminUserId);
    expect(batch.length).toBe(2);
    expect(batch[0].referenceNo).toMatch(/^TSK-\d{4}-\d{4}$/);
  });

  it("7. Should aggregate normalized business events in CalendarService", async () => {
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const events = await CalendarService.getCalendarEvents({
      startDate: start,
      endDate: end,
      category: "ALL",
    });

    expect(Array.isArray(events)).toBe(true);
    if (events.length > 0) {
      const first = events[0];
      expect(first.id).toBeDefined();
      expect(first.title).toBeDefined();
      expect(first.sourceType).toBeDefined();
      expect(first.actionUrl).toBeDefined();
    }
  });
});
