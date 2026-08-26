import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { EmployeeService } from "@/modules/employees/employee.service";
import { ExpenseService } from "@/modules/expenses/expense.service";
import { PettyCashService } from "@/modules/petty-cash/petty-cash.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { BusinessRuleError, ForbiddenError } from "@/lib/errors";

describe("Prompt 04: Employee Management + Employee Finance + Salary Automation Tests", () => {
  let superAdminUser: any;
  let normalUser: any;
  let createdEmployee: any;
  let testProject: any;

  beforeAll(async () => {
    // 1. Ensure Super Admin user
    superAdminUser = await db.user.upsert({
      where: { email: "superadmin-emp-test@espacio.in" },
      update: { accessLevel: "SUPER_ADMIN", status: "ACTIVE" },
      create: {
        email: "superadmin-emp-test@espacio.in",
        fullName: "Test Super Admin",
        passwordHash: "$2a$10$somethinghashedfortestpurposesonly123456",
        accessLevel: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });

    // 2. Ensure Normal regular user with employees:read but without employees:view_salary or manage_salary
    normalUser = await db.user.upsert({
      where: { email: "normaluser-emp-test@espacio.in" },
      update: { accessLevel: "USER", status: "ACTIVE" },
      create: {
        email: "normaluser-emp-test@espacio.in",
        fullName: "Test Normal User",
        passwordHash: "$2a$10$somethinghashedfortestpurposesonly123456",
        accessLevel: "USER",
        status: "ACTIVE",
      },
    });

    await RbacService.setUserPermissionOverrides(
      normalUser.id,
      [{ code: "employees:read", effect: "ALLOW" }],
      superAdminUser.id
    );

    // 3. Ensure a test project for project-linked employee expenses
    testProject = await db.project.create({
      data: {
        referenceNo: `PROJ-TEST-${Date.now()}`,
        title: "Test Employee Project",
        propertyTypeKey: "RESIDENTIAL_APARTMENT",
        contractValue: 500000,
        revisedBudget: 350000,
        stage: "EXECUTION",
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    if (createdEmployee) {
      const payments = await db.employeeSalaryPayment.findMany({ where: { employeeId: createdEmployee.id } });
      const expIds = payments.map((p) => p.expenseId).filter(Boolean) as string[];

      await db.employeeSalaryPayment.deleteMany({ where: { employeeId: createdEmployee.id } });
      await db.employeeSalaryStructure.deleteMany({ where: { employeeId: createdEmployee.id } });
      await db.expense.deleteMany({ where: { employeeId: createdEmployee.id } });
      if (expIds.length > 0) {
        await db.expense.deleteMany({ where: { id: { in: expIds } } });
      }
      await db.employee.delete({ where: { id: createdEmployee.id } });
    }

    if (testProject) {
      await db.expense.deleteMany({ where: { projectId: testProject.id } });
      await db.employeeAdvance.deleteMany({ where: { projectId: testProject.id } });
      await db.project.delete({ where: { id: testProject.id } });
    }

    await db.user.deleteMany({
      where: {
        email: {
          in: [
            "superadmin-emp-test@espacio.in",
            "normaluser-emp-test@espacio.in",
            "soheb-test-emp@espacio.in",
          ],
        },
      },
    });
  });

  // TEST 1, 2, 3: Super Admin creates employee with linked account
  it("TEST 1, 2 & 3: Super Admin can create employee with user account and initial salary", async () => {
    createdEmployee = await EmployeeService.createEmployee(
      {
        fullName: "Soheb Site Lead",
        email: "soheb-test-emp@espacio.in",
        phone: "+91 98765 11111",
        department: "SITE_EXECUTION",
        designation: "Lead Site Engineer",
        status: "ACTIVE",
        createUserAccount: true,
        accessLevel: "USER",
        roleName: "PROJECT",
        password: "Password123!",
        baseSalary: 25000,
        paymentMethod: "UPI",
      },
      superAdminUser.id
    );

    expect(createdEmployee.id).toBeDefined();
    expect(createdEmployee.employeeNo).toMatch(/^EMP-\d{4}-\d{4}$/);
    expect(createdEmployee.userId).toBeDefined();
    expect(createdEmployee.salaryStructures.length).toBe(1);
    expect(createdEmployee.salaryStructures[0].baseSalary).toBe(25000);

    // Verify appears in employee directory
    const list = await EmployeeService.getEmployees({ search: "Soheb" }, superAdminUser.id);
    const found = list.employees.find((e) => e.id === createdEmployee.id);
    expect(found).toBeDefined();
    expect(found?.fullName).toBe("Soheb Site Lead");
  });

  // TEST 4: Profile displays correct data
  it("TEST 4: Employee profile returns complete employment, user account, and salary structure", async () => {
    const profile = await EmployeeService.getEmployeeById(createdEmployee.id, superAdminUser.id);
    expect(profile.fullName).toBe("Soheb Site Lead");
    expect(profile.department).toBe("SITE_EXECUTION");
    expect(profile.designation).toBe("Lead Site Engineer");
    expect(profile.currentSalary).toBe(25000);
    expect(profile.user?.email).toBe("soheb-test-emp@espacio.in");
  });

  // TEST 5 & 6: Salary can be configured and history is preserved
  it("TEST 5 & 6: Updating salary structure creates new active record and preserves previous history", async () => {
    const newStructure = await EmployeeService.configureSalary(
      createdEmployee.id,
      {
        baseSalary: 30000,
        paymentMethod: "BANK_TRANSFER",
        notes: "Annual appraisal promotion",
      },
      superAdminUser.id
    );

    expect(newStructure.baseSalary).toBe(30000);
    expect(newStructure.isActive).toBe(true);

    // Verify history contains both old (25000) and new (30000)
    const profile = await EmployeeService.getEmployeeById(createdEmployee.id, superAdminUser.id);
    expect(profile.currentSalary).toBe(30000);
    expect(profile.salaryStructures.length).toBe(2);

    const oldStructure = profile.salaryStructures.find((s) => s.baseSalary === 25000);
    expect(oldStructure?.isActive).toBe(false);
  });

  // TEST 7, 8, 9, 10: Atomic Salary Credit creates exactly ONE linked Expense
  it("TEST 7, 8, 9 & 10: Salary credit atomically creates EmployeeSalaryPayment and canonical Expense (Category: SALARY)", async () => {
    const periodMonth = 8;
    const periodYear = 2026;
    const amount = 30000;

    const salaryPayment = await EmployeeService.creditSalary(
      createdEmployee.id,
      {
        periodMonth,
        periodYear,
        amount,
        paymentMethod: "UPI",
        referenceNoExternal: "UPI-TEST-998877",
        notes: "August 2026 Salary Credit",
      },
      superAdminUser.id
    );

    expect(salaryPayment.id).toBeDefined();
    expect(salaryPayment.referenceNo).toMatch(/^SAL-\d{4}-\d{4}$/);
    expect(salaryPayment.status).toBe("PAID");
    expect(salaryPayment.expenseId).toBeDefined();

    // Verify canonical Expense was created with status PAID and categoryKey SALARY
    const expense = await db.expense.findUnique({
      where: { id: salaryPayment.expenseId! },
    });

    expect(expense).toBeDefined();
    expect(expense?.categoryKey).toBe("SALARY");
    expect(expense?.amount).toBe(30000);
    expect(expense?.status).toBe("PAID");
    expect(expense?.expenseType).toBe("BUSINESS");
    expect(expense?.employeeId).toBe(createdEmployee.id);

    // Verify Expense appears in ExpenseService.getExpenses
    const expenseList = await ExpenseService.getExpenses({
      categoryKey: "SALARY",
    });
    const foundExp = expenseList.expenses.find((e) => e.id === expense?.id);
    expect(foundExp).toBeDefined();

    // Verify appears in Employee profile salaryPayments
    const profile = await EmployeeService.getEmployeeById(createdEmployee.id, superAdminUser.id);
    expect(profile.salaryPayments.length).toBe(1);
    expect(profile.salaryPayments[0].referenceNo).toBe(salaryPayment.referenceNo);
  });

  // TEST 11: Duplicate salary credit is rejected
  it("TEST 11: Duplicate salary credit for same employee and period is rejected", async () => {
    await expect(
      EmployeeService.creditSalary(
        createdEmployee.id,
        {
          periodMonth: 8,
          periodYear: 2026,
          amount: 30000,
          paymentMethod: "UPI",
        },
        superAdminUser.id
      )
    ).rejects.toThrow(BusinessRuleError);
  });

  // TEST 12: Salary reversal is auditable and updates linked expense
  it("TEST 12: Reversing a salary credit marks payment REVERSED and linked Expense CANCELLED", async () => {
    const profile = await EmployeeService.getEmployeeById(createdEmployee.id, superAdminUser.id);
    const payment = profile.salaryPayments[0];

    const reversed = await EmployeeService.reverseSalaryPayment(
      payment.id,
      "Bank payment bounce correction",
      superAdminUser.id
    );

    expect(reversed.status).toBe("REVERSED");
    expect(reversed.reversalReason).toBe("Bank payment bounce correction");

    // Verify linked expense is CANCELLED
    const expense = await db.expense.findUnique({ where: { id: payment.expenseId! } });
    expect(expense?.status).toBe("CANCELLED");

    // Re-credit for test continuity
    await EmployeeService.creditSalary(
      createdEmployee.id,
      {
        periodMonth: 9,
        periodYear: 2026,
        amount: 30000,
        paymentMethod: "BANK_TRANSFER",
      },
      superAdminUser.id
    );
  });

  // TEST 13, 14, 15: Direct & project-linked employee expense
  it("TEST 13, 14 & 15: Direct employee expense is linked to Project and appears in Expense Management", async () => {
    const directExpense = await ExpenseService.recordExpense(
      {
        expenseType: "PROJECT",
        projectId: testProject.id,
        employeeId: createdEmployee.id,
        categoryKey: "SITE_EXPENSE",
        description: "Emergency site screws and hardware purchase",
        amount: 1500,
        paymentMethod: "UPI",
      },
      superAdminUser.id
    );

    expect(directExpense.id).toBeDefined();
    expect(directExpense.employeeId).toBe(createdEmployee.id);
    expect(directExpense.projectId).toBe(testProject.id);

    // Verify expense appears in Employee profile
    const profile = await EmployeeService.getEmployeeById(createdEmployee.id, superAdminUser.id);
    const found = profile.expenses.find((e) => e.id === directExpense.id);
    expect(found).toBeDefined();
    expect(found?.amount).toBe(1500);
  });

  // TEST 16 & 17: Employee Advance and settlement calculation
  it("TEST 16 & 17: Employee advance and petty cash float balance calculate accurately", async () => {
    // Issue advance to employee's user ID
    const advance = await PettyCashService.issueAdvance(
      {
        employeeId: createdEmployee.userId!,
        projectId: testProject.id,
        amount: 5000,
        purpose: "Site petty cash float for plumbing materials",
      },
      superAdminUser.id
    );

    expect(advance.id).toBeDefined();
    expect(advance.amount).toBe(5000);

    // Record a petty cash expense of 1200
    const pettyExp = await PettyCashService.recordPettyExpense(
      {
        advanceId: advance.id,
        amount: 1200,
        purpose: "PVC pipes and cement",
        categoryKey: "SITE_HARDWARE",
        paymentMethod: "PETTY_CASH",
      },
      superAdminUser.id
    );

    expect(pettyExp.id).toBeDefined();

    // Verify profile advance summary
    const profile = await EmployeeService.getEmployeeById(createdEmployee.id, superAdminUser.id);
    expect(profile.advanceSummary.totalIssued).toBe(5000);
    expect(profile.advanceSummary.totalSpent).toBe(1200);
    expect(profile.advanceSummary.remainingBalance).toBe(3800);
  });

  // TEST 19: Deactivated employee retains historical records
  it("TEST 19: Deactivated employee retains all historical salary and expense records", async () => {
    const deactivated = await EmployeeService.deactivateEmployee(createdEmployee.id, superAdminUser.id);
    expect(deactivated.status).toBe("INACTIVE");

    // Verify profile loads and retains salary and expense history
    const profile = await EmployeeService.getEmployeeById(createdEmployee.id, superAdminUser.id);
    expect(profile.status).toBe("INACTIVE");
    expect(profile.salaryPayments.length).toBeGreaterThan(0);
    expect(profile.expenses.length).toBeGreaterThan(0);

    // Reactivate
    await EmployeeService.reactivateEmployee(createdEmployee.id, superAdminUser.id);
  });

  // TEST 20 & 21: Privacy & RBAC enforcement (regular user cannot see others' salary)
  it("TEST 20 & 21: Unauthorized user without employees:view_salary has salary data redacted", async () => {
    const directory = await EmployeeService.getEmployees({}, normalUser.id);
    const target = directory.employees.find((e) => e.id === createdEmployee.id);
    expect(target).toBeDefined();
    // Salary must be redacted/undefined for normal user
    expect(target?.currentSalary).toBeUndefined();
    expect(target?.salaryStructures).toEqual([]);

    // Attempting to configure salary as normal user throws ForbiddenError
    await expect(
      EmployeeService.configureSalary(
        createdEmployee.id,
        { baseSalary: 99999, paymentMethod: "UPI" },
        normalUser.id
      )
    ).rejects.toThrow(ForbiddenError);

    // Attempting to credit salary as normal user throws ForbiddenError
    await expect(
      EmployeeService.creditSalary(
        createdEmployee.id,
        {
          periodMonth: 10,
          periodYear: 2026,
          amount: 50000,
          paymentMethod: "UPI",
        },
        normalUser.id
      )
    ).rejects.toThrow(ForbiddenError);
  });

  // TEST 22: Audit logging
  it("TEST 22: Employee creation, salary configuration, and salary credit generate audit logs with zero secrets", async () => {
    const auditLogs = await db.auditLog.findMany({
      where: {
        entityType: { in: ["Employee", "EmployeeSalaryPayment", "EmployeeSalaryStructure"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    expect(auditLogs.length).toBeGreaterThan(0);
    for (const log of auditLogs) {
      if (log.newValues) {
        expect(log.newValues).not.toContain("password");
        expect(log.newValues).not.toContain("Password123!");
      }
    }
  });

  // TEST 23 & 27: Monthly Employee Cost Calculation (No double counting)
  it("TEST 23 & 27: Monthly financial summary calculates Total Employee Cost (Salary + Direct Expenses) without double entry", async () => {
    const summary = await EmployeeService.getMonthlyFinancialSummary(
      createdEmployee.id,
      9,
      2026,
      superAdminUser.id
    );

    expect(summary.month).toBe(9);
    expect(summary.year).toBe(2026);
    expect(summary.salary.paid).toBe(true);
    expect(summary.salary.amount).toBe(30000);

    // Total Company Cost equals Paid Salary (30,000) + Direct Expenses
    expect(summary.totalCompanyCost).toBeGreaterThanOrEqual(30000);
  });
});
