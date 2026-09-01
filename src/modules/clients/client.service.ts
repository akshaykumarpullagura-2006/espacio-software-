import { db } from "@/lib/db";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { RbacService } from "../rbac/rbac.service";
import { DuplicateClientDetectionService, DuplicateClientCheckResult } from "./duplicate-detection.service";
import { ClientFinancialService } from "./client-financial.service";
import {
  CreateClientInput,
  UpdateClientInput,
  ClientFilterInput,
  AddClientNoteInput,
} from "@/validators/client.schema";
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

export class ClientService {
  /**
   * Helper to round numbers to 2 decimal places
   */
  private static round2(val: number): number {
    return Math.round(val * 100) / 100;
  }

  /**
   * Retrieve paginated client directory with multi-filtering and RBAC scoping
   */
  public static async getClients(filters: Partial<ClientFilterInput>, actorUserId?: string) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    let canViewFinancials = false;
    let isSuper = false;
    let isAdmin = false;

    if (actorUserId) {
      isSuper = await RbacService.isUserSuperAdmin(actorUserId);
      isAdmin = await RbacService.isUserAdmin(actorUserId);
      const hasFinPerm = await RbacService.hasPermission(actorUserId, "clients:view_financials");
      canViewFinancials = isSuper || isAdmin || hasFinPerm;
    }

    const where: any = {};

    // 1. RBAC Record-Level Scoping for Standard Users
    if (actorUserId && !isSuper && !isAdmin) {
      where.OR = [
        { projects: { some: { members: { some: { userId: actorUserId } } } } },
        { leads: { some: { assignedToId: actorUserId } } },
        { lead: { assignedToId: actorUserId } },
      ];
    }

    // 2. Status Filter
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    // 3. Client Type Filter
    if (filters.clientType && filters.clientType !== "ALL") {
      where.clientType = filters.clientType;
    }

    // 4. City / Location Filter
    if (filters.city) {
      where.city = { contains: filters.city.trim() };
    }

    // 5. Active Project Filter
    if (filters.hasActiveProject !== undefined) {
      if (filters.hasActiveProject) {
        where.projects = {
          some: {
            stage: { notIn: ["COMPLETED", "HANDOVER", "CANCELLED", "WARRANTY"] },
          },
        };
      } else {
        where.projects = {
          none: {
            stage: { notIn: ["COMPLETED", "HANDOVER", "CANCELLED", "WARRANTY"] },
          },
        };
      }
    }

