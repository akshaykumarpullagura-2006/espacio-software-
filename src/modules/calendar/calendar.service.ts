import { db } from "@/lib/db";

export interface CalendarFilterParams {
  startDate: Date;
  endDate: Date;
  category?: string; // ALL, TASKS, PROJECTS, FINANCE, PROCUREMENT, REMINDERS
  search?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO String
  sourceType:
    | "TASK"
    | "PROJECT_MILESTONE"
    | "PAYMENT_DUE"
    | "PO_DELIVERY"
    | "QUOTATION_EXPIRY"
    | "REMINDER"
    | "LEAD_FOLLOW_UP"
    | "SITE_VISIT"
    | "MEETING";
  sourceId: string;
  referenceNo?: string;
  actionUrl: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: string;
  category: "TASKS" | "PROJECTS" | "FINANCE" | "PROCUREMENT" | "CRM" | "REMINDERS" | "MEETINGS" | "SITE_VISITS";
}

export class CalendarService {
  public static async getCalendarEvents(params: CalendarFilterParams): Promise<CalendarEvent[]> {
    const { startDate, endDate, category, search } = params;
    const events: CalendarEvent[] = [];

    const searchFilter = search && search.trim() ? search.trim().toLowerCase() : null;

    // 1. TASKS
    if (!category || category === "ALL" || category === "TASKS") {
      const tasks = await db.task.findMany({
        where: {
          OR: [
            { dueAt: { gte: startDate, lte: endDate } },
            { startDate: { gte: startDate, lte: endDate } },
          ],
        },
        include: { project: { select: { referenceNo: true } } },
      });

      for (const t of tasks) {
        const targetDate = t.dueAt || t.startDate;
        if (!targetDate) continue;

        if (searchFilter && !t.title.toLowerCase().includes(searchFilter) && !t.referenceNo.toLowerCase().includes(searchFilter)) {
          continue;
        }

        events.push({
          id: `tsk_${t.id}`,
          title: t.title,
          date: targetDate.toISOString(),
          sourceType: "TASK",
          sourceId: t.id,
          referenceNo: t.referenceNo,
          actionUrl: `/tasks?id=${t.id}`,
          priority: (t.priority as any) || "NORMAL",
          status: t.status,
          category: "TASKS",
        });
      }
    }

    // 2. PROJECT MILESTONES / HANDOVERS
    if (!category || category === "ALL" || category === "PROJECTS") {
      const projects = await db.project.findMany({
        where: {
          handoverDate: { gte: startDate, lte: endDate },
        },
      });

      for (const p of projects) {
        if (!p.handoverDate) continue;
        if (searchFilter && !p.title.toLowerCase().includes(searchFilter) && !p.referenceNo.toLowerCase().includes(searchFilter)) {
          continue;
        }

        events.push({
          id: `proj_${p.id}`,
          title: `Project Handover: ${p.title}`,
          date: p.handoverDate.toISOString(),
          sourceType: "PROJECT_MILESTONE",
          sourceId: p.id,
          referenceNo: p.referenceNo,
          actionUrl: `/projects?id=${p.id}`,
          priority: "HIGH",
          status: p.stage,
          category: "PROJECTS",
        });
      }
    }

    // 3. FINANCIAL RECEIVABLES / CLIENT PAYMENT DUE DATES
    if (!category || category === "ALL" || category === "FINANCE") {
      const receivables = await db.clientReceivable.findMany({
        where: {
          dueDate: { gte: startDate, lte: endDate },
          status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] },
        },
        include: { client: { select: { fullName: true } } },
      });

