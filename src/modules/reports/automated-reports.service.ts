import { db } from "@/lib/db";
import { EmailService } from "@/lib/email.service";

export class AutomatedReportsService {
  public static async generateDailyReport() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayPayments, todayExpenses, newLeads, activeProjects] = await Promise.all([
      db.clientPayment.aggregate({
        _sum: { amount: true },
        where: { paymentDate: { gte: todayStart }, status: "VERIFIED" },
      }),
      db.expense.aggregate({
        _sum: { amount: true },
        where: { expenseDate: { gte: todayStart }, status: { in: ["APPROVED", "PAID"] } },
      }),
      db.lead.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.project.count({
        where: { stage: { notIn: ["COMPLETED", "WARRANTY"] } },
      }),
    ]);

    const revenue = todayPayments._sum.amount ?? 0;
    const expenses = todayExpenses._sum.amount ?? 0;
    const period = todayStart.toISOString().split("T")[0];

    const reportSummary = {
      reportType: "Daily Executive Summary",
      period,
      revenue: `₹${revenue.toLocaleString("en-IN")}`,
      expenses: `₹${expenses.toLocaleString("en-IN")}`,
      newLeads,
      activeProjects,
    };

    // Dispatch executive summary email
    await EmailService.sendTemplatedEmail({
      eventType: "REPORT_READY",
      recipientEmail: "leadership@espacio.com",
      variables: {
        reportType: "Daily Executive Summary",
        period,
        amount: `₹${revenue.toLocaleString("en-IN")}`,
        userName: "Leadership Team",
      },
    });

    return reportSummary;
  }

  public static async generateMonthlyReport() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [monthlyPayments, monthlyExpenses, wonLeads, completedProjects] = await Promise.all([
      db.clientPayment.aggregate({
        _sum: { amount: true },
        where: { paymentDate: { gte: monthStart }, status: "VERIFIED" },
      }),
      db.expense.aggregate({
        _sum: { amount: true },
        where: { expenseDate: { gte: monthStart }, status: { in: ["APPROVED", "PAID"] } },
      }),
      db.lead.count({
        where: { stage: "WON", updatedAt: { gte: monthStart } },
      }),
      db.project.count({
        where: { stage: "COMPLETED", updatedAt: { gte: monthStart } },
      }),
    ]);

    const revenue = monthlyPayments._sum.amount ?? 0;
    const expenses = monthlyExpenses._sum.amount ?? 0;
    const profit = revenue - expenses;
    const period = `${monthStart.toLocaleString("default", { month: "long" })} ${monthStart.getFullYear()}`;

    const reportSummary = {
      reportType: "Monthly Financial & Operational Report",
      period,
      revenue: `₹${revenue.toLocaleString("en-IN")}`,
      expenses: `₹${expenses.toLocaleString("en-IN")}`,
      profit: `₹${profit.toLocaleString("en-IN")}`,
      wonLeads,
      completedProjects,
    };

    await EmailService.sendTemplatedEmail({
      eventType: "REPORT_READY",
      recipientEmail: "leadership@espacio.com",
      variables: {
        reportType: "Monthly Executive Report",
        period,
        amount: `₹${profit.toLocaleString("en-IN")}`,
        userName: "Leadership Team",
      },
    });

    return reportSummary;
  }
}
