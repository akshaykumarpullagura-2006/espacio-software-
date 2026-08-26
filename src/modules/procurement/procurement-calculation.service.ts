import { BusinessRuleError } from "@/lib/errors";

export interface POLineCalculationInput {
  quantity: number;
  rate: number;
  discount?: number;
  taxRate?: number;
}

export interface POTotalsCalculationInput {
  items: POLineCalculationInput[];
  discount?: number;
  tax?: number;
  shippingCharges?: number;
}

export class ProcurementCalculationService {
  public static roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Calculates a single PO line item total:
   * Line Subtotal = (Quantity * Rate) - Discount
   * Tax Amount = Line Subtotal * (TaxRate / 100)
   * Line Total = Line Subtotal + Tax Amount
   */
  public static calculateLineTotal(input: POLineCalculationInput): {
    subtotal: number;
    taxAmount: number;
    lineTotal: number;
  } {
    const qty = Math.max(0, input.quantity);
    const rate = Math.max(0, input.rate);
    const discount = Math.max(0, input.discount ?? 0);
    const taxRate = Math.max(0, input.taxRate ?? 0);

    const gross = qty * rate;
    const subtotal = Math.max(0, gross - discount);
    const taxAmount = (subtotal * taxRate) / 100;
    const lineTotal = subtotal + taxAmount;

    return {
      subtotal: this.roundCurrency(subtotal),
      taxAmount: this.roundCurrency(taxAmount),
      lineTotal: this.roundCurrency(lineTotal),
    };
  }

  /**
   * Calculates Grand Total for a Purchase Order:
   * Subtotal = Sum of line totals
   * Grand Total = Subtotal - Discount + Tax + ShippingCharges
   */
  public static calculatePOTotals(input: POTotalsCalculationInput): {
    subtotal: number;
    discount: number;
    tax: number;
    shippingCharges: number;
    grandTotal: number;
  } {
    let subtotal = 0;
    for (const item of input.items) {
      const line = this.calculateLineTotal(item);
      subtotal += line.lineTotal;
    }

    subtotal = this.roundCurrency(subtotal);
    const discount = Math.max(0, input.discount ?? 0);
    const tax = Math.max(0, input.tax ?? 0);
    const shippingCharges = Math.max(0, input.shippingCharges ?? 0);

    const grandTotal = Math.max(0, subtotal - discount + tax + shippingCharges);

    return {
      subtotal,
      discount: this.roundCurrency(discount),
      tax: this.roundCurrency(tax),
      shippingCharges: this.roundCurrency(shippingCharges),
      grandTotal: this.roundCurrency(grandTotal),
    };
  }

  /**
   * Over-receiving protection check.
   */
  public static validateReceivingQuantity(
    orderedQty: number,
    previouslyReceivedQty: number,
    attemptingReceiptQty: number,
    allowOverReceiving: boolean = false
  ): void {
    const totalAfterReceipt = previouslyReceivedQty + attemptingReceiptQty;
    if (!allowOverReceiving && totalAfterReceipt > orderedQty) {
      throw new BusinessRuleError(
        `Receiving quantity of ${attemptingReceiptQty} exceeds the remaining PO pending quantity of ${
          orderedQty - previouslyReceivedQty
        }. Over-receiving is not permitted.`
      );
    }
  }
}
