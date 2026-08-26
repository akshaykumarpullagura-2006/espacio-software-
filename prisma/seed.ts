import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ESPACIO ERP database with Finance & Financial Control data...");

  // 1. Seed Permissions
  const permissionsList = [
    { code: "system:admin", module: "SYSTEM", description: "Full system administration" },
    { code: "leads:read", module: "CRM", description: "View leads and follow-ups" },
    { code: "leads:write", module: "CRM", description: "Create and update leads" },
    { code: "leads:assign", module: "CRM", description: "Assign leads to team members" },
    { code: "leads:convert", module: "CRM", description: "Convert Won leads into execution projects" },
    { code: "leads:delete", module: "CRM", description: "Archive or delete lead records" },
    { code: "leads:manage_followups", module: "CRM", description: "Schedule and complete follow-ups" },
    { code: "config:manage", module: "SYSTEM", description: "Manage dynamic ERP configuration & taxonomies" },
    { code: "projects:read", module: "PROJECTS", description: "View project records and workspace" },
    { code: "projects:write", module: "PROJECTS", description: "Create and edit project attributes" },
    { code: "projects:stage_change", module: "PROJECTS", description: "Advance or update project execution stage" },
    { code: "projects:change_order", module: "PROJECTS", description: "Create and approve scope change orders" },
    { code: "projects:quality_check", module: "PROJECTS", description: "Perform quality check inspections" },
    { code: "projects:handover", module: "PROJECTS", description: "Execute project handover and warranty initialization" },
    { code: "projects:warranty", module: "PROJECTS", description: "Log and resolve warranty complaint issues" },
    { code: "payments:read", module: "FINANCE", description: "View client payments, receivables, and timelines" },
    { code: "payments:write", module: "FINANCE", description: "Record client payments and milestone allocations" },
    { code: "payments:verify", module: "FINANCE", description: "Verify recorded client payments" },
    { code: "payments:reverse", module: "FINANCE", description: "Execute controlled payment reversals" },
    { code: "payments:cancel", module: "FINANCE", description: "Cancel unverified payment records" },
    { code: "expenses:read", module: "FINANCE", description: "View business and project expenses & cost sheets" },
    { code: "expenses:write", module: "FINANCE", description: "Record business and project expenses" },
    { code: "expenses:submit", module: "FINANCE", description: "Submit expenses for approval" },
    { code: "expenses:approve", module: "FINANCE", description: "Approve submitted business/project expenses" },
    { code: "expenses:reject", module: "FINANCE", description: "Reject submitted expense requests" },
    { code: "expenses:cancel", module: "FINANCE", description: "Cancel recorded expenses with audit log" },
    { code: "expenses:reclassify", module: "FINANCE", description: "Reclassify expense categories or type" },
    { code: "petty_cash:read", module: "FINANCE", description: "View employee petty cash advances and ledgers" },
    { code: "petty_cash:write", module: "FINANCE", description: "Issue employee advances and top-ups" },
    { code: "petty_cash:approve", module: "FINANCE", description: "Approve requested employee advances" },
    { code: "petty_cash:record_expense", module: "FINANCE", description: "Record petty expenses against an advance" },
    { code: "petty_cash:settle", module: "FINANCE", description: "Submit advance settlements and cash returns" },
    { code: "petty_cash:approve_settlement", module: "FINANCE", description: "Approve finalized advance settlements" },
    { code: "petty_cash:view_all", module: "FINANCE", description: "View petty cash activity across all employees" },
    { code: "vendors:read", module: "PROCUREMENT", description: "View vendor directory, contacts, and performance" },
    { code: "vendors:write", module: "PROCUREMENT", description: "Create and edit vendor master records" },
    { code: "vendors:deactivate", module: "PROCUREMENT", description: "Deactivate or archive supplier profiles" },
    { code: "vendors:block", module: "PROCUREMENT", description: "Block vendors from future procurement" },
    { code: "vendors:rate", module: "PROCUREMENT", description: "Submit quality and delivery ratings for suppliers" },
    { code: "vendors:view_financials", module: "PROCUREMENT", description: "View sensitive vendor bank & payable details" },
    { code: "material_requests:read", module: "PROCUREMENT", description: "View material requests and item requirements" },
    { code: "material_requests:write", module: "PROCUREMENT", description: "Create and edit material requests" },
    { code: "material_requests:approve", module: "PROCUREMENT", description: "Approve submitted material requests" },
    { code: "material_requests:reject", module: "PROCUREMENT", description: "Reject material request items" },
    { code: "purchase_orders:read", module: "PROCUREMENT", description: "View purchase orders, line items, and delivery status" },
    { code: "purchase_orders:write", module: "PROCUREMENT", description: "Create and edit draft purchase orders" },
    { code: "purchase_orders:approve", module: "PROCUREMENT", description: "Approve submitted purchase orders" },
    { code: "purchase_orders:send", module: "PROCUREMENT", description: "Issue and send purchase orders to suppliers" },
    { code: "purchase_orders:cancel", module: "PROCUREMENT", description: "Cancel purchase orders with reason log" },
    { code: "goods_receipts:read", module: "PROCUREMENT", description: "View goods receipt notes and inspection logs" },
    { code: "goods_receipts:write", module: "PROCUREMENT", description: "Record goods receipt notes and material inspection" },
    { code: "inventory:read", module: "INVENTORY", description: "View material master, stock balances, and movements" },
    { code: "inventory:write", module: "INVENTORY", description: "Create and edit material master and warehouse profiles" },
    { code: "inventory:transfers", module: "INVENTORY", description: "Initiate, approve, and receive stock transfers" },
    { code: "inventory:adjust", module: "INVENTORY", description: "Perform authorized physical stock adjustments" },
    { code: "inventory:counts", module: "INVENTORY", description: "Create and approve physical stock counts" },
    { code: "inventory:admin", module: "INVENTORY", description: "Manage inventory valuation and unit conversions" },
    { code: "finance:view", module: "FINANCE", description: "View company financial overview and dashboards" },
    { code: "finance:receivables", module: "FINANCE", description: "Manage client receivables and due tracking" },
    { code: "finance:payables", module: "FINANCE", description: "Manage vendor payables and outstanding bills" },
    { code: "finance:payments", module: "FINANCE", description: "Record vendor payments and execute payment reversals" },
    { code: "finance:cash_flow", module: "FINANCE", description: "View cash flow inflows, outflows, and account balances" },
    { code: "finance:profit", module: "FINANCE", description: "View gross profit, net profit, and project margin analysis" },
    { code: "finance:invoices", module: "FINANCE", description: "Generate and manage GST tax invoices and PDF notes" },
    { code: "finance:period_lock", module: "FINANCE", description: "Close and reopen financial accounting periods" },
    { code: "finance:admin", module: "FINANCE", description: "Full financial administration and account setup" },
    { code: "quotations:read", module: "SALES", description: "View quotations" },
    { code: "quotations:write", module: "SALES", description: "Create and edit quotations" },
    { code: "audit:read", module: "SYSTEM", description: "View system audit logs" },
    { code: "settings:manage", module: "SYSTEM", description: "Manage global ERP settings" },
  ];

  const dbPermissions: Record<string, string> = {};

  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description, module: p.module },
      create: p,
    });
    dbPermissions[p.code] = perm.id;
  }

  console.log(`✅ Seeded ${permissionsList.length} permissions.`);

  // 2. Seed Roles
  const rolesList = [
    { name: "ADMIN", description: "Full system administrator", isSystem: true, permissions: Object.values(dbPermissions) },
    { name: "LEADERSHIP", description: "Executive leadership team", isSystem: true, permissions: Object.values(dbPermissions) },
    {
      name: "FINANCE",
      description: "Finance & Accounts team",
      isSystem: false,
      permissions: [
        dbPermissions["payments:read"],
        dbPermissions["payments:write"],
        dbPermissions["payments:verify"],
        dbPermissions["payments:reverse"],
        dbPermissions["expenses:read"],
        dbPermissions["expenses:write"],
        dbPermissions["expenses:submit"],
        dbPermissions["expenses:approve"],
        dbPermissions["petty_cash:read"],
        dbPermissions["petty_cash:write"],
        dbPermissions["petty_cash:settle"],
        dbPermissions["vendors:read"],
        dbPermissions["finance:view"],
        dbPermissions["finance:receivables"],
        dbPermissions["finance:payables"],
        dbPermissions["finance:payments"],
        dbPermissions["finance:cash_flow"],
        dbPermissions["finance:profit"],
        dbPermissions["finance:invoices"],
        dbPermissions["finance:period_lock"],
      ],
    },
  ];

  for (const r of rolesList) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: {
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
      },
    });

    for (const permId of r.permissions) {
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }

  console.log(`✅ Seeded ${rolesList.length} roles.`);

  // 3. Seed Users
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "shaikh@espacio.in" },
    update: { passwordHash, fullName: "Shaikh (Admin)" },
    create: {
      email: "shaikh@espacio.in",
      passwordHash,
      fullName: "Shaikh (Admin)",
      phone: "+91 98765 43210",
      status: "ACTIVE",
    },
  });

  const hassanComUser = await prisma.user.upsert({
    where: { email: "hassan@espacio.com" },
    update: { passwordHash, fullName: "Hassan (Finance Lead)" },
    create: {
      email: "hassan@espacio.com",
      passwordHash,
      fullName: "Hassan (Finance Lead)",
      phone: "+91 98765 43211",
      status: "ACTIVE",
    },
  });

  const adminComUser = await prisma.user.upsert({
    where: { email: "admin@espacio.com" },
    update: { passwordHash, fullName: "System Admin" },
    create: {
      email: "admin@espacio.com",
      passwordHash,
      fullName: "System Admin",
      phone: "+91 98765 43212",
      status: "ACTIVE",
    },
  });

  const hassanUser = await prisma.user.upsert({
    where: { email: "hassan@espacio.in" },
    update: { passwordHash, fullName: "Hassan (Finance Lead)" },
    create: {
      email: "hassan@espacio.in",
      passwordHash,
      fullName: "Hassan (Finance Lead)",
      phone: "+91 98765 43211",
      status: "ACTIVE",
    },
  });

  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  if (adminRole) {
    for (const u of [adminUser, hassanComUser, adminComUser, hassanUser]) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: u.id, roleId: adminRole.id } },
        update: {},
        create: { userId: u.id, roleId: adminRole.id },
      });
    }
  }

  // 4. Seed Financial Accounts
  const hdfcAcc = await prisma.financialAccount.upsert({
    where: { accountCode: "ACC-0001" },
    update: { currentBalance: 500000 },
    create: {
      accountCode: "ACC-0001",
      name: "HDFC Operating Bank Account",
      type: "BANK",
      currency: "INR",
      openingBalance: 500000,
      currentBalance: 500000,
      bankName: "HDFC Bank",
      accountNo: "50200012345678",
      ifscCode: "HDFC0001234",
      status: "ACTIVE",
    },
  });

  const cashAcc = await prisma.financialAccount.upsert({
    where: { accountCode: "ACC-0002" },
    update: { currentBalance: 50000 },
    create: {
      accountCode: "ACC-0002",
      name: "Main Office Cash Locker",
      type: "CASH",
      currency: "INR",
      openingBalance: 50000,
      currentBalance: 50000,
      status: "ACTIVE",
    },
  });

  const upiAcc = await prisma.financialAccount.upsert({
    where: { accountCode: "ACC-0003" },
    update: { currentBalance: 75000 },
    create: {
      accountCode: "ACC-0003",
      name: "Company PhonePe / UPI Merchant",
      type: "UPI",
      currency: "INR",
      openingBalance: 75000,
      currentBalance: 75000,
      status: "ACTIVE",
    },
  });

  console.log("✅ Seeded Financial Accounts (HDFC, Cash Locker, UPI).");

  // 5. Seed Vendor & Sample Vendor Payable / Payment
  const venasai = await prisma.vendor.upsert({
    where: { referenceNo: "VEN-2026-0001" },
    update: {},
    create: {
      referenceNo: "VEN-2026-0001",
      name: "Sri Sai Plywood & Hardware Supplies",
      legalName: "Sri Sai Plywood Enterprises Pvt Ltd",
      categoryKey: "PLYWOOD",
      contactPerson: "Venkat Rao",
      phone: "+91 98480 12345",
      email: "sai.plywood@gmail.com",
      address: "Plot 14, Timber Depot Road, Goshamahal",
      city: "Hyderabad",
      state: "Telangana",
      gstin: "36ABCDE1234F1Z5",
      paymentTermsKey: "DAYS_30",
      creditLimit: 500000,
      status: "ACTIVE",
    },
  });

  const year = new Date().getFullYear();

  const payable = await prisma.vendorPayable.upsert({
    where: { payableNo: `VPAYABLE-${year}-0001` },
    update: {},
    create: {
      payableNo: `VPAYABLE-${year}-0001`,
      vendorId: venasai.id,
      amount: 125000,
      paidAmount: 50000,
      outstandingAmount: 75000,
      status: "PARTIALLY_PAID",
      dueDate: new Date(Date.now() + 15 * 86400000),
      notes: "Plywood and HDHMR supply delivery invoice",
    },
  });

  const vpay = await prisma.vendorPayment.upsert({
    where: { paymentNo: `VPAY-${year}-0001` },
    update: {},
    create: {
      paymentNo: `VPAY-${year}-0001`,
      vendorId: venasai.id,
      payableId: payable.id,
      financialAccountId: hdfcAcc.id,
      recordedById: hassanUser.id,
      amount: 50000,
      paymentDate: new Date(),
      paymentMethod: "BANK_TRANSFER",
      referenceNoExt: "UTR-9911228844",
      status: "VERIFIED",
      notes: "First partial payment via NEFT from HDFC Operating Account",
    },
  });

  // Seed Financial Ledger Entry for Vendor Payment (Outflow)
  await prisma.financialLedger.upsert({
    where: { entryNo: `LED-${year}-0001` },
    update: {},
    create: {
      entryNo: `LED-${year}-0001`,
      transactionDate: new Date(),
      direction: "OUTFLOW",
      sourceType: "VENDOR_PAYMENT",
      sourceId: vpay.id,
      financialAccountId: hdfcAcc.id,
      vendorId: venasai.id,
      categoryKey: "MATERIAL",
      amount: 50000,
      paymentMethod: "BANK_TRANSFER",
      referenceNoExt: "UTR-9911228844",
      status: "RECORDED",
      notes: `Vendor Payment ${vpay.paymentNo} to ${venasai.name}`,
    },
  });

  console.log(`✅ Seeded Vendor Payable ${payable.payableNo} & Vendor Payment ${vpay.paymentNo}.`);

  // 6. Seed Sample GST Invoice
  const invoice = await prisma.gstInvoice.upsert({
    where: { invoiceNo: `INV-${year}-0001` },
    update: {},
    create: {
      invoiceNo: `INV-${year}-0001`,
      invoiceDate: new Date(),
      customerName: "Dr. Vikram Sharma",
      customerGstin: "36AAAPL1234C1Z9",
      customerAddress: "Villa 14, Rainbow Vistas, Kukatpally, Hyderabad",
      stateCode: "36",
      placeOfSupply: "Telangana",
      isInterState: false,
      taxableAmount: 200000,
      cgstAmount: 18000,
      sgstAmount: 18000,
      igstAmount: 0,
      totalTax: 36000,
      roundOff: 0,
      grandTotal: 236000,
      paidAmount: 100000,
      outstandingAmount: 136000,
      status: "PARTIALLY_PAID",
      notes: "First stage interior execution tax invoice",
      items: {
        create: [
          {
            description: "Custom Teakwood Paneling & False Ceiling Work",
            hsnSacCode: "995476",
            quantity: 1,
            unitKey: "NOS",
            unitRate: 200000,
            amount: 200000,
            taxableValue: 200000,
            gstRate: 18,
            cgstRate: 9,
            cgstAmount: 18000,
            sgstRate: 9,
            sgstAmount: 18000,
            igstRate: 0,
            igstAmount: 0,
            totalAmount: 236000,
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded GST Invoice ${invoice.invoiceNo}.`);

  console.log("🎉 Finance database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