    // 6. Date Range Filters
    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom) where.createdAt.gte = new Date(filters.createdFrom);
      if (filters.createdTo) where.createdAt.lte = new Date(filters.createdTo);
    }

    // 7. Search Filter (Multi-field database query)
    if (filters.search) {
      const q = filters.search.trim();
      const searchConditions = [
        { referenceNo: { contains: q } },
        { fullName: { contains: q } },
        { companyName: { contains: q } },
        { phone: { contains: q } },
        { alternatePhone: { contains: q } },
        { email: { contains: q } },
        { gstin: { contains: q } },
        { city: { contains: q } },
        { tags: { contains: q } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Determine Order By
    let orderBy: any = { createdAt: filters.sortOrder || "desc" };
    if (filters.sortBy === "fullName") {
      orderBy = { fullName: filters.sortOrder || "asc" };
    } else if (filters.sortBy === "referenceNo") {
      orderBy = { referenceNo: filters.sortOrder || "asc" };
    } else if (filters.sortBy === "createdAt") {
      orderBy = { createdAt: filters.sortOrder || "desc" };
    }

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
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
                select: { amount: true },
              },
            },
          },
          quotations: {
            where: { status: { notIn: ["CANCELLED", "SUPERSEDED"] } },
            select: { id: true, totalAmount: true, status: true },
          },
          payments: {
            where: { status: { in: ["VERIFIED", "ACCEPTED", "COMPLETED"] } },
            select: { amount: true, paymentDate: true },
            orderBy: { paymentDate: "desc" },
            take: 1,
          },
          _count: {
            select: {
              projects: true,
              leads: true,
              quotations: true,
              payments: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.client.count({ where }),
    ]);

    // Format output and calculate financial summaries per client
    const formattedClients = clients.map((c) => {
      let totalQuoted: number | null = null;
      let totalProjectValue: number | null = null;
      let totalReceived: number | null = null;
      let totalOutstanding: number | null = null;
      let lastPaymentDate: Date | null = null;

      const activeProjectsCount = c.projects.filter(
        (p) => !["COMPLETED", "HANDOVER", "CANCELLED", "WARRANTY"].includes(p.stage)
      ).length;

      if (canViewFinancials) {
        let quotedSum = 0;
        for (const q of c.quotations) {
          quotedSum += q.totalAmount;
        }
        totalQuoted = this.round2(quotedSum);

        let projValSum = 0;
        let projPaidSum = 0;
        for (const p of c.projects) {
          projValSum += p.revisedBudget || p.contractValue || 0;
          for (const pay of p.payments) {
            projPaidSum += pay.amount;
          }
        }
        totalProjectValue = this.round2(projValSum);
        totalReceived = this.round2(projPaidSum);
        totalOutstanding = this.round2(Math.max(0, projValSum - projPaidSum));

        if (c.payments.length > 0) {
          lastPaymentDate = c.payments[0].paymentDate;
        }
      }

      return {
        id: c.id,
        referenceNo: c.referenceNo,
        fullName: c.fullName,
        companyName: c.companyName,
        clientType: c.clientType,
        status: c.status,
        phone: c.phone,
        alternatePhone: c.alternatePhone,
        email: c.email,
        city: c.city,
        state: c.state,
        tags: c.tags,
        projectCount: c._count.projects,
        activeProjectsCount,
        leadsCount: c._count.leads,
        quotationsCount: c._count.quotations,
        totalQuoted,
        totalProjectValue,
        totalReceived,
        totalOutstanding,
        lastPaymentDate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    // Optional Filter: hasOutstanding
    let finalClients = formattedClients;
    if (filters.hasOutstanding !== undefined && canViewFinancials) {
      if (filters.hasOutstanding) {
        finalClients = formattedClients.filter((c) => (c.totalOutstanding || 0) > 0);
      } else {
        finalClients = formattedClients.filter((c) => (c.totalOutstanding || 0) === 0);
      }
    }

    return {
      clients: finalClients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      canViewFinancials,
    };
  }

  /**
   * Retrieve comprehensive Client 360° Profile
   */
  public static async getClientById(id: string, actorUserId?: string) {
    let canViewFinancials = false;
    let isSuper = false;
    let isAdmin = false;

    if (actorUserId) {
      isSuper = await RbacService.isUserSuperAdmin(actorUserId);
      isAdmin = await RbacService.isUserAdmin(actorUserId);
      const hasFinPerm = await RbacService.hasPermission(actorUserId, "clients:view_financials");
      canViewFinancials = isSuper || isAdmin || hasFinPerm;
    }

    const client = await db.client.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            referenceNo: true,
            clientName: true,
            stage: true,
            sourceKey: true,
            estimatedBudget: true,
            createdAt: true,
            assignedTo: { select: { id: true, fullName: true, email: true } },
          },
        },
        leads: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            referenceNo: true,
            clientName: true,
            stage: true,
            priority: true,
            sourceKey: true,
            estimatedBudget: true,
            requirement: true,
            createdAt: true,
            assignedTo: { select: { id: true, fullName: true, email: true } },
          },
        },
        quotations: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            referenceNo: true,
            revision: true,
            title: true,
            status: true,
            subtotal: true,
            discountAmount: true,
            taxAmount: true,
            totalAmount: true,
            validityDate: true,
            createdAt: true,
            approvedAt: true,
            approvedBy: { select: { id: true, fullName: true } },
            createdBy: { select: { id: true, fullName: true } },
            project: { select: { id: true, referenceNo: true, title: true } },
          },
        },
        projects: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            referenceNo: true,
            title: true,
            stage: true,
            propertyTypeKey: true,
            siteAddress: true,
            contractValue: true,
            revisedBudget: true,
            handoverDate: true,
            warrantyEndDate: true,
            createdAt: true,
            members: {
              select: {
                role: true,
                user: { select: { id: true, fullName: true, email: true } },
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          select: {
            id: true,
            referenceNo: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            status: true,
            referenceNoExt: true,
            notes: true,
            project: { select: { id: true, referenceNo: true, title: true } },
          },
        },
        documents: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            referenceNo: true,
            name: true,
            type: true,
            category: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError("Client not found");
    }

    // RBAC Record-Level Check for Standard User
    if (actorUserId && !isSuper && !isAdmin) {
      const isProjectMember = client.projects.some((p) =>
        p.members.some((pm) => pm.user.id === actorUserId)
      );
      const isLeadAssignee =
        client.lead?.assignedTo?.id === actorUserId ||
        client.leads.some((l) => l.assignedTo?.id === actorUserId);

      if (!isProjectMember && !isLeadAssignee) {
        throw new ForbiddenError("You do not have permission to access this client profile");
      }
    }

    // 1. Calculate Authoritative Financials
    const financialSummary = await ClientFinancialService.getClientFinancialSummary(
      client.id,
      canViewFinancials
    );

    // 2. Fetch Project-Specific Expenses (if authorized)
    let projectExpenses: any[] = [];
    if (canViewFinancials && client.projects.length > 0) {
      const projectIds = client.projects.map((p) => p.id);
      projectExpenses = await db.expense.findMany({
        where: {
          projectId: { in: projectIds },
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          referenceNo: true,
          amount: true,
          categoryKey: true,
          expenseDate: true,
          description: true,
          status: true,
          project: { select: { id: true, referenceNo: true, title: true } },
        },
        orderBy: { expenseDate: "desc" },
        take: 50,
      });
    }

    // 3. Fetch Unified Activity & Timeline
    const leadIds = client.leads.map((l) => l.id);
    const projIds = client.projects.map((p) => p.id);
    const quoteIds = client.quotations.map((q) => q.id);

    const [activities, auditLogs] = await Promise.all([
      db.activityLog.findMany({
        where: {
          OR: [
            { entityType: "Client", entityId: client.id },
            ...(leadIds.length > 0 ? [{ entityType: "Lead", entityId: { in: leadIds } }] : []),
            ...(projIds.length > 0 ? [{ entityType: "Project", entityId: { in: projIds } }] : []),
            ...(quoteIds.length > 0 ? [{ entityType: "Quotation", entityId: { in: quoteIds } }] : []),
          ],
        },
        include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.auditLog.findMany({
        where: {
          entityType: "Client",
          entityId: client.id,
        },
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    // Separate Internal Notes from ActivityLog
    const internalNotes = activities
      .filter((a) => a.type === "NOTE" || a.title.startsWith("[INTERNAL]"))
      .map((a) => ({
        id: a.id,
        title: a.title.replace("[INTERNAL] ", ""),
        description: a.description,
        createdAt: a.createdAt,
        author: a.user?.fullName || "System",
      }));

    // Build Chronological Timeline
    const timeline = activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      entityType: a.entityType,
      entityId: a.entityId,
      createdAt: a.createdAt,
      actorName: a.user?.fullName || "System",
    }));

    return {
      client: {
        id: client.id,
        referenceNo: client.referenceNo,
        fullName: client.fullName,
        companyName: client.companyName,
        clientType: client.clientType,
        status: client.status,
        phone: client.phone,
        alternatePhone: client.alternatePhone,
        email: client.email,
        address: client.address,
        city: client.city,
        state: client.state,
        postalCode: client.postalCode,
        country: client.country,
        gstin: client.gstin,
        pan: client.pan,
        billingAddress: client.billingAddress,
        shippingAddress: client.shippingAddress,
        preferredContactMethod: client.preferredContactMethod,
        tags: client.tags,
        notes: client.notes,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      },
      leads: client.leads,
      quotations: client.quotations,
      projects: client.projects,
      payments: canViewFinancials ? client.payments : [],
      invoices: [],
      expenses: projectExpenses,
      financialSummary,
      internalNotes,
      timeline,
      auditLogs,
      documents: client.documents,
    };
  }

  /**
   * Create a new Client record with sequential reference and duplicate detection
   */
  public static async createClient(input: CreateClientInput, actorUserId?: string) {
    if (actorUserId) {
      await RbacService.authorize(actorUserId, "clients:write", "CREATE_CLIENT");
    }

    // 1. Check for Duplicate Clients
    const duplicateWarning = await DuplicateClientDetectionService.checkDuplicates({
      phone: input.phone,
      email: input.email || undefined,
      gstin: input.gstin || undefined,
      companyName: input.companyName || undefined,
      fullName: input.fullName,
    });

    // Check unique phone collision
    const existingPhone = await db.client.findFirst({
      where: { phone: input.phone },
    });
    if (existingPhone) {
      throw new ConflictError(`A client with phone number "${input.phone}" already exists (${existingPhone.referenceNo} - ${existingPhone.fullName})`);
    }

    // 2. Generate Reference ID
    const referenceNo = await IdGeneratorService.generate("CLI");

    // 3. Create Client in DB
    const client = await db.client.create({
      data: {
        referenceNo,
        fullName: input.fullName.trim(),
        companyName: input.companyName?.trim() || null,
        clientType: input.clientType || "INDIVIDUAL",
        status: input.status || "ACTIVE",
        phone: input.phone.trim(),
        alternatePhone: input.alternatePhone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        postalCode: input.postalCode?.trim() || null,
        country: input.country || "India",
        gstin: input.gstin?.trim() || null,
        pan: input.pan?.trim() || null,
        billingAddress: input.billingAddress?.trim() || null,
        shippingAddress: input.shippingAddress?.trim() || null,
        preferredContactMethod: input.preferredContactMethod || "PHONE",
        tags: input.tags?.trim() || null,
        notes: input.notes?.trim() || null,
        leadId: input.leadId || null,
      },
    });

    // 4. Link Lead if provided
    if (input.leadId) {
      await db.lead.update({
        where: { id: input.leadId },
        data: { clientId: client.id },
      }).catch(() => {});
    }

    // 5. Audit Logging
    await AuditService.log({
      userId: actorUserId,
      action: "CLIENT_CREATED",
      entityType: "Client",
      entityId: client.id,
      newValues: { referenceNo: client.referenceNo, fullName: client.fullName, phone: client.phone },
    });

    await db.activityLog.create({
      data: {
        userId: actorUserId,
        entityType: "Client",
        entityId: client.id,
        type: "STATUS_CHANGE",
        title: `Client created: ${client.fullName} (${client.referenceNo})`,
        description: `Client account initialized with type ${client.clientType}`,
      },
    });

    return {
      client,
      duplicateWarning: duplicateWarning.isDuplicate ? duplicateWarning : null,
    };
  }

  /**
   * Update Client record
   */
  public static async updateClient(id: string, input: UpdateClientInput, actorUserId?: string) {
    if (actorUserId) {
      await RbacService.authorize(actorUserId, "clients:write", "UPDATE_CLIENT");
    }

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Client not found");
    }

    // Check unique phone collision if phone is being changed
    if (input.phone && input.phone !== existing.phone) {
      const phoneCollision = await db.client.findFirst({
        where: { phone: input.phone, id: { not: id } },
      });
      if (phoneCollision) {
        throw new ConflictError(`Phone number "${input.phone}" is already used by client ${phoneCollision.referenceNo} (${phoneCollision.fullName})`);
      }
    }

    const updated = await db.client.update({
      where: { id },
      data: {
        fullName: input.fullName !== undefined ? input.fullName.trim() : undefined,
        companyName: input.companyName !== undefined ? input.companyName?.trim() || null : undefined,
        clientType: input.clientType,
        status: input.status,
        phone: input.phone !== undefined ? input.phone.trim() : undefined,
        alternatePhone: input.alternatePhone !== undefined ? input.alternatePhone?.trim() || null : undefined,
        email: input.email !== undefined ? input.email?.trim() || null : undefined,
        address: input.address !== undefined ? input.address?.trim() || null : undefined,
        city: input.city !== undefined ? input.city?.trim() || null : undefined,
        state: input.state !== undefined ? input.state?.trim() || null : undefined,
        postalCode: input.postalCode !== undefined ? input.postalCode?.trim() || null : undefined,
        country: input.country,
        gstin: input.gstin !== undefined ? input.gstin?.trim() || null : undefined,
        pan: input.pan !== undefined ? input.pan?.trim() || null : undefined,
        billingAddress: input.billingAddress !== undefined ? input.billingAddress?.trim() || null : undefined,
        shippingAddress: input.shippingAddress !== undefined ? input.shippingAddress?.trim() || null : undefined,
        preferredContactMethod: input.preferredContactMethod,
        tags: input.tags !== undefined ? input.tags?.trim() || null : undefined,
        notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
      },
    });

    await AuditService.log({
      userId: actorUserId,
      action: "CLIENT_UPDATED",
      entityType: "Client",
      entityId: id,
      oldValues: { fullName: existing.fullName, status: existing.status, clientType: existing.clientType },
      newValues: { fullName: updated.fullName, status: updated.status, clientType: updated.clientType },
    });

    return updated;
  }

  /**
   * Safe Client Deletion with foreign key dependency enforcement
   */
  public static async deleteClient(id: string, actorUserId?: string) {
    if (actorUserId) {
      await RbacService.authorize(actorUserId, "clients:delete", "DELETE_CLIENT");
    }

    const client = await db.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            projects: true,
            quotations: true,
            payments: true,
            leads: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError("Client not found");
    }

    const reasons: string[] = [];
    if (client._count.projects > 0) reasons.push(`${client._count.projects} linked project(s)`);
    if (client._count.quotations > 0) reasons.push(`${client._count.quotations} quotation(s)`);
    if (client._count.payments > 0) reasons.push(`${client._count.payments} financial payment(s)`);
    if (client._count.leads > 0) reasons.push(`${client._count.leads} lead(s)`);

    if (reasons.length > 0) {
      throw new BusinessRuleError(
        `Client "${client.referenceNo}" (${client.fullName}) cannot be deleted because historical records exist: ${reasons.join(", ")}. Please deactivate or archive this client instead.`
      );
    }

    await db.client.delete({ where: { id } });

    await AuditService.log({
      userId: actorUserId,
      action: "CLIENT_DELETED",
      entityType: "Client",
      entityId: id,
      oldValues: { referenceNo: client.referenceNo, fullName: client.fullName },
    });

    return { success: true, message: `Client ${client.referenceNo} successfully removed.` };
  }

  /**
   * Archive or toggle client status (ACTIVE / INACTIVE / PROSPECT / CUSTOMER)
   */
  public static async changeStatus(id: string, status: string, actorUserId?: string) {
    if (actorUserId) {
      await RbacService.authorize(actorUserId, "clients:archive", "CHANGE_CLIENT_STATUS");
    }

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Client not found");
    }

    const updated = await db.client.update({
      where: { id },
      data: { status },
    });

    await AuditService.log({
      userId: actorUserId,
      action: "CLIENT_STATUS_CHANGED",
      entityType: "Client",
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: updated.status },
    });

    await db.activityLog.create({
      data: {
        userId: actorUserId,
        entityType: "Client",
        entityId: id,
        type: "STATUS_CHANGE",
        title: `Client status changed to ${status}`,
        description: `Status transitioned from ${existing.status} to ${status}`,
      },
    });

    return updated;
  }

  /**
   * Add Internal Note to Client
   */
  public static async addNote(id: string, input: AddClientNoteInput, actorUserId?: string) {
    if (actorUserId) {
      await RbacService.authorize(actorUserId, "clients:manage_notes", "ADD_CLIENT_NOTE");
    }

    const client = await db.client.findUnique({ where: { id } });
    if (!client) {
      throw new NotFoundError("Client not found");
    }

    const activity = await db.activityLog.create({
      data: {
        userId: actorUserId,
        entityType: "Client",
        entityId: id,
        type: "NOTE",
        title: `[INTERNAL] ${input.title.trim()}`,
        description: input.description.trim(),
      },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    });

    return {
      id: activity.id,
      title: input.title.trim(),
      description: input.description.trim(),
      createdAt: activity.createdAt,
      author: activity.user?.fullName || "Staff",
    };
  }

  /**
   * Link existing Lead to Client
   */
  public static async linkLead(clientId: string, leadId: string, actorUserId?: string) {
    if (actorUserId) {
      await RbacService.authorize(actorUserId, "clients:write", "LINK_LEAD_TO_CLIENT");
    }

    const [client, lead] = await Promise.all([
      db.client.findUnique({ where: { id: clientId } }),
      db.lead.findUnique({ where: { id: leadId } }),
    ]);

    if (!client) throw new NotFoundError("Client not found");
    if (!lead) throw new NotFoundError("Lead not found");

    await db.lead.update({
      where: { id: leadId },
      data: { clientId },
    });

    await AuditService.log({
      userId: actorUserId,
      action: "LEAD_LINKED_TO_CLIENT",
      entityType: "Client",
      entityId: clientId,
      newValues: { leadId, leadReferenceNo: lead.referenceNo },
    });

    await db.activityLog.create({
      data: {
        userId: actorUserId,
        entityType: "Client",
        entityId: clientId,
        type: "STATUS_CHANGE",
        title: `Lead linked: ${lead.referenceNo}`,
        description: `Lead ${lead.referenceNo} (${lead.clientName}) linked to client ${client.referenceNo}`,
      },
    });

    return { success: true, message: `Lead ${lead.referenceNo} successfully linked to client ${client.referenceNo}` };
  }

  /**
   * Aggregate directory-level KPI metrics
   */
  public static async getClientMetrics(actorUserId?: string) {
    let canViewFinancials = false;
    if (actorUserId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorUserId);
      const isAdmin = await RbacService.isUserAdmin(actorUserId);
      const hasFinPerm = await RbacService.hasPermission(actorUserId, "clients:view_financials");
      canViewFinancials = isSuper || isAdmin || hasFinPerm;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalClients, activeClients, prospects, newThisMonth, clientsWithActiveProjects] =
      await Promise.all([
        db.client.count(),
        db.client.count({ where: { status: "ACTIVE" } }),
        db.client.count({ where: { status: "PROSPECT" } }),
        db.client.count({ where: { createdAt: { gte: startOfMonth } } }),
        db.client.count({
          where: {
            projects: {
              some: {
                stage: { notIn: ["COMPLETED", "HANDOVER", "CANCELLED", "WARRANTY"] },
              },
            },
          },
        }),
      ]);

    let clientsWithOutstandingCount: number | null = null;
    if (canViewFinancials) {
      const clientsWithProjects = await db.client.findMany({
        select: {
          id: true,
          projects: {
            select: {
              contractValue: true,
              revisedBudget: true,
              payments: {
                where: { status: { in: ["VERIFIED", "ACCEPTED", "COMPLETED"] } },
                select: { amount: true },
              },
            },
          },
        },
      });

      let count = 0;
      for (const c of clientsWithProjects) {
        let val = 0;
        let paid = 0;
        for (const p of c.projects) {
          val += p.revisedBudget || p.contractValue || 0;
          for (const pay of p.payments) {
            paid += pay.amount;
          }
        }
        if (val - paid > 0) {
          count++;
        }
      }
      clientsWithOutstandingCount = count;
    }

    return {
      totalClients,
      activeClients,
      prospects,
      newThisMonth,
      clientsWithActiveProjects,
      clientsWithOutstandingCount,
      canViewFinancials,
    };
  }
}
