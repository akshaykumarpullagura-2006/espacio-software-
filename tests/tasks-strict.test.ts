import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { TaskService } from '@/modules/tasks/task.service';
import { CalendarService } from '@/modules/calendar/calendar.service';
import { NotificationService } from '@/modules/notifications/notification.service';
import { NotificationEngine } from '@/modules/notifications/notification-engine';
import { ReminderService } from '@/modules/notifications/reminder.service';

let testAdminId: string;
let testEmployeeId: string;
let testProjectId: string;
let testLeadId: string;
let testClientId: string;
let testTaskId: string;
let testParentTaskId: string;
let testSubtaskId: string;
let testChecklistId: string;
let testNotificationId: string;

describe('ESPACIO ERP Strict Task Management, Calendar & Notifications Test Suite (Prompt 12)', () => {

  beforeAll(async () => {
    // 1. Resolve or create test Admin user
    const admin = await db.user.findFirst({ where: { accessLevel: 'ADMIN' } });
    if (admin) {
      testAdminId = admin.id;
    } else {
      const createdAdmin = await db.user.create({
        data: {
          email: 'task_admin_p12_' + Date.now() + '@espacio.com',
          passwordHash: 'hash123',
          fullName: 'Task Master Admin',
          accessLevel: 'ADMIN',
        },
      });
      testAdminId = createdAdmin.id;
    }

    // 2. Resolve or create test Employee user
    const employee = await db.user.findFirst({ where: { accessLevel: 'USER' } });
    if (employee) {
      testEmployeeId = employee.id;
    } else {
      const createdEmp = await db.user.create({
        data: {
          email: 'task_emp_p12_' + Date.now() + '@espacio.com',
          passwordHash: 'hash123',
          fullName: 'Field Operations Engineer',
          accessLevel: 'USER',
        },
      });
      testEmployeeId = createdEmp.id;
    }

    // 3. Resolve or create test Project
    const proj = await db.project.findFirst({ where: { status: { not: 'CANCELLED' } } });
    if (proj) {
      testProjectId = proj.id;
    } else {
      const createdProj = await db.project.create({
        data: {
          referenceNo: 'PROJ-2026-9999',
          title: 'Skyline Luxury Penthouse',
          propertyTypeKey: 'RESIDENTIAL',
          status: 'IN_PROGRESS',
          stage: 'DESIGNING',
          projectManagerId: testAdminId,
        },
      });
      testProjectId = createdProj.id;
    }

    // 4. Resolve or create test Lead & Client
    const lead = await db.lead.findFirst();
    if (lead) {
      testLeadId = lead.id;
    } else {
      const createdLead = await db.lead.create({
        data: {
          referenceNo: 'LD-2026-9999',
          clientName: 'Vikram Aditya',
          phone: '+919988776655',
          stage: 'CONTACTED',
          sourceKey: 'WEBSITE',
          propertyTypeKey: 'RESIDENTIAL',
        },
      });
      testLeadId = createdLead.id;
    }

    const client = await db.client.findFirst();
    if (client) {
      testClientId = client.id;
    } else {
      const createdClient = await db.client.create({
        data: {
          referenceNo: 'CLI-2026-9999',
          fullName: 'Vikram Aditya Holdings',
          phone: '+919988776655',
          email: 'vikram.holdings@example.com',
        },
      });
      testClientId = createdClient.id;
    }
  });

  // ==========================================
  // SECTION 1: TASK CREATION & VALIDATION
  // ==========================================

  it('1. Creates a Task with server-generated TSK-YYYY-XXXX reference code', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const task = await TaskService.createTask({
      title: 'Complete Modular Kitchen 3D Renders',
      description: 'Prepare detailed elevation and 3D visual walkthrough for client presentation',
      priority: 'HIGH',
      type: 'DESIGN',
      createdById: testAdminId,
      assigneeId: testEmployeeId,
      projectId: testProjectId,
      dueAt: tomorrow,
      tags: ['KITCHEN', '3D_DESIGN', 'CLIENT_MEETING'],
    });

    expect(task).toBeDefined();
    expect(task.referenceNo).toMatch(/^TSK-\d{4}-\d{4}$/);
    expect(task.title).toBe('Complete Modular Kitchen 3D Renders');
    expect(task.priority).toBe('HIGH');
    expect(task.type).toBe('DESIGN');
    expect(task.status).toBe('TODO');
    expect(task.assigneeId).toBe(testEmployeeId);

    testTaskId = task.id;
  });

  it('2. Rejects task creation when due date precedes start date', async () => {
    const today = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await expect(
      TaskService.createTask({
        title: 'Invalid Date Task',
        startDate: today,
        dueAt: yesterday,
        createdById: testAdminId,
      })
    ).rejects.toThrow('Task due date must be on or after start date');
  });

  it('3. Creates Task with embedded checklists', async () => {
    const task = await TaskService.createTask({
      title: 'Site Measurement & Quality Audit',
      priority: 'NORMAL',
      type: 'SITE_VISIT',
      createdById: testAdminId,
      projectId: testProjectId,
      checklists: [
        'Verify Floor-to-Ceiling Height in Living Room',
        'Check Wall Plumbness and Corner Squareness',
        'Mark Electrical Conduit Entry Points',
      ],
    });

    expect(task).toBeDefined();
    const fetched = await TaskService.getTaskById(task.id);
    expect(fetched.checklists.length).toBe(3);
    expect(fetched.checklists[0].title).toBe('Verify Floor-to-Ceiling Height in Living Room');
    expect(fetched.checklists[0].isCompleted).toBe(false);

    testChecklistId = fetched.checklists[0].id;
  });

  it('4. Creates Parent-Child task hierarchy', async () => {
    const parentTask = await TaskService.createTask({
      title: 'Master Bedroom Wardrobe Fabrication',
      priority: 'HIGH',
      type: 'PRODUCTION',
      createdById: testAdminId,
      projectId: testProjectId,
    });
    testParentTaskId = parentTask.id;

    const subtask = await TaskService.createTask({
      title: 'Cut HDHMR Panels for Carcass',
      priority: 'NORMAL',
      type: 'PRODUCTION',
      createdById: testAdminId,
      projectId: testProjectId,
      parentTaskId: parentTask.id,
    });
    testSubtaskId = subtask.id;

    const fetchedParent = await TaskService.getTaskById(parentTask.id);
    expect(fetchedParent.subtasks.length).toBe(1);
    expect(fetchedParent.subtasks[0].id).toBe(subtask.id);
  });

  it('5. Creates Task with blocking dependencies and auto-sets status to BLOCKED', async () => {
    const dependentTask = await TaskService.createTask({
      title: 'Apply Polyurethane Polish to Shutters',
      priority: 'NORMAL',
      type: 'PRODUCTION',
      createdById: testAdminId,
      projectId: testProjectId,
      blockingTaskIds: [testSubtaskId],
    });

    expect(dependentTask.status).toBe('BLOCKED');

    const fetched = await TaskService.getTaskById(dependentTask.id);
    expect(fetched.dependencies.length).toBe(1);
    expect(fetched.dependencies[0].blockingTaskId).toBe(testSubtaskId);
  });

  // ==========================================
  // SECTION 2: TASK ASSIGNMENT & NOTIFICATIONS
  // ==========================================

  it('6. Dispatches TASK_ASSIGNED notification to assignee upon task creation', async () => {
    const notif = await db.notification.findFirst({
      where: {
        userId: testEmployeeId,
        type: 'TASK_ASSIGNED',
        entityId: testTaskId,
      },
    });

    expect(notif).toBeDefined();
    expect(notif?.category).toBe('TASKS');
    expect(notif?.title).toContain('Task Assigned:');
  });

  it('7. Reassigns task to another user, updates assigneeId, and logs audit', async () => {
    const reassigned = await TaskService.reassignTask(testTaskId, testAdminId, testAdminId);
    expect(reassigned.assigneeId).toBe(testAdminId);

    const audit = await db.auditLog.findFirst({
      where: {
        entityType: 'Task',
        entityId: testTaskId,
        action: 'TASK_REASSIGNED',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(audit).toBeDefined();
  });

  it('8. Reassigning task back to employee triggers TASK_REASSIGNED notification', async () => {
    await TaskService.reassignTask(testTaskId, testEmployeeId, testAdminId);

    const notif = await db.notification.findFirst({
      where: {
        userId: testEmployeeId,
        type: 'TASK_REASSIGNED',
        entityId: testTaskId,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(notif).toBeDefined();
    expect(notif?.title).toContain('Task Reassigned:');
  });

  // ==========================================
  // SECTION 3: TASK LIFECYCLE & STATUS WORKFLOW
  // ==========================================

  it('9. Transitions task status from TODO to IN_PROGRESS', async () => {
    const updated = await TaskService.updateTaskStatus(testTaskId, 'IN_PROGRESS', testEmployeeId);
    expect(updated.status).toBe('IN_PROGRESS');
    expect(updated.completedAt).toBeNull();
  });

  it('10. Completes task, records completedAt timestamp, and triggers TASK_COMPLETED notification', async () => {
    const completed = await TaskService.updateTaskStatus(testTaskId, 'COMPLETED', testEmployeeId);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.completedAt).not.toBeNull();

    const notif = await db.notification.findFirst({
      where: {
        userId: testAdminId,
        type: 'TASK_COMPLETED',
        entityId: testTaskId,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(notif).toBeDefined();
    expect(notif?.title).toContain('Task Completed:');
  });

  it('11. Blocks task with explicit reason (status BLOCKED and audit recorded)', async () => {
    const blocked = await TaskService.blockTask(testTaskId, 'Waiting for client approval on quartz counter-top slab', testAdminId);
    expect(blocked.status).toBe('BLOCKED');
    expect(blocked.description).toContain('quartz counter-top slab');

    const audit = await db.auditLog.findFirst({
      where: { entityType: 'Task', entityId: testTaskId, action: 'TASK_BLOCKED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeDefined();
  });

  it('12. Unblocks task, restoring status to IN_PROGRESS', async () => {
    const unblocked = await TaskService.unblockTask(testTaskId, testAdminId);
    expect(unblocked.status).toBe('IN_PROGRESS');

    const audit = await db.auditLog.findFirst({
      where: { entityType: 'Task', entityId: testTaskId, action: 'TASK_UNBLOCKED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeDefined();
  });

  it('13. Reopens a completed task with reason (completedAt reset to null)', async () => {
    // Complete first
    await TaskService.updateTaskStatus(testTaskId, 'COMPLETED', testEmployeeId);

    // Now reopen
    const reopened = await TaskService.reopenTask(testTaskId, 'Client requested minor adjustments to 3D lighting', testAdminId);
    expect(reopened.status).toBe('IN_PROGRESS');
    expect(reopened.completedAt).toBeNull();
    expect(reopened.description).toContain('Client requested minor adjustments');

    const audit = await db.auditLog.findFirst({
      where: { entityType: 'Task', entityId: testTaskId, action: 'TASK_REOPENED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeDefined();
  });

  // ==========================================
  // SECTION 4: CHECKLISTS & SUBTASKS
  // ==========================================

  it('14. Adds a checklist item to an existing task', async () => {
    const item = await TaskService.addChecklistItem(testTaskId, 'Confirm Handle Finish (Brushed Brass)');
    expect(item).toBeDefined();
    expect(item.title).toBe('Confirm Handle Finish (Brushed Brass)');
    expect(item.isCompleted).toBe(false);
  });

  it('15. Toggles checklist item to completed with completedBy and completedAt', async () => {
    const toggled = await TaskService.toggleChecklistItem(testChecklistId, testEmployeeId);
    expect(toggled.isCompleted).toBe(true);
    expect(toggled.completedById).toBe(testEmployeeId);
    expect(toggled.completedAt).not.toBeNull();
  });

  // ==========================================
  // SECTION 5: PROJECT STAGE-BASED TASK INTEGRATION
  // ==========================================

  it('16. Generates predefined tasks when project enters DESIGNING stage', async () => {
    const stageTasks = await TaskService.generateStageTasks(testProjectId, 'DESIGNING', testAdminId);
    expect(stageTasks.length).toBe(3);
    expect(stageTasks.some((t) => t.title.includes('Prepare 2D & 3D Design'))).toBe(true);
    expect(stageTasks.some((t) => t.title.includes('Client Design Presentation'))).toBe(true);
  });

  it('17. Generates predefined tasks when project enters QUALITY_CHECK stage', async () => {
    const qcTasks = await TaskService.generateStageTasks(testProjectId, 'QUALITY_CHECK', testAdminId);
    expect(qcTasks.length).toBe(2);
    expect(qcTasks.some((t) => t.type === 'QUALITY_CHECK')).toBe(true);
  });

  it('18. Generates predefined tasks when project enters HANDOVER stage', async () => {
    const handoverTasks = await TaskService.generateStageTasks(testProjectId, 'HANDOVER', testAdminId);
    expect(handoverTasks.length).toBe(3);
    expect(handoverTasks.some((t) => t.type === 'HANDOVER')).toBe(true);
  });

  it('19. Idempotency: Re-triggering stage task generation does NOT create duplicate tasks', async () => {
    const repeatTasks = await TaskService.generateStageTasks(testProjectId, 'DESIGNING', testAdminId);
    expect(repeatTasks.length).toBe(0); // 0 new tasks generated because all exist
  });

  // ==========================================
  // SECTION 6: LEAD & CLIENT TASK INTEGRATION
  // ==========================================

  it('20. Creates Lead follow-up task linked to leadId', async () => {
    const leadTask = await TaskService.createTask({
      title: 'Call Vikram Aditya to finalize quotation scope',
      priority: 'HIGH',
      type: 'FOLLOW_UP',
      createdById: testAdminId,
      assigneeId: testEmployeeId,
      leadId: testLeadId,
      dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });

    expect(leadTask.leadId).toBe(testLeadId);
    expect(leadTask.type).toBe('FOLLOW_UP');

    const fetched = await TaskService.getTasks({ leadId: testLeadId });
    expect(fetched.tasks.some((t) => t.id === leadTask.id)).toBe(true);
  });

  it('21. Creates Client task linked to clientId', async () => {
    const clientTask = await TaskService.createTask({
      title: 'Send Revised Tax Invoice & Payment Receipt',
      priority: 'NORMAL',
      type: 'CLIENT',
      createdById: testAdminId,
      clientId: testClientId,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    expect(clientTask.clientId).toBe(testClientId);

    const fetched = await TaskService.getTasks({ clientId: testClientId });
    expect(fetched.tasks.some((t) => t.id === clientTask.id)).toBe(true);
  });

  // ==========================================
  // SECTION 7: PROCUREMENT & INVENTORY TASK INTEGRATION
  // ==========================================

  it('22. Creates Procurement task linked to procurement workflow', async () => {
    const procTask = await TaskService.createTask({
      title: 'Follow up on Greenply 19mm Plywood dispatch ETA',
      priority: 'HIGH',
      type: 'PROCUREMENT',
      createdById: testAdminId,
      projectId: testProjectId,
      dueAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    });

    expect(procTask.type).toBe('PROCUREMENT');
  });

  it('23. Creates Inventory material inspection task', async () => {
    const invTask = await TaskService.createTask({
      title: 'Inspect arriving batch of Blum Aventos lift mechanisms',
      priority: 'NORMAL',
      type: 'INVENTORY',
      createdById: testAdminId,
      projectId: testProjectId,
    });

    expect(invTask.type).toBe('INVENTORY');
  });

  // ==========================================
  // SECTION 8: DAILY OPERATIONS — MY WORK & TEAM WORK
  // ==========================================

  it('24. Aggregates My Work summary for an employee', async () => {
    const myWork = await TaskService.getMyWorkSummary(testEmployeeId);
    expect(myWork).toBeDefined();
    expect(typeof myWork.dueTodayCount).toBe('number');
    expect(typeof myWork.overdueCount).toBe('number');
    expect(typeof myWork.upcomingCount).toBe('number');
    expect(typeof myWork.blockedCount).toBe('number');
    expect(Array.isArray(myWork.dueToday)).toBe(true);
    expect(Array.isArray(myWork.recentlyCompleted)).toBe(true);
  });

  it('25. Correctly calculates dynamic isOverdue flag for past-due tasks', async () => {
    const pastDueTask = await TaskService.createTask({
      title: 'Overdue Site Verification Task',
      priority: 'URGENT',
      createdById: testAdminId,
      assigneeId: testEmployeeId,
      dueAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    });

    const result = await TaskService.getTasks({ assigneeId: testEmployeeId });
    const found = result.tasks.find((t: any) => t.id === pastDueTask.id);
    expect(found).toBeDefined();
    expect(found!.isOverdue).toBe(true);
  });

  it('26. Evaluates overdue tasks and dispatches idempotent notifications', async () => {
    const publishedCount = await TaskService.evaluateOverdueTasks();
    expect(typeof publishedCount).toBe('number');

    // Calling again immediately should publish 0 because of idempotency key
    const secondPass = await TaskService.evaluateOverdueTasks();
    expect(secondPass).toBe(0);
  });

  it('27. Retrieves Unassigned tasks list for manager allocation', async () => {
    // Create an unassigned task
    const unassigned = await TaskService.createTask({
      title: 'Unassigned Snag Item: Polish living room console',
      priority: 'NORMAL',
      createdById: testAdminId,
      projectId: testProjectId,
    });

    const list = await TaskService.getUnassignedTasks({ limit: 100 });
    expect(list.tasks.some((t) => t.id === unassigned.id)).toBe(true);
    for (const t of list.tasks) {
      expect(t.assigneeId).toBeNull();
    }
  });

  it('28. Aggregates Team Work summary for management operations', async () => {
    const teamWork = await TaskService.getTeamWorkSummary();
    expect(teamWork).toBeDefined();
    expect(teamWork.totalTasks).toBeGreaterThan(0);
    expect(typeof teamWork.openTasks).toBe('number');
    expect(typeof teamWork.completedTasks).toBe('number');
    expect(typeof teamWork.overdueTasks).toBe('number');
    expect(typeof teamWork.unassignedTasks).toBe('number');
    expect(Array.isArray(teamWork.tasksByPriority)).toBe(true);
    expect(Array.isArray(teamWork.tasksByType)).toBe(true);
  });

  // ==========================================
  // SECTION 9: TASK SEARCH & SERVER-SIDE FILTERS
  // ==========================================

  it('29. Searches tasks by query string (title, reference, or tags)', async () => {
    const searchRes = await TaskService.getTasks({ search: 'Modular Kitchen' });
    expect(searchRes.tasks.length).toBeGreaterThan(0);
    expect(searchRes.tasks.some((t) => t.title.includes('Modular Kitchen'))).toBe(true);
  });

  it('30. Filters tasks by priority and status', async () => {
    const filtered = await TaskService.getTasks({ priority: 'HIGH', status: 'IN_PROGRESS' });
    for (const t of filtered.tasks) {
      expect(t.priority).toBe('HIGH');
      expect(t.status).toBe('IN_PROGRESS');
    }
  });

  it('31. Filters tasks by isOverdue: true', async () => {
    const overdueRes = await TaskService.getTasks({ isOverdue: true });
    for (const t of overdueRes.tasks) {
      expect(t.isOverdue).toBe(true);
      expect(t.status).not.toBe('COMPLETED');
      expect(t.status).not.toBe('CANCELLED');
    }
  });

  // ==========================================
  // SECTION 10: CALENDAR INTEGRATION
  // ==========================================

  it('32. Retrieves unified calendar events across 30-day date window', async () => {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const events = await CalendarService.getCalendarEvents({ startDate, endDate, category: 'ALL' });
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  it('33. Tasks with scheduled dates appear as TASK events in calendar', async () => {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const events = await CalendarService.getCalendarEvents({ startDate, endDate, category: 'TASKS' });
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.sourceType).toBe('TASK');
      expect(e.category).toBe('TASKS');
    }
  });

  it('34. Project milestones appear as PROJECT_MILESTONE events in calendar', async () => {
    // Set handover date on project
    const handoverDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    await db.project.update({
      where: { id: testProjectId },
      data: { handoverDate },
    });

    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const events = await CalendarService.getCalendarEvents({ startDate, endDate, category: 'PROJECTS' });
    const handoverEvent = events.find((e) => e.sourceId === testProjectId && e.sourceType === 'PROJECT_MILESTONE');
    expect(handoverEvent).toBeDefined();
    expect(handoverEvent?.title).toContain('Project Handover:');
  });

  it('35. Financial client receivables appear as PAYMENT_DUE events in calendar', async () => {
    const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const rec = await db.clientReceivable.create({
      data: {
        receivableNo: 'REC-2026-9999',
        clientId: testClientId,
        amount: 250000,
        outstandingAmount: 250000,
        dueDate,
        status: 'OPEN',
      },
    });

    const startDate = new Date();
    const endDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

    const events = await CalendarService.getCalendarEvents({ startDate, endDate, category: 'FINANCE' });
    const recEvent = events.find((e) => e.sourceId === rec.id);
    expect(recEvent).toBeDefined();
    expect(recEvent?.sourceType).toBe('PAYMENT_DUE');

    // Cleanup
    await db.clientReceivable.delete({ where: { id: rec.id } });
  });

  it('36. Lead Follow-ups appear as CRM events in calendar', async () => {
    const scheduledAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const followUp = await db.leadFollowUp.create({
      data: {
        leadId: testLeadId,
        followUpDate: scheduledAt,
        type: 'PHONE_CALL',
        status: 'SCHEDULED',
        notes: 'Call client to discuss floor plans',
        assignedToId: testEmployeeId,
      },
    });

    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const events = await CalendarService.getCalendarEvents({ startDate, endDate, category: 'CRM' });
    const fuEvent = events.find((e) => e.sourceId === followUp.id);
    expect(fuEvent).toBeDefined();
    expect(fuEvent?.sourceType).toBe('LEAD_FOLLOW_UP');

    // Cleanup
    await db.leadFollowUp.delete({ where: { id: followUp.id } });
  });

  it('37. Lead Site Visits appear as SITE_VISIT events in calendar', async () => {
    const visitDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const siteVisit = await db.leadSiteVisit.create({
      data: {
        leadId: testLeadId,
        visitDate,
        status: 'SCHEDULED',
        assignedToId: testEmployeeId,
      },
    });

    const startDate = new Date();
    const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    const events = await CalendarService.getCalendarEvents({ startDate, endDate, category: 'SITE_VISITS' });
    const svEvent = events.find((e) => e.sourceId === siteVisit.id);
    expect(svEvent).toBeDefined();
    expect(svEvent?.sourceType).toBe('SITE_VISIT');

    // Cleanup
    await db.leadSiteVisit.delete({ where: { id: siteVisit.id } });
  });

  // ==========================================
  // SECTION 11: NOTIFICATIONS & REMINDERS
  // ==========================================

  it('38. Publishes Domain Event and delivers in-app notification', async () => {
    const result = await NotificationEngine.publishEvent({
      eventId: 'evt_test_broadcast_' + Date.now(),
      eventType: 'SYSTEM_ALERT',
      category: 'SYSTEM',
      priority: 'HIGH',
      title: 'Scheduled System Maintenance Notice',
      message: 'ERP server maintenance scheduled for Sunday 2 AM.',
      targetUserId: testEmployeeId,
    });

    expect(result.publishedCount).toBe(1);

    const notif = await db.notification.findFirst({
      where: { userId: testEmployeeId, title: 'Scheduled System Maintenance Notice' },
      orderBy: { createdAt: 'desc' },
    });
    expect(notif).toBeDefined();
    expect(notif?.isRead).toBe(false);
    testNotificationId = notif!.id;
  });

  it('39. Marks individual notification as read', async () => {
    const updated = await NotificationService.markAsRead(testNotificationId, testEmployeeId);
    expect(updated.isRead).toBe(true);
    expect(updated.readAt).not.toBeNull();
  });

  it('40. Marks all user notifications as read', async () => {
    await NotificationService.create({
      userId: testEmployeeId,
      type: 'INFO',
      title: 'Batch Notification 1',
      message: 'Test message 1',
    });
    await NotificationService.create({
      userId: testEmployeeId,
      type: 'INFO',
      title: 'Batch Notification 2',
      message: 'Test message 2',
    });

    await NotificationService.markAllAsRead(testEmployeeId);

    const unread = await db.notification.count({
      where: { userId: testEmployeeId, isRead: false },
    });
    expect(unread).toBe(0);
  });

  it('41. Dismisses notification by setting dismissedAt timestamp', async () => {
    const dismissed = await NotificationService.dismiss(testNotificationId, testEmployeeId);
    expect(dismissed.dismissedAt).not.toBeNull();
  });

  it('42. Idempotency: Duplicate eventId does NOT generate duplicate notifications', async () => {
    const uniqueEventId = 'evt_idempotency_test_' + Date.now();

    const first = await NotificationEngine.publishEvent({
      eventId: uniqueEventId,
      eventType: 'TASK_ASSIGNED',
      category: 'TASKS',
      title: 'Idempotency Test Task',
      message: 'Only 1 should exist',
      targetUserId: testEmployeeId,
    });
    expect(first.publishedCount).toBe(1);

    const second = await NotificationEngine.publishEvent({
      eventId: uniqueEventId,
      eventType: 'TASK_ASSIGNED',
      category: 'TASKS',
      title: 'Idempotency Test Task',
      message: 'Only 1 should exist',
      targetUserId: testEmployeeId,
    });
    expect(second.publishedCount).toBe(0);

    const notifs = await db.notification.findMany({
      where: { eventId: uniqueEventId, userId: testEmployeeId },
    });
    expect(notifs.length).toBe(1);
  });

  // ==========================================
  // SECTION 12: USER REMINDERS & SNOOZE
  // ==========================================

  it('43. Creates a personal Reminder with REM-YYYY-XXXX reference', async () => {
    const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const reminder = await ReminderService.createReminder({
      userId: testEmployeeId,
      title: 'Call Glass Fabricator for Toughened Partition Status',
      dueAt,
      priority: 'HIGH',
    });

    expect(reminder.referenceNo).toMatch(/^REM-\d{4}-\d{4}$/);
    expect(reminder.status).toBe('PENDING');
  });

  it('44. Snoozes a reminder without altering underlying business deadlines', async () => {
    const dueAt = new Date(Date.now() - 30 * 60 * 1000); // Past
    const rem = await ReminderService.createReminder({
      userId: testEmployeeId,
      title: 'Follow up on sample laminate swatch',
      dueAt,
    });

    const snoozeUntil = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const snoozed = await ReminderService.snoozeReminder(rem.id, testEmployeeId, snoozeUntil);
    expect(snoozed.snoozedUntil).toEqual(snoozeUntil);
    expect(snoozed.status).toBe('PENDING');
  });

  // ==========================================
  // SECTION 13: TASK TEMPLATES
  // ==========================================

  it('45. Creates Task Template and instantiates workflow tasks for project', async () => {
    const template = await TaskService.createTaskTemplate(
      'Living Room Interior Standard Workflow',
      'PROJECT',
      'Standard checklist and task sequence for living room fabrication',
      [
        { title: 'Living Room False Ceiling Framing & Wiring', priority: 'HIGH', estimatedMinutes: 480 },
        { title: 'TV Unit CNC Grooving & Laminate Pressing', priority: 'NORMAL', estimatedMinutes: 360 },
      ]
    );

    expect(template.id).toBeDefined();

    const createdTasks = await TaskService.createTasksFromTemplate(template.id, testProjectId, testAdminId);
    expect(createdTasks.length).toBe(2);
    expect(createdTasks[0].projectId).toBe(testProjectId);
  });

  // ==========================================
  // SECTION 14: TASK DELETION / CANCELLATION SAFETY
  // ==========================================

  it('46. Soft-deletes/cancels task preserving historical record and audit trail', async () => {
    const task = await TaskService.createTask({
      title: 'Task to be safely cancelled',
      createdById: testAdminId,
    });

    const cancelled = await TaskService.deleteTask(task.id, testAdminId);
    expect(cancelled.status).toBe('CANCELLED');

    // Confirm it still exists in database
    const dbRecord = await db.task.findUnique({ where: { id: task.id } });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.status).toBe('CANCELLED');
  });

  // ==========================================
  // SECTION 15: AUDIT LOG VERIFICATION
  // ==========================================

  it('47. Verifies TASK_CREATED audit logs exist with actor and entity data', async () => {
    const log = await db.auditLog.findFirst({
      where: { entityType: 'Task', action: 'TASK_CREATED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeDefined();
    expect(log?.userId).toBe(testAdminId);
  });

  it('48. Verifies TASK_STATUS_CHANGED audit logs exist', async () => {
    const log = await db.auditLog.findFirst({
      where: { entityType: 'Task', action: 'TASK_STATUS_CHANGED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeDefined();
  });

  it('49. Verifies TASK_BLOCKED and TASK_REOPENED audit logs exist', async () => {
    const blockLog = await db.auditLog.findFirst({
      where: { entityType: 'Task', action: 'TASK_BLOCKED' },
    });
    const reopenLog = await db.auditLog.findFirst({
      where: { entityType: 'Task', action: 'TASK_REOPENED' },
    });
    expect(blockLog).toBeDefined();
    expect(reopenLog).toBeDefined();
  });

  it('50. Verifies notification user preferences can be updated and queried', async () => {
    const updatedPref = await NotificationService.updatePreference(
      testEmployeeId,
      'TASKS',
      'IN_APP',
      true
    );
    expect(updatedPref.isEnabled).toBe(true);

    const prefs = await NotificationService.getUserPreferences(testEmployeeId);
    expect(prefs.some((p) => p.category === 'TASKS' && p.channel === 'IN_APP')).toBe(true);
  });
});
