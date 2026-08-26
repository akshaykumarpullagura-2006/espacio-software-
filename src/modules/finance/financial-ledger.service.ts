import { db } from "@/lib/db";
import { IdGeneratorService } from "@/lib/id-generator";
import { FinanceCalculationService } from "./finance-calculation.service";

export interface LedgerFilterParams {
  direction?: "INFLOW" | "OUTFLOW";
  sourceType?: string;
  financialAccountId?: string;
  clientId?: string;
  vendorId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export class FinancialLedgerService {
  public static async getLedgerEntries(params: LedgerFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.direction) where.direction = params.direction;
    if (params.sourceType) where.sourceType = params.sourceType;
    if (params.financialAccountId) where.financialAccountId = params.financialAccountId;
    if (params.clientId) where.clientId = params.clientId;
    if (params.vendorId) where.vendorId = params.vendorId;
    if (params.projectId) where.projectId = params.projectId;

    if (params.startDate || params.endDate) {
      where.transactionDate = {
        ...(params.startDate ? { gte: params.startDate } : {}),
        ...(params.endDate ? { lte: params.endDate } : {}),
      };
    }

    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim();
      where.OR = [
        { entryNo: { contains: q } },
        { referenceNoExt: { contains: q } },
        { notes: { contains: q } },
        { client: { fullName: { contains: q } } },
        { vendor: { name: { contains: q } } },
      ];
    }

    const [total, entries] = await Promise.all([
      db.financialLedger.count({ where }),
      db.financialLedger.findMany({
        where,
        orderBy: { transactionDate: "desc" },
        skip,
        take: limit,
        include: {
          financialAccount: { select: { accountCode: true, name: true, type: true } },
          client: { select: { referenceNo: true, fullName: true } },
          vendor: { select: { referenceNo: true, name: true } },
        },
      }),
    ]);

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
