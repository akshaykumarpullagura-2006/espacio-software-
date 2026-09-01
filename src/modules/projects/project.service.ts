import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError, AuthError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { WarrantyService } from "./warranty.service";
import { ProjectStageService } from "./project-stage.service";
import { RbacService } from "../rbac/rbac.service";
import { ProjectFilterInput } from "@/validators/project.schema";

export class ProjectService {
  /**
   * Calculate delay health status based on target completion date and current stage
   */
  public static calculateDelayHealth(project: {
    stage?: string | null;
    status?: string | null;
    targetCompletionDate?: Date | string | null;
    targetDate?: Date | string | null;
    handoverDate?: Date | string | null;
    actualCompletionDate?: Date | string | null;
  }) {
    const stage = ProjectStageService.normalizeStageKey(project.stage);
    if (stage === "PROJECT_COMPLETED" || stage === "WARRANTY" || project.status === "COMPLETED" || project.status === "WARRANTY") {
      return { status: "ON_TIME", daysDelayed: 0, text: "Completed on schedule" };
    }

    const target = project.targetCompletionDate || project.targetDate || project.handoverDate;
    if (!target) {
      return { status: "ON_TIME", daysDelayed: 0, text: "Execution on schedule" };
    }

    const targetDate = new Date(target);
    const now = new Date();

    if (now > targetDate) {
      const days = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 3600 * 24));
      return {
        status: "DELAYED",
        daysDelayed: days,
        text: `${days} days past target handover`,
      };
    }

    // Check if within 5 days of target date
    const daysRemaining = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (daysRemaining <= 5 && daysRemaining >= 0) {
      return {
        status: "AT_RISK",
        daysDelayed: 0,
        text: `Due in ${daysRemaining} days`,
      };
    }

    return { status: "ON_TIME", daysDelayed: 0, text: "Execution on schedule" };
  }

  /**
   * Calculate 30-60 day post-handover review & referral timing status
   */
  public static calculateReviewReferralStatus(project: {
    handoverDate?: Date | string | null;
    stage?: string | null;
    status?: string | null;
  }) {
    if (!project.handoverDate) {
      return {
        status: "NOT_APPLICABLE",
        badge: "Not Handed Over",
        message: "Review prompt unlocks after formal project handover",
        daysSinceHandover: 0,
        isDue: false,
      };
    }

    const handover = new Date(project.handoverDate);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - handover.getTime()) / (1000 * 3600 * 24));

    if (daysSince < 30) {
      const daysLeft = 30 - daysSince;
      return {
        status: "SCHEDULED",
        badge: `Due in ${daysLeft} days`,
        message: `30-60 Day Review window opens in ${daysLeft} days (${daysSince}/30 days post-handover)`,
        daysSinceHandover: daysSince,
        isDue: false,
      };
    } else if (daysSince <= 60) {
      return {
        status: "DUE_NOW",
        badge: `Due Now (Day ${daysSince})`,
        message: `Client Review & Referral Follow-up is DUE NOW (${daysSince} days post-handover)`,
        daysSinceHandover: daysSince,
        isDue: true,
      };
    } else {
      return {
        status: "PAST_WINDOW",
        badge: `${daysSince}d Post-Handover`,
        message: `Review window elapsed (${daysSince} days post-handover). Feedback & referral collection recommended.`,
        daysSinceHandover: daysSince,
        isDue: true,
      };
    }
  }

  /**
   * Create a new Project with lead/quotation inheritance and sequential numbering
   */
  public static async createProject(input: any, userId?: string) {
    if (input.leadId) {
      const existingProject = await db.project.findFirst({
        where: { leadId: input.leadId },
        include: { client: { select: { id: true, fullName: true } } },
      });
      if (existingProject) {
        return existingProject;
      }
    }

    let clientId = input.clientId || null;
    let approvedQuotationId = input.approvedQuotationId || null;
    let quotationContractValue = 0;

    // Check lead for client linkage or quotation
    if (input.leadId) {
      const lead = await db.lead.findUnique({
        where: { id: input.leadId },
        include: {
          client: true,
          quotations: {
            where: { status: "APPROVED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (lead) {
        if (lead.client) {
          clientId = lead.client.id;
        } else if (lead.clientId) {
          clientId = lead.clientId;
        }

        if (lead.quotations && lead.quotations.length > 0) {
          approvedQuotationId = approvedQuotationId || lead.quotations[0].id;
          quotationContractValue = lead.quotations[0].totalAmount || 0;
        }
      }
    }

    // Check specific quotation if provided
    if (approvedQuotationId && quotationContractValue === 0) {
      const quote = await db.quotation.findUnique({
        where: { id: approvedQuotationId },
        select: { id: true, totalAmount: true, clientId: true },
      });
      if (quote) {
        quotationContractValue = quote.totalAmount || 0;
        if (!clientId && quote.clientId) clientId = quote.clientId;
      }
    }

    let referenceNo: string;
    try {
      referenceNo = await IdGeneratorService.generate("PROJ");
    } catch {
      referenceNo = `PROJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const contractValue =
      input.contractValue ||
      input.revisedBudget ||
      input.totalBudget ||
      quotationContractValue ||
      0;

    const initialStage = ProjectStageService.normalizeStageKey(input.stage || "CONFIRMATION_FEE_PAID");
    const targetDate = input.targetCompletionDate || input.targetDate || null;
    const startDate = input.startDate ? new Date(input.startDate) : new Date();

    let project;
    try {
      project = await db.project.create({
        data: {
          referenceNo,
          title: input.title,
          description: input.description || input.address || null,
          propertyTypeKey: input.propertyTypeKey || input.propertyType || "APARTMENT_INTERIOR",
          status: input.status || "ACTIVE",
          priority: input.priority || "MEDIUM",
          stage: initialStage,
          siteAddress: input.siteAddress || input.address || null,
          city: input.city || "Hyderabad",
          state: input.state || "Telangana",
          postalCode: input.postalCode || null,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          googleMapsUrl: input.googleMapsUrl || null,
          whatsAppGroupUrl: input.whatsAppGroupUrl || null,
          contractValue,
          revisedBudget: contractValue,
          clientId,
          leadId: input.leadId || null,
          approvedQuotationId,
          projectManagerId: input.projectManagerId || null,
          startDate,
          targetCompletionDate: targetDate ? new Date(targetDate) : null,
          notes: input.notes || null,
        },
        include: {
          client: { select: { id: true, fullName: true, phone: true, email: true } },
          lead: { select: { id: true, referenceNo: true, clientName: true } },
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        referenceNo = `PROJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        project = await db.project.create({
          data: {
            referenceNo,
            title: input.title,
            description: input.description || input.address || null,
            propertyTypeKey: input.propertyTypeKey || input.propertyType || "APARTMENT_INTERIOR",
            status: input.status || "ACTIVE",
            priority: input.priority || "MEDIUM",
            stage: initialStage,
            siteAddress: input.siteAddress || input.address || null,
            city: input.city || "Hyderabad",
            state: input.state || "Telangana",
            postalCode: input.postalCode || null,
            latitude: input.latitude || null,
            longitude: input.longitude || null,
            googleMapsUrl: input.googleMapsUrl || null,
            whatsAppGroupUrl: input.whatsAppGroupUrl || null,
            contractValue,
            revisedBudget: contractValue,
            clientId,
            leadId: input.leadId || null,
            approvedQuotationId,
            projectManagerId: input.projectManagerId || null,
            startDate,
            targetCompletionDate: targetDate ? new Date(targetDate) : null,
            notes: input.notes || null,
          },
          include: {
            client: { select: { id: true, fullName: true, phone: true, email: true } },
            lead: { select: { id: true, referenceNo: true, clientName: true } },
          },
        });
      } else {
        throw err;
      }
    }

    // Record initial stage in ProjectStageHistory
    await ProjectStageService.recordHistory(
      project.id,
      null,
      initialStage,
      userId,
      "Project initialized"
    );

    // If project manager provided, assign to team
    if (input.projectManagerId) {
      await db.projectMember.create({
        data: {
          projectId: project.id,
          userId: input.projectManagerId,
          role: "PROJECT_MANAGER",
        },
      }).catch(() => {});
    }

    // Link Quotation if provided
    if (approvedQuotationId) {
      await db.quotation.update({
        where: { id: approvedQuotationId },
        data: { projectId: project.id },
      }).catch(() => {});
    }

    await AuditService.logEvent({
      userId,
      action: "PROJECT_CREATED",
      entityType: "Project",
      entityId: project.id,
      newValues: {
        referenceNo: project.referenceNo,
        title: project.title,
        contractValue: project.contractValue,
        stage: project.stage,
        clientId: project.clientId,
      },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: project.id,
      type: "STATUS_CHANGE",
      title: `Project ${project.referenceNo} Created`,
      description: `Project initialized for ${project.client?.fullName || "Client"} with contract value ₹${project.contractValue.toLocaleString()}.`,
    });

    return project;
  }

  /**
   * Retrieve paginated project directory with multi-filtering and RBAC scoping
   */
  public static async getProjects(params: Partial<ProjectFilterInput>, actorUserId?: string) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    if (params.isArchived !== undefined) {
      where.isArchived = params.isArchived;
    } else {
      where.isArchived = false;
    }

    if (params.stage && params.stage !== "ALL") {
      where.stage = ProjectStageService.normalizeStageKey(params.stage);
    }

    if (params.status && params.status !== "ALL") {
      where.status = params.status;
    }

    if (params.priority && params.priority !== "ALL") {
      where.priority = params.priority;
    }

    if (params.projectManagerId) {
      where.projectManagerId = params.projectManagerId;
    }

    if (params.clientId) {
      where.clientId = params.clientId;
    }

    if (params.assignedUserId) {
      where.members = {
        some: { userId: params.assignedUserId },
      };
    }

    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { title: { contains: q } },
        { siteAddress: { contains: q } },
        { city: { contains: q } },
        { client: { fullName: { contains: q } } },
      ];
    }

    // RBAC record-level scoping
    let canViewFinancials = true;
    if (actorUserId) {
      const isSuperAdmin = await RbacService.isUserSuperAdmin(actorUserId);
      if (!isSuperAdmin) {
        canViewFinancials = await RbacService.hasPermission(actorUserId, "projects:view_financials");
      }
    }

    const orderByField = params.sortBy || "createdAt";
    const orderDirection = params.sortOrder || "desc";

    const [total, rawProjects] = await Promise.all([
      db.project.count({ where }),
      db.project.findMany({
        where,
        orderBy: { [orderByField]: orderDirection },
        skip,
        take: limit,
        include: {
          client: { select: { id: true, fullName: true, phone: true, email: true } },
          members: {
            include: {
              user: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } },
            },
          },
          _count: {
            select: {
              tasks: true,
              qualityChecks: true,
              changeOrders: true,
              warrantyIssues: true,
            },
          },
        },
      }),
    ]);

    // Enhance records with progress and delay calculations
    const projects = rawProjects.map((p) => {
      const delayHealth = this.calculateDelayHealth(p);
      const progressPct = ProjectStageService.calculateProgress(p.stage);

      return {
        ...p,
        stage: ProjectStageService.normalizeStageKey(p.stage),
        delayHealth: delayHealth.status,
        daysDelayed: delayHealth.daysDelayed,
        delayText: delayHealth.text,
        progressPct,
        totalBudget: p.revisedBudget || p.contractValue,
        targetDate: p.targetCompletionDate,
        // Redact financials if user lacks permission
        contractValue: canViewFinancials ? p.contractValue : null,
        revisedBudget: canViewFinancials ? p.revisedBudget : null,
        totalExpenses: canViewFinancials ? p.totalExpenses : null,
        netProfit: canViewFinancials ? p.netProfit : null,
        profitMarginPct: canViewFinancials ? p.profitMarginPct : null,
      };
    });

    return {
      projects,
      canViewFinancials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve complete 360° Project operational and execution profile
   */
  public static async getProjectById(id: string, actorUserId?: string) {
    const project = await db.project.findUnique({
      where: { id },
      include: {
        client: true,
        lead: {
          select: {
            id: true,
            referenceNo: true,
            clientName: true,
            phone: true,
            stage: true,
            estimatedBudget: true,
          },
        },
        members: {
          include: {
            user: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } },
          },
        },
        stageHistory: {
          orderBy: { createdAt: "desc" },
        },
        quotations: {
          where: { status: { not: "SUPERSEDED" } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        paymentMilestones: {
          orderBy: { dueDate: "asc" },
        },
        qualityChecks: {
          orderBy: { createdAt: "desc" },
        },
        changeOrders: {
          orderBy: { createdAt: "desc" },
        },
        warrantyIssues: {
          orderBy: { createdAt: "desc" },
        },
        materialRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        purchaseOrders: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        payments: {
          where: { status: "VERIFIED" },
          orderBy: { paymentDate: "desc" },
        },
        expenses: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { expenseDate: "desc" },
          take: 20,
        },
      },
    });

    if (!project) throw new NotFoundError("Project record not found");

    let canViewFinancials = true;
    if (actorUserId) {
      const isSuperAdmin = await RbacService.isUserSuperAdmin(actorUserId);
      if (!isSuperAdmin) {
        canViewFinancials = await RbacService.hasPermission(actorUserId, "projects:view_financials");
      }
    }

    const timeline = await ActivityService.getTimeline("Project", project.id);
    const delayHealth = this.calculateDelayHealth(project);
    const reviewReferralStatus = this.calculateReviewReferralStatus(project);
    const progressPct = ProjectStageService.calculateProgress(project.stage);

    // Calculate live financial figures directly from canonical tables
    const totalApprovedQuoted = project.contractValue;
    const approvedChangeOrders = project.changeOrders
      .filter((co) => co.status === "APPROVED")
      .reduce((sum, co) => sum + co.amount, 0);

    const adjustedContractValue = totalApprovedQuoted + approvedChangeOrders;
    const totalReceived = project.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOutstanding = Math.max(0, adjustedContractValue - totalReceived);
    const totalProjectExpenses = project.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const grossProfit = adjustedContractValue - totalProjectExpenses;
    const grossMarginPct = adjustedContractValue > 0 ? (grossProfit / adjustedContractValue) * 100 : 0;

    const financialSummary = canViewFinancials
      ? {
          contractValue: totalApprovedQuoted,
          approvedChangeOrdersTotal: approvedChangeOrders,
          adjustedContractValue,
          totalReceived,
          totalOutstanding,
          totalExpenses: totalProjectExpenses,
          grossProfit,
          grossMarginPct: Number(grossMarginPct.toFixed(2)),
          paymentCompletionPct: adjustedContractValue > 0 ? Number(((totalReceived / adjustedContractValue) * 100).toFixed(1)) : 0,
        }
      : null;

    const sanitizedProject = {
      ...project,
      stage: ProjectStageService.normalizeStageKey(project.stage),
      progressPct,
      totalBudget: project.revisedBudget || project.contractValue,
      targetDate: project.targetCompletionDate,
      contractValue: canViewFinancials ? project.contractValue : null,
      revisedBudget: canViewFinancials ? project.revisedBudget : null,
      totalExpenses: canViewFinancials ? project.totalExpenses : null,
      netProfit: canViewFinancials ? project.netProfit : null,
      profitMarginPct: canViewFinancials ? project.profitMarginPct : null,
      expenses: canViewFinancials ? project.expenses : [],
      payments: canViewFinancials ? project.payments : [],
    };

    return {
      project: sanitizedProject,
      timeline,
      delayHealth,
      reviewReferralStatus,
      financialSummary,
      canViewFinancials,
      stageDefinitions: ProjectStageService.getStageDefinitions(),
    };
  }

  /**
   * Update project metadata and scheduling
   */
  public static async updateProject(id: string, input: any, userId?: string) {
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Project record not found");

    const targetDate = input.targetCompletionDate || input.targetDate;
    const startDate = input.startDate ? new Date(input.startDate) : undefined;
    const actualCompletionDate = input.actualCompletionDate ? new Date(input.actualCompletionDate) : undefined;

    const updated = await db.project.update({
      where: { id },
      data: {
        title: input.title || undefined,
        description: input.description !== undefined ? input.description : undefined,
        propertyTypeKey: input.propertyTypeKey || undefined,
        status: input.status || undefined,
        priority: input.priority || undefined,
        siteAddress: input.siteAddress || input.address || undefined,
        city: input.city || undefined,
        state: input.state || undefined,
        postalCode: input.postalCode !== undefined ? input.postalCode : undefined,
        latitude: input.latitude !== undefined ? input.latitude : undefined,
        longitude: input.longitude !== undefined ? input.longitude : undefined,
        googleMapsUrl: input.googleMapsUrl !== undefined ? input.googleMapsUrl : undefined,
        whatsAppGroupUrl: input.whatsAppGroupUrl !== undefined ? input.whatsAppGroupUrl : undefined,
        projectManagerId: input.projectManagerId !== undefined ? input.projectManagerId : undefined,
        startDate,
        targetCompletionDate: targetDate ? new Date(targetDate) : undefined,
        actualCompletionDate,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "PROJECT_UPDATED",
      entityType: "Project",
      entityId: id,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  }

  /**
   * Transition project to new execution stage with strict precondition validation
   */
  public static async changeStage(id: string, input: any, userId?: string) {
    const project = await db.project.findUnique({
      where: { id },
      include: { qualityChecks: true },
    });
    if (!project) throw new NotFoundError("Project record not found");

    const targetStage = ProjectStageService.normalizeStageKey(input.stage);
    const previousStage = ProjectStageService.normalizeStageKey(project.stage);

    // Validate preconditions
    const validation = await ProjectStageService.validateTransition(id, targetStage, previousStage);
    if (!validation.valid) {
      throw new BusinessRuleError(validation.reason || "Invalid project stage transition");
    }

    // Record immutable history
    await ProjectStageService.recordHistory(
      id,
      previousStage,
      targetStage,
      userId,
      input.notes || null,
      input.delayReason || null
    );

    // Status synchronization
    let newStatus = project.status;
    let actualCompletionDate = project.actualCompletionDate;

    if (targetStage === "PROJECT_COMPLETED") {
      newStatus = "COMPLETED";
      actualCompletionDate = actualCompletionDate || new Date();
    } else if (targetStage === "WARRANTY") {
      newStatus = "WARRANTY";
      actualCompletionDate = actualCompletionDate || new Date();
    }

    const updated = await db.project.update({
      where: { id },
      data: {
        stage: targetStage,
        status: newStatus,
        actualCompletionDate,
      },
    });

    // Automatic Handover & Warranty Initialization
    if (targetStage === "PROJECT_HANDOVER" || targetStage === "PROJECT_COMPLETED") {
      await WarrantyService.initializeWarranty(id, 12);
    }

    await AuditService.logEvent({
      userId,
      action: "PROJECT_STAGE_CHANGED",
      entityType: "Project",
      entityId: id,
      oldValues: { stage: previousStage },
      newValues: { stage: targetStage, notes: input.notes },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: id,
      type: "STATUS_CHANGE",
      title: `Stage transition: ${previousStage.replace(/_/g, " ")} → ${targetStage.replace(/_/g, " ")}`,
      description: input.notes || undefined,
    });

    return updated;
  }

  /**
   * Assign or update a team member role on a project
   */
  public static async addMember(projectId: string, userIdToAssign: string, role: string, actorUserId?: string) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError("Project record not found");

    const member = await db.projectMember.upsert({
      where: {
        projectId_userId: { projectId, userId: userIdToAssign },
      },
      update: { role },
      create: { projectId, userId: userIdToAssign, role },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });

    // If role is PROJECT_MANAGER, update primary projectManagerId
    if (role === "PROJECT_MANAGER") {
      await db.project.update({
        where: { id: projectId },
        data: { projectManagerId: userIdToAssign },
      });
    }

    await AuditService.logEvent({
      userId: actorUserId,
      action: "PROJECT_ASSIGNED",
      entityType: "Project",
      entityId: projectId,
      newValues: { assignedUserId: userIdToAssign, role },
    });

    await ActivityService.record({
      userId: actorUserId,
      entityType: "Project",
      entityId: projectId,
      type: "ASSIGNMENT",
      title: `Team member assigned: ${member.user.fullName} (${role.replace(/_/g, " ")})`,
    });

    return member;
  }

  /**
   * Remove a member from the project team
   */
  public static async removeMember(projectId: string, userIdToRemove: string, actorUserId?: string) {
    const existing = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: userIdToRemove } },
      include: { user: { select: { fullName: true } } },
    });
    if (!existing) throw new NotFoundError("Team member not found on this project");

    await db.projectMember.delete({
      where: { projectId_userId: { projectId, userId: userIdToRemove } },
    });

    await AuditService.logEvent({
      userId: actorUserId,
      action: "PROJECT_MEMBER_REMOVED",
      entityType: "Project",
      entityId: projectId,
      oldValues: { userId: userIdToRemove, role: existing.role },
    });

    return { success: true };
  }

  /**
   * Safe project deletion: enforces foreign key dependencies and prevents deletion of projects with historical records
   */
  public static async deleteProject(id: string, actorUserId?: string) {
    const project = await db.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            payments: true,
            expenses: true,
            quotations: true,
            purchaseOrders: true,
            materialRequests: true,
            changeOrders: true,
          },
        },
      },
    });

    if (!project) throw new NotFoundError("Project record not found");

    const hasFinancialHistory =
      project._count.payments > 0 ||
      project._count.expenses > 0 ||
      project._count.changeOrders > 0;

    const hasProcurementHistory =
      project._count.purchaseOrders > 0 ||
      project._count.materialRequests > 0;

    if (hasFinancialHistory || hasProcurementHistory) {
      throw new BusinessRuleError(
        "Cannot hard-delete a project with existing payments, expenses, change orders, or procurement records. Archive the project instead."
      );
    }

    await db.project.delete({ where: { id } });

    await AuditService.logEvent({
      userId: actorUserId,
      action: "PROJECT_DELETED",
      entityType: "Project",
      entityId: id,
      oldValues: { referenceNo: project.referenceNo, title: project.title },
    });

    return { success: true, message: `Project ${project.referenceNo} permanently deleted.` };
  }

  /**
   * Archive / unarchive project
   */
  public static async archiveProject(id: string, isArchived: boolean = true, actorUserId?: string) {
    const updated = await db.project.update({
      where: { id },
      data: { isArchived, status: isArchived ? "CANCELLED" : "ACTIVE" },
    });

    await AuditService.logEvent({
      userId: actorUserId,
      action: isArchived ? "PROJECT_ARCHIVED" : "PROJECT_UNARCHIVED",
      entityType: "Project",
      entityId: id,
    });

    return updated;
  }

  /**
   * Add a timestamped note to the project history
   */
  public static async addNote(projectId: string, noteText: string, userId?: string) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError("Project record not found");

    const author = userId ? await db.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true } }) : null;
    const authorName = author?.fullName || "System User";
    const timestamp = new Date().toISOString();

    const noteEntry = `[${timestamp}] ${authorName}: ${noteText.trim()}`;
    const updatedNotes = project.notes ? `${project.notes}\n${noteEntry}` : noteEntry;

    const updated = await db.project.update({
      where: { id: projectId },
      data: { notes: updatedNotes },
    });

    await AuditService.logEvent({
      userId,
      action: "PROJECT_NOTE_ADDED",
      entityType: "Project",
      entityId: projectId,
      newValues: { note: noteText },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: projectId,
      type: "STATUS_CHANGE",
      title: `Project Note Added by ${authorName}`,
      description: noteText,
    });

    return {
      success: true,
      project: updated,
      note: {
        id: `note-${Date.now()}`,
        author: authorName,
        text: noteText,
        createdAt: timestamp,
      },
    };
  }

  /**
   * Directory KPI metrics for Project Operations Dashboard
   */
  public static async getProjectMetrics(actorUserId?: string) {
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      warrantyProjects,
      rawActiveList,
      totalContractAgg,
    ] = await Promise.all([
      db.project.count({ where: { isArchived: false } }),
      db.project.count({ where: { isArchived: false, status: "ACTIVE" } }),
      db.project.count({ where: { isArchived: false, status: "COMPLETED" } }),
      db.project.count({ where: { isArchived: false, status: "WARRANTY" } }),
      db.project.findMany({
        where: { isArchived: false, status: "ACTIVE" },
        select: { stage: true, targetCompletionDate: true },
      }),
      db.project.aggregate({
        where: { isArchived: false },
        _sum: { contractValue: true },
      }),
    ]);

    let delayedCount = 0;
    let qualityPendingCount = 0;

    for (const p of rawActiveList) {
      const health = this.calculateDelayHealth(p);
      if (health.status === "DELAYED") delayedCount++;
      if (p.stage === "QUALITY_CHECK") qualityPendingCount++;
    }

    let canViewFinancials = true;
    if (actorUserId) {
      const isSuperAdmin = await RbacService.isUserSuperAdmin(actorUserId);
      if (!isSuperAdmin) {
        canViewFinancials = await RbacService.hasPermission(actorUserId, "projects:view_financials");
      }
    }

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      warrantyProjects,
      delayedProjects: delayedCount,
      qualityPendingProjects: qualityPendingCount,
      totalContractValue: canViewFinancials ? (totalContractAgg._sum.contractValue || 0) : null,
      canViewFinancials,
    };
  }
}
