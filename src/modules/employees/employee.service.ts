import { db } from "@/lib/db";
import { BusinessRuleError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { RbacService } from "../rbac/rbac.service";
import { NotificationService } from "../notifications/notification.service";
import bcrypt from "bcryptjs";
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  ConfigureSalaryInput,
  CreditSalaryInput,
} from "@/validators/employee.schema";

export interface EmployeeFilterParams {
  department?: string;
  designation?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class EmployeeService {
  public static async getEmployees(params: EmployeeFilterParams, actorId?: string) {
    if (actorId) {
      const hasRead = await RbacService.hasPermission(actorId, "employees:read");
      const isAdmin = await RbacService.isUserAdmin(actorId);
      if (!hasRead && !isAdmin) {
        throw new ForbiddenError("Insufficient permissions to view employee directory");
      }
    }

    const { department, designation, status, search, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (department && department !== "ALL") {
      where.department = department;
    }

    if (designation) {
      where.designation = { contains: designation, mode: "insensitive" };
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search && search.trim() !== "") {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { employeeNo: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, employees] = await Promise.all([
      db.employee.count({ where }),
      db.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
          user: {
            select: {
              id: true,
              email: true,
              accessLevel: true,
              status: true,
              userRoles: { include: { role: true } },
            },
          },
          salaryStructures: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              salaryPayments: true,
              expenses: true,
            },
          },
        },
      }),
    ]);

    // Check if actor has permission to see salaries
    let canViewSalary = false;
    if (actorId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasSalaryPerm = await RbacService.hasPermission(actorId, "employees:view_salary");
      const hasManagePerm = await RbacService.hasPermission(actorId, "employees:manage_salary");
      canViewSalary = isSuper || hasSalaryPerm || hasManagePerm;
    }

    // Redact salary info if unauthorized
    const sanitizedEmployees = employees.map((emp) => {
      const currentSalary = emp.salaryStructures[0]?.baseSalary ?? 0;
      return {
        ...emp,
        currentSalary: canViewSalary ? currentSalary : undefined,
        salaryStructures: canViewSalary ? emp.salaryStructures : [],
      };
    });

    return {
      employees: sanitizedEmployees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getEmployeeById(idOrUserId: string, actorId?: string) {
    const employee = await db.employee.findFirst({
      where: {
        OR: [{ id: idOrUserId }, { userId: idOrUserId }, { employeeNo: idOrUserId }],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            accessLevel: true,
            status: true,
            userRoles: { include: { role: true } },
          },
        },
        salaryStructures: {
          orderBy: { effectiveFrom: "desc" },
        },
        salaryPayments: {
          orderBy: { paymentDate: "desc" },
          include: {
            expense: {
              select: {
                id: true,
                referenceNo: true,
                amount: true,
                status: true,
                expenseDate: true,
              },
            },
          },
        },
        expenses: {
          orderBy: { expenseDate: "desc" },
          take: 20,
          include: {
            project: { select: { id: true, referenceNo: true, title: true } },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError("Employee record not found");
    }

    // Permission and privacy check
    const isViewingSelf = actorId && employee.userId === actorId;
    let canViewSalary = isViewingSelf;

    if (actorId && !isViewingSelf) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasRead = await RbacService.hasPermission(actorId, "employees:read");
      const isAdmin = await RbacService.isUserAdmin(actorId);

      if (!hasRead && !isAdmin && !isSuper) {
        throw new ForbiddenError("Insufficient permissions to view this employee profile");
      }

      const hasSalaryPerm = await RbacService.hasPermission(actorId, "employees:view_salary");
      const hasManagePerm = await RbacService.hasPermission(actorId, "employees:manage_salary");
      canViewSalary = isSuper || hasSalaryPerm || hasManagePerm;
    }

    // Fetch advance and settlement history if linked to User
    let advances: any[] = [];
    let advanceSummary = { totalIssued: 0, totalSpent: 0, remainingBalance: 0 };

    if (employee.userId) {
      advances = await db.employeeAdvance.findMany({
        where: { employeeId: employee.userId },
        orderBy: { issuedDate: "desc" },
        include: {
          project: { select: { id: true, referenceNo: true, title: true } },
          expenses: true,
          settlements: true,
        },
      });

      for (const adv of advances) {
        if (adv.status !== "CANCELLED") {
          advanceSummary.totalIssued += adv.amount;
          const spent = adv.expenses.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
          advanceSummary.totalSpent += spent;
        }
      }
      advanceSummary.remainingBalance = Math.max(0, advanceSummary.totalIssued - advanceSummary.totalSpent);
    }

    const currentSalary = employee.salaryStructures.find((s) => s.isActive)?.baseSalary ?? 0;

    return {
      ...employee,
      currentSalary: canViewSalary ? currentSalary : undefined,
      salaryStructures: canViewSalary ? employee.salaryStructures : [],
      salaryPayments: canViewSalary ? employee.salaryPayments : [],
      advances,
      advanceSummary,
      isViewingSelf,
    };
  }

  public static async createEmployee(input: CreateEmployeeInput, actorId?: string) {
    if (actorId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasWrite = await RbacService.hasPermission(actorId, "employees:write");
      if (!isSuper && !hasWrite) {
        throw new ForbiddenError("Insufficient permissions to create employee records");
      }
    }

    // Check unique email in Employee table
    const existingEmp = await db.employee.findUnique({ where: { email: input.email } });
    if (existingEmp) {
      throw new ValidationError(`Employee with email ${input.email} already exists`);
    }

    // Generate unique employeeNo
    const currentYear = new Date().getFullYear();
    const count = await db.employee.count();
    const employeeNo = `EMP-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    let linkedUserId: string | null = null;

    // Create user account if requested or if password provided
    if (input.createUserAccount || input.password) {
      const existingUser = await db.user.findUnique({ where: { email: input.email } });
      if (existingUser) {
        linkedUserId = existingUser.id;
      } else {
        const rawPassword = input.password || `Espacio@${currentYear}!`;
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const newUser = await db.user.create({
          data: {
            email: input.email,
            fullName: input.fullName,
            phone: input.phone || null,
            passwordHash,
            accessLevel: input.accessLevel || "USER",
            status: input.status || "ACTIVE",
          },
        });

        // Assign role if specified
        const roleRecord = await db.role.findFirst({
          where: { name: input.roleName || "USER" },
        });

        if (roleRecord) {
          await db.userRole.create({
            data: { userId: newUser.id, roleId: roleRecord.id },
          });
        }

        linkedUserId = newUser.id;
      }
    }

    const joiningDate = input.joiningDate ? new Date(input.joiningDate) : new Date();

    // Create Employee record + initial Salary Structure atomically
    const employee = await db.employee.create({
      data: {
        employeeNo,
        userId: linkedUserId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        department: input.department,
        designation: input.designation,
        joiningDate,
        status: input.status || "ACTIVE",
        address: input.address || null,
        emergencyContact: input.emergencyContact || null,
        emergencyPhone: input.emergencyPhone || null,
        bankName: input.bankName || null,
        bankAccountNo: input.bankAccountNo || null,
        bankIfsc: input.bankIfsc || null,
        upiId: input.upiId || null,
        notes: input.notes || null,
        salaryStructures: input.baseSalary > 0 ? {
          create: {
            baseSalary: input.baseSalary,
            paymentMethod: input.paymentMethod || "UPI",
            effectiveFrom: joiningDate,
            isActive: true,
          },
        } : undefined,
      },
      include: {
        salaryStructures: true,
        user: true,
      },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "EMPLOYEE_CREATED",
      entityType: "Employee",
      entityId: employee.id,
      newValues: {
        employeeNo: employee.employeeNo,
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        baseSalary: input.baseSalary,
      },
    });

    return employee;
  }

  public static async updateEmployee(id: string, input: UpdateEmployeeInput, actorId?: string) {
    if (actorId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasWrite = await RbacService.hasPermission(actorId, "employees:write");
      if (!isSuper && !hasWrite) {
        throw new ForbiddenError("Insufficient permissions to update employee records");
      }
    }

    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundError("Employee record not found");

    const updated = await db.employee.update({
      where: { id },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        department: input.department,
        designation: input.designation,
        status: input.status,
        address: input.address,
        emergencyContact: input.emergencyContact,
        emergencyPhone: input.emergencyPhone,
        bankName: input.bankName,
        bankAccountNo: input.bankAccountNo,
        bankIfsc: input.bankIfsc,
        upiId: input.upiId,
        notes: input.notes,
        joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
      },
    });

    // If fullName or phone updated and linked user exists, sync basic user details
    if (employee.userId && (input.fullName || input.phone)) {
      await db.user.update({
        where: { id: employee.userId },
        data: {
          fullName: input.fullName ?? undefined,
          phone: input.phone ?? undefined,
        },
      });
    }

    await AuditService.logEvent({
      userId: actorId,
      action: "EMPLOYEE_UPDATED",
      entityType: "Employee",
      entityId: id,
      newValues: input,
    });

    return updated;
  }

  public static async deactivateEmployee(id: string, actorId?: string) {
    if (actorId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasDeact = await RbacService.hasPermission(actorId, "employees:deactivate");
      if (!isSuper && !hasDeact) {
        throw new ForbiddenError("Insufficient permissions to deactivate employee");
      }
    }

    const employee = await db.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) throw new NotFoundError("Employee record not found");

    // Guard: Prevent deactivating the only active Super Admin
    if (employee.user && employee.user.accessLevel === "SUPER_ADMIN") {
      const activeSuperAdmins = await db.user.count({
        where: { accessLevel: "SUPER_ADMIN", status: "ACTIVE" },
      });
      if (activeSuperAdmins <= 1) {
        throw new BusinessRuleError("Cannot deactivate the sole active Super Admin in the system");
      }
    }

    const updated = await db.employee.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    if (employee.userId) {
      await db.user.update({
        where: { id: employee.userId },
        data: { status: "DEACTIVATED" },
      });
    }

    await AuditService.logEvent({
      userId: actorId,
      action: "EMPLOYEE_DEACTIVATED",
      entityType: "Employee",
      entityId: id,
      newValues: { status: "INACTIVE", employeeNo: employee.employeeNo },
    });

    return updated;
  }

  public static async reactivateEmployee(id: string, actorId?: string) {
    if (actorId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasDeact = await RbacService.hasPermission(actorId, "employees:deactivate");
      if (!isSuper && !hasDeact) {
        throw new ForbiddenError("Insufficient permissions to reactivate employee");
      }
    }

    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundError("Employee record not found");

    const updated = await db.employee.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    if (employee.userId) {
      await db.user.update({
        where: { id: employee.userId },
        data: { status: "ACTIVE" },
      });
    }

    await AuditService.logEvent({
      userId: actorId,
      action: "EMPLOYEE_REACTIVATED",
      entityType: "Employee",
      entityId: id,
      newValues: { status: "ACTIVE", employeeNo: employee.employeeNo },
    });

    return updated;
  }

  public static async configureSalary(employeeId: string, input: ConfigureSalaryInput, actorId?: string) {
    if (actorId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasManageSalary = await RbacService.hasPermission(actorId, "employees:manage_salary");
      if (!isSuper && !hasManageSalary) {
        throw new ForbiddenError("Insufficient permissions to configure salary structure");
      }
    }

    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundError("Employee record not found");

    const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : new Date();

    // Deactivate previous active salary structure
    await db.employeeSalaryStructure.updateMany({
      where: { employeeId, isActive: true },
      data: { isActive: false },
    });

    const newStructure = await db.employeeSalaryStructure.create({
      data: {
        employeeId,
        baseSalary: input.baseSalary,
        paymentMethod: input.paymentMethod || "UPI",
        effectiveFrom,
        notes: input.notes || null,
        isActive: true,
      },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "SALARY_STRUCTURE_CHANGED",
      entityType: "EmployeeSalaryStructure",
      entityId: newStructure.id,
      newValues: {
        employeeId,
        baseSalary: input.baseSalary,
        paymentMethod: input.paymentMethod,
        effectiveFrom,
      },
    });

    return newStructure;
  }

  /**
   * ATOMIC SALARY CREDIT WORKFLOW
   * Creates EmployeeSalaryPayment + Canonical Expense record with categoryKey "SALARY".
   * Prevents duplicate salary credits for the same employee and period.
   */
  public static async creditSalary(employeeId: string, input: CreditSalaryInput, actorId?: string) {
    if (actorId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasManageSalary = await RbacService.hasPermission(actorId, "employees:manage_salary");
      if (!isSuper && !hasManageSalary) {
        throw new ForbiddenError("Insufficient permissions to credit salary payments");
      }
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee) throw new NotFoundError("Employee record not found");

    if (employee.status !== "ACTIVE") {
      throw new BusinessRuleError("Cannot credit salary to an inactive or deactivated employee");
    }

    // 1. DUPLICATE SALARY PROTECTION
    const existingPayment = await db.employeeSalaryPayment.findFirst({
      where: {
        employeeId,
        periodMonth: input.periodMonth,
        periodYear: input.periodYear,
        status: "PAID",
      },
    });

    if (existingPayment) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthStr = monthNames[input.periodMonth - 1] || `Month ${input.periodMonth}`;
      throw new BusinessRuleError(`Salary for ${monthStr} ${input.periodYear} has already been credited (${existingPayment.referenceNo}). Duplicate payment rejected.`);
    }

    let amount = input.amount;
    if (!amount || amount <= 0) {
      const salaryStructure = await db.employeeSalaryStructure.findFirst({
        where: { employeeId, isActive: true },
        orderBy: { effectiveFrom: "desc" },
      });
      if (!salaryStructure) {
        throw new BusinessRuleError("No active salary structure found for this employee. Please configure salary structure first.");
      }
      amount = salaryStructure.baseSalary;
    }


    const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
    const salRef = await IdGeneratorService.generate("SAL");
    const expRef = await IdGeneratorService.generate("EXP");

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthStr = monthNames[input.periodMonth - 1] || `Month ${input.periodMonth}`;

    // 2. ATOMIC DATABASE TRANSACTION (SalaryPayment + Canonical Expense)
    const result = await db.$transaction(async (tx) => {
      // Step A: Create canonical Expense record
      const expense = await tx.expense.create({
        data: {
          referenceNo: expRef,
          expenseType: "BUSINESS",
          categoryKey: "SALARY",
          employeeId: employee.id,
          vendorName: employee.fullName,
          description: `Monthly Salary Credit for ${employee.fullName} (${monthStr} ${input.periodYear})`,
          amount,
          paymentMethod: input.paymentMethod,
          expenseDate: paymentDate,
          referenceNoExternal: input.referenceNoExternal || null,
          status: "PAID",
          notes: input.notes || null,
          createdById: actorId ?? null,
          approvedById: actorId ?? null,
          approvedAt: new Date(),
        },
      });

      // Step B: Create EmployeeSalaryPayment linked directly to generated Expense
      const salaryPayment = await tx.employeeSalaryPayment.create({
        data: {
          referenceNo: salRef,
          employeeId: employee.id,
          periodMonth: input.periodMonth,
          periodYear: input.periodYear,
          amount,
          paymentDate,
          paymentMethod: input.paymentMethod,
          referenceNoExternal: input.referenceNoExternal || null,
          expenseId: expense.id,
          status: "PAID",
          notes: input.notes || null,
          createdById: actorId ?? null,
        },
        include: {
          expense: true,
          employee: true,
        },
      });

      return { salaryPayment, expense };
    });


    // 3. AUDIT & ACTIVITY LOGGING
    await AuditService.logEvent({
      userId: actorId,
      action: "SALARY_CREDITED",
      entityType: "EmployeeSalaryPayment",
      entityId: result.salaryPayment.id,
      newValues: {
        referenceNo: result.salaryPayment.referenceNo,
        employee: employee.fullName,
        amount: input.amount,
        period: `${monthStr} ${input.periodYear}`,
        linkedExpense: result.expense.referenceNo,
        paymentMethod: input.paymentMethod,
      },
    });

    await ActivityService.record({
      userId: actorId,
      entityType: "Expense",
      entityId: result.expense.id,
      type: "EXPENSE",
      title: `Salary Credited: ${employee.fullName}`,
      description: `₹${amount.toLocaleString()} for ${monthStr} ${input.periodYear} via ${input.paymentMethod} (Ref: ${result.salaryPayment.referenceNo}).`,
    });

    // 4. NOTIFICATION TO EMPLOYEE
    if (employee.userId) {
      await NotificationService.create({
        userId: employee.userId,
        title: "Salary Credited",
        message: `Your salary of ₹${amount.toLocaleString()} for ${monthStr} ${input.periodYear} has been credited via ${input.paymentMethod}.`,
        category: "FINANCE",
        priority: "NORMAL",
        type: "PAYMENT_PENDING",
      });
    }


    return result.salaryPayment;
  }

  public static async reverseSalaryPayment(paymentId: string, reason: string, actorId?: string) {
    if (actorId) {
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasManageSalary = await RbacService.hasPermission(actorId, "employees:manage_salary");
      if (!isSuper && !hasManageSalary) {
        throw new ForbiddenError("Insufficient permissions to reverse salary payments");
      }
    }

    const payment = await db.employeeSalaryPayment.findUnique({
      where: { id: paymentId },
      include: { expense: true, employee: true },
    });

    if (!payment) throw new NotFoundError("Salary payment record not found");
    if (payment.status === "REVERSED") {
      throw new BusinessRuleError("This salary payment has already been reversed");
    }

    const reversed = await db.$transaction(async (tx) => {
      // Reversal on Salary Payment
      const updatedPayment = await tx.employeeSalaryPayment.update({
        where: { id: paymentId },
        data: {
          status: "REVERSED",
          reversalReason: reason.trim(),
        },
      });

      // Cancel linked Expense
      if (payment.expenseId) {
        await tx.expense.update({
          where: { id: payment.expenseId },
          data: {
            status: "CANCELLED",
            rejectionReason: `Salary credit reversed: ${reason.trim()}`,
          },
        });
      }

      return updatedPayment;
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "SALARY_REVERSED",
      entityType: "EmployeeSalaryPayment",
      entityId: payment.id,
      newValues: {
        referenceNo: payment.referenceNo,
        reversalReason: reason,
        cancelledExpense: payment.expense?.referenceNo,
      },
    });

    return reversed;
  }

  public static async getMonthlyFinancialSummary(
    employeeId: string,
    month: number,
    year: number,
    actorId?: string
  ) {
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundError("Employee record not found");

    if (actorId) {
      const isViewingSelf = employee.userId === actorId;
      const isSuper = await RbacService.isUserSuperAdmin(actorId);
      const hasSalaryPerm = await RbacService.hasPermission(actorId, "employees:view_salary");

      if (!isViewingSelf && !isSuper && !hasSalaryPerm) {
        throw new ForbiddenError("Insufficient permissions to view financial summary");
      }
    }

    // 1. Paid Salary in Period
    const salaryPayment = await db.employeeSalaryPayment.findFirst({
      where: {
        employeeId,
        periodMonth: month,
        periodYear: year,
        status: "PAID",
      },
    });

    const netSalary = salaryPayment?.amount ?? 0;

    // 2. Direct Approved Expenses (excluding Salary to prevent double-counting)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const directExpenses = await db.expense.findMany({
      where: {
        employeeId,
        categoryKey: { not: "SALARY" },
        status: { in: ["APPROVED", "PAID"] },
        expenseDate: { gte: startDate, lte: endDate },
      },
      include: {
        project: { select: { id: true, referenceNo: true, title: true } },
      },
    });

    const directExpenseTotal = directExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // 3. Total Company Cost = Net Salary + Direct Expenses
    const totalCompanyCost = netSalary + directExpenseTotal;

    return {
      month,
      year,
      employeeId,
      employeeName: employee.fullName,
      salary: {
        paid: netSalary > 0,
        amount: netSalary,
        referenceNo: salaryPayment?.referenceNo,
        paymentDate: salaryPayment?.paymentDate,
        paymentMethod: salaryPayment?.paymentMethod,
        expenseId: salaryPayment?.expenseId,
      },
      directExpenses: {
        count: directExpenses.length,
        total: directExpenseTotal,
        items: directExpenses,
      },
      totalCompanyCost,
    };
  }
}
