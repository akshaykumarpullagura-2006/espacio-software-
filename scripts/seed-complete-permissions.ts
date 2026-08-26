import { db } from "../src/lib/db";

export const ALL_SYSTEM_PERMISSIONS = [
  // CRM
  { code: "leads:read", module: "CRM", description: "View leads and pipeline" },
  { code: "leads:write", module: "CRM", description: "Create and edit leads" },
  { code: "leads:assign", module: "CRM", description: "Assign leads to team members" },
  { code: "leads:convert", module: "CRM", description: "Convert Won leads into execution projects" },
  { code: "leads:delete", module: "CRM", description: "Archive or delete lead records" },
  { code: "leads:manage_followups", module: "CRM", description: "Schedule and complete follow-ups" },
  { code: "clients:read", module: "CRM", description: "View client directory and account balances" },
  { code: "clients:write", module: "CRM", description: "Create and update client details" },
  
  // PROJECTS
  { code: "projects:read", module: "PROJECTS", description: "View project records and workspace" },
  { code: "projects:write", module: "PROJECTS", description: "Create and edit project attributes" },
  { code: "projects:stage_change", module: "PROJECTS", description: "Advance or update project execution stage" },
  { code: "projects:change_order", module: "PROJECTS", description: "Create and submit scope change orders" },
  { code: "projects:quality_check", module: "PROJECTS", description: "Perform quality check inspections" },
  { code: "projects:handover", module: "PROJECTS", description: "Execute project handover and warranty initialization" },
  { code: "projects:warranty", module: "PROJECTS", description: "Log and resolve warranty complaint issues" },
  { code: "tasks:read", module: "PROJECTS", description: "View tasks, checklists, and Kanban board" },
  { code: "tasks:write", module: "PROJECTS", description: "Create, update, and complete tasks" },
  { code: "calendar:read", module: "PROJECTS", description: "View operations and milestone calendar" },
  { code: "calendar:write", module: "PROJECTS", description: "Schedule events and follow-ups on calendar" },

  // SALES
  { code: "quotations:read", module: "SALES", description: "View BOQ quotations and estimates" },
  { code: "quotations:write", module: "SALES", description: "Create and edit draft quotations" },
  { code: "quotations:approve", module: "SALES", description: "Approve quotations and finalize estimates" },

  // FINANCE
  { code: "finance:view", module: "FINANCE", description: "View financial hub and cash flow overview" },
  { code: "finance:receivables", module: "FINANCE", description: "Manage client receivables and due tracking" },
  { code: "finance:payables", module: "FINANCE", description: "Manage vendor payables and outstanding bills" },
  { code: "finance:payments", module: "FINANCE", description: "Record vendor payments and manage bank payouts" },
  { code: "finance:invoices", module: "FINANCE", description: "Generate GST tax invoices and PDF notes" },
  { code: "finance:period_lock", module: "FINANCE", description: "Close and reopen accounting periods" },
  { code: "finance:admin", module: "FINANCE", description: "Full financial administration and account setup" },
  { code: "payments:read", module: "FINANCE", description: "View client payments, receivables, and timelines" },
  { code: "payments:write", module: "FINANCE", description: "Record client payments" },
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

  // PROCUREMENT
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
  { code: "purchase_orders:read", module: "PROCUREMENT", description: "View purchase orders and delivery status" },
  { code: "purchase_orders:write", module: "PROCUREMENT", description: "Create and edit draft purchase orders" },
  { code: "purchase_orders:approve", module: "PROCUREMENT", description: "Approve submitted purchase orders" },
  { code: "purchase_orders:send", module: "PROCUREMENT", description: "Issue and send purchase orders to suppliers" },
  { code: "purchase_orders:cancel", module: "PROCUREMENT", description: "Cancel purchase orders with reason log" },
  { code: "goods_receipts:read", module: "PROCUREMENT", description: "View goods receipt notes and inspection logs" },
  { code: "goods_receipts:write", module: "PROCUREMENT", description: "Record goods receipts (GRN) and material inspection" },

  // INVENTORY
  { code: "inventory:read", module: "INVENTORY", description: "View material master, stock balances, and movements" },
  { code: "inventory:write", module: "INVENTORY", description: "Create and edit material master and warehouse profiles" },
  { code: "inventory:transfers", module: "INVENTORY", description: "Initiate, approve, and receive stock transfers" },
  { code: "inventory:adjust", module: "INVENTORY", description: "Perform authorized physical stock adjustments" },
  { code: "inventory:counts", module: "INVENTORY", description: "Create and approve physical stock counts" },
  { code: "inventory:admin", module: "INVENTORY", description: "Manage inventory valuation and unit conversions" },

  // PEOPLE
  { code: "employees:read", module: "PEOPLE", description: "View employee profiles and team directory" },
  { code: "employees:write", module: "PEOPLE", description: "Create and edit employee profiles" },
  { code: "employees:deactivate", module: "PEOPLE", description: "Deactivate employee accounts" },
  { code: "employees:manage_salary", module: "PEOPLE", description: "Manage employee salary structure and payroll credits" },
  { code: "employees:manage_permissions", module: "PEOPLE", description: "Manage custom module and action permissions" },

  // ANALYTICS
  { code: "reports:read", module: "ANALYTICS", description: "View operational reports and business metrics" },
  { code: "reports:financial", module: "ANALYTICS", description: "View detailed financial statements and profit & loss" },
  { code: "reports:export", module: "ANALYTICS", description: "Export reports in PDF and CSV format" },

  // SYSTEM
  { code: "system:admin", module: "SYSTEM", description: "Full system administration" },
  { code: "config:manage", module: "SYSTEM", description: "Manage dynamic ERP configuration & taxonomies" },
  { code: "settings:manage", module: "SYSTEM", description: "Manage company settings and preferences" },
  { code: "audit:read", module: "SYSTEM", description: "View immutable system audit logs" },
  { code: "documents:read", module: "SYSTEM", description: "View digital documents and project archives" },
  { code: "documents:write", module: "SYSTEM", description: "Upload and manage digital document versions" },
  { code: "search:read", module: "SYSTEM", description: "Execute global quick search across all modules" },
];

