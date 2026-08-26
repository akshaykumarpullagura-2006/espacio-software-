-- CreateTable
CREATE TABLE "PettyCashCategoryConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeAdvance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "issuedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "purpose" TEXT NOT NULL,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "notes" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmployeeAdvance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PettyCashExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "expenseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" REAL NOT NULL,
    "purpose" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "projectId" TEXT,
    "referenceNoExternal" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECORDED',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PettyCashExpense_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "EmployeeAdvance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PettyCashExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdvanceSettlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "settlementDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAdvance" REAL NOT NULL,
    "totalSpent" REAL NOT NULL,
    "cashReturned" REAL NOT NULL DEFAULT 0.0,
    "reimbursementDue" REAL NOT NULL DEFAULT 0.0,
    "difference" REAL NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'SETTLED',
    "settledById" TEXT,
    "approvedById" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdvanceSettlement_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "EmployeeAdvance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PettyCashCategoryConfig_key_key" ON "PettyCashCategoryConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAdvance_referenceNo_key" ON "EmployeeAdvance"("referenceNo");

-- CreateIndex
CREATE INDEX "EmployeeAdvance_employeeId_idx" ON "EmployeeAdvance"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeAdvance_projectId_idx" ON "EmployeeAdvance"("projectId");

-- CreateIndex
CREATE INDEX "EmployeeAdvance_status_idx" ON "EmployeeAdvance"("status");

-- CreateIndex
CREATE INDEX "EmployeeAdvance_issuedDate_idx" ON "EmployeeAdvance"("issuedDate");

-- CreateIndex
CREATE UNIQUE INDEX "PettyCashExpense_referenceNo_key" ON "PettyCashExpense"("referenceNo");

-- CreateIndex
CREATE INDEX "PettyCashExpense_advanceId_idx" ON "PettyCashExpense"("advanceId");

-- CreateIndex
CREATE INDEX "PettyCashExpense_employeeId_idx" ON "PettyCashExpense"("employeeId");

-- CreateIndex
CREATE INDEX "PettyCashExpense_projectId_idx" ON "PettyCashExpense"("projectId");

-- CreateIndex
CREATE INDEX "PettyCashExpense_status_idx" ON "PettyCashExpense"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdvanceSettlement_referenceNo_key" ON "AdvanceSettlement"("referenceNo");

-- CreateIndex
CREATE INDEX "AdvanceSettlement_advanceId_idx" ON "AdvanceSettlement"("advanceId");

-- CreateIndex
CREATE INDEX "AdvanceSettlement_employeeId_idx" ON "AdvanceSettlement"("employeeId");

-- CreateIndex
CREATE INDEX "AdvanceSettlement_status_idx" ON "AdvanceSettlement"("status");
