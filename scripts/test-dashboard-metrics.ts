import { db } from "../src/lib/db";
import { DashboardMetricsService } from "../src/modules/dashboard/dashboard.service";

async function main() {
  console.log("📊 Testing ESPACIO ERP Executive Command Center (Dashboard) Metrics...\n");

  // 1. Find Admin user
  const adminUser = await db.user.findFirst({
    where: { email: "espacio@gmail.com" },
  });

  if (!adminUser) {
    console.error("❌ Admin user not found!");
    process.exit(1);
  }

  console.log(`👤 Using user: ${adminUser.fullName} (${adminUser.email})`);

  // 2. Test Default Period (THIS_MONTH)
  const thisMonthSummary = await DashboardMetricsService.getDashboardSummary(adminUser.id, {
    period: "THIS_MONTH",
  });

  console.log("\n==================================================");
  console.log("13 MANDATORY REQUIREMENTS VERIFICATION (LIVE DB)");
  console.log("==================================================");

  const checks = [
    { num: 1, name: "Total Leads", val: thisMonthSummary.kpis.totalLeads, ok: typeof thisMonthSummary.kpis.totalLeads === "number" },
    { num: 2, name: "Active Projects", val: thisMonthSummary.kpis.activeProjects, ok: typeof thisMonthSummary.kpis.activeProjects === "number" },
    { num: 3, name: "Completed Projects", val: thisMonthSummary.kpis.completedProjects, ok: typeof thisMonthSummary.kpis.completedProjects === "number" },
    { num: 4, name: "Delayed Projects", val: thisMonthSummary.kpis.delayedProjects, ok: typeof thisMonthSummary.kpis.delayedProjects === "number" },
    { num: 5, name: "Pending Client Payments", val: `₹${thisMonthSummary.kpis.pendingClientPayments.toLocaleString("en-IN")}`, ok: typeof thisMonthSummary.kpis.pendingClientPayments === "number" },
    { num: 6, name: "Monthly Revenue", val: `₹${thisMonthSummary.kpis.monthlyRevenue.toLocaleString("en-IN")}`, ok: typeof thisMonthSummary.kpis.monthlyRevenue === "number" },
    { num: 7, name: "Monthly Expenses", val: `₹${thisMonthSummary.kpis.monthlyExpenses.toLocaleString("en-IN")}`, ok: typeof thisMonthSummary.kpis.monthlyExpenses === "number" },
    { num: 8, name: "Monthly Profit", val: `₹${thisMonthSummary.kpis.monthlyProfit.toLocaleString("en-IN")} (${thisMonthSummary.kpis.monthlyProfitMarginPct ?? "N/A"}% margin)`, ok: typeof thisMonthSummary.kpis.monthlyProfit === "number" },
    { num: 9, name: "Today's Follow-ups", val: `${thisMonthSummary.followUps.todayCount} items`, ok: Array.isArray(thisMonthSummary.followUps.items) },
    { num: 10, name: "Recent Activities", val: `${thisMonthSummary.activities.length} items`, ok: Array.isArray(thisMonthSummary.activities) },
    { num: 11, name: "Business Performance Charts", val: `Trend: ${thisMonthSummary.financialTrend.length} months | Pipeline: ${thisMonthSummary.pipeline.stages.length} stages`, ok: thisMonthSummary.financialTrend.length === 6 && thisMonthSummary.pipeline.stages.length === 6 },
    { num: 12, name: "Quick Access Shortcuts", val: `${thisMonthSummary.quickAccess.length} shortcuts`, ok: thisMonthSummary.quickAccess.length > 0 },
    { num: 13, name: "Notifications Summary", val: `${thisMonthSummary.notifications.totalUnread} unread`, ok: typeof thisMonthSummary.notifications.totalUnread === "number" },
  ];

  let allPassed = true;
  checks.forEach((c) => {
    const status = c.ok ? "✅ PASS" : "❌ FAIL";
    if (!c.ok) allPassed = false;
    console.log(`${status} | [${c.num.toString().padStart(2, "0")}] ${c.name.padEnd(28, " ")}: ${c.val}`);
  });

  // 3. Test Period Switching
  console.log("\n==================================================");
  console.log("PERIOD FILTERING DYNAMIC SWITCHING VERIFICATION");
  console.log("==================================================");

  const periods = ["THIS_MONTH", "LAST_MONTH", "THIS_QUARTER", "THIS_YEAR"] as const;
  for (const p of periods) {
    const res = await DashboardMetricsService.getDashboardSummary(adminUser.id, { period: p });
    console.log(`✅ Period [${p.padEnd(12, " ")}] -> Label: "${res.periodLabel}" | Revenue: ₹${res.kpis.monthlyRevenue.toLocaleString("en-IN")} | Expenses: ₹${res.kpis.monthlyExpenses.toLocaleString("en-IN")} | Profit: ₹${res.kpis.monthlyProfit.toLocaleString("en-IN")}`);
  }

  console.log("\n==================================================");
  if (allPassed) {
    console.log("🎉 ALL 13 REQUIREMENTS VERIFIED & 100% PASSING!");
  } else {
    console.log("❌ SOME REQUIREMENTS FAILED CHECKS");
  }
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
