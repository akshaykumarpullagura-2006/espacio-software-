import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export interface ProjectFinancialSummary {
  projectId: string;
  referenceNo: string;
  title: string;
  clientName: string;
  contractBudget: number;
  revisedProjectValue: number;
  totalVerifiedPaid: number;
  totalPendingRecorded: number;
  remainingBalance: number;
  paymentProgressPercentage: number;
  paymentStatus: "NO_PAYMENTS" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
}

export class FinancialCalculationService {
  public static roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  public static async calculateProjectFinancials(projectId: string): Promise<ProjectFinancialSummary> {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { fullName: true } },
        payments: {
          where: { status: { in: ["VERIFIED", "RECORDED"] } },
          select: { amount: true, status: true },
        },
      },
    });

    if (!project) throw new NotFoundError("Project record not found");

    const contractBudget = this.roundCurrency(project.contractValue || 0);
    const revisedProjectValue = this.roundCurrency(project.revisedBudget || project.contractValue || 0);

    let totalVerifiedPaid = 0;
    let totalPendingRecorded = 0;

    for (const payment of project.payments) {
      if (payment.status === "VERIFIED") {
        totalVerifiedPaid += payment.amount;
      } else if (payment.status === "RECORDED") {
        totalPendingRecorded += payment.amount;
      }
    }

    totalVerifiedPaid = this.roundCurrency(totalVerifiedPaid);
    totalPendingRecorded = this.roundCurrency(totalPendingRecorded);

    const remainingBalance = this.roundCurrency(Math.max(0, revisedProjectValue - totalVerifiedPaid));
    const paymentProgressPercentage =
      revisedProjectValue > 0 ? this.roundCurrency((totalVerifiedPaid / revisedProjectValue) * 100) : 0;

    let paymentStatus: "NO_PAYMENTS" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" = "NO_PAYMENTS";
    if (totalVerifiedPaid >= revisedProjectValue && revisedProjectValue > 0) {
      paymentStatus = "PAID";
    } else if (totalVerifiedPaid > 0) {
      paymentStatus = "PARTIALLY_PAID";
    }

    return {
      projectId: project.id,
      referenceNo: project.referenceNo,
      title: project.title,
      clientName: project.client ? project.client.fullName : "N/A",
      contractBudget,
      revisedProjectValue,
      totalVerifiedPaid,
      totalPendingRecorded,
      remainingBalance,
      paymentProgressPercentage,
      paymentStatus,
    };
  }

  public static async calculateClientTotalFinancials(clientId: string) {
    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        projects: {
          include: {
            payments: {
              where: { status: "VERIFIED" },
              select: { amount: true },
            },
          },
        },
      },
    });

    if (!client) throw new NotFoundError("Client record not found");

    let totalContractValue = 0;
    let totalPaid = 0;

    for (const proj of client.projects) {
      const val = proj.revisedBudget || proj.contractValue || 0;
      totalContractValue += val;

      for (const p of proj.payments) {
        totalPaid += p.amount;
      }
    }

    totalContractValue = this.roundCurrency(totalContractValue);
    totalPaid = this.roundCurrency(totalPaid);
    const totalOutstanding = this.roundCurrency(Math.max(0, totalContractValue - totalPaid));

    return {
      clientId: client.id,
      clientReferenceNo: client.referenceNo,
      clientName: client.fullName,
      phone: client.phone || "N/A",
      activeProjectsCount: client.projects.length,
      totalContractValue,
      totalVerifiedPaid: totalPaid,
      totalPendingBalance: totalOutstanding,
    };
  }

  public static async calculateClientReceivables(clientId?: string) {
    if (!clientId) {
      const clients = await db.client.findMany({
        select: {
          id: true,
          referenceNo: true,
          fullName: true,
          phone: true,
          projects: {
            where: { status: { not: "CANCELLED" } },
            include: {
              payments: {
                where: { status: "VERIFIED" },
                select: { amount: true },
              },
            },
          },
        },
        orderBy: { fullName: "asc" },
      });

      return clients.map((c) => {
        let totalContractValue = 0;
        let totalVerifiedPaid = 0;

        for (const proj of c.projects) {
          const val = proj.revisedBudget || proj.contractValue || 0;
          totalContractValue += val;
          for (const p of proj.payments) {
            totalVerifiedPaid += p.amount;
          }
        }

        totalContractValue = this.roundCurrency(totalContractValue);
        totalVerifiedPaid = this.roundCurrency(totalVerifiedPaid);
        const totalPendingBalance = this.roundCurrency(Math.max(0, totalContractValue - totalVerifiedPaid));

        return {
          clientId: c.id,
          clientReferenceNo: c.referenceNo,
          clientName: c.fullName,
          phone: c.phone || "N/A",
          activeProjectsCount: c.projects.length,
          totalContractValue,
          totalVerifiedPaid,
          totalPendingBalance,
        };
      });
    }
    return this.calculateClientTotalFinancials(clientId);
  }
}

