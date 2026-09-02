import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { NotificationService } from "../notifications/notification.service";
import { DuplicateDetectionService } from "./duplicate-detection.service";
import { RbacService } from "../rbac/rbac.service";
import { CreateLeadInput, UpdateLeadInput, ChangeStatusInput } from "@/validators/lead.schema";

export interface LeadFilterParams {
  status?: string;
  stage?: string;
  source?: string;
  priority?: string;
  assignedToId?: string;
  tags?: string;
  minBudget?: number;
  maxBudget?: number;
  createdFrom?: string | Date;
  createdTo?: string | Date;
  followUpFrom?: string | Date;
  followUpTo?: string | Date;
  search?: string;
  page?: number;
  limit?: number;
}

export class LeadService {
  /**
   * Helper to resolve stage aliases (e.g. ESTIMATE_SENT -> QUOTATION_SENT)
   */
  public static normalizeStage(stage?: string | null): string | undefined {
    if (!stage) return undefined;
    if (stage === "ESTIMATE_SENT") return "QUOTATION_SENT";
    return stage;
  }

  public static async checkForDuplicate(phone: string, email?: string | null, clientName?: string, location?: string | null) {
    return DuplicateDetectionService.checkDuplicates({
      phone,
      email,
      clientName,
      location,
    });
  }

