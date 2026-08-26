import { db } from "@/lib/db";

export interface GstTaxBreakdown {
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
}

export class FinanceCalculationService {
  /**
   * Safe financial money rounding (2 decimal places).
   */
  public static roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Calculates GST breakdown (CGST+SGST vs IGST).
   */
  public static calculateGst(
    taxableAmount: number,
    gstRate: number = 18.0,
    isInterState: boolean = false
  ): GstTaxBreakdown {
    const roundedTaxable = this.roundMoney(taxableAmount);

    if (isInterState) {
      const igstRate = gstRate;
      const igstAmount = this.roundMoney((roundedTaxable * igstRate) / 100);
      const exactTotal = roundedTaxable + igstAmount;
      const grandTotal = Math.round(exactTotal);
      const roundOff = this.roundMoney(grandTotal - exactTotal);

      return {
        taxableAmount: roundedTaxable,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate,
        igstAmount,
        totalTax: igstAmount,
        roundOff,
        grandTotal,
      };
    } else {
      const halfRate = gstRate / 2;
      const cgstAmount = this.roundMoney((roundedTaxable * halfRate) / 100);
      const sgstAmount = this.roundMoney((roundedTaxable * halfRate) / 100);
      const totalTax = this.roundMoney(cgstAmount + sgstAmount);
      const exactTotal = roundedTaxable + totalTax;
      const grandTotal = Math.round(exactTotal);
      const roundOff = this.roundMoney(grandTotal - exactTotal);

      return {
        taxableAmount: roundedTaxable,
        cgstRate: halfRate,
        cgstAmount,
        sgstRate: halfRate,
        sgstAmount,
        igstRate: 0,
        igstAmount: 0,
        totalTax,
        roundOff,
        grandTotal,
      };
    }
  }

  /**
   * Calculates MoM Growth Percentage safely.
   */
  public static calculateGrowthPct(current: number, previous: number): number | null {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return this.roundMoney(((current - previous) / previous) * 100);
  }
}
