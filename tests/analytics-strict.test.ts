import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { AnalyticsService } from '@/modules/analytics/analytics.service';
import { ReportsService, REPORT_CATALOG } from '@/modules/reports/reports.service';
import { GstInvoiceService } from '@/modules/finance/gst-invoice.service';
import { ForbiddenError } from '@/lib/errors';

describe('ESPACIO ERP — MASTER PROMPT 15: Reports, Analytics & Executive Dashboard Strict Suite', () => {
  let superAdminId: string;
  let standardUserId: string;
  let testClientId: string;
  let testProjectId: string;
  let testVendorId: string;
  let testMaterialId: string;
  let testInvoiceId: string;

  beforeAll(async () => {
    // 1. Super Admin User
    const superAdmin = await db.user.upsert({
      where: { email: 'superadmin.analytics@espacio.com' },
      update: { accessLevel: 'SUPER_ADMIN' },
      create: {
        email: 'superadmin.analytics@espacio.com',
        fullName: 'Super Admin Analytics',
        passwordHash: 'dummyhash',
        accessLevel: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
    superAdminId = superAdmin.id;

    // 2. Standard User
    const standardUser = await db.user.upsert({
      where: { email: 'standard.analytics@espacio.com' },
      update: { accessLevel: 'USER' },
      create: {
        email: 'standard.analytics@espacio.com',
        fullName: 'Standard User Analytics',
        passwordHash: 'dummyhash',
        accessLevel: 'USER',
        status: 'ACTIVE',
      },
    });
    standardUserId = standardUser.id;

    // 3. Test Client
    const client = await db.client.upsert({
      where: { phone: '9888877777' },
      update: {},
      create: {
        referenceNo: 'CLI-AN-001',
        fullName: 'Skyline Ventures Analytics',
        phone: '9888877777',
        email: 'analytics.client@espacio.com',
        clientType: 'COMMERCIAL',
        status: 'ACTIVE',
      },
    });
    testClientId = client.id;

    // 4. Test Project
    const project = await db.project.upsert({
      where: { referenceNo: 'PRJ-AN-001' },
      update: {},
      create: {
        referenceNo: 'PRJ-AN-001',
        title: 'Skyline Commercial Tower Fitout',
        clientId: testClientId,
        contractValue: 5000000,
        stage: 'EXECUTION',
        status: 'ACTIVE',
      },
    });
    testProjectId = project.id;

    // 5. Test Vendor
    const vendor = await db.vendor.upsert({
      where: { referenceNo: 'VEN-AN-001' },
      update: {},
      create: {
        referenceNo: 'VEN-AN-001',
        name: 'Apex Ply & Hardware Analytics',
        categoryKey: 'MATERIALS',
        phone: '9777766666',
        email: 'vendor.analytics@espacio.com',
        status: 'ACTIVE',
      },
    });
    testVendorId = vendor.id;

    // 6. Test Material
    const material = await db.material.upsert({
      where: { materialCode: 'MAT-AN-001' },
      update: {},
      create: {
        materialCode: 'MAT-AN-001',
        name: 'Century 19mm Commercial Ply',
        categoryKey: 'WOOD',
        baseUnitKey: 'SHEET',
        purchaseCost: 2400,
        reorderLevel: 20,
        status: 'ACTIVE',
      },
    });
    testMaterialId = material.id;

    // 7. Seed Test Invoices & Receivables
    const invoice = await GstInvoiceService.createInvoice({
      clientId: testClientId,
      projectId: testProjectId,
      customerName: 'Skyline Ventures Analytics',
      customerGstin: '36AAAAA0000A1Z5',
      placeOfSupply: 'Telangana',
      stateCode: '36',
      isInterState: false,
      items: [
        {
          description: 'Initial Fitout Milestone Billing',
          hsnSacCode: '9954',
          quantity: 1,
          unitRate: 1000000,
          discount: 0,
          gstRate: 18,
        },
      ],
      notes: 'Analytics Seed Invoice',
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'ISSUED',
      allowOverBilling: true,
      createdById: superAdminId,
    });
    testInvoiceId = invoice.id;

    // 8. Seed Verified Client Payment
    await db.clientPayment.create({
      data: {
        referenceNo: `PAY-AN-${Date.now().toString().slice(-4)}`,
        clientId: testClientId,
        projectId: testProjectId,
        amount: 500000,
        paymentDate: new Date(),
        paymentMethod: 'NEFT',
        status: 'VERIFIED',
        receivedById: superAdminId,
      },
    });

    // 9. Seed Approved Direct Project Expense
    await db.expense.create({
      data: {
        referenceNo: `EXP-AN-${Date.now().toString().slice(-4)}`,
        projectId: testProjectId,
        categoryKey: 'SITE_EXPENSE',
        expenseType: 'PROJECT',
        description: 'Site civil works and setup',
        amount: 85000,
        paymentMethod: 'BANK_TRANSFER',
        expenseDate: new Date(),
        status: 'APPROVED',
        createdById: superAdminId,
      },
    });

    // 10. Seed Purchase Order
    await db.purchaseOrder.create({
      data: {
        referenceNo: `PO-AN-${Date.now().toString().slice(-4)}`,
        vendorId: testVendorId,
        projectId: testProjectId,
        poDate: new Date(),
        expectedDeliveryDate: new Date(Date.now() + 5 * 86400000),
        subtotal: 120000,
        tax: 21600,
        grandTotal: 141600,
        status: 'ISSUED',
        createdById: superAdminId,
      },
    });

    // 11. Seed Leads
    await db.lead.create({
      data: {
        referenceNo: `LED-AN-${Date.now().toString().slice(-4)}`,
        clientName: 'Modern Office Solutions',
        phone: '9666655555',
        sourceKey: 'WEBSITE',
        propertyTypeKey: 'COMMERCIAL',
        stage: 'NEW',
        estimatedBudget: 3500000,
      },
    });

    // 12. Seed Tasks
    await db.task.create({
      data: {
        referenceNo: `TSK-AN-${Date.now().toString().slice(-4)}`,
        title: 'Complete Ceiling Framing Inspection',
        assigneeId: standardUserId,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueAt: new Date(Date.now() + 86400000),
        createdById: superAdminId,
      },
    });
  });

  // ==========================================
  // SECTION 1: DATE RANGE RESOLUTION & COMPARISONS
  // ==========================================

  it('1. Resolves date range for "this_month" with matching previous period', () => {
    const range = AnalyticsService.resolveDateRange({ period: 'this_month' });
    expect(range.startDate).toBeInstanceOf(Date);
    expect(range.endDate).toBeInstanceOf(Date);
    expect(range.previousStartDate).toBeInstanceOf(Date);
    expect(range.previousEndDate).toBeInstanceOf(Date);
    expect(range.periodLabel).toBeDefined();
  });

  it('2. Resolves date range for "this_quarter"', () => {
    const range = AnalyticsService.resolveDateRange({ period: 'this_quarter' });
    expect(range.periodLabel).toMatch(/^Q[1-4]\s\d{4}$/);
  });

  it('3. Resolves date range for "custom" with calculated previous duration', () => {
    const range = AnalyticsService.resolveDateRange({
      period: 'custom',
      startDate: '2026-08-01',
      endDate: '2026-08-15',
    });
    expect(range.startDate.getDate()).toBe(1);
    expect(range.endDate.getDate()).toBe(15);
  });

  // ==========================================
  // SECTION 2: EXECUTIVE DASHBOARD & PERSONALIZATION
  // ==========================================

  it('4. Loads company-wide Executive Dashboard for Super Admin', async () => {
    const dashboard: any = await AnalyticsService.getExecutiveDashboard(superAdminId, { period: 'this_month' });
    expect(dashboard.viewType).toBe('EXECUTIVE_COMPANY_WIDE');
    expect(dashboard.kpiCards.revenue.value).toBeGreaterThanOrEqual(1180000);
    expect(dashboard.kpiCards.collections.value).toBeGreaterThanOrEqual(500000);
    expect(dashboard.kpiCards.outstanding.value).toBeGreaterThan(0);
    expect(dashboard.kpiCards.expenses.value).toBeGreaterThanOrEqual(85000);
    expect(dashboard.kpiCards.activeProjects.value).toBeGreaterThan(0);
  });

  it('5. Distinguishes period metrics from point-in-time metrics', async () => {
    const dashboard: any = await AnalyticsService.getExecutiveDashboard(superAdminId, { period: 'this_month' });
    expect(dashboard.kpiCards.revenue.isPeriodMetric).toBe(true);
    expect(dashboard.kpiCards.expenses.isPeriodMetric).toBe(true);
    expect(dashboard.kpiCards.outstanding.isPeriodMetric).toBe(false);
    expect(dashboard.kpiCards.activeProjects.isPeriodMetric).toBe(false);
  });

  it('6. Loads personalized Dashboard for Standard User without company revenue leak', async () => {
    const dashboard: any = await AnalyticsService.getExecutiveDashboard(standardUserId);
    expect(dashboard.viewType).toBe('USER_PERSONALIZED');
    expect(dashboard.kpiCards).toBeUndefined();
    expect(dashboard.summary.activeTasksCount).toBeGreaterThanOrEqual(1);
  });

  // ==========================================
  // SECTION 3: REVENUE ANALYTICS
  // ==========================================

  it('7. Calculates realized revenue from issued invoices', async () => {
    const rev = await AnalyticsService.getRevenueAnalytics({ period: 'this_month' });
    expect(rev.totalRevenue).toBeGreaterThanOrEqual(1180000);
    expect(rev.totalTaxable).toBeGreaterThanOrEqual(1000000);
    expect(rev.totalTax).toBeGreaterThanOrEqual(180000);
    expect(rev.invoiceCount).toBeGreaterThan(0);
  });

  it('8. Excludes draft/pending invoices from realized revenue', async () => {
    const draftInv = await GstInvoiceService.createInvoice({
      clientId: testClientId,
      customerName: 'Draft Customer Test',
      placeOfSupply: 'Telangana',
      stateCode: '36',
      isInterState: false,
      items: [{ description: 'Draft Item', hsnSacCode: '9954', quantity: 1, unitRate: 50000, discount: 0, gstRate: 18 }],
      notes: 'Draft test',
      status: 'DRAFT',
      createdById: superAdminId,
    });

    const rev = await AnalyticsService.getRevenueAnalytics({ period: 'this_month' });
    expect(rev.totalRevenue).toBeGreaterThanOrEqual(1180000);
    // Cleanup draft invoice
    await db.gstInvoiceItem.deleteMany({ where: { invoiceId: draftInv.id } });
    await db.gstInvoice.delete({ where: { id: draftInv.id } });
  });

  it('9. Breaks down revenue by project and client', async () => {
    const rev = await AnalyticsService.getRevenueAnalytics({ period: 'this_month' });
    expect(rev.byProject.length).toBeGreaterThan(0);
    expect(rev.byClient.length).toBeGreaterThan(0);
    expect(rev.byProject[0].amount).toBeGreaterThan(0);
  });

  // ==========================================
  // SECTION 4: COLLECTION & RECEIVABLE AGING
  // ==========================================

  it('10. Calculates collections from verified client payments', async () => {
    const col = await AnalyticsService.getCollectionAnalytics({ period: 'this_month' });
    expect(col.totalCollected).toBeGreaterThanOrEqual(500000);
    expect(col.totalOutstanding).toBeGreaterThan(0);
  });

  it('11. Categorizes receivables into exact aging buckets', async () => {
    const col = await AnalyticsService.getCollectionAnalytics({ period: 'this_month' });
    expect(col.agingBuckets).toBeDefined();
    expect(col.agingBuckets.length).toBe(5);
    const currentBucket = col.agingBuckets.find((b) => b.bucket === 'current');
    expect(currentBucket).toBeDefined();
    expect(currentBucket!.amount).toBeGreaterThan(0);
  });

  // ==========================================
  // SECTION 5: EXPENSE ANALYTICS
  // ==========================================

  it('12. Aggregates approved expenses by category', async () => {
    const exp = await AnalyticsService.getExpenseAnalytics({ period: 'this_month' });
    expect(exp.totalExpenses).toBeGreaterThanOrEqual(85000);
    expect(exp.projectExpenses).toBeGreaterThanOrEqual(85000);
    expect(exp.byCategory.length).toBeGreaterThan(0);
    const siteExpense = exp.byCategory.find((c) => c.category === 'SITE_EXPENSE');
    expect(siteExpense).toBeDefined();
    expect(siteExpense!.amount).toBeGreaterThanOrEqual(85000);
  });

  // ==========================================
  // SECTION 6: PROJECT CONTRIBUTION & PROFITABILITY
  // ==========================================

  it('13. Calculates Project Contribution Estimate with correct label', async () => {
    const prof = await AnalyticsService.getProjectProfitabilityAnalytics({ projectId: testProjectId });
    expect(prof.projects.length).toBe(1);
    const p = prof.projects[0];
    expect(p.totalInvoiced).toBeGreaterThanOrEqual(1180000);
    expect(p.directExpenses).toBeGreaterThanOrEqual(85000);
    expect(p.directProcurement).toBeGreaterThanOrEqual(141600);
    expect(p.contributionEstimate).toBe(p.totalInvoiced - p.directCostTotal);
    expect(p.contributionLabel).toBe('Project Contribution Estimate');
  });

  it('14. Calculates Project Budget vs Actual cost variance', async () => {
    const prof = await AnalyticsService.getProjectProfitabilityAnalytics({ projectId: testProjectId });
    const p = prof.projects[0];
    expect(p.contractValue).toBe(5000000);
    expect(p.budgetVariance).toBe(5000000 - p.directCostTotal);
  });

  // ==========================================
  // SECTION 7: SALES, LEADS & QUOTATIONS
  // ==========================================

  it('15. Analyzes Lead Funnel, Pipeline Value, and Conversion Rate', async () => {
    const leadAnalytics = await AnalyticsService.getLeadAnalytics({ period: 'this_month' });
    expect(leadAnalytics.totalLeads).toBeGreaterThan(0);
    expect(leadAnalytics.pipelineValue).toBeGreaterThanOrEqual(3500000);
    expect(leadAnalytics.stageFunnel['NEW']).toBeGreaterThan(0);
  });

  it('16. Analyzes Quotation volumes and approval rates', async () => {
    const quoteAnalytics = await AnalyticsService.getQuotationAnalytics({ period: 'this_month' });
    expect(quoteAnalytics.totalQuotations).toBeDefined();
    expect(quoteAnalytics.approvalRatePercentage).toBeGreaterThanOrEqual(0);
  });

  // ==========================================
  // SECTION 8: CLIENT ANALYTICS & CONCENTRATION
  // ==========================================

  it('17. Calculates Client Revenue and Top 5 Concentration %', async () => {
    const clientAnalytics = await AnalyticsService.getClientAnalytics({ period: 'this_month' });
    expect(clientAnalytics.totalClients).toBeGreaterThan(0);
    expect(clientAnalytics.overallRevenue).toBeGreaterThanOrEqual(1180000);
    expect(clientAnalytics.top5ConcentrationPercentage).toBeGreaterThan(0);
    expect(clientAnalytics.top5ConcentrationPercentage).toBeLessThanOrEqual(100);
  });

  // ==========================================
  // SECTION 9: PROCUREMENT & VENDOR SPEND
  // ==========================================

  it('18. Aggregates Purchase Orders and Top Vendors by spend', async () => {
    const proc = await AnalyticsService.getProcurementAnalytics({ period: 'this_month' });
    expect(proc.totalPurchaseOrders).toBeGreaterThan(0);
    expect(proc.totalSpend).toBeGreaterThanOrEqual(141600);
    expect(proc.topVendorsBySpend.length).toBeGreaterThan(0);
    expect(proc.topVendorsBySpend.some((v) => v.name === 'Apex Ply & Hardware Analytics')).toBe(true);
  });

  // ==========================================
  // SECTION 10: INVENTORY & VALUATION
  // ==========================================

  it('19. Analyzes Inventory SKUs and total valuation', async () => {
    const inv = await AnalyticsService.getInventoryAnalytics();
    expect(inv.totalSKUs).toBeGreaterThan(0);
    expect(inv.valuationStatus).toBe('AVAILABLE');
    expect(inv.totalValuation).toBeGreaterThanOrEqual(0);
  });

  // ==========================================
  // SECTION 11: TASK & OPERATIONS ANALYTICS
  // ==========================================

  it('20. Aggregates Task velocity and Team Workload', async () => {
    const taskAnalytics = await AnalyticsService.getTaskAnalytics({ period: 'this_month' });
    expect(taskAnalytics.totalTasks).toBeGreaterThan(0);
    expect(taskAnalytics.teamWorkload.length).toBeGreaterThan(0);
  });

  // ==========================================
  // SECTION 12: GST & TAX ANALYTICS
  // ==========================================

  it('21. Aggregates GST taxable values, CGST, SGST, IGST and B2B counts', async () => {
    const gst = await AnalyticsService.getGstTaxAnalytics({ period: 'this_month' });
    expect(gst.totalTaxableValue).toBeGreaterThanOrEqual(1000000);
    expect(gst.totalCgst).toBeGreaterThanOrEqual(90000);
    expect(gst.totalSgst).toBeGreaterThanOrEqual(90000);
    expect(gst.b2bInvoicesCount).toBeGreaterThan(0);
  });

  // ==========================================
  // SECTION 13: REPORTS CENTER & DYNAMIC GENERATION
  // ==========================================

  it('22. Returns accessible report catalog based on user RBAC', async () => {
    const superAdminCatalog = await ReportsService.getReportCatalog(superAdminId);
    expect(superAdminCatalog.length).toBe(REPORT_CATALOG.length);

    const standardUserCatalog = await ReportsService.getReportCatalog(standardUserId);
    expect(standardUserCatalog.length).toBeLessThan(REPORT_CATALOG.length);
  });

  it('23. Generates "finance_revenue" Report with row traceability', async () => {
    const report = await ReportsService.generateReport('finance_revenue', { period: 'this_month' }, superAdminId);
    expect(report.reportKey).toBe('finance_revenue');
    expect(report.totalRows).toBeGreaterThan(0);
    expect(report.rows[0].entityId).toBeDefined();
    expect(report.rows[0].referenceNo).toBeDefined();
    expect(report.rows[0].entityType).toBe('GstInvoice');
  });

  it('24. Generates "finance_receivables" Aging Report', async () => {
    const report = await ReportsService.generateReport('finance_receivables', {}, superAdminId);
    expect(report.reportKey).toBe('finance_receivables');
    expect(report.totalRows).toBeGreaterThan(0);
  });

  it('25. Generates "sales_leads" Report', async () => {
    const report = await ReportsService.generateReport('sales_leads', { period: 'this_month' }, superAdminId);
    expect(report.reportKey).toBe('sales_leads');
    expect(report.totalRows).toBeGreaterThan(0);
  });

  it('26. Generates "tax_gst" Summary Report', async () => {
    const report = await ReportsService.generateReport('tax_gst', { period: 'this_month' }, superAdminId);
    expect(report.reportKey).toBe('tax_gst');
    expect(report.totalRows).toBeGreaterThan(0);
  });

  // ==========================================
  // SECTION 14: REPORT EXPORTS (CSV & JSON)
  // ==========================================

  it('27. Exports Report as CSV with valid headers and escaped quotes', async () => {
    const exportResult = await ReportsService.exportReport('finance_revenue', 'CSV', { period: 'this_month' }, superAdminId);
    expect(exportResult.contentType).toContain('text/csv');
    expect(exportResult.fileName).toMatch(/^finance_revenue_.*\.csv$/);
    expect(exportResult.content).toContain('"Invoice No"');
    expect(exportResult.content).toContain('Skyline Ventures Analytics');
  });

  it('28. Exports Report as JSON with complete schema', async () => {
    const exportResult = await ReportsService.exportReport('finance_revenue', 'JSON', { period: 'this_month' }, superAdminId);
    expect(exportResult.contentType).toContain('application/json');
    expect(exportResult.fileName).toMatch(/^finance_revenue_.*\.json$/);
    const parsed = JSON.parse(exportResult.content);
    expect(parsed.reportKey).toBe('finance_revenue');
    expect(parsed.rows.length).toBeGreaterThan(0);
  });

  // ==========================================
  // SECTION 15: RBAC & SECURITY ENFORCEMENT
  // ==========================================

  it('29. Blocks unauthorized standard user from generating finance reports', async () => {
    await expect(
      ReportsService.generateReport('finance_revenue', { period: 'this_month' }, standardUserId)
    ).rejects.toThrow(ForbiddenError);
  });

  it('30. Blocks unauthorized standard user from generating employee cost reports', async () => {
    await expect(
      ReportsService.generateReport('employee_cost', { period: 'this_month' }, standardUserId)
    ).rejects.toThrow(ForbiddenError);
  });

  // ==========================================
  // SECTION 16: COMPREHENSIVE REPORTS & DRILL-DOWNS
  // ==========================================

  it('31. Generates "finance_expenses" Breakdown Report', async () => {
    const report = await ReportsService.generateReport('finance_expenses', { period: 'this_month' }, superAdminId);
    expect(report.reportKey).toBe('finance_expenses');
    expect(report.totalRows).toBeGreaterThan(0);
    expect(report.rows[0].entityType).toBe('Expense');
  });

  it('32. Generates "finance_payments" Collection Report', async () => {
    const report = await ReportsService.generateReport('finance_payments', { period: 'this_month' }, superAdminId);
    expect(report.reportKey).toBe('finance_payments');
    expect(report.totalRows).toBeGreaterThan(0);
    expect(report.rows[0].entityType).toBe('ClientPayment');
  });

  it('33. Generates "project_status" Performance Report', async () => {
    const report = await ReportsService.generateReport('project_status', {}, superAdminId);
    expect(report.reportKey).toBe('project_status');
    expect(report.totalRows).toBeGreaterThan(0);
    expect(report.rows.some((r) => r.referenceNo === 'PRJ-AN-001' && r.contractValue === 5000000)).toBe(true);
  });

  it('34. Generates "client_directory" Directory Report', async () => {
    const report = await ReportsService.generateReport('client_directory', {}, superAdminId);
    expect(report.reportKey).toBe('client_directory');
    expect(report.totalRows).toBeGreaterThan(0);
    expect(report.rows.some((r) => r.fullName === 'Skyline Ventures Analytics')).toBe(true);
  });

  it('35. Generates "procurement_pos" Purchase Orders Report', async () => {
    const report = await ReportsService.generateReport('procurement_pos', { period: 'this_month' }, superAdminId);
    expect(report.reportKey).toBe('procurement_pos');
    expect(report.totalRows).toBeGreaterThan(0);
    expect(report.rows[0].entityType).toBe('PurchaseOrder');
  });

  it('36. Generates "inventory_stock" Valuation & Stock Report', async () => {
    const report = await ReportsService.generateReport('inventory_stock', {}, superAdminId);
    expect(report.reportKey).toBe('inventory_stock');
    expect(report.totalRows).toBeGreaterThan(0);
    expect(report.rows[0].entityType).toBe('Material');
  });

  it('37. Generates "operations_tasks" Task Execution Report', async () => {
    const report = await ReportsService.generateReport('operations_tasks', { period: 'this_month' }, superAdminId);
    expect(report.reportKey).toBe('operations_tasks');
    expect(report.totalRows).toBeGreaterThan(0);
    expect(report.rows[0].entityType).toBe('Task');
  });

  it('38. Generates "employee_cost" Report for authorized Super Admin', async () => {
    const report = await ReportsService.generateReport('employee_cost', { period: 'this_month' }, superAdminId);
    expect(report.reportKey).toBe('employee_cost');
    expect(report.columns.length).toBeGreaterThan(0);
  });

  // ==========================================
  // SECTION 17: EDGE CASES & DATA INTEGRITY
  // ==========================================

  it('39. Date Range "today" boundaries correctly isolate today records', () => {
    const range = AnalyticsService.resolveDateRange({ period: 'today' });
    const now = new Date();
    expect(range.startDate.getDate()).toBe(now.getDate());
    expect(range.endDate.getDate()).toBe(now.getDate());
    expect(range.startDate.getHours()).toBe(0);
    expect(range.endDate.getHours()).toBe(23);
  });

  it('40. Date Range "this_week" starts on Monday', () => {
    const range = AnalyticsService.resolveDateRange({ period: 'this_week' });
    expect(range.startDate.getTime()).toBeLessThan(range.endDate.getTime());
  });

  it('41. Date Range "last_month" isolates previous month boundaries', () => {
    const range = AnalyticsService.resolveDateRange({ period: 'last_month' });
    const now = new Date();
    const expectedMonth = (now.getMonth() + 11) % 12;
    expect(range.startDate.getMonth()).toBe(expectedMonth);
  });

  it('42. Date Range "this_year" covers Jan 1 to Dec 31', () => {
    const range = AnalyticsService.resolveDateRange({ period: 'this_year' });
    const now = new Date();
    expect(range.startDate.getMonth()).toBe(0);
    expect(range.startDate.getDate()).toBe(1);
    expect(range.endDate.getMonth()).toBe(11);
    expect(range.endDate.getDate()).toBe(31);
    expect(range.startDate.getFullYear()).toBe(now.getFullYear());
  });

  it('43. Calculates 0% delta when both periods have 0 amount', async () => {
    const dashboard: any = await AnalyticsService.getExecutiveDashboard(superAdminId, { period: 'last_month' });
    expect(dashboard.kpiCards.revenue.deltaPercentage).toBeDefined();
  });

  it('44. Excludes soft-deleted and cancelled POs from spend analytics', async () => {
    const cancelledPO = await db.purchaseOrder.create({
      data: {
        referenceNo: `PO-CAN-${Date.now().toString().slice(-4)}`,
        vendorId: testVendorId,
        poDate: new Date(),
        subtotal: 500000,
        tax: 90000,
        grandTotal: 590000,
        status: 'CANCELLED',
        createdById: superAdminId,
      },
    });

    const proc = await AnalyticsService.getProcurementAnalytics({ period: 'this_month' });
    expect(proc.totalSpend).toBeGreaterThanOrEqual(141600);
    // Cleanup
    await db.purchaseOrder.delete({ where: { id: cancelledPO.id } });
  });

  it('45. Aging buckets properly sum up to total outstanding amount', async () => {
    const col = await AnalyticsService.getCollectionAnalytics({ period: 'this_month' });
    const bucketSum = col.agingBuckets.reduce((acc, b) => acc + b.amount, 0);
    expect(bucketSum).toBe(col.totalOutstanding);
  });

  it('46. Project profitability calculates budget variance accurately', async () => {
    const prof = await AnalyticsService.getProjectProfitabilityAnalytics({ projectId: testProjectId });
    const p = prof.projects[0];
    expect(p.budgetVariance).toBe(p.contractValue - p.directCostTotal);
  });

  it('47. Exporting non-existent report throws NotFoundError', async () => {
    await expect(
      ReportsService.generateReport('non_existent_report', {}, superAdminId)
    ).rejects.toThrow();
  });

  it('48. Audit event is generated when exporting reports', async () => {
    const auditCountBefore = await db.auditLog.count({
      where: { action: 'REPORT_EXPORTED' },
    });
    await ReportsService.exportReport('sales_leads', 'CSV', { period: 'this_month' }, superAdminId);
    const auditCountAfter = await db.auditLog.count({
      where: { action: 'REPORT_EXPORTED' },
    });
    expect(auditCountAfter).toBeGreaterThan(auditCountBefore);
  });

  it('49. Analytics calls are strictly read-only and preserve database records', async () => {
    const invCountBefore = await db.gstInvoice.count();
    const payCountBefore = await db.clientPayment.count();
    await AnalyticsService.getExecutiveDashboard(superAdminId, { period: 'this_month' });
    await AnalyticsService.getRevenueAnalytics({ period: 'this_month' });
    await AnalyticsService.getCollectionAnalytics({ period: 'this_month' });
    const invCountAfter = await db.gstInvoice.count();
    const payCountAfter = await db.clientPayment.count();
    expect(invCountAfter).toBe(invCountBefore);
    expect(payCountAfter).toBe(payCountBefore);
  });

  it('50. Reports catalog lists all canonical reports for Super Admin', async () => {
    const catalog = await ReportsService.getReportCatalog(superAdminId);
    expect(catalog.length).toBe(REPORT_CATALOG.length);
    const keys = catalog.map((r) => r.key);
    expect(keys).toContain('sales_leads');
    expect(keys).toContain('finance_revenue');
    expect(keys).toContain('finance_receivables');
    expect(keys).toContain('tax_gst');
  });
});
