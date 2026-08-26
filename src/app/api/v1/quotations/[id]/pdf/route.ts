import { NextRequest } from "next/server";
import { QuotationService } from "@/modules/quotations/quotation.service";
import { CompanyService } from "@/modules/settings/company.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Strictly client-facing (redacts internal cost, margins, and internal notes)
    const quote = await QuotationService.getQuotationById(id, undefined, true);
    const company = await CompanyService.getCompanyProfile();

    const clientName = quote.client?.fullName || quote.lead?.clientName || "Valued Client";
    const clientPhone = quote.client?.phone || quote.lead?.phone || "N/A";
    const clientEmail = quote.client?.email || quote.lead?.email || "N/A";
    const clientAddress = quote.client?.address || quote.lead?.location || quote.project?.siteAddress || "N/A";

    const formattedDate = new Date(quote.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const validityDateStr = quote.validityDate
      ? new Date(quote.validityDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "30 Days from Issue Date";

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>QUOTATION - ${quote.referenceNo} - ${clientName}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #0f172a;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.5;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #059669;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #047857;
      margin-bottom: 4px;
    }
    .brand-tagline {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .quote-title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      text-align: right;
      margin-bottom: 4px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 4px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
    }
    .meta-box h4 {
      margin: 0 0 8px 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #047857;
    }
    .meta-row {
      display: flex;
      margin-bottom: 4px;
    }
    .meta-label { width: 110px; color: #64748b; font-weight: 500; }
    .meta-value { font-weight: 600; color: #1e293b; }
    
    .room-section { margin-bottom: 25px; }
    .room-header {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px 6px 0 0;
      display: flex;
      justify-content: space-between;
    }
    .room-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-top: none;
      margin-bottom: 10px;
    }
    .room-table th {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }
    .room-table td {
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      vertical-align: top;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-variant-numeric: tabular-nums; font-family: inherit; }
    
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
      margin-bottom: 30px;
    }
    .totals-table {
      width: 380px;
      border-collapse: collapse;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }
    .totals-table td {
      padding: 8px 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .totals-table tr.grand-total {
      background: #047857;
      color: #ffffff;
      font-size: 15px;
      font-weight: 800;
    }
    .totals-table tr.grand-total td {
      padding: 12px 14px;
      border-bottom: none;
    }
    
    .terms-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      background: #ffffff;
      margin-bottom: 30px;
    }
    .terms-box h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #047857; }
    .terms-box p { margin: 0 0 6px 0; color: #475569; font-size: 11px; }
    
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .sig-box {
      border-top: 1px dashed #94a3b8;
      padding-top: 10px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }

    .no-print-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      z-index: 9999;
    }
    .btn-print {
      background: #059669;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-print:hover { background: #047857; }
    
    @media print {
      .no-print-bar { display: none; }
      body { padding: 0; margin: 20mm 15mm 20mm 15mm; }
      .container { max-width: 100%; }
      .room-section { page-break-inside: avoid; }
      .totals-wrapper { page-break-inside: avoid; }
      .signature-grid { page-break-inside: avoid; }
    }
  </style>
</head>
<body style="padding-top: 70px;">
  <div class="no-print-bar">
    <div>
      <strong>ESPACIO Quotation:</strong> ${quote.referenceNo} (Rev ${quote.revision}) &mdash; Total: ₹${quote.totalAmount.toLocaleString("en-IN")}
    </div>
    <div>
      <button class="btn-print" onclick="window.print()">Print / Download PDF</button>
    </div>
  </div>

  <div class="container">
    <div class="header">
      <div>
        <div class="brand-title">${company.companyName}</div>
        <div class="brand-tagline">Architectural & Luxury Interior Solutions</div>
        <div style="color: #475569; font-size: 11px;">
          ${company.addressLine || ""}, ${company.city || ""} ${company.postalCode || ""}<br>
          GSTIN: <strong>${company.gstin || "29ABCDE1234F1ZH"}</strong> | Email: ${company.email || "hello@espacio.in"}<br>
          Phone: ${company.phone || "+91 98765 43210"}
        </div>
      </div>
      <div>
        <div class="quote-title">COMMERCIAL ESTIMATE</div>
        <div style="text-align: right; margin-bottom: 6px;">
          <span class="badge">${quote.status}</span>
        </div>
        <div style="text-align: right; font-size: 12px; color: #475569;">
          <strong>Quote Ref:</strong> ${quote.referenceNo}<br>
          <strong>Revision:</strong> Version ${quote.revision}<br>
          <strong>Issue Date:</strong> ${formattedDate}<br>
          <strong>Valid Until:</strong> ${validityDateStr}
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h4>Client Information</h4>
        <div class="meta-row"><span class="meta-label">Client Name:</span><span class="meta-value">${clientName}</span></div>
        <div class="meta-row"><span class="meta-label">Phone:</span><span class="meta-value">${clientPhone}</span></div>
        <div class="meta-row"><span class="meta-label">Email:</span><span class="meta-value">${clientEmail}</span></div>
        <div class="meta-row"><span class="meta-label">Address:</span><span class="meta-value">${clientAddress}</span></div>
      </div>
      <div class="meta-box">
        <h4>Project Details</h4>
        <div class="meta-row"><span class="meta-label">Quotation Title:</span><span class="meta-value">${quote.title}</span></div>
        ${
          quote.project
            ? `<div class="meta-row"><span class="meta-label">Project Ref:</span><span class="meta-value">${quote.project.referenceNo} (${quote.project.title})</span></div>`
            : quote.lead
            ? `<div class="meta-row"><span class="meta-label">Lead Ref:</span><span class="meta-value">${quote.lead.referenceNo}</span></div>`
            : ""
        }
        <div class="meta-row"><span class="meta-label">Prepared By:</span><span class="meta-value">${quote.createdBy?.fullName || "ESPACIO Design Team"}</span></div>
      </div>
    </div>

    <!-- Room-wise BOQ Tables -->
    ${quote.roomGroups
      .map(
        (group, gIdx) => `
      <div class="room-section">
        <div class="room-header">
          <span>${gIdx + 1}. ${group.room.toUpperCase()}</span>
          <span class="font-mono">Subtotal: ₹${group.subtotal.toLocaleString("en-IN")}</span>
        </div>
        <table class="room-table">
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Description & Specifications</th>
              <th style="width: 100px;">Trade</th>
              <th style="width: 75px;" class="text-center">Qty / Area</th>
              <th style="width: 60px;" class="text-center">Unit</th>
              <th style="width: 85px;" class="text-right">Rate (₹)</th>
              <th style="width: 75px;" class="text-right">Disc (₹)</th>
              <th style="width: 95px;" class="text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${group.items
              .map(
                (item, idx) => `
              <tr>
                <td class="text-center" style="color: #64748b;">${idx + 1}</td>
                <td>
                  <strong>${item.itemDescription}</strong>
                  ${item.specifications ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${item.specifications}</div>` : ""}
                  ${item.length && item.height ? `<div style="font-size: 10px; color: #047857; margin-top: 2px;">Dim: ${item.length} ft × ${item.height} ft</div>` : ""}
                </td>
                <td style="font-size: 11px; color: #475569;">${item.category}</td>
                <td class="text-center font-mono">${item.quantity}</td>
                <td class="text-center" style="font-size: 11px;">${item.unitKey}</td>
                <td class="text-right font-mono">${item.unitRate.toLocaleString("en-IN")}</td>
                <td class="text-right font-mono" style="color: ${item.discountAmount > 0 ? "#dc2626" : "#64748b"};">
                  ${item.discountAmount > 0 ? `-${item.discountAmount.toLocaleString("en-IN")}` : "0"}
                </td>
                <td class="text-right font-mono" style="font-weight: 700;">
                  ₹${item.totalAmount.toLocaleString("en-IN")}
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
      )
      .join("")}

    <!-- Financial Totals Summary -->
    <div class="totals-wrapper">
      <table class="totals-table">
        <tr>
          <td style="color: #475569;">BOQ Gross Subtotal:</td>
          <td class="text-right font-mono">₹${quote.subtotal.toLocaleString("en-IN")}</td>
        </tr>
        ${
          quote.discountAmount > 0
            ? `
          <tr>
            <td style="color: #dc2626;">Quotation Discount ${quote.discountType === "PERCENTAGE" ? `(${quote.discountValue}%)` : ""}:</td>
            <td class="text-right font-mono" style="color: #dc2626; font-weight: 600;">-₹${quote.discountAmount.toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="font-weight: 600;">Taxable Amount:</td>
            <td class="text-right font-mono" style="font-weight: 600;">₹${Math.max(0, quote.subtotal - quote.discountAmount).toLocaleString("en-IN")}</td>
          </tr>`
            : ""
        }
        ${
          quote.taxAmount > 0
            ? `
          <tr>
            <td style="color: #475569;">GST (${quote.taxRate}%):</td>
            <td class="text-right font-mono">₹${quote.taxAmount.toLocaleString("en-IN")}</td>
          </tr>`
            : ""
        }
        ${
          quote.adjustmentAmount !== 0
            ? `
          <tr>
            <td style="color: #475569;">Commercial Adjustment ${quote.adjustmentReason ? `(${quote.adjustmentReason})` : ""}:</td>
            <td class="text-right font-mono">${quote.adjustmentAmount > 0 ? "+" : ""}₹${quote.adjustmentAmount.toLocaleString("en-IN")}</td>
          </tr>`
            : ""
        }
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td class="text-right font-mono">₹${quote.totalAmount.toLocaleString("en-IN")}</td>
        </tr>
      </table>
    </div>

    <!-- Terms & Notes -->
    <div class="terms-box">
      <h4>Standard Terms & Commercial Conditions</h4>
      <p>1. <strong>Payment Milestones:</strong> 10% Booking Advance &bull; 40% Material Procurement &bull; 40% Production / On-site Execution &bull; 10% Final Handover & Quality Signoff.</p>
      <p>2. <strong>Validity:</strong> This commercial quotation is valid for 30 calendar days from the date of issuance.</p>
      <p>3. <strong>Site Readiness:</strong> Execution timeline commences upon unhindered site handover, water/electricity availability, and advance disbursement.</p>
      <p>4. <strong>Modifications:</strong> Any post-approval design changes will be handled via Change Orders with updated commercial estimates.</p>
      ${quote.termsAndConditions ? `<p style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px;"><strong>Additional Terms:</strong> ${quote.termsAndConditions}</p>` : ""}
      ${quote.notes ? `<p><strong>Client Notes:</strong> ${quote.notes}</p>` : ""}
    </div>

    <!-- Signatures -->
    <div class="signature-grid">
      <div>
        <div style="height: 50px;"></div>
        <div class="sig-box">
          <strong>Authorized Signatory</strong><br>
          For ${company.companyName}
        </div>
      </div>
      <div>
        <div style="height: 50px;"></div>
        <div class="sig-box">
          <strong>Client Acceptance & Sign-off</strong><br>
          ${clientName}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return new Response(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: any) {
    return new Response(err.message || "Failed to generate Quotation document", {
      status: err.statusCode || 500,
    });
  }
}
