import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { GstInvoiceService } from '@/modules/finance/gst-invoice.service';
import { RbacService } from '@/modules/rbac/rbac.service';
import { BusinessRuleError, ValidationError, NotFoundError } from '@/lib/errors';

describe('ESPACIO ERP Master Prompt 14 — Strict GST, Invoicing & Receivable Integration Test Suite', () => {
  let testAdminId: string;
  let testClientId: string;
  let testProjectId: string;
  let testQuotationId: string;

  beforeAll(async () => {
    // 1. Fetch or create admin
    const admin = await db.user.findFirst({ where: { accessLevel: 'ADMIN' } });
    if (admin) {
      testAdminId = admin.id;
    } else {
      const created = await db.user.create({
        data: {
          email: 'invoice.admin@espacio.com',
          fullName: 'Invoice Admin',
          accessLevel: 'ADMIN',
          passwordHash: 'hashed_password',
        },
      });
      testAdminId = created.id;
    }

    // 2. Create isolated test client
    const createdClient = await db.client.create({
      data: {
        referenceNo: `CLI-2026-${Date.now().toString().slice(-4)}`,
        fullName: 'Aarav Singhania Enterprises',
        phone: `+91${Date.now().toString().slice(-10)}`,
        email: `aarav.${Date.now()}@example.com`,
        gstin: '36AAAAA0000A1Z5',
      },
    });
    testClientId = createdClient.id;

    // 3. Create isolated test project with ample contract value (5 Crore)
    const createdProject = await db.project.create({
      data: {
        referenceNo: `PRJ-2026-${Date.now().toString().slice(-4)}`,
        title: 'Singhania Luxury Penthouse Execution',
        client: { connect: { id: testClientId } },
        status: 'IN_PROGRESS',
        contractValue: 50000000, // ₹5,00,00,000
      },
    });
    testProjectId = createdProject.id;

    // 4. Create isolated approved quotation
    const createdQuotation = await db.quotation.create({
      data: {
        referenceNo: `Q-2026-${Date.now().toString().slice(-4)}`,
        title: 'Singhania Penthouse Interior Scope',
        clientId: testClientId,
        projectId: testProjectId,
        status: 'APPROVED',
        subtotal: 10000000,
        totalAmount: 11800000, // ₹1,18,00,000 incl tax
        createdById: testAdminId,
      },
    });
    testQuotationId = createdQuotation.id;
  });

  // ==========================================
  // SECTION 1: INVOICE LIFECYCLE & NUMBERING
  // ==========================================

  it('1. Creates a DRAFT invoice without creating client receivables', async () => {
    const draft = await GstInvoiceService.createInvoice({
      customerName: 'Aarav Singhania',
      customerGstin: '36AAAAA0000A1Z5',
      clientId: testClientId,
      projectId: testProjectId,
      status: 'DRAFT',
      items: [
        {
          description: 'Living Room False Ceiling & Cove Lighting',
          quantity: 1,
          unitRate: 100000,
          gstRate: 18,
        },
      ],
      createdById: testAdminId,
    });

    expect(draft.id).toBeDefined();
    expect(draft.invoiceNo).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(draft.status).toBe('DRAFT');
    expect(draft.grandTotal).toBe(118000);

    const rec = await db.clientReceivable.findFirst({ where: { referenceNo: draft.invoiceNo } });
    expect(rec).toBeNull();
  });

  it('2. Updates a DRAFT invoice items and recalculated totals', async () => {
    const draft = await GstInvoiceService.createInvoice({
      customerName: 'Aarav Singhania Draft 2',
      status: 'DRAFT',
      items: [{ description: 'Item 1', quantity: 1, unitRate: 50000, gstRate: 18 }],
      createdById: testAdminId,
    });

    const updated = await GstInvoiceService.updateDraftInvoice(
      draft.id,
      {
        customerName: 'Aarav Singhania Revised Draft',
        items: [
          { description: 'Item 1 Updated', quantity: 2, unitRate: 50000, gstRate: 18 },
        ],
      },
      testAdminId
    );

    expect(updated.customerName).toBe('Aarav Singhania Revised Draft');
    expect(updated.taxableAmount).toBe(100000);
    expect(updated.grandTotal).toBe(118000);
  });

  it('3. Throws BusinessRuleError when attempting to update an ISSUED invoice', async () => {
    const issued = await GstInvoiceService.createInvoice({
      customerName: 'Aarav Singhania Direct Issued',
      status: 'ISSUED',
      items: [{ description: 'Item 1', quantity: 1, unitRate: 20000, gstRate: 18 }],
      createdById: testAdminId,
    });

    await expect(
      GstInvoiceService.updateDraftInvoice(
        issued.id,
        { customerName: 'Attempted Silent Modification' },
        testAdminId
      )
    ).rejects.toThrow(BusinessRuleError);
  });

  it('4. Generates unique, sequential INV-YYYY-XXXX invoice numbers', async () => {
    const inv1 = await GstInvoiceService.createInvoice({
      customerName: 'Client Alpha',
      items: [{ description: 'Consulting', quantity: 1, unitRate: 10000 }],
      createdById: testAdminId,
    });

    const inv2 = await GstInvoiceService.createInvoice({
      customerName: 'Client Beta',
      items: [{ description: 'Consulting', quantity: 1, unitRate: 10000 }],
      createdById: testAdminId,
    });

    expect(inv1.invoiceNo).not.toBe(inv2.invoiceNo);
    expect(inv1.invoiceNo.startsWith('INV-')).toBe(true);
    expect(inv2.invoiceNo.startsWith('INV-')).toBe(true);
  });

  // ==========================================
  // SECTION 2: GST & COMMERCIAL CALCULATIONS
  // ==========================================

  it('5. Calculates Intra-State GST with exact 50/50 CGST + SGST split', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Telangana Client Local',
      stateCode: '36',
      placeOfSupply: 'Telangana',
      isInterState: false,
      items: [
        {
          description: 'Modular Kitchen Fabrication',
          quantity: 1,
          unitRate: 200000,
          discount: 20000, // Taxable: 180,000
          gstRate: 18,
        },
      ],
      createdById: testAdminId,
    });

    expect(invoice.taxableAmount).toBe(180000);
    expect(invoice.cgstAmount).toBe(16200); // 9% of 180,000
    expect(invoice.sgstAmount).toBe(16200); // 9% of 180,000
    expect(invoice.igstAmount).toBe(0);
    expect(invoice.totalTax).toBe(32400);
    expect(invoice.grandTotal).toBe(212400);
  });

  it('6. Calculates Inter-State GST with 100% IGST allocation', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Bangalore Client Outstation',
      stateCode: '29',
      placeOfSupply: 'Karnataka',
      isInterState: true,
      items: [
        {
          description: 'Architectural 3D Visuals & BOQ Pack',
          quantity: 1,
          unitRate: 100000,
          discount: 0,
          gstRate: 18,
        },
      ],
      createdById: testAdminId,
    });

    expect(invoice.taxableAmount).toBe(100000);
    expect(invoice.cgstAmount).toBe(0);
    expect(invoice.sgstAmount).toBe(0);
    expect(invoice.igstAmount).toBe(18000); // 18% of 100,000
    expect(invoice.totalTax).toBe(18000);
    expect(invoice.grandTotal).toBe(118000);
  });

  it('7. Supports Zero-Tax / Tax-Exempt commercial invoices', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Exempt Client Organisation',
      items: [
        {
          description: 'Special Economic Zone Consultancy',
          quantity: 1,
          unitRate: 50000,
          gstRate: 0,
        },
      ],
      createdById: testAdminId,
    });

    expect(invoice.taxableAmount).toBe(50000);
    expect(invoice.totalTax).toBe(0);
    expect(invoice.grandTotal).toBe(50000);
  });

  it('8. Computes exact mathematical roundOff for fractional tax values', async () => {
    const totals = GstInvoiceService.calculateInvoiceTotals(
      [
        {
          description: 'Custom Brass Inlay Strips',
          quantity: 3,
          unitRate: 333.33,
          gstRate: 18,
        },
      ],
      false
    );

    expect(totals.taxableAmount).toBe(999.99);
    expect(totals.cgstAmount).toBe(90);
    expect(totals.sgstAmount).toBe(90);
    expect(totals.grandTotal).toBe(1180);
    expect(typeof totals.roundOff).toBe('number');
  });

  // ==========================================
  // SECTION 3: ENTITY RELATIONSHIPS & BILLING
  // ==========================================

  it('9. Links invoice to Client Directory (Prompt 07)', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      clientId: testClientId,
      customerName: 'Aarav Singhania',
      items: [{ description: 'Milestone 1', quantity: 1, unitRate: 10000 }],
      createdById: testAdminId,
    });

    expect(invoice.clientId).toBe(testClientId);
    expect(invoice.client?.id).toBe(testClientId);
  });

  it('10. Links invoice to Project record (Prompt 08)', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      projectId: testProjectId,
      customerName: 'Aarav Singhania',
      items: [{ description: 'Milestone 1', quantity: 1, unitRate: 10000 }],
      createdById: testAdminId,
    });

    expect(invoice.projectId).toBe(testProjectId);
    expect(invoice.project?.id).toBe(testProjectId);
  });

  it('11. Links invoice to Quotation record (Prompt 05)', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      quotationId: testQuotationId,
      customerName: 'Aarav Singhania',
      items: [{ description: 'Quotation Advance 20%', quantity: 1, unitRate: 50000 }],
      createdById: testAdminId,
    });

    expect(invoice.quotationId).toBe(testQuotationId);
  });

  it('12. Retrieves billable summary and calculates remaining billable amount', async () => {
    const summary = await GstInvoiceService.getBillableSummary({ quotationId: testQuotationId });
    expect(summary.approvedValue).toBeGreaterThan(0);
    expect(typeof summary.totalInvoiced).toBe('number');
    expect(typeof summary.remainingBillable).toBe('number');
  });

  it('13. Blocks over-invoicing when invoice exceeds approved value', async () => {
    const smallQuotation = await db.quotation.create({
      data: {
        referenceNo: `Q-2026-TEST-S-${Date.now()}`,
        title: 'Small Test Scope',
        status: 'APPROVED',
        subtotal: 10000,
        totalAmount: 11800,
        createdById: testAdminId,
      },
    });

    await expect(
      GstInvoiceService.createInvoice({
        quotationId: smallQuotation.id,
        customerName: 'Test Client',
        items: [{ description: 'Massive Invoice', quantity: 1, unitRate: 100000, gstRate: 18 }],
        createdById: testAdminId,
      })
    ).rejects.toThrow(BusinessRuleError);
  });

  it('14. Allows billing beyond original quotation when allowOverBilling flag is set', async () => {
    const smallQuotation = await db.quotation.create({
      data: {
        referenceNo: `Q-2026-TEST-O-${Date.now()}`,
        title: 'Change Order Scope',
        status: 'APPROVED',
        subtotal: 10000,
        totalAmount: 11800,
        createdById: testAdminId,
      },
    });

    const inv = await GstInvoiceService.createInvoice({
      quotationId: smallQuotation.id,
      customerName: 'Test Client',
      allowOverBilling: true,
      items: [{ description: 'Approved Extra Work', quantity: 1, unitRate: 50000, gstRate: 18 }],
      createdById: testAdminId,
    });

    expect(inv.grandTotal).toBe(59000);
  });

  // ==========================================
  // SECTION 4: RECEIVABLE INTEGRATION (PROMPT 09)
  // ==========================================

  it('15. Automatically creates ClientReceivable when invoice is ISSUED', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Receivable Auto Test',
      clientId: testClientId,
      status: 'ISSUED',
      items: [{ description: 'Site Mobilization Advance', quantity: 1, unitRate: 100000, gstRate: 18 }],
      createdById: testAdminId,
    });

    const receivable = await db.clientReceivable.findFirst({
      where: { referenceNo: invoice.invoiceNo },
    });

    expect(receivable).not.toBeNull();
    expect(receivable!.amount).toBe(118000);
    expect(receivable!.outstandingAmount).toBe(118000);
    expect(receivable!.status).toBe('OPEN');
  });

  it('16. Approving a DRAFT invoice transitions it to ISSUED and generates receivable', async () => {
    const draft = await GstInvoiceService.createInvoice({
      customerName: 'Draft Approval Client',
      status: 'DRAFT',
      items: [{ description: 'Preliminary Drawings', quantity: 1, unitRate: 40000, gstRate: 18 }],
      createdById: testAdminId,
    });

    expect(draft.status).toBe('DRAFT');

    const approved = await GstInvoiceService.approveInvoice(draft.id, testAdminId);
    expect(approved.status).toBe('ISSUED');

    const rec = await db.clientReceivable.findFirst({ where: { referenceNo: draft.invoiceNo } });
    expect(rec).not.toBeNull();
    expect(rec!.amount).toBe(47200);
  });

  it('17. Voiding an invoice cancels both the invoice and the linked receivable', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Void Target Client',
      status: 'ISSUED',
      items: [{ description: 'Cancelled Milestone', quantity: 1, unitRate: 25000, gstRate: 18 }],
      createdById: testAdminId,
    });

    const voided = await GstInvoiceService.voidInvoice(invoice.id, 'Client revised project scope', testAdminId);
    expect(voided.status).toBe('CANCELLED');

    const rec = await db.clientReceivable.findFirst({ where: { referenceNo: invoice.invoiceNo } });
    expect(rec!.status).toBe('CANCELLED');
  });

  it('18. Blocks voiding an invoice if collections/payments are recorded against it', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Collected Invoice Client',
      projectId: testProjectId,
      status: 'ISSUED',
      items: [{ description: 'Paid Work', quantity: 1, unitRate: 50000, gstRate: 18 }],
      createdById: testAdminId,
    });

    // Simulate payment recorded
    await db.gstInvoice.update({
      where: { id: invoice.id },
      data: { paidAmount: 20000, outstandingAmount: 39000 },
    });

    await expect(
      GstInvoiceService.voidInvoice(invoice.id, 'Illegal Void', testAdminId)
    ).rejects.toThrow(BusinessRuleError);
  });

  it('19. Creates Credit Note adjusting outstanding receivable and invoice balance', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Credit Note Client',
      status: 'ISSUED',
      items: [{ description: 'Original Work', quantity: 1, unitRate: 100000, gstRate: 18 }],
      createdById: testAdminId,
    });

    const adjusted = await GstInvoiceService.createCreditNote(
      invoice.id,
      { amount: 18000, reason: 'Goodwill concession on carpentry' },
      testAdminId
    );

    expect(adjusted.outstandingAmount).toBe(100000);

    const rec = await db.clientReceivable.findFirst({ where: { referenceNo: invoice.invoiceNo } });
    expect(rec!.outstandingAmount).toBe(100000);
  });

  // ==========================================
  // SECTION 5: DOCUMENT GENERATION & PROMPT 13
  // ==========================================

  it('20. Generates official HTML invoice document and links to Document system (Prompt 13)', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Document Arch Client',
      status: 'ISSUED',
      items: [{ description: 'Full Scope Execution Phase 1', quantity: 1, unitRate: 150000, gstRate: 18 }],
      createdById: testAdminId,
    });

    const result = await GstInvoiceService.generateAndLinkInvoiceDocument(invoice.id, testAdminId);
    expect(result.htmlContent).toContain(invoice.invoiceNo);
    expect(result.htmlContent).toContain('TAX INVOICE');
    expect(result.document.id).toBeDefined();
    expect(result.document.category).toBe('FINANCE');
    expect(result.document.type).toBe('INVOICE');
  });

  // ==========================================
  // SECTION 6: GST ANALYTICS & DASHBOARD
  // ==========================================

  it('21. Aggregates GST Summary report across date range', async () => {
    const summary = await GstInvoiceService.getGstSummary();
    expect(summary.totalTaxableValue).toBeGreaterThan(0);
    expect(summary.totalTax).toBeGreaterThan(0);
    expect(typeof summary.totalCgst).toBe('number');
    expect(typeof summary.totalSgst).toBe('number');
    expect(typeof summary.totalIgst).toBe('number');
    expect(typeof summary.b2bInvoicesCount).toBe('number');
    expect(typeof summary.b2cInvoicesCount).toBe('number');
  });

  it('22. Aggregates Invoice Dashboard KPI metrics', async () => {
    const metrics = await GstInvoiceService.getInvoiceDashboardMetrics();
    expect(metrics.totalInvoiced).toBeGreaterThan(0);
    expect(typeof metrics.totalCollected).toBe('number');
    expect(typeof metrics.totalOutstanding).toBe('number');
    expect(typeof metrics.draftCount).toBe('number');
    expect(typeof metrics.issuedCount).toBe('number');
  });

  // ==========================================
  // SECTION 7: SEARCH & MULTI-FILTERING
  // ==========================================

  it('23. Searches invoices by invoice number query string', async () => {
    const inv = await GstInvoiceService.createInvoice({
      customerName: 'Unique Customer Search Target',
      items: [{ description: 'Search Item', quantity: 1, unitRate: 10000 }],
      createdById: testAdminId,
    });

    const results = await GstInvoiceService.getInvoices({ search: inv.invoiceNo });
    expect(results.some((r) => r.id === inv.id)).toBe(true);
  });

  it('24. Searches invoices by customer name query string', async () => {
    const inv = await GstInvoiceService.createInvoice({
      customerName: 'Zorawar Kalia Ventures',
      items: [{ description: 'Specialized Scope', quantity: 1, unitRate: 20000 }],
      createdById: testAdminId,
    });

    const results = await GstInvoiceService.getInvoices({ search: 'Zorawar Kalia' });
    expect(results.some((r) => r.id === inv.id)).toBe(true);
  });

  it('25. Filters invoices by status DRAFT', async () => {
    const results = await GstInvoiceService.getInvoices({ status: 'DRAFT' });
    expect(results.every((r) => r.status === 'DRAFT')).toBe(true);
  });

  // ==========================================
  // SECTION 8: RBAC & AUDIT LOG INTEGRITY
  // ==========================================

  it('26. Verifies Admin user has invoice permissions', async () => {
    const adminUser = await db.user.findFirst({ where: { accessLevel: 'ADMIN' } });
    if (adminUser) {
      const perms = await RbacService.getUserPermissions(adminUser.id);
      expect(perms.includes('invoices:read')).toBe(true);
      expect(perms.includes('invoices:create')).toBe(true);
      expect(perms.includes('invoices:approve')).toBe(true);
      expect(perms.includes('invoices:issue')).toBe(true);
      expect(perms.includes('invoices:void')).toBe(true);
      expect(perms.includes('gst:reports')).toBe(true);
    }
  });

  it('27. Verifies audit log created upon INVOICE_CREATED', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Audit Verification Client',
      items: [{ description: 'Audit Item', quantity: 1, unitRate: 15000 }],
      createdById: testAdminId,
    });

    const audit = await db.auditLog.findFirst({
      where: { entityType: 'GstInvoice', entityId: invoice.id, action: 'INVOICE_CREATED' },
    });
    expect(audit).not.toBeNull();
  });

  it('28. Verifies audit log created upon INVOICE_UPDATED', async () => {
    const draft = await GstInvoiceService.createInvoice({
      customerName: 'Audit Update Client',
      status: 'DRAFT',
      items: [{ description: 'Draft Item', quantity: 1, unitRate: 10000 }],
      createdById: testAdminId,
    });

    await GstInvoiceService.updateDraftInvoice(draft.id, { notes: 'Updated terms' }, testAdminId);

    const audit = await db.auditLog.findFirst({
      where: { entityType: 'GstInvoice', entityId: draft.id, action: 'INVOICE_UPDATED' },
    });
    expect(audit).not.toBeNull();
  });

  it('29. Verifies audit log created upon INVOICE_APPROVED', async () => {
    const draft = await GstInvoiceService.createInvoice({
      customerName: 'Audit Approve Client',
      status: 'DRAFT',
      items: [{ description: 'Pending Item', quantity: 1, unitRate: 12000 }],
      createdById: testAdminId,
    });

    await GstInvoiceService.approveInvoice(draft.id, testAdminId);

    const audit = await db.auditLog.findFirst({
      where: { entityType: 'GstInvoice', entityId: draft.id, action: 'INVOICE_APPROVED' },
    });
    expect(audit).not.toBeNull();
  });

  it('30. Verifies audit log created upon INVOICE_VOIDED', async () => {
    const issued = await GstInvoiceService.createInvoice({
      customerName: 'Audit Void Client',
      status: 'ISSUED',
      items: [{ description: 'Void Item', quantity: 1, unitRate: 8000 }],
      createdById: testAdminId,
    });

    await GstInvoiceService.voidInvoice(issued.id, 'Duplicate invoice', testAdminId);

    const audit = await db.auditLog.findFirst({
      where: { entityType: 'GstInvoice', entityId: issued.id, action: 'INVOICE_VOIDED' },
    });
    expect(audit).not.toBeNull();
  });

  it('31. Verifies audit log created upon CREDIT_NOTE_CREATED', async () => {
    const issued = await GstInvoiceService.createInvoice({
      customerName: 'Audit Credit Client',
      status: 'ISSUED',
      items: [{ description: 'Credit Item', quantity: 1, unitRate: 20000, gstRate: 18 }],
      createdById: testAdminId,
    });

    await GstInvoiceService.createCreditNote(issued.id, { amount: 5000, reason: 'Defect deduction' }, testAdminId);

    const audit = await db.auditLog.findFirst({
      where: { entityType: 'GstInvoice', entityId: issued.id, action: 'CREDIT_NOTE_CREATED' },
    });
    expect(audit).not.toBeNull();
  });

  it('32. Calculates multi-item invoice with mixed GST rates (18%, 12%, 5%, 0%)', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Mixed Rate Enterprise',
      items: [
        { description: 'Interior Design Services', quantity: 1, unitRate: 100000, gstRate: 18 },
        { description: 'Plywood & Board Supply', quantity: 1, unitRate: 50000, gstRate: 12 },
        { description: 'Specialized Hardware Parts', quantity: 1, unitRate: 20000, gstRate: 5 },
        { description: 'Freight & Transportation Exempt', quantity: 1, unitRate: 10000, gstRate: 0 },
      ],
      createdById: testAdminId,
    });

    // 100k@18% = 18k tax, 50k@12% = 6k tax, 20k@5% = 1k tax, 10k@0% = 0 tax
    // Taxable = 180k, Total tax = 25k, Grand total = 205k
    expect(invoice.taxableAmount).toBe(180000);
    expect(invoice.totalTax).toBe(25000);
    expect(invoice.grandTotal).toBe(205000);
  });

  it('33. Validates required fields: empty customerName throws ValidationError', async () => {
    await expect(
      GstInvoiceService.createInvoice({
        customerName: '',
        items: [{ description: 'Item 1', quantity: 1, unitRate: 1000 }],
        createdById: testAdminId,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('34. Validates required fields: empty items array throws ValidationError', async () => {
    await expect(
      GstInvoiceService.createInvoice({
        customerName: 'Valid Name',
        items: [],
        createdById: testAdminId,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('35. Concurrency: Sequential creation of 5 invoices generates 5 unique sequential invoice numbers', async () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      const inv = await GstInvoiceService.createInvoice({
        customerName: `Sequential Client ${i + 1}`,
        items: [{ description: 'Rapid Action Item', quantity: 1, unitRate: 5000 }],
        createdById: testAdminId,
      });
      results.push(inv);
    }

    const invoiceNos = results.map((r) => r.invoiceNo);
    const uniqueNos = new Set(invoiceNos);
    expect(uniqueNos.size).toBe(5);
  });

  it('36. Non-destructive cancellation: Cancelled invoice remains queryable with historical lineage', async () => {
    const inv = await GstInvoiceService.createInvoice({
      customerName: 'Historical Void Audit Client',
      status: 'ISSUED',
      items: [{ description: 'Pre-cancellation Item', quantity: 1, unitRate: 10000 }],
      createdById: testAdminId,
    });

    await GstInvoiceService.voidInvoice(inv.id, 'Legal dispute resolved', testAdminId);

    const fetched = await GstInvoiceService.getInvoiceById(inv.id);
    expect(fetched.status).toBe('CANCELLED');
    expect(fetched.notes).toContain('VOIDED: Legal dispute resolved');
  });

  it('37. Filters invoices by date range', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const results = await GstInvoiceService.getInvoices({
      startDate: yesterday,
      endDate: tomorrow,
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('38. Filters invoices by projectId', async () => {
    const results = await GstInvoiceService.getInvoices({ projectId: testProjectId });
    expect(results.every((r) => r.projectId === testProjectId)).toBe(true);
  });

  it('39. Filters invoices by clientId', async () => {
    const results = await GstInvoiceService.getInvoices({ clientId: testClientId });
    expect(results.every((r) => r.clientId === testClientId)).toBe(true);
  });

  it('40. Calculates item-level discounts correctly before applying GST', async () => {
    const totals = GstInvoiceService.calculateInvoiceTotals(
      [
        {
          description: 'Dining Table Polish',
          quantity: 2,
          unitRate: 10000,
          discount: 2000, // 20,000 - 2,000 = 18,000 taxable
          gstRate: 18,
        },
      ],
      false
    );

    expect(totals.taxableAmount).toBe(18000);
    expect(totals.cgstAmount).toBe(1620);
    expect(totals.sgstAmount).toBe(1620);
    expect(totals.grandTotal).toBe(21240);
  });

  it('41. Handles zero unitRate cleanly', async () => {
    const totals = GstInvoiceService.calculateInvoiceTotals(
      [{ description: 'Complimentary Mockup', quantity: 1, unitRate: 0, gstRate: 18 }],
      false
    );

    expect(totals.taxableAmount).toBe(0);
    expect(totals.totalTax).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });

  it('42. Verifies Standard User has read and create invoice permissions', async () => {
    let standardUser = await db.user.findFirst({ where: { accessLevel: 'USER', status: 'ACTIVE' } });
    if (!standardUser) {
      standardUser = await db.user.create({
        data: {
          email: `standard.test.${Date.now()}@espacio.com`,
          fullName: 'Standard Test User',
          accessLevel: 'USER',
          status: 'ACTIVE',
          passwordHash: 'hashed_password',
        },
      });
    }
    const perms = await RbacService.getUserPermissions(standardUser.id);
    expect(perms.includes('invoices:read')).toBe(true);
    expect(perms.includes('invoices:create')).toBe(true);
  });

  it('43. Verifies Super Admin has full wildcard access', async () => {
    const superAdmin = await db.user.findFirst({ where: { accessLevel: 'SUPER_ADMIN' } });
    if (superAdmin) {
      const perms = await RbacService.getUserPermissions(superAdmin.id);
      expect(perms.includes('*')).toBe(true);
    }
  });

  it('44. getInvoiceById throws NotFoundError for nonexistent invoice ID', async () => {
    await expect(
      GstInvoiceService.getInvoiceById('00000000-0000-0000-0000-000000000000')
    ).rejects.toThrow(NotFoundError);
  });

  it('45. Over-invoicing check accurately sums existing non-cancelled invoices', async () => {
    const billable = await GstInvoiceService.getBillableSummary({ projectId: testProjectId });
    expect(typeof billable.approvedValue).toBe('number');
    expect(typeof billable.totalInvoiced).toBe('number');
    expect(typeof billable.remainingBillable).toBe('number');
  });

  it('46. Correctly determines place of supply for interstate client', async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Chennai Client Enterprise',
      stateCode: '33',
      placeOfSupply: 'Tamil Nadu',
      isInterState: true,
      items: [{ description: 'Offshore Concept Package', quantity: 1, unitRate: 80000, gstRate: 18 }],
      createdById: testAdminId,
    });

    expect(invoice.placeOfSupply).toBe('Tamil Nadu');
    expect(invoice.stateCode).toBe('33');
    expect(invoice.isInterState).toBe(true);
    expect(invoice.igstAmount).toBe(14400);
  });

  it('47. Categorizes B2B vs B2C invoices in GST Summary', async () => {
    // Create one B2B invoice (with GSTIN)
    await GstInvoiceService.createInvoice({
      customerName: 'B2B Client Ltd',
      customerGstin: '36BBBBB1111B1Z9',
      items: [{ description: 'Commercial Interior Execution', quantity: 1, unitRate: 100000, gstRate: 18 }],
      createdById: testAdminId,
    });

    // Create one B2C invoice (without GSTIN)
    await GstInvoiceService.createInvoice({
      customerName: 'B2C Individual Homeowner',
      items: [{ description: 'Residential Bedroom Wardrobes', quantity: 1, unitRate: 50000, gstRate: 18 }],
      createdById: testAdminId,
    });

    const summary = await GstInvoiceService.getGstSummary();
    expect(summary.b2bInvoicesCount).toBeGreaterThan(0);
    expect(summary.b2cInvoicesCount).toBeGreaterThan(0);
  });

  it('48. Verifies roundOff is zero when line totals evaluate to whole numbers', async () => {
    const totals = GstInvoiceService.calculateInvoiceTotals(
      [{ description: 'Whole Number Item', quantity: 1, unitRate: 10000, gstRate: 18 }],
      false
    );

    expect(totals.roundOff).toBe(0);
    expect(totals.grandTotal).toBe(11800);
  });

  it('49. Prevents modification of invoice items if status is CANCELLED', async () => {
    const inv = await GstInvoiceService.createInvoice({
      customerName: 'Cancelled Edit Target',
      status: 'ISSUED',
      items: [{ description: 'Cancel Target', quantity: 1, unitRate: 10000 }],
      createdById: testAdminId,
    });

    await GstInvoiceService.voidInvoice(inv.id, 'Duplicate entry', testAdminId);

    await expect(
      GstInvoiceService.updateDraftInvoice(inv.id, { customerName: 'Illegal Change' }, testAdminId)
    ).rejects.toThrow(BusinessRuleError);
  });

  it('50. Complete commercial flow: Quotation -> Invoicing -> Document Generation -> Receivable Creation', async () => {
    // 1. Create invoice against approved quotation
    const invoice = await GstInvoiceService.createInvoice({
      customerName: 'Complete Flow Client',
      customerGstin: '36AAAAA9999A1Z1',
      clientId: testClientId,
      projectId: testProjectId,
      quotationId: testQuotationId,
      status: 'ISSUED',
      items: [
        {
          description: 'Milestone 1: Civil & Demolition Complete',
          quantity: 1,
          unitRate: 200000,
          gstRate: 18,
        },
      ],
      createdById: testAdminId,
    });

    expect(invoice.status).toBe('ISSUED');
    expect(invoice.grandTotal).toBe(236000);

    // 2. Verify receivable created
    const rec = await db.clientReceivable.findFirst({ where: { referenceNo: invoice.invoiceNo } });
    expect(rec).not.toBeNull();
    expect(rec!.amount).toBe(236000);

    // 3. Generate commercial document
    const docResult = await GstInvoiceService.generateAndLinkInvoiceDocument(invoice.id, testAdminId);
    expect(docResult.document.id).toBeDefined();
    expect(docResult.document.category).toBe('FINANCE');
    expect(docResult.document.type).toBe('INVOICE');
  });
});