  public static async createLead(input: CreateLeadInput, userId?: string) {
    const duplicateCheck = await this.checkForDuplicate(
      input.phone,
      input.email,
      input.clientName,
      input.location || input.propertyLocation
    );

    const referenceNo = await IdGeneratorService.generate("LEAD");

    const sourceKey = input.sourceKey || input.source || "WEBSITE";
    const propertyTypeKey = input.propertyTypeKey || input.propertyType || "APARTMENT_INTERIOR";
    const location = (input.location || input.propertyLocation || "").trim() || null;
    const estimatedBudget = input.budget !== undefined ? input.budget : input.estimatedBudget !== undefined ? input.estimatedBudget : null;
    const priority = input.priority || "MEDIUM";
    const tags = input.tags ? input.tags.trim() : null;
    const notes = input.notes ? input.notes.trim() : null;
    const requirement = input.requirement ? input.requirement.trim() : null;
    const assignedToId = input.assignedToId || null;

    const lead = await db.lead.create({
      data: {
        referenceNo,
        clientName: input.clientName.trim(),
        phone: input.phone.trim(),
        email: input.email ? input.email.trim() : null,
        sourceKey,
        propertyTypeKey,
        location,
        estimatedBudget,
        requirement,
        priority,
        tags,
        notes,
        assignedToId,
        stage: "NEW",
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    // If client ID was explicitly passed, link client
    if (input.clientId && typeof input.clientId === "string" && input.clientId.trim().length > 0) {
      await db.client.update({
        where: { id: input.clientId },
        data: { leadId: lead.id },
      }).catch(() => {});
    }

    await AuditService.logEvent({
      userId,
      action: "LEAD_CREATED",
      entityType: "Lead",
      entityId: lead.id,
      newValues: {
        referenceNo: lead.referenceNo,
        clientName: lead.clientName,
        phone: lead.phone,
        sourceKey,
        priority,
        estimatedBudget,
        assignedToId,
      },
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: lead.id,
      type: "STATUS_CHANGE",
      title: `Lead ${lead.referenceNo} Created`,
      description: `New lead registered for ${lead.clientName} (${lead.phone}) via ${sourceKey} [Priority: ${priority}].`,
    });

    if (assignedToId) {
      await NotificationService.create({
        userId: assignedToId,
        type: "LEAD_ASSIGNED",
        title: `Lead Assigned: ${lead.referenceNo}`,
        message: `You have been assigned lead "${lead.clientName}" (${lead.referenceNo}).`,
        entityType: "Lead",
        entityId: lead.id,
        actionUrl: `/leads`,
      });
    }

    return {
      lead,
      duplicateWarning: duplicateCheck.isDuplicate ? duplicateCheck : null,
    };
  }

  public static async getLeads(params: LeadFilterParams, actorUserId?: string) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(100, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // 1. Stage / Status filter
    const rawStage = params.status || params.stage;
    if (rawStage) {
      if (rawStage === "QUOTATION_SENT") {
        where.stage = { in: ["QUOTATION_SENT", "ESTIMATE_SENT"] };
      } else if (rawStage === "ALL_ACTIVE") {
        where.stage = { notIn: ["WON", "LOST"] };
      } else {
        where.stage = rawStage;
      }
    }

    // 2. Source filter
    if (params.source) {
      where.sourceKey = params.source;
    }

    // 3. Priority filter
    if (params.priority) {
      where.priority = params.priority;
    }

    // 4. Assigned staff filter
    if (params.assignedToId) {
      where.assignedToId = params.assignedToId;
    }

    // 5. Tags filter
    if (params.tags) {
      where.tags = { contains: params.tags };
    }

    // 6. Budget range
    if (params.minBudget !== undefined || params.maxBudget !== undefined) {
      where.estimatedBudget = {
        ...(params.minBudget !== undefined ? { gte: params.minBudget } : {}),
        ...(params.maxBudget !== undefined ? { lte: params.maxBudget } : {}),
      };
    }

    // 7. Created date range
    if (params.createdFrom || params.createdTo) {
      where.createdAt = {
        ...(params.createdFrom ? { gte: new Date(params.createdFrom) } : {}),
        ...(params.createdTo ? { lte: new Date(params.createdTo) } : {}),
      };
    }

    // 8. Text Search
    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { clientName: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { location: { contains: q } },
        { requirement: { contains: q } },
      ];
    }

    // 9. RBAC Record-level Scoping
    if (actorUserId) {
      const isSuperAdmin = await RbacService.isSuperAdmin(actorUserId);
      const isAdmin = await RbacService.isAdmin(actorUserId);
      const hasReadAll = await RbacService.hasPermission(actorUserId, "leads:read_all");

      if (!isSuperAdmin && !isAdmin && !hasReadAll) {
        // Scope to assigned leads or created leads
        where.assignedToId = actorUserId;
      }
    }

    const [total, rawLeads] = await Promise.all([
      db.lead.count({ where }),
      db.lead.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          assignedTo: { select: { id: true, fullName: true, email: true, phone: true } },
          followUps: {
            where: { status: "PENDING" },
            orderBy: { followUpDate: "asc" },
            take: 1,
            select: { id: true, followUpDate: true, type: true, notes: true, status: true },
          },
          siteVisits: {
            where: { status: "SCHEDULED" },
            orderBy: { visitDate: "asc" },
            take: 1,
            select: { id: true, visitDate: true, location: true, status: true },
          },
          quotations: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, referenceNo: true, totalAmount: true, status: true, revision: true },
          },
          project: {
            select: { id: true, referenceNo: true, title: true, stage: true, contractValue: true },
          },
          client: {
            select: { id: true, referenceNo: true, fullName: true, phone: true },
          },
        },
      }),
    ]);

    // Normalize returned leads
    const leads = rawLeads.map((l) => ({
      ...l,
      stage: this.normalizeStage(l.stage),
      nextFollowUp: l.followUps[0] || null,
      nextSiteVisit: l.siteVisits[0] || null,
      latestQuotation: l.quotations[0] || null,
    }));

    return {
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getLeadById(id: string, actorUserId?: string) {
    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } },
        followUps: {
          orderBy: { followUpDate: "desc" },
          include: { assignedTo: { select: { id: true, fullName: true } } },
        },
        siteVisits: {
          orderBy: { visitDate: "desc" },
          include: { assignedTo: { select: { id: true, fullName: true } } },
        },
        quotations: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            referenceNo: true,
            title: true,
            totalAmount: true,
            subtotal: true,
            discountAmount: true,
            taxAmount: true,
            status: true,
            revision: true,
            parentQuotationId: true,
            createdAt: true,
            approvedAt: true,
            clientApprovedName: true,
          },
        },
        project: {
          select: { id: true, referenceNo: true, title: true, stage: true, contractValue: true, revisedBudget: true },
        },
        client: {
          select: { id: true, referenceNo: true, fullName: true, phone: true, email: true, address: true },
        },
        stageHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) throw new NotFoundError("Lead record not found");

    // Scoping check for non-admin users
    if (actorUserId) {
      const isSuperAdmin = await RbacService.isSuperAdmin(actorUserId);
      const isAdmin = await RbacService.isAdmin(actorUserId);
      const hasReadAll = await RbacService.hasPermission(actorUserId, "leads:read_all");

      if (!isSuperAdmin && !isAdmin && !hasReadAll && lead.assignedToId && lead.assignedToId !== actorUserId) {
        throw new ForbiddenError("You do not have access to view this assigned lead record.");
      }
    }

    const timeline = await ActivityService.getTimeline("Lead", lead.id);

    return {
      lead: {
        ...lead,
        stage: this.normalizeStage(lead.stage),
      },
      timeline,
    };
  }

  public static async updateLead(id: string, input: UpdateLeadInput, userId?: string) {
    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundError("Lead record not found");

    const updated = await db.lead.update({
      where: { id },
      data: {
        clientName: input.clientName ? input.clientName.trim() : undefined,
        phone: input.phone ? input.phone.trim() : undefined,
        email: input.email !== undefined ? (input.email ? input.email.trim() : null) : undefined,
        sourceKey: input.sourceKey || input.source || undefined,
        propertyTypeKey: input.propertyTypeKey || input.propertyType || undefined,
        location: input.location !== undefined ? (input.location ? input.location.trim() : null) : input.propertyLocation !== undefined ? (input.propertyLocation ? input.propertyLocation.trim() : null) : undefined,
        estimatedBudget: input.estimatedBudget !== undefined ? input.estimatedBudget : input.budget !== undefined ? input.budget : undefined,
        requirement: input.requirement !== undefined ? (input.requirement ? input.requirement.trim() : null) : undefined,
        priority: input.priority || undefined,
        tags: input.tags !== undefined ? (input.tags ? input.tags.trim() : null) : undefined,
        notes: input.notes !== undefined ? (input.notes ? input.notes.trim() : null) : undefined,
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    await AuditService.logEvent({
      userId,
      action: "LEAD_UPDATED",
      entityType: "Lead",
      entityId: id,
      oldValues: lead,
      newValues: updated,
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: id,
      type: "STATUS_CHANGE",
      title: `Lead Details Updated`,
      description: `Updated contact/property attributes for ${updated.clientName}.`,
    });

    return updated;
  }

  public static async changeStatus(id: string, input: ChangeStatusInput, userId?: string) {
    const lead = await db.lead.findUnique({
      where: { id },
      include: { quotations: true },
    });

    if (!lead) throw new NotFoundError("Lead record not found");

    const targetStage = input.status;

    // 1. Quotation Stage Validation
    if (targetStage === "ESTIMATE_SENT" || targetStage === "QUOTATION_SENT") {
      const hasSentOrApprovedQuote = lead.quotations.some((q) => q.status === "APPROVED" || q.status === "SENT" || q.status === "READY_TO_SEND");
      if (!hasSentOrApprovedQuote && lead.quotations.length === 0) {
        throw new BusinessRuleError("Cannot advance to Quotation Sent without at least one Quotation record created.");
      }
    }

    // 2. Won Validation
    if (targetStage === "WON") {
      const hasApprovedQuote = lead.quotations.some((q) => q.status === "APPROVED");
      if (!hasApprovedQuote) {
        throw new BusinessRuleError("Cannot mark lead as Won without at least one Approved Quotation.");
      }
    }

    // 3. Lost Validation
    if (targetStage === "LOST" && !input.lossReason) {
      throw new ValidationError("A valid loss reason is mandatory when marking a lead as Lost.");
    }

    const oldStage = lead.stage;

    const updated = await db.lead.update({
      where: { id },
      data: {
        stage: targetStage,
        lossReasonKey: targetStage === "LOST" ? input.lossReason : null,
      },
    });

    // Record stage history
    await db.leadStageHistory.create({
      data: {
        leadId: id,
        fromStage: oldStage,
        toStage: targetStage,
        changedById: userId || null,
        notes: input.reopenReason
          ? `Reopened from Lost. Reason: ${input.reopenReason}`
          : input.lossReason
          ? `Marked Lost: ${input.lossReason}`
          : input.notes || null,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "LEAD_STATUS_CHANGED",
      entityType: "Lead",
      entityId: id,
      oldValues: { stage: oldStage },
      newValues: { stage: targetStage, lossReason: input.lossReason, reopenReason: input.reopenReason },
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: id,
      type: "STATUS_CHANGE",
      title: `Stage Changed: ${oldStage} → ${targetStage}`,
      description: input.lossReason
        ? `Loss Reason: ${input.lossReason}`
        : input.reopenReason
        ? `Reopen Reason: ${input.reopenReason}`
        : undefined,
    });

    return updated;
  }

  public static async assignLead(id: string, assignedToId: string, userId?: string) {
    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundError("Lead record not found");

    const newAssignee = await db.user.findUnique({ where: { id: assignedToId } });
    if (!newAssignee) throw new NotFoundError("Assignee user account not found");

    const oldAssigneeId = lead.assignedToId;

    const updated = await db.lead.update({
      where: { id },
      data: { assignedToId },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    await AuditService.logEvent({
      userId,
      action: "LEAD_ASSIGNED",
      entityType: "Lead",
      entityId: id,
      oldValues: { assignedToId: oldAssigneeId },
      newValues: { assignedToId },
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: id,
      type: "STATUS_CHANGE",
      title: `Lead Assigned to ${newAssignee.fullName}`,
      description: `Assigned on ${new Date().toLocaleDateString()}`,
    });

    await NotificationService.create({
      userId: assignedToId,
      type: "LEAD_ASSIGNED",
      title: `Lead Assigned: ${lead.referenceNo}`,
      message: `You have been assigned lead "${lead.clientName}" (${lead.referenceNo}).`,
      entityType: "Lead",
      entityId: lead.id,
      actionUrl: `/leads`,
    });

    return updated;
  }

  public static async linkExistingClient(leadId: string, clientId: string, userId?: string) {
    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundError("Lead not found");

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundError("Client not found");

    await db.client.update({
      where: { id: clientId },
      data: { leadId },
    });

    await AuditService.logEvent({
      userId,
      action: "CLIENT_LINKED_TO_LEAD",
      entityType: "Lead",
      entityId: leadId,
      newValues: { clientId, clientName: client.fullName },
    });

    await ActivityService.record({
      userId,
      entityType: "Lead",
      entityId: leadId,
      type: "STATUS_CHANGE",
      title: `Linked to Existing Client: ${client.fullName}`,
      description: `Client Reference: ${client.referenceNo}`,
    });

    return { success: true, client };
  }

  public static async getPipelineMetrics(actorUserId?: string) {
    const where: Record<string, unknown> = {};

    if (actorUserId) {
      const isSuperAdmin = await RbacService.isSuperAdmin(actorUserId);
      const isAdmin = await RbacService.isAdmin(actorUserId);
      const hasReadAll = await RbacService.hasPermission(actorUserId, "leads:read_all");

      if (!isSuperAdmin && !isAdmin && !hasReadAll) {
        where.assignedToId = actorUserId;
      }
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const [
      totalLeads,
      activeLeads,
      wonLeads,
      lostLeads,
      followUpsDue,
      siteVisitsScheduled,
      quotationsSent,
      inNegotiation,
      activeLeadsList,
      wonLeadsList,
      stageGroupCounts,
      sourceGroupCounts,
      contactedLeads,
      nonContactedLeads,
    ] = await Promise.all([
      db.lead.count({ where }),
      db.lead.count({ where: { ...where, stage: { notIn: ["WON", "PROJECT_CREATED", "LOST"] } } }),
      db.lead.count({ where: { ...where, stage: { in: ["WON", "PROJECT_CREATED"] } } }),
      db.lead.count({ where: { ...where, stage: "LOST" } }),
      db.leadFollowUp.count({
        where: {
          status: "PENDING",
          followUpDate: { lte: today },
          lead: where,
        },
      }),
      db.leadSiteVisit.count({
        where: {
          status: "SCHEDULED",
          lead: where,
        },
      }),
      db.lead.count({
        where: {
          ...where,
          stage: { in: ["QUOTATION_SENT", "ESTIMATE_SENT"] },
        },
      }),
      db.lead.count({ where: { ...where, stage: "NEGOTIATION" } }),
      db.lead.findMany({
        where: { ...where, stage: { notIn: ["WON", "PROJECT_CREATED", "LOST"] } },
        select: { estimatedBudget: true },
      }),
      db.lead.findMany({
        where: { ...where, stage: { in: ["WON", "PROJECT_CREATED"] } },
        select: { estimatedBudget: true, quotations: { where: { status: "APPROVED" }, select: { totalAmount: true } } },
      }),
      db.lead.groupBy({
        by: ["stage"],
        where,
        _count: { _all: true },
        _sum: { estimatedBudget: true },
      }),
      db.lead.groupBy({
        by: ["sourceKey"],
        where,
        _count: { _all: true },
      }),
      db.lead.count({
        where: {
          ...where,
          stage: { notIn: ["NEW", "NOT_CONTACTED", "NON_CONTACTED"] },
        },
      }),
      db.lead.count({
        where: {
          ...where,
          stage: { in: ["NEW", "NOT_CONTACTED", "NON_CONTACTED"] },
        },
      }),
    ]);

    const pipelineExpectedValue = activeLeadsList.reduce((sum, l) => sum + (l.estimatedBudget || 0), 0);
    const wonValue = wonLeadsList.reduce((sum, l) => {
      const approvedTotal = l.quotations[0]?.totalAmount;
      return sum + (approvedTotal !== undefined ? approvedTotal : (l.estimatedBudget || 0));
    }, 0);

    const conversionRate = (wonLeads + lostLeads > 0)
      ? Math.round((wonLeads / (wonLeads + lostLeads)) * 100)
      : totalLeads > 0
      ? Math.round((wonLeads / totalLeads) * 100)
      : 0;

    return {
      totalLeads,
      activeLeads,
      contactedLeads,
      nonContactedLeads,
      wonLeads,
      lostLeads,
      followUpsDue,
      siteVisitsScheduled,
      quotationsSent,
      inNegotiation,
      conversionRate,
      pipelineExpectedValue,
      wonValue,
      byStage: stageGroupCounts.map((g) => ({
        stage: this.normalizeStage(g.stage),
        count: g._count._all,
        value: g._sum.estimatedBudget || 0,
      })),
      bySource: sourceGroupCounts.map((g) => ({
        source: g.sourceKey,
        count: g._count._all,
      })),
    };
  }

  /**
   * Lead Source ROI Tracking Calculation
   */
  public static async getLeadSourceRoi() {
    const [sources, leadsBySource, wonLeadsBySource, marketingExpenses] = await Promise.all([
      db.leadSourceConfig.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      }),
      db.lead.groupBy({
        by: ["sourceKey"],
        _count: { _all: true },
        _sum: { estimatedBudget: true },
      }),
      db.lead.findMany({
        where: { stage: { in: ["WON", "PROJECT_CREATED"] } },
        select: {
          sourceKey: true,
          estimatedBudget: true,
          quotations: { where: { status: "APPROVED" }, select: { totalAmount: true } },
          project: { select: { contractValue: true } },
        },
      }),
      db.expense.findMany({
        where: {
          status: "APPROVED",
          OR: [
            { categoryKey: "MARKETING" },
            { categoryKey: "ADVERTISING" },
            { description: { contains: "MARKETING" } },
            { description: { contains: "ADS" } },
          ],
        },
        select: { amount: true, description: true, categoryKey: true },
      }),
    ]);

    const leadCountMap = new Map<string, { total: number; totalBudget: number }>();
    leadsBySource.forEach((item) => {
      leadCountMap.set(item.sourceKey, {
        total: item._count._all,
        totalBudget: item._sum.estimatedBudget || 0,
      });
    });

    const wonValueMap = new Map<string, { count: number; revenue: number }>();
    wonLeadsBySource.forEach((lead) => {
      const existing = wonValueMap.get(lead.sourceKey) || { count: 0, revenue: 0 };
      const contractVal = lead.project?.contractValue || lead.quotations[0]?.totalAmount || lead.estimatedBudget || 0;
      wonValueMap.set(lead.sourceKey, {
        count: existing.count + 1,
        revenue: existing.revenue + contractVal,
      });
    });

    // Calculate marketing spend per source if descriptions mention the source key, otherwise distribute evenly or 0
    const sourceStats = sources.map((source) => {
      const leadData = leadCountMap.get(source.key) || { total: 0, totalBudget: 0 };
      const wonData = wonValueMap.get(source.key) || { count: 0, revenue: 0 };

      // Calculate source-specific spend
      const directSpend = marketingExpenses
        .filter((e) => e.description?.toUpperCase().includes(source.key.toUpperCase()) || e.description?.toUpperCase().includes(source.name.toUpperCase()))
        .reduce((sum, e) => sum + e.amount, 0);

      const totalLeads = leadData.total;
      const wonLeads = wonData.count;
      const wonRevenue = wonData.revenue;
      const spend = directSpend;

      const conversionRatePct = totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;
      const costPerLead = spend > 0 && totalLeads > 0 ? Number((spend / totalLeads).toFixed(0)) : 0;
      const costPerAcquisition = spend > 0 && wonLeads > 0 ? Number((spend / wonLeads).toFixed(0)) : 0;
      const netProfit = wonRevenue - spend;
      const roiPct = spend > 0 ? Number((((wonRevenue - spend) / spend) * 100).toFixed(1)) : null;

      return {
        sourceKey: source.key,
        sourceName: source.name,
        totalLeads,
        wonLeads,
        conversionRatePct,
        wonRevenue,
        spend,
        costPerLead,
        costPerAcquisition,
        netProfit,
        roiPct,
      };
    });

    const totalLeadsAll = sourceStats.reduce((s, x) => s + x.totalLeads, 0);
    const totalWonAll = sourceStats.reduce((s, x) => s + x.wonLeads, 0);
    const totalRevenueAll = sourceStats.reduce((s, x) => s + x.wonRevenue, 0);
    const totalSpendAll = sourceStats.reduce((s, x) => s + x.spend, 0);
    const overallConversionPct = totalLeadsAll > 0 ? Number(((totalWonAll / totalLeadsAll) * 100).toFixed(1)) : 0;
    const overallRoiPct = totalSpendAll > 0 ? Number((((totalRevenueAll - totalSpendAll) / totalSpendAll) * 100).toFixed(1)) : null;

    return {
      summary: {
        totalLeads: totalLeadsAll,
        totalWon: totalWonAll,
        totalRevenue: totalRevenueAll,
        totalSpend: totalSpendAll,
        overallConversionPct,
        overallRoiPct,
      },
      sources: sourceStats,
    };
  }

  public static async deleteLead(id: string, userId?: string) {
    const lead = await db.lead.findUnique({
      where: { id },
      include: { quotations: true, project: true },
    });

    if (!lead) throw new NotFoundError("Lead record not found");

    if (lead.project) {
      throw new BusinessRuleError("Cannot delete lead linked to an existing project. Use archive instead.");
    }

    if (lead.quotations.length > 0) {
      throw new BusinessRuleError("Cannot delete lead with linked quotation history.");
    }

    await db.lead.delete({ where: { id } });

    await AuditService.logEvent({
      userId,
      action: "LEAD_DELETED",
      entityType: "Lead",
      entityId: id,
      oldValues: { referenceNo: lead.referenceNo, clientName: lead.clientName },
    });

    return { success: true, message: `Lead ${lead.referenceNo} removed` };
  }
}
