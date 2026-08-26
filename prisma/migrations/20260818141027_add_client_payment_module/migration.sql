/*
  Warnings:

  - Added the required column `clientId` to the `ClientPayment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "PaymentMethodConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClientPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNo" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "amount" REAL NOT NULL,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECORDED',
    "externalReference" TEXT,
    "notes" TEXT,
    "receivedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" DATETIME,
    "reversalReason" TEXT,
    "reversedById" TEXT,
    "reversedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientPayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientPayment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ClientPayment" ("amount", "createdAt", "id", "notes", "paymentDate", "paymentMethod", "projectId", "referenceNo", "status", "updatedAt") SELECT "amount", "createdAt", "id", "notes", "paymentDate", "paymentMethod", "projectId", "referenceNo", "status", "updatedAt" FROM "ClientPayment";
DROP TABLE "ClientPayment";
ALTER TABLE "new_ClientPayment" RENAME TO "ClientPayment";
CREATE UNIQUE INDEX "ClientPayment_referenceNo_key" ON "ClientPayment"("referenceNo");
CREATE INDEX "ClientPayment_projectId_idx" ON "ClientPayment"("projectId");
CREATE INDEX "ClientPayment_clientId_idx" ON "ClientPayment"("clientId");
CREATE INDEX "ClientPayment_milestoneId_idx" ON "ClientPayment"("milestoneId");
CREATE INDEX "ClientPayment_status_idx" ON "ClientPayment"("status");
CREATE INDEX "ClientPayment_paymentDate_idx" ON "ClientPayment"("paymentDate");
CREATE TABLE "new_ProjectMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "percentage" REAL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "paidAmount" REAL NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProjectMilestone" ("amount", "createdAt", "dueDate", "id", "name", "notes", "paidAmount", "percentage", "projectId", "status", "updatedAt") SELECT "amount", "createdAt", "dueDate", "id", "name", "notes", "paidAmount", "percentage", "projectId", "status", "updatedAt" FROM "ProjectMilestone";
DROP TABLE "ProjectMilestone";
ALTER TABLE "new_ProjectMilestone" RENAME TO "ProjectMilestone";
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");
CREATE INDEX "ProjectMilestone_dueDate_idx" ON "ProjectMilestone"("dueDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodConfig_key_key" ON "PaymentMethodConfig"("key");
