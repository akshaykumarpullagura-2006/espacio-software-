import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface LogEventParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  public static async logEvent(params: LogEventParams) {
    try {
      const log = await db.auditLog.create({
        data: {
          userId: params.userId ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
          newValues: params.newValues ? JSON.stringify(params.newValues) : null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });

      logger.info(`[AUDIT] ${params.action} on ${params.entityType}:${params.entityId || "N/A"}`, "AUDIT_SERVICE", {
        auditId: log.id,
        actor: params.userId,
      });

      return log;
    } catch (err) {
      // Audit logging failure should not crash main transaction, but must log an error alert
      logger.error("Failed to create audit log entry", err, "AUDIT_SERVICE");
    }
  }

  public static async log(params: LogEventParams) {
    return this.logEvent(params);
  }

  public static async getLogs(params: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.entityId ? { entityId: params.entityId } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
    };

    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
    ]);

    return {
      logs: logs.map((l) => ({
        ...l,
        oldValues: l.oldValues ? JSON.parse(l.oldValues) : null,
        newValues: l.newValues ? JSON.parse(l.newValues) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