async function seedPermissions() {
  console.log(`🌱 Seeding complete set of ${ALL_SYSTEM_PERMISSIONS.length} permissions...`);
  
  for (const perm of ALL_SYSTEM_PERMISSIONS) {
    await db.permission.upsert({
      where: { code: perm.code },
      update: {
        module: perm.module,
        description: perm.description,
      },
      create: {
        code: perm.code,
        module: perm.module,
        description: perm.description,
      },
    });
  }

  // Ensure default roles exist
  const roles = [
    { name: "SUPER_ADMIN", description: "Highest authority with unrestricted universal control", isSystem: true },
    { name: "ADMIN", description: "Operational manager with team and workflow supervision", isSystem: true },
    { name: "LEADERSHIP", description: "Executive leadership team", isSystem: true },
    { name: "SALES", description: "Sales and CRM specialists", isSystem: true },
    { name: "DESIGN", description: "Interior designers and 2D/3D planners", isSystem: true },
    { name: "PROJECT", description: "Project site engineers and site managers", isSystem: true },
    { name: "FINANCE", description: "Finance and accounting officers", isSystem: true },
    { name: "USER", description: "Standard operational employee", isSystem: true },
    { name: "EMPLOYEE", description: "Standard operational employee template", isSystem: true },
  ];

  for (const r of roles) {
    await db.role.upsert({
      where: { name: r.name },
      update: { description: r.description, isSystem: r.isSystem },
      create: r,
    });
  }

  console.log("✅ All permissions and system roles seeded successfully.");
}

seedPermissions()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
