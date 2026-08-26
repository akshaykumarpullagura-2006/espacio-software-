import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export interface ProjectFinancialBreakdown {
  projectId: string;
  referenceNo: string;
  title: string;
  stage: string;
  contractValue: number;
  totalReceived: number;
  totalOutstanding: number;
  totalInvoiced: number;
  paymentProgressPct: number;
}

export interface ClientFinancialSummary {
  canViewFinancials: boolean;
  totalQuoted: number | null;
  totalApprovedQuoted: number | null;
  totalProjectValue: number | null;
  totalReceived: number | null;
  totalInvoiced: number | null;
  totalOutstanding: number | null;
  lastPaymentDate: Date | null;
  lastPaymentAmount: number | null;
  paymentCount: number;
  projectBreakdowns: ProjectFinancialBreakdown[];
}

export class ClientFinancialService {
  private static round2(val: number): number {
    return Math.round(val * 100) / 100;
  }

  /**
   * Calculate complete, authoritative financial summary for a client with permission-based privacy redaction
   */
  public static async getClientFinancialSummary(
    clientId: string,
    canViewFinancials: boolean
  ): Promise<ClientFinancialSummary> {
    if (!canViewFinancials) {
      return {
        canViewFinancials: false,
        totalQuoted: null,
        totalApprovedQuoted: null,
        totalProjectValue: null,
        totalReceived: null,
        totalInvoiced: null,
        totalOutstanding: null,
        lastPaymentDate: null,
        lastPaymentAmount: null,
        paymentCount: 0,
        projectBreakdowns: [],
      };
    }

    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        projects: {
          select: {
            id: true,
            referenceNo: true,
            title: true,
            stage: true,
            contractValue: true,
            revisedBudget: true,
            payments: {
              where: { status: { in: ["VERIFIED", "ACCEPTED", "COMPLETED"] } },
              select: {
                id: true,
                amount: true,
                paymentDate: true,
                createdAt: true,
              },
            },
            receivables: {
              select: {
                id: true,
                amount: true,
                status: true,
              },
            },
          },
        },
        quotations: {
          where: { status: { notIn: ["CANCELLED", "SUPERSEDED"] } },
          select: {
            id: true,
            totalAmount: true,
            status: true,
          },
        },
        payments: {
          where: { status: { in: ["VERIFIED", "ACCEPTED", "COMPLETED"] } },
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            createdAt: true,
          },
          orderBy: { paymentDate: "desc" },
        },
        receivables: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError("Client not found");
    }

    // 1. Calculate Quotations
    let totalQuoted = 0;
    let totalApprovedQuoted = 0;

    for (const q of client.quotations) {
      totalQuoted += q.totalAmount;
      if (q.status === "APPROVED") {
        totalApprovedQuoted += q.totalAmount;
      }
    }

    // 2. Calculate Projects Breakdowns
    let totalProjectValue = 0;
    let totalProjectReceived = 0;
    let totalInvoiced = 0;
    const projectBreakdowns: ProjectFinancialBreakdown[] = [];

    for (const proj of client.projects) {
      const projValue = proj.revisedBudget || proj.contractValue || 0;
      totalProjectValue += projValue;

      let projPaid = 0;
      for (const p of proj.payments) {
        projPaid += p.amount;
      }
      totalProjectReceived += projPaid;

      let projInvoiced = 0;
      for (const r of proj.receivables) {
        projInvoiced += r.amount;
      }
      totalInvoiced += projInvoiced;

      const projOutstanding = Math.max(0, projValue - projPaid);
      const paymentProgressPct =
        projValue > 0 ? Math.min(100, Math.round((projPaid / projValue) * 100)) : 0;

      projectBreakdowns.push({
        projectId: proj.id,
        referenceNo: proj.referenceNo,
        title: proj.title,
        stage: proj.stage,
        contractValue: this.round2(projValue),
        totalReceived: this.round2(projPaid),
        totalOutstanding: this.round2(projOutstanding),
        totalInvoiced: this.round2(projInvoiced),
        paymentProgressPct,
      });
    }

    // 3. Client-level direct payments
    let totalDirectReceived = 0;
    for (const p of client.payments) {
      totalDirectReceived += p.amount;
    }
    const finalTotalReceived = Math.max(totalProjectReceived, totalDirectReceived);
    const totalOutstanding = Math.max(0, totalProjectValue - finalTotalReceived);

    // 4. Last payment details
    const lastPayment = client.payments[0] || null;

    return {
      canViewFinancials: true,
      totalQuoted: this.round2(totalQuoted),
      totalApprovedQuoted: this.round2(totalApprovedQuoted),
      totalProjectValue: this.round2(totalProjectValue),
      totalReceived: this.round2(finalTotalReceived),
      totalInvoiced: this.round2(totalInvoiced),
      totalOutstanding: this.round2(totalOutstanding),
      lastPaymentDate: lastPayment ? lastPayment.paymentDate || lastPayment.createdAt : null,
      lastPaymentAmount: lastPayment ? this.round2(lastPayment.amount) : null,
      paymentCount: client.payments.length,
      projectBreakdowns,
    };
  }
}
