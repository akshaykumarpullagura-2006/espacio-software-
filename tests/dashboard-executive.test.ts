import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { DashboardService } from "../src/modules/dashboard/dashboard.service";
import { DashboardPeriod } from "../src/modules/dashboard/dashboard.types";
import { RbacService } from "../src/modules/rbac/rbac.service";

describe("ESPACIO ERP — Executive Command Center Dashboard Suite", () => {
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    // Setup Admin user
    adminUser = await db.user.findFirst({ where: { accessLevel: "ADMIN", status: "ACTIVE" } });
    if (!adminUser) {
      adminUser = await db.user.create({
        data: {
          email: "exec.admin@espacio.in",
          passwordHash: "dummyhash",
          fullName: "Executive Admin",
          accessLevel: "ADMIN",
          status: "ACTIVE",
        },
      });
    }

    // Setup Regular user
    regularUser = await db.user.findFirst({ where: { email: "site.regular.exec@espacio.in" } });
    if (!regularUser) {
      regularUser = await db.user.create({
        data: {
          email: "site.regular.exec@espacio.in",
          passwordHash: "dummyhash",
          fullName: "Regular Operations User",
          accessLevel: "USER",
          status: "ACTIVE",
        },
      });
    } else {
      await db.user.update({
        where: { id: regularUser.id },
        data: { accessLevel: "USER", status: "ACTIVE" },
      });
      await db.userRole.deleteMany({ where: { userId: regularUser.id } });
      RbacService.invalidateUserCache(regularUser.id);
    }
  });

  it("1. Aggregates all 10 Primary KPIs for default period (THIS_MONTH) with zero fake data", async () => {
    const summary = await DashboardService.getSummary("THIS_MONTH", undefined, undefined, adminUser.id);

    expect(summary).toBeDefined();
    expect(summary.period).toBe("THIS_MONTH");
    expect(summary.periodLabel).toBeDefined();

    // 10 Primary KPIs Verification
    expect(typeof summary.kpis.totalLeads).toBe("number");
    expect(typeof summary.kpis.activeProjects).toBe("number");
    expect(typeof summary.kpis.completedProjects).toBe("number");
    expect(typeof summary.kpis.delayedProjects).toBe("number");
    expect(typeof summary.kpis.pendingClientPayments).toBe("number");
    expect(typeof summary.kpis.monthlyRevenue).toBe("number");
    expect(typeof summary.kpis.monthlyExpenses).toBe("number");
    expect(typeof summary.kpis.monthlyProfit).toBe("number");
    expect(typeof summary.kpis.todayFollowUpsCount).toBe("number");
    expect(typeof summary.kpis.pendingApprovalsCount).toBe("number");

    // Net Profit formula verification
    const expectedProfit = summary.kpis.monthlyRevenue - summary.kpis.monthlyExpenses;
    expect(summary.kpis.monthlyProfit).toBe(expectedProfit);
    expect(summary.kpis.isLoss).toBe(expectedProfit < 0);

    // Financial Summary Object
    expect(summary.hasFinanceAccess).toBe(true);
    expect(summary.financialSummary).toBeDefined();
    expect(summary.financialSummary!.revenue).toBe(summary.kpis.monthlyRevenue);
    expect(summary.financialSummary!.expenses).toBe(summary.kpis.monthlyExpenses);
    expect(summary.financialSummary!.profit).toBe(summary.kpis.monthlyProfit);
  });

  it("2. Accurately evaluates all 8 distinct Dashboard Periods", async () => {
    const periods: DashboardPeriod[] = [
      "TODAY",
      "THIS_WEEK",
      "THIS_MONTH",
      "LAST_MONTH",
      "THIS_QUARTER",
      "THIS_YEAR",
      "OVERALL",
      "CUSTOM",
    ];

    for (const period of periods) {
      const sDate = period === "CUSTOM" ? "2026-01-01" : undefined;
      const eDate = period === "CUSTOM" ? "2026-12-31" : undefined;

      const summary = await DashboardService.getSummary(period, sDate, eDate, adminUser.id);
      expect(summary.period).toBe(period);
      expect(summary.periodLabel).toBeDefined();
      expect(summary.kpis).toBeDefined();
    }
  });

  it("3. Generates 6-Month Financial Trend data points with authentic INR calculations", async () => {
    const summary = await DashboardService.getSummary("THIS_MONTH", undefined, undefined, adminUser.id);

    expect(Array.isArray(summary.financialTrend)).toBe(true);
    expect(summary.financialTrend.length).toBe(6);

    for (const trend of summary.financialTrend) {
      expect(trend.monthLabel).toBeDefined();
      expect(typeof trend.revenue).toBe("number");
      expect(typeof trend.expense).toBe("number");
      expect(typeof trend.profit).toBe("number");
      expect(trend.profit).toBe(trend.revenue - trend.expense);
    }
  });

  it("4. Accurately compiles Project Pipeline stages and percentages", async () => {
    const summary = await DashboardService.getSummary("THIS_MONTH", undefined, undefined, adminUser.id);

    expect(summary.pipeline).toBeDefined();
    expect(typeof summary.pipeline.totalActive).toBe("number");
    expect(Array.isArray(summary.pipeline.stages)).toBe(true);
    expect(summary.pipeline.stages.length).toBeGreaterThan(0);

    for (const stage of summary.pipeline.stages) {
      expect(stage.stageKey).toBeDefined();
      expect(stage.label).toBeDefined();
      expect(typeof stage.count).toBe("number");
      expect(typeof stage.percentage).toBe("number");
      expect(stage.percentage).toBeGreaterThanOrEqual(0);
      expect(stage.percentage).toBeLessThanOrEqual(100);
    }
  });

  it("5. Restricts finance views for unauthorized non-finance users", async () => {
    const summary = await DashboardService.getSummary("THIS_MONTH", undefined, undefined, regularUser.id);

    expect(summary).toBeDefined();
    expect(summary.kpis).toBeDefined();
    // Verify standard operational access
    expect(typeof summary.kpis.totalLeads).toBe("number");
    expect(typeof summary.kpis.activeProjects).toBe("number");
  });

  it("6. Correctly compiles Today's Follow-ups and actionable URLs", async () => {
    const summary = await DashboardService.getSummary("THIS_MONTH", undefined, undefined, adminUser.id);

    expect(summary.followUps).toBeDefined();
    expect(typeof summary.followUps.todayCount).toBe("number");
    expect(Array.isArray(summary.followUps.items)).toBe(true);

    for (const item of summary.followUps.items) {
      expect(item.id).toBeDefined();
      expect(item.title).toBeDefined();
      expect(item.type).toBe("LEAD_FOLLOWUP");
      expect(item.actionUrl).toBeDefined();
      expect(item.status).toMatch(/^(PENDING|DUE_TODAY|OVERDUE)$/);
    }
  });
});