      for (const r of receivables) {
        if (!r.dueDate) continue;
        if (searchFilter && !r.receivableNo.toLowerCase().includes(searchFilter)) {
          continue;
        }

        const clientName = r.client?.fullName || "Client";

        events.push({
          id: `rec_${r.id}`,
          title: `Client Payment Due: ₹${r.outstandingAmount.toLocaleString()} (${clientName})`,
          date: r.dueDate.toISOString(),
          sourceType: "PAYMENT_DUE",
          sourceId: r.id,
          referenceNo: r.receivableNo,
          actionUrl: `/finance/receivables`,
          priority: "HIGH",
          status: r.status,
          category: "FINANCE",
        });
      }
    }

    // 4. PURCHASE ORDER DELIVERIES
    if (!category || category === "ALL" || category === "PROCUREMENT") {
      const orders = await db.purchaseOrder.findMany({
        where: {
          expectedDeliveryDate: { gte: startDate, lte: endDate },
          status: { in: ["ISSUED", "SENT", "PARTIALLY_RECEIVED"] },
        },
        include: { vendor: { select: { name: true } } },
      });

      for (const po of orders) {
        if (!po.expectedDeliveryDate) continue;
        if (searchFilter && !po.referenceNo.toLowerCase().includes(searchFilter)) {
          continue;
        }

        events.push({
          id: `po_${po.id}`,
          title: `PO Delivery Expected: ${po.referenceNo} (${po.vendor.name})`,
          date: po.expectedDeliveryDate.toISOString(),
          sourceType: "PO_DELIVERY",
          sourceId: po.id,
          referenceNo: po.referenceNo,
          actionUrl: `/procurement/purchase-orders`,
          priority: "NORMAL",
          status: po.status,
          category: "PROCUREMENT",
        });
      }
    }

    // 5. QUOTATIONS
    if (!category || category === "ALL" || category === "CRM") {
      const quotations = await db.quotation.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: "SENT",
        },
      });

      for (const q of quotations) {
        if (searchFilter && !q.referenceNo.toLowerCase().includes(searchFilter)) {
          continue;
        }

        events.push({
          id: `quo_${q.id}`,
          title: `Quotation Sent: ${q.referenceNo}`,
          date: q.createdAt.toISOString(),
          sourceType: "QUOTATION_EXPIRY",
          sourceId: q.id,
          referenceNo: q.referenceNo,
          actionUrl: `/quotations`,
          priority: "NORMAL",
          status: q.status,
          category: "CRM",
        });
      }
    }

    // 6. REMINDERS
    if (!category || category === "ALL" || category === "REMINDERS") {
      const reminders = await db.reminder.findMany({
        where: {
          dueAt: { gte: startDate, lte: endDate },
          status: { in: ["PENDING", "OVERDUE"] },
        },
      });

      for (const rem of reminders) {
        if (searchFilter && !rem.title.toLowerCase().includes(searchFilter) && !rem.referenceNo.toLowerCase().includes(searchFilter)) {
          continue;
        }

        events.push({
          id: `rem_${rem.id}`,
          title: `Reminder: ${rem.title}`,
          date: rem.dueAt.toISOString(),
          sourceType: "REMINDER",
          sourceId: rem.id,
          referenceNo: rem.referenceNo,
          actionUrl: rem.actionUrl || `/notifications`,
          priority: (rem.priority as any) || "NORMAL",
          status: rem.status,
          category: "REMINDERS",
        });
      }
    }

    // 7. LEAD FOLLOW-UPS (CALLS, MEETINGS, REVIEWS)
    if (!category || category === "ALL" || category === "CRM" || category === "MEETINGS") {
      const followUps = await db.leadFollowUp.findMany({
        where: {
          followUpDate: { gte: startDate, lte: endDate },
        },
        include: {
          lead: { select: { referenceNo: true, clientName: true } },
          assignedTo: { select: { fullName: true } },
        },
      });

      for (const f of followUps) {
        if (searchFilter && !f.lead.clientName.toLowerCase().includes(searchFilter) && !f.lead.referenceNo.toLowerCase().includes(searchFilter)) {
          continue;
        }

        events.push({
          id: `lfu_${f.id}`,
          title: `Lead Follow-up (${f.type}): ${f.lead.clientName}`,
          date: f.followUpDate.toISOString(),
          sourceType: "LEAD_FOLLOW_UP",
          sourceId: f.id,
          referenceNo: f.lead.referenceNo,
          actionUrl: `/leads?id=${f.leadId}`,
          priority: "NORMAL",
          status: f.status,
          category: "CRM",
        });
      }
    }

    // 8. SITE VISITS (LEAD & PROJECT SITE VISITS)
    if (!category || category === "ALL" || category === "CRM" || category === "SITE_VISITS") {
      const siteVisits = await db.leadSiteVisit.findMany({
        where: {
          visitDate: { gte: startDate, lte: endDate },
        },
        include: {
          lead: { select: { referenceNo: true, clientName: true, location: true } },
          assignedTo: { select: { fullName: true } },
        },
      });

      for (const sv of siteVisits) {
        if (searchFilter && !sv.lead.clientName.toLowerCase().includes(searchFilter) && !sv.lead.referenceNo.toLowerCase().includes(searchFilter)) {
          continue;
        }

        events.push({
          id: `lsv_${sv.id}`,
          title: `Site Visit: ${sv.lead.clientName} (${sv.lead.location || "Location"})`,
          date: sv.visitDate.toISOString(),
          sourceType: "SITE_VISIT",
          sourceId: sv.id,
          referenceNo: sv.lead.referenceNo,
          actionUrl: `/leads?id=${sv.leadId}`,
          priority: "HIGH",
          status: sv.status,
          category: "SITE_VISITS",
        });
      }
    }

    // Sort all events chronologically by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return events;
  }
}
