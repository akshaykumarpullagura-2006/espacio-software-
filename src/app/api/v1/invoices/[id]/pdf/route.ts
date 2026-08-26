import { NextRequest } from "next/server";
import { GstInvoiceService } from "@/modules/finance/gst-invoice.service";
import { CompanyService } from "@/modules/settings/company.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await GstInvoiceService.getInvoiceById(id);
    const company = await CompanyService.getCompanyProfile();

    // Render plain text/HTML representation for downloadable GST Invoice PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TAX INVOICE - ${invoice.invoiceNo}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; font-size: 12px; color: #1e293b; }
    .header { display: flex; justify-content: space-between; border-b: 2px solid #047857; padding-bottom: 15px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: bold; color: #047857; }
    .meta-table, .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .items-table th, .items-table td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    .items-table th { background-color: #f1f5f9; font-weight: bold; }
    .total-row { font-weight: bold; background-color: #f8fafc; }
    .footer { margin-top: 30px; font-size: 10px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${company.companyName}</div>
      <div>${company.legalName || ""}</div>
      <div>${company.addressLine || ""}, ${company.city || ""} ${company.postalCode || ""}</div>
      <div>GSTIN: <strong>${company.gstin || "29ABCDE1234F1ZH"}</strong> | Email: ${company.email || ""}</div>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; color: #047857;">TAX INVOICE</h2>
      <div><strong>Invoice No:</strong> ${invoice.invoiceNo}</div>
      <div><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</div>
      <div><strong>Place of Supply:</strong> ${invoice.placeOfSupply}</div>
    </div>
  </div>

  <table className="meta-table">
    <tr>
      <td><strong>Billed To:</strong> ${invoice.customerName}</td>
      <td><strong>Client GSTIN:</strong> ${invoice.customerGstin || "N/A"}</td>
    </tr>
    <tr>
      <td><strong>Customer Address:</strong> ${invoice.customerAddress || "N/A"}</td>
      <td><strong>Tax Type:</strong> ${invoice.isInterState ? "IGST (Inter-State)" : "CGST + SGST (Intra-State)"}</td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>HSN/SAC</th>
        <th>Qty</th>
        <th>Rate (₹)</th>
        <th>Discount (₹)</th>
        <th>Taxable Value (₹)</th>
        <th>GST Rate</th>
        <th>Tax Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items
        .map(
          (item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.description}</td>
          <td>${item.hsnSacCode || "995476"}</td>
          <td>${item.quantity} ${item.unitKey}</td>
          <td>${item.unitRate.toLocaleString("en-IN")}</td>
          <td>${item.discount.toLocaleString("en-IN")}</td>
          <td>${item.taxableValue.toLocaleString("en-IN")}</td>
          <td>${item.gstRate}%</td>
          <td>${(item.cgstAmount + item.sgstAmount + item.igstAmount).toLocaleString("en-IN")}</td>
        </tr>`
        )
        .join("")}
      <tr class="total-row">
        <td colspan="6" style="text-align: right;">Subtotal Taxable Amount:</td>
        <td colspan="3">₹${invoice.taxableAmount.toLocaleString("en-IN")}</td>
      </tr>
      ${
        invoice.isInterState
          ? `<tr class="total-row"><td colspan="6" style="text-align: right;">IGST Total:</td><td colspan="3">₹${invoice.igstAmount.toLocaleString("en-IN")}</td></tr>`
          : `<tr class="total-row"><td colspan="6" style="text-align: right;">CGST Total:</td><td colspan="3">₹${invoice.cgstAmount.toLocaleString("en-IN")}</td></tr>
             <tr class="total-row"><td colspan="6" style="text-align: right;">SGST Total:</td><td colspan="3">₹${invoice.sgstAmount.toLocaleString("en-IN")}</td></tr>`
      }
      <tr class="total-row" style="font-size: 14px; color: #047857;">
        <td colspan="6" style="text-align: right;">GRAND TOTAL:</td>
        <td colspan="3">₹${invoice.grandTotal.toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    This is a computer-generated tax invoice. Thank you for doing business with ${company.companyName}!
  </div>
</body>
</html>
    `;

    return new Response(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="GST_Invoice_${invoice.invoiceNo}.html"`,
      },
    });
  } catch (err: any) {
    return new Response(err.message || "Failed to generate Invoice PDF", { status: 500 });
  }
}
