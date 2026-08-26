import { db } from "./db";

export type EntityPrefix =
  | "LEAD"
  | "PROJ"
  | "Q"
  | "PAY"
  | "EXP"
  | "VEN"
  | "PO"
  | "CLI"
  | "CO"
  | "WAR"
  | "ADV"
  | "PCX"
  | "SET"
  | "MR"
  | "GRN"
  | "MAT"
  | "WH"
  | "STM"
  | "STT"
  | "STC"
  | "RES"
  | "ADJ"
  | "VPAY"
  | "INV"
  | "REC"
  | "VPAYABLE"
  | "LED"
  | "ACC"
  | "REM"
  | "TSK"
  | "DOC"
  | "BAK"
  | "EMP"
  | "SAL";

/**
 * Safe, concurrency-resistant reference ID generator.
 * Format: PREFIX-YYYY-XXXX (or ACC-XXXX / WH-XXXX for accounts/warehouses)
 */
export class IdGeneratorService {
  public static async generate(prefix: EntityPrefix, offset: number = 0): Promise<string> {
    const year = new Date().getFullYear();

    let maxSequence = 0;

    switch (prefix) {
      case "EMP": {
        const last = await db.employee.findFirst({
          where: { employeeNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { employeeNo: "desc" },
          select: { employeeNo: true },
        });
        maxSequence = this.extractSequence(last?.employeeNo);
        break;
      }
      case "SAL": {
        const last = await db.employeeSalaryPayment.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "BAK": {
        const last = await db.backupLog.findFirst({
          where: { backupNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { backupNo: "desc" },
          select: { backupNo: true },
        });
        maxSequence = this.extractSequence(last?.backupNo);
        break;
      }
      case "DOC": {
        const last = await db.document.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "TSK": {
        const last = await db.task.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "REM": {
        const last = await db.reminder.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "ACC": {
        const last = await db.financialAccount.findFirst({
          where: { accountCode: { startsWith: `${prefix}-` } },
          orderBy: { accountCode: "desc" },
          select: { accountCode: true },
        });
        maxSequence = this.extractSequence(last?.accountCode);
        const nextSeq = maxSequence + 1 + offset;
        return `${prefix}-${String(nextSeq).padStart(4, "0")}`;
      }
      case "VPAY": {
        const last = await db.vendorPayment.findFirst({
          where: { paymentNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { paymentNo: "desc" },
          select: { paymentNo: true },
        });
        maxSequence = this.extractSequence(last?.paymentNo);
        break;
      }
      case "INV": {
        const last = await db.gstInvoice.findFirst({
          where: { invoiceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { invoiceNo: "desc" },
          select: { invoiceNo: true },
        });
        maxSequence = this.extractSequence(last?.invoiceNo);
        break;
      }
      case "REC": {
        const last = await db.clientReceivable.findFirst({
          where: { receivableNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { receivableNo: "desc" },
          select: { receivableNo: true },
        });
        maxSequence = this.extractSequence(last?.receivableNo);
        break;
      }
      case "VPAYABLE": {
        const last = await db.vendorPayable.findFirst({
          where: { payableNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { payableNo: "desc" },
          select: { payableNo: true },
        });
        maxSequence = this.extractSequence(last?.payableNo);
        break;
      }
      case "LED": {
        const last = await db.financialLedger.findFirst({
          where: { entryNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { entryNo: "desc" },
          select: { entryNo: true },
        });
        maxSequence = this.extractSequence(last?.entryNo);
        break;
      }
      case "MAT": {
        const last = await db.material.findFirst({
          where: { materialCode: { startsWith: `${prefix}-${year}-` } },
          orderBy: { materialCode: "desc" },
          select: { materialCode: true },
        });
        maxSequence = this.extractSequence(last?.materialCode);
        break;
      }
      case "WH": {
        const last = await db.warehouse.findFirst({
          where: { warehouseCode: { startsWith: `${prefix}-` } },
          orderBy: { warehouseCode: "desc" },
          select: { warehouseCode: true },
        });
        maxSequence = this.extractSequence(last?.warehouseCode);
        const nextSeq = maxSequence + 1 + offset;
        return `${prefix}-${String(nextSeq).padStart(4, "0")}`;
      }
      case "STM": {
        const last = await db.stockMovement.findFirst({
          where: { movementNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { movementNo: "desc" },
          select: { movementNo: true },
        });
        maxSequence = this.extractSequence(last?.movementNo);
        break;
      }
      case "STT": {
        const last = await db.stockTransfer.findFirst({
          where: { transferNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { transferNo: "desc" },
          select: { transferNo: true },
        });
        maxSequence = this.extractSequence(last?.transferNo);
        break;
      }
      case "STC": {
        const last = await db.stockCount.findFirst({
          where: { countNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { countNo: "desc" },
          select: { countNo: true },
        });
        maxSequence = this.extractSequence(last?.countNo);
        break;
      }
      case "RES": {
        const last = await db.stockReservation.findFirst({
          where: { reservationNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { reservationNo: "desc" },
          select: { reservationNo: true },
        });
        maxSequence = this.extractSequence(last?.reservationNo);
        break;
      }
      case "MR": {
        const last = await db.materialRequest.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "GRN": {
        const last = await db.goodsReceipt.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "LEAD": {
        const last = await db.lead.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "PROJ": {
        const last = await db.project.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "CO": {
        const last = await db.changeOrder.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "WAR": {
        const last = await db.warrantyIssue.findFirst({
          where: { issueNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { issueNo: "desc" },
          select: { issueNo: true },
        });
        maxSequence = this.extractSequence(last?.issueNo);
        break;
      }
      case "ADV": {
        const last = await db.employeeAdvance.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "PCX": {
        const last = await db.pettyCashExpense.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "SET": {
        const last = await db.advanceSettlement.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "Q": {
        const records = await db.quotation.findMany({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          select: { referenceNo: true },
        });
        maxSequence = records.reduce((max, r) => {
          const seq = this.extractSequence(r.referenceNo);
          return Math.max(max, seq);
        }, 0);
        break;
      }
      case "PAY": {
        const last = await db.clientPayment.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "EXP": {
        const last = await db.expense.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "VEN": {
        const last = await db.vendor.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "PO": {
        const last = await db.purchaseOrder.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "CLI": {
        const last = await db.client.findFirst({
          where: { referenceNo: { startsWith: `${prefix}-${year}-` } },
          orderBy: { referenceNo: "desc" },
          select: { referenceNo: true },
        });
        maxSequence = this.extractSequence(last?.referenceNo);
        break;
      }
      case "INV": {
        const records = await db.gstInvoice.findMany({
          where: { invoiceNo: { startsWith: `${prefix}-${year}-` } },
          select: { invoiceNo: true },
        });
        maxSequence = records.reduce((max, r) => {
          const seq = this.extractSequence(r.invoiceNo);
          return Math.max(max, seq);
        }, 0);
        break;
      }
    }

    const nextSeq = maxSequence + 1 + offset;
    const padding = 4;
    const paddedSeq = String(nextSeq).padStart(padding, "0");

    return `${prefix}-${year}-${paddedSeq}`;
  }


  private static extractSequence(refNo?: string | null): number {
    if (!refNo) return 0;
    // Match pattern: PREFIX-YYYY-XXXX (extracting XXXX digits before any optional -V suffix)
    const match = refNo.match(/^[A-Z]+-\d{4}-(\d+)/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    const parts = refNo.split("-");
    for (let i = parts.length - 1; i >= 0; i--) {
      const parsed = parseInt(parts[i], 10);
      if (!isNaN(parsed) && parts[i].length <= 6) {
        return parsed;
      }
    }
    return 0;
  }
}
