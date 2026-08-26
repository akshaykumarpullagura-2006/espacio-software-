import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { CompanyService } from "@/modules/settings/company.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        project: true,
        items: true,
      },
    });

    if (!po) {
      return new Response("Purchase Order not found", { status: 404 });
    }

    const company = await CompanyService.getCompanyProfile();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PURCHASE ORDER - ${po.referenceNo}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; font-size: 12px; color: #1e293b; }
    .header { display: flex; justify-content: space-between; border-b: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: bold; color: #0284c7; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
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
      <div>GSTIN: ${company.gstin || "29ABCDE1234F1ZH"} | Phone: ${company.phone || ""}</div>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; color: #0284c7;">PURCHASE ORDER</h2>
      <div><strong>PO Reference:</strong> ${po.referenceNo}</div>
      <div><strong>Date:</strong> ${new Date(po.poDate).toLocaleDateString("en-IN")}</div>
      <div><strong>Status:</strong> ${po.status}</div>
    </div>
  </div>

  <div style="margin-bottom: 15px;">
    <strong>Vendor Name:</strong> ${po.vendor ? po.vendor.name : "Vendor"} | <strong>Project:</strong> ${po.project ? po.project.title : "N/A"}
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Material / Item Description</th>
        <th>Qty</th>
        <th>Rate (₹)</th>
        <th>Line Total (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${po.items
        .map(
          (item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.materialName} ${item.description ? `- ${item.description}` : ""}</td>
          <td>${item.quantity} ${item.unitKey}</td>
          <td>${item.rate.toLocaleString("en-IN")}</td>
          <td>${item.lineTotal.toLocaleString("en-IN")}</td>
        </tr>`
        )
        .join("")}
      <tr class="total-row">
        <td colspan="4" style="text-align: right;">Subtotal:</td>
        <td>₹${po.subtotal.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row">
        <td colspan="4" style="text-align: right;">Tax Amount:</td>
        <td>₹${po.tax.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row" style="font-size: 14px; color: #0284c7;">
        <td colspan="4" style="text-align: right;">GRAND TOTAL:</td>
        <td>₹${po.grandTotal.toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Authorized Purchase Order issued by ${company.companyName}.
  </div>
</body>
</html>
    `;

    return new Response(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="PurchaseOrder_${po.referenceNo}.html"`,
      },
    });
  } catch (err: any) {
    return new Response(err.message || "Failed to generate PO PDF", { status: 500 });
  }
}
