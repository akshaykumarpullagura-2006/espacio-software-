import { RbacService } from "@/modules/rbac/rbac.service";

export type CommandCategory = "RECENT" | "NAVIGATION" | "CREATE" | "ACTIONS";

export interface CommandItem {
  id: string;
  category: CommandCategory;
  title: string;
  subtitle?: string;
  keywords?: string[];
  href?: string;
  actionKey?: string;
  iconName: string;
  requiredPermission?: string;
}

export class CommandRegistry {
  private static readonly COMMANDS: CommandItem[] = [
    // NAVIGATION
    { id: "nav-leads", category: "NAVIGATION", title: "Go to Leads & CRM", subtitle: "Manage sales pipeline and follow-ups", keywords: ["leads", "crm", "pipeline", "prospects"], href: "/leads", iconName: "Users", requiredPermission: "leads:read" },
    { id: "nav-projects", category: "NAVIGATION", title: "Go to Projects", subtitle: "Project operations, stages and Gantt", keywords: ["projects", "sites", "construction", "interior"], href: "/projects", iconName: "FolderKanban", requiredPermission: "projects:read" },
    { id: "nav-quotations", category: "NAVIGATION", title: "Go to Quotations", subtitle: "Estimates, BOQ and customer quotes", keywords: ["quotations", "estimates", "boq", "proposals"], href: "/quotations", iconName: "FileText", requiredPermission: "quotations:read" },
    { id: "nav-clients", category: "NAVIGATION", title: "Go to Client Master", subtitle: "Client directories and accounts", keywords: ["clients", "customers", "directory"], href: "/clients", iconName: "UserCheck", requiredPermission: "leads:read" },
    { id: "nav-vendors", category: "NAVIGATION", title: "Go to Vendors & Suppliers", subtitle: "Vendor directory, ratings and commercial terms", keywords: ["vendors", "suppliers", "subcontractors"], href: "/procurement/vendors", iconName: "Truck", requiredPermission: "vendors:read" },
    { id: "nav-po", category: "NAVIGATION", title: "Go to Purchase Orders", subtitle: "Procurement orders and tracking", keywords: ["purchase orders", "po", "procurement"], href: "/procurement/purchase-orders", iconName: "ShoppingBag", requiredPermission: "procurement:read" },
    { id: "nav-mr", category: "NAVIGATION", title: "Go to Material Requests", subtitle: "Site requisition and approvals", keywords: ["material requests", "mr", "requisition"], href: "/procurement/material-requests", iconName: "FileSpreadsheet", requiredPermission: "procurement:read" },
    { id: "nav-materials", category: "NAVIGATION", title: "Go to Materials Master", subtitle: "Item catalog, SKUs and price list", keywords: ["materials", "inventory", "catalog", "items", "sku"], href: "/inventory/materials", iconName: "Package", requiredPermission: "inventory:read" },
    { id: "nav-stock", category: "NAVIGATION", title: "Go to Stock Movements", subtitle: "Receipts, issues and site transfers", keywords: ["stock", "movements", "receipts", "issues", "transfers"], href: "/inventory/movements", iconName: "ArrowLeftRight", requiredPermission: "inventory:read" },
    { id: "nav-warehouses", category: "NAVIGATION", title: "Go to Warehouses & Stores", subtitle: "Godowns and project site stores", keywords: ["warehouses", "stores", "godowns"], href: "/inventory/warehouses", iconName: "Building2", requiredPermission: "inventory:read" },
    { id: "nav-finance", category: "NAVIGATION", title: "Go to Finance Control", subtitle: "Ledger, receivables, payables and bank accounts", keywords: ["finance", "ledger", "receivables", "payables", "bank"], href: "/finance", iconName: "Wallet", requiredPermission: "finance:read" },
    { id: "nav-payments", category: "NAVIGATION", title: "Go to Client Payments", subtitle: "Payment receipts and milestone collections", keywords: ["payments", "collections", "receipts"], href: "/finance/payments", iconName: "CreditCard", requiredPermission: "finance:read" },
    { id: "nav-expenses", category: "NAVIGATION", title: "Go to Expenses", subtitle: "Project and business operational expenses", keywords: ["expenses", "costs", "vouchers"], href: "/finance/expenses", iconName: "Receipt", requiredPermission: "finance:read" },
    { id: "nav-petty-cash", category: "NAVIGATION", title: "Go to Petty Cash & Advances", subtitle: "Employee advances and site cash vouchers", keywords: ["petty cash", "advances", "site cash"], href: "/finance/petty-cash", iconName: "Banknote", requiredPermission: "finance:read" },
    { id: "nav-reports", category: "NAVIGATION", title: "Go to Reports & Analytics", subtitle: "Financial P&L, project margins, stock aging", keywords: ["reports", "analytics", "profitability", "pnl"], href: "/reports", iconName: "BarChart3", requiredPermission: "reports:read" },
    { id: "nav-audit", category: "NAVIGATION", title: "Go to Audit Logs", subtitle: "System security and compliance audit trail", keywords: ["audit", "logs", "security", "history"], href: "/audit-logs", iconName: "ShieldAlert", requiredPermission: "system:read" },

    // CREATE
    { id: "create-lead", category: "CREATE", title: "Create New Lead", subtitle: "Register a prospective client lead", keywords: ["add lead", "new lead", "create lead"], href: "/leads?action=create", iconName: "PlusCircle", requiredPermission: "leads:write" },
    { id: "create-project", category: "CREATE", title: "Create New Project", subtitle: "Initialize a new project workspace", keywords: ["add project", "new project"], href: "/projects?action=create", iconName: "FolderPlus", requiredPermission: "projects:write" },
    { id: "create-vendor", category: "CREATE", title: "Create New Vendor", subtitle: "Register supplier or contractor master", keywords: ["add vendor", "new supplier"], href: "/procurement/vendors?action=create", iconName: "UserPlus", requiredPermission: "vendors:write" },
    { id: "create-po", category: "CREATE", title: "Create Purchase Order", subtitle: "Raise procurement order to vendor", keywords: ["new po", "create purchase order"], href: "/procurement/purchase-orders?action=create", iconName: "ShoppingCart", requiredPermission: "procurement:write" },
    { id: "create-mr", category: "CREATE", title: "Create Material Request", subtitle: "Request site materials or items", keywords: ["new mr", "requisition"], href: "/procurement/material-requests?action=create", iconName: "ClipboardPlus", requiredPermission: "procurement:write" },
    { id: "create-expense", category: "CREATE", title: "Record Expense", subtitle: "Log a project or business expense voucher", keywords: ["add expense", "record cost"], href: "/finance/expenses?action=create", iconName: "FileSpreadsheet", requiredPermission: "finance:write" },
    { id: "create-payment", category: "CREATE", title: "Record Client Payment", subtitle: "Log incoming client payment receipt", keywords: ["add payment", "receive money"], href: "/finance/payments?action=create", iconName: "ArrowDownLeft", requiredPermission: "finance:write" },

    // ACTIONS
    { id: "act-overdue-receivables", category: "ACTIONS", title: "View Overdue Receivables", subtitle: "Inspect client milestone payments pending collection", keywords: ["overdue", "receivables", "pending payments"], href: "/finance?view=overdue-receivables", iconName: "AlertTriangle", requiredPermission: "finance:read" },
    { id: "act-low-stock", category: "ACTIONS", title: "View Low Stock Materials", subtitle: "Items at or below reorder threshold", keywords: ["low stock", "reorder", "shortage"], href: "/inventory/materials?view=low-stock", iconName: "AlertCircle", requiredPermission: "inventory:read" },
    { id: "act-delayed-projects", category: "ACTIONS", title: "View Delayed Projects", subtitle: "Projects exceeding schedule timeline", keywords: ["delayed projects", "behind schedule"], href: "/projects?view=delayed", iconName: "Clock", requiredPermission: "projects:read" },
  ];

  public static async getAccessibleCommands(userId: string, query?: string): Promise<CommandItem[]> {
    const userPermissions = await RbacService.getUserPermissions(userId);
    const isAdmin = userPermissions.includes("*");

    let allowed = this.COMMANDS.filter((cmd) => {
      if (!cmd.requiredPermission) return true;
      if (isAdmin) return true;
      return userPermissions.includes(cmd.requiredPermission);
    });

    if (query && query.trim().length > 0) {
      const q = query.toLowerCase().trim();
      allowed = allowed.filter(
        (cmd) =>
          cmd.title.toLowerCase().includes(q) ||
          cmd.subtitle?.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    }

    return allowed;
  }
}
