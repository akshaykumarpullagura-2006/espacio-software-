import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export interface ProjectCostCategoryBreakdown {
  material: number;
  labour: number;
  transport: number;
  fuel: number;
  subcontractor: number;
  siteExpense: number;
  equipment: number;
  other: number;
}

export interface ProjectCostSheet {
  projectId: string;
  projectReferenceNo: string;
  projectTitle: string;
  clientName: string;
  contractBudget: number;
  revisedBudget: number;
  totalCost: number;
  categoryBreakdown: ProjectCostCategoryBreakdown;
  costVariance: number;
  varianceStatus: "UNDER_BUDGET" | "ON_BUDGET" | "OVER_BUDGET";
  estimatedMargin: number;
}

export class ProjectCostService {
  /**
   * Safe financial currency rounding to 2 decimal places.
   */
  public static roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Authoritative calculation engine for a specific project's cost sheet.
   * Includes both formal approved Expenses AND valid project-linked Petty Cash Expenses.
   */
  public static async calculateProjectCost(projectId: string): Promise<ProjectCostSheet> {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { fullName: true } },
        expenses: {
          where: {
            expenseType: "PROJECT",
            status: { in: ["APPROVED", "PAID"] },
          },
          select: { categoryKey: true, amount: true },
        },
        pettyCashExpenses: {
          where: {
            status: "RECORDED",
          },
          select: { categoryKey: true, amount: true },
        },
      },
    });

    if (!project) throw new NotFoundError("Project record not found");

    const contractBudget = this.roundCurrency(project.contractValue || 0);
    const revisedBudget = this.roundCurrency(project.revisedBudget || project.contractValue || 0);

    const breakdown: ProjectCostCategoryBreakdown = {
      material: 0,
      labour: 0,
      transport: 0,
      fuel: 0,
      subcontractor: 0,
      siteExpense: 0,
      equipment: 0,
      other: 0,
    };

    let totalCost = 0;

    // 1. Accumulate formal approved project expenses
    for (const exp of project.expenses) {
      const amt = exp.amount;
      totalCost += amt;

      switch (exp.categoryKey) {
        case "MATERIAL":
          breakdown.material += amt;
          break;
        case "LABOUR":
          breakdown.labour += amt;
          break;
        case "TRANSPORT":
          breakdown.transport += amt;
          break;
        case "FUEL":
          breakdown.fuel += amt;
          break;
        case "SUBCONTRACTOR":
          breakdown.subcontractor += amt;
          break;
        case "SITE_EXPENSE":
          breakdown.siteExpense += amt;
          break;
        case "EQUIPMENT":
          breakdown.equipment += amt;
          break;
        default:
          breakdown.other += amt;
          break;
      }
    }

    // 2. Accumulate valid project-linked petty cash expenses (e.g. ₹450 tea/transport vouchers)
    for (const pcx of project.pettyCashExpenses) {
      const amt = pcx.amount;
      totalCost += amt;

      switch (pcx.categoryKey) {
        case "LOCAL_TRANSPORT":
          breakdown.transport += amt;
          break;
        case "SMALL_HARDWARE":
          breakdown.material += amt;
          break;
        case "MINOR_SITE_EXPENSE":
        case "SITE_REFRESHMENTS":
        case "STATIONERY":
        case "COURIER":
          breakdown.siteExpense += amt;
          break;
        default:
          breakdown.other += amt;
          break;
      }
    }

    totalCost = this.roundCurrency(totalCost);
    breakdown.material = this.roundCurrency(breakdown.material);
    breakdown.labour = this.roundCurrency(breakdown.labour);
    breakdown.transport = this.roundCurrency(breakdown.transport);
    breakdown.fuel = this.roundCurrency(breakdown.fuel);
    breakdown.subcontractor = this.roundCurrency(breakdown.subcontractor);
    breakdown.siteExpense = this.roundCurrency(breakdown.siteExpense);
    breakdown.equipment = this.roundCurrency(breakdown.equipment);
    breakdown.other = this.roundCurrency(breakdown.other);

    const costVariance = this.roundCurrency(totalCost - revisedBudget);
    let varianceStatus: "UNDER_BUDGET" | "ON_BUDGET" | "OVER_BUDGET" = "UNDER_BUDGET";
    if (costVariance > 0) {
      varianceStatus = "OVER_BUDGET";
    } else if (costVariance === 0) {
      varianceStatus = "ON_BUDGET";
    }

    const estimatedMargin = this.roundCurrency(revisedBudget - totalCost);

    return {
      projectId: project.id,
      projectReferenceNo: project.referenceNo,
      projectTitle: project.title,
      clientName: project.client ? project.client.fullName : "N/A",
      contractBudget,
      revisedBudget,
      totalCost,
      categoryBreakdown: breakdown,
      costVariance,
      varianceStatus,
      estimatedMargin,
    };
  }

  /**
   * Retrieves Project Cost Sheets across all active projects.
   */
  public static async calculateProjectCostSheets(): Promise<ProjectCostSheet[]> {
    const projects = await db.project.findMany({ select: { id: true } });
    const sheets: ProjectCostSheet[] = [];

    for (const p of projects) {
      const sheet = await this.calculateProjectCost(p.id);
      sheets.push(sheet);
    }

    return sheets.sort((a, b) => b.totalCost - a.totalCost);
  }
}
