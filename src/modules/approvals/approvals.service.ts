import { db } from "@/lib/db";

export interface PendingExpenseItem {
  id: string;
  referenceNo: string;
  amount: number;
  categoryKey: string;
  expenseType: string;
  description: string;
  expenseDate: Date;
  status: string;
  submittedBy: {
    id?: string;
    fullName?: string;
    email?: string;
  } | null;
  project: {
    id: string;
    referenceNo: string;
    title: string;
  } | null;
}

export interface PendingPaymentItem {
  id: string;
  referenceNo: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  status: string;
  notes?: string | null;
  referenceNoExt?: string | null;
  submittedBy: {
    id?: string;
    fullName?: string;
    email?: string;
  } | null;
  client: {
    id?: string;
    fullName?: string;
    companyName?: string | null;
  } | null;
  project: {
    id: string;
    referenceNo: string;
    title: string;
  } | null;
  milestone: {
    id: string;
    title: string;
    amount: number;
  } | null;
}

export interface PendingApprovalsData {
  expenses: PendingExpenseItem[];
  payments: PendingPaymentItem[];
  stats: {
    totalPending: number;
    pendingExpensesCount: number;
    pendingPaymentsCount: number;
    totalPendingExpenseAmount: number;
    totalPendingPaymentAmount: number;
    totalPendingAmount: number;
  };
}

export class ApprovalsService {
  public static async getPendingApprovals(): Promise<PendingApprovalsData> {
    const [expenses, payments] = await Promise.all([
      db.expense.findMany({
        where: {
          status: "SUBMITTED",
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          project: {
            select: { id: true, referenceNo: true, title: true },
          },
        },
      }),
      db.clientPayment.findMany({
        where: {
          status: "RECORDED",
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          project: {
            select: { id: true, referenceNo: true, title: true },
          },
          client: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          milestone: {
            select: { id: true, title: true, amount: true },
          },
        },
      }),
    ]);

    // Gather creator user details for expenses & payments
    const userIds = new Set<string>();
    expenses.forEach((e) => {
      if (e.createdById) userIds.add(e.createdById);
    });
    payments.forEach((p) => {
      if (p.receivedById) userIds.add(p.receivedById);
    });

    const users = await db.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, fullName: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const formattedExpenses: PendingExpenseItem[] = expenses.map((e) => ({
      id: e.id,
      referenceNo: e.referenceNo,
      amount: e.amount,
      categoryKey: e.categoryKey,
      expenseType: e.expenseType,
      description: e.description,
      expenseDate: e.expenseDate,
      status: e.status,
      submittedBy: e.createdById ? userMap.get(e.createdById) || null : null,
      project: e.project,
    }));

    const formattedPayments: PendingPaymentItem[] = payments.map((p) => ({
      id: p.id,
      referenceNo: p.referenceNo,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
      status: p.status,
      notes: p.notes,
      referenceNoExt: p.referenceNoExt,
      submittedBy: p.receivedById ? userMap.get(p.receivedById) || null : null,
      client: p.client,
      project: p.project,
      milestone: p.milestone,
    }));

    const totalPendingExpenseAmount = formattedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPendingPaymentAmount = formattedPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      expenses: formattedExpenses,
      payments: formattedPayments,
      stats: {
        totalPending: formattedExpenses.length + formattedPayments.length,
        pendingExpensesCount: formattedExpenses.length,
        pendingPaymentsCount: formattedPayments.length,
        totalPendingExpenseAmount,
        totalPendingPaymentAmount,
        totalPendingAmount: totalPendingExpenseAmount + totalPendingPaymentAmount,
      },
    };
  }
}
