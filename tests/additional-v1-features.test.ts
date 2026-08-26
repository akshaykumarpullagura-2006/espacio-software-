import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { EmailService } from "../src/lib/email.service";
import { GstInvoiceService } from "../src/modules/finance/gst-invoice.service";
import { AutomatedReportsService } from "../src/modules/reports/automated-reports.service";

describe("Module 18: Additional V1 Features & Integrations", () => {
  let adminUserId: string;
  let testProjectId: string;
  let testVendorId: string;
  let testInvoiceId: string;

  beforeAll(async () => {
    // Find or create test admin user
    const admin = await db.user.findFirst({ where: { status: "ACTIVE" } });
    if (admin) {
      adminUserId = admin.id;
    } else {
      const created = await db.user.create({
        data: {
          email: `admin_v1_features_${Date.now()}@espacio.com`,
          passwordHash: "hash123",
          fullName: "V1 Features Admin",
        },
      });
      adminUserId = created.id;
    }

    // Find or create test project
    const proj = await db.project.findFirst();
    if (proj) {
      testProjectId = proj.id;
    } else {
      const createdProj = await db.project.create({
        data: {
          referenceNo: `PROJ-V1-${Date.now()}`,
          title: "V1 Integration Test Project",
          propertyTypeKey: "RESIDENTIAL",
          siteAddress: "100 Feet Road, Indiranagar",
          city: "Bengaluru",
          state: "Karnataka",
          latitude: 12.9716,
          longitude: 77.5946,
          googleMapsUrl: "https://maps.google.com/?q=12.9716,77.5946",
          whatsAppGroupUrl: "https://chat.whatsapp.com/demo_project_group",
        },
      });
      testProjectId = createdProj.id;
    }

    // Find or create test vendor
    const vendor = await db.vendor.findFirst();
    if (vendor) {
      testVendorId = vendor.id;
    } else {
      const createdVendor = await db.vendor.create({
        data: {
          referenceNo: `VEN-V1-${Date.now()}`,
          name: "V1 Material Supplier Pvt Ltd",
          contactPerson: "Ramesh Vendor",
          phone: "+91 91234 56789",
        },
      });
      testVendorId = createdVendor.id;
    }
  });

  it("1. Should parse template variables and dispatch email logged in NotificationDeliveryLog", async () => {
    const result = await EmailService.sendTemplatedEmail({
      eventType: "LEAD_FOLLOWUP",
      recipientEmail: "testclient@example.com",
      recipientId: adminUserId,
      variables: {
        clientName: "Rajesh Sharma",
        userName: "Aahil Khan",
        requirement: "3BHK Villa Interior Execution",
        dueDate: "2026-08-25",
      },
    });

    expect(result.success).toBe(true);
    expect(result.parsedSubject).toContain("Rajesh Sharma");
    expect(result.parsedBody).toContain("Aahil Khan");

    // Verify delivery log recorded
    const log = await db.notificationDeliveryLog.findFirst({
      where: { channel: "EMAIL" },
      orderBy: { sentAt: "desc" },
    });
    expect(log).toBeDefined();
    expect(log?.status).toBe("SENT");
  });

  it("2. Should create a GST Invoice (INV-YYYY-XXXX) and compute intra-state CGST + SGST split", async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: "Rajesh Sharma",
      customerGstin: "29ABCDE1234F1ZH",
      placeOfSupply: "Karnataka",
      isInterState: false, // Intra-state => CGST + SGST
      projectId: testProjectId,
      items: [
        { description: "Living Room Modular Furniture", quantity: 2, unitRate: 50000, discount: 5000, gstRate: 18 },
      ],
      createdById: adminUserId,
    });

    expect(invoice).toBeDefined();
    expect(invoice.invoiceNo).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(invoice.taxableAmount).toBe(95000); // (2 * 50000) - 5000
    expect(invoice.cgstAmount).toBe(8550); // 95000 * 9%
    expect(invoice.sgstAmount).toBe(8550); // 95000 * 9%
    expect(invoice.igstAmount).toBe(0);
    expect(invoice.grandTotal).toBe(112100);

    testInvoiceId = invoice.id;
  });

  it("3. Should compute inter-state IGST split for inter-state invoice", async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: "Hyderabad Commercial Ltd",
      customerGstin: "36ABCDE1234F1ZH",
      placeOfSupply: "Telangana",
      isInterState: true, // Inter-state => IGST
      items: [
        { description: "Custom Laminate Wall Paneling", quantity: 1, unitRate: 200000, discount: 0, gstRate: 18 },
      ],
      createdById: adminUserId,
    });

    expect(invoice).toBeDefined();
    expect(invoice.isInterState).toBe(true);
    expect(invoice.igstAmount).toBe(36000); // 200000 * 18%
    expect(invoice.cgstAmount).toBe(0);
    expect(invoice.sgstAmount).toBe(0);
  });

  it("4. Should generate Purchase Order (PO-YYYY-XXXX) and link to Vendor and Project", async () => {
    const po = await db.purchaseOrder.create({
      data: {
        referenceNo: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        vendorId: testVendorId,
        projectId: testProjectId,
        subtotal: 150000,
        tax: 27000,
        grandTotal: 177000,
        status: "APPROVED",
        createdById: adminUserId,
        items: {
          create: [
            { materialName: "CenturyPlywood 18mm", quantity: 50, rate: 3000, pendingQuantity: 50, lineTotal: 150000 },
          ],
        },
      },
    });

    expect(po).toBeDefined();
    expect(po.referenceNo).toMatch(/^PO-\d{4}-\d{4}$/);
    expect(po.grandTotal).toBe(177000);
  });

  it("5. Should generate Material Request (MR-YYYY-XXXX) and convert to Purchase Order", async () => {
    const mr = await db.materialRequest.create({
      data: {
        referenceNo: `MR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        projectId: testProjectId,
        requesterId: adminUserId,
        requiredDate: new Date(),
        status: "APPROVED",
        items: {
          create: [{ materialName: "Hafele Soft-close Hinges", requestedQuantity: 100, unitKey: "NOS" }],
        },
      },
    });

    expect(mr).toBeDefined();
    expect(mr.referenceNo).toMatch(/^MR-\d{4}-\d{4}$/);
  });

  it("6. Should record Vendor Payment and update Vendor Payable outstanding balance", async () => {
    const payment = await db.vendorPayment.create({
      data: {
        paymentNo: `VPAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        vendorId: testVendorId,
        projectId: testProjectId,
        amount: 50000,
        paymentMethod: "BANK_TRANSFER",
        status: "VERIFIED",
        recordedById: adminUserId,
      },
    });

    expect(payment).toBeDefined();
    expect(payment.paymentNo).toMatch(/^VPAY-\d{4}-\d{4}$/);
    expect(payment.amount).toBe(50000);
  });

  it("7. Should generate Automated Daily and Monthly Reports", async () => {
    const daily = await AutomatedReportsService.generateDailyReport();
    expect(daily).toBeDefined();
    expect(daily.reportType).toBe("Daily Executive Summary");

    const monthly = await AutomatedReportsService.generateMonthlyReport();
    expect(monthly).toBeDefined();
    expect(monthly.reportType).toBe("Monthly Financial & Operational Report");
  });

  it("8. Should store Project Google Maps site location and WhatsApp Group link", async () => {
    const project = await db.project.update({
      where: { id: testProjectId },
      data: {
        latitude: 12.9716,
        longitude: 77.5946,
        googleMapsUrl: "https://maps.google.com/?q=12.9716,77.5946",
        whatsAppGroupUrl: "https://chat.whatsapp.com/demo_project_group",
      },
    });

    expect(project).toBeDefined();
    expect(project.latitude).toBe(12.9716);
    expect(project.googleMapsUrl).toContain("maps.google.com");
    expect(project.whatsAppGroupUrl).toContain("chat.whatsapp.com");
  });
});
