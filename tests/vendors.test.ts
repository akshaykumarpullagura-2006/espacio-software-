import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { VendorService } from "../src/modules/vendors/vendor.service";
import { VendorPerformanceService } from "../src/modules/vendors/vendor-performance.service";

describe("Vendors & Suppliers Management Module Tests", () => {
  let sampleUserId: string;
  let testVendorId: string;

  beforeAll(async () => {
    // Find or seed a sample user
    const user = await db.user.findFirst();
    if (!user) throw new Error("No user found for testing");
    sampleUserId = user.id;
  });

  it("creates a vendor master record with server-generated VEN-YYYY-XXXX reference", async () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const vendor = await VendorService.createVendor(
      {
        name: `Test Plywood Supplier ${randomSuffix}`,
        legalName: "Test Plywood Private Limited",
        categoryKey: "PLYWOOD",
        contactPerson: "Ramesh Test",
        phone: `+91 99999 ${randomSuffix}`,
        email: `orders.${randomSuffix}@testply.com`,
        address: "Kukatpally Industrial Area",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500072",
        gstin: `36AAACT${randomSuffix}F1Z9`,
        paymentTermsKey: "DAYS_30",
        creditLimit: 500000,
      },
      sampleUserId
    );

    expect(vendor).toBeDefined();
    expect(vendor.referenceNo).toMatch(/^VEN-\d{4}-\d{4}$/);
    expect(vendor.name).toContain("Test Plywood Supplier");
    expect(vendor.status).toBe("ACTIVE");

    testVendorId = vendor.id;
  });

  it("detects and rejects duplicate vendors registered with the same phone or GSTIN", async () => {
    const existing = await db.vendor.findUnique({ where: { id: testVendorId } });
    if (!existing) throw new Error("Test vendor not found");

    await expect(
      VendorService.createVendor(
        {
          name: "Duplicate Vendor Attempt",
          categoryKey: "PLYWOOD",
          phone: existing.phone,
        },
        sampleUserId
      )
    ).rejects.toThrow(/already exists/i);
  });

  it("adds secondary vendor contacts to VendorContact table", async () => {
    const contact = await VendorService.addContact(
      {
        vendorId: testVendorId,
        name: "Suresh Dispatch",
        designation: "Dispatch & Logistics Manager",
        phone: "+91 98888 77766",
        email: "dispatch@testply.com",
        isPrimary: false,
      },
      sampleUserId
    );

    expect(contact).toBeDefined();
    expect(contact.vendorId).toBe(testVendorId);
    expect(contact.name).toBe("Suresh Dispatch");
  });

  it("logs supplier quality ratings and calculates average performance ratings", async () => {
    const rating1 = await VendorService.logRating(
      {
        vendorId: testVendorId,
        qualityRating: 5.0,
        deliveryRating: 4.8,
        notes: "Excellent BWP plywood delivery",
      },
      sampleUserId
    );

    expect(rating1).toBeDefined();
    expect(rating1.qualityRating).toBe(5.0);

    const metrics = await VendorPerformanceService.calculateVendorMetrics(testVendorId);
    expect(metrics.qualityRating).toBe(5.0);
  });

  it("blocks vendor from new procurement and records blocking reason", async () => {
    const blocked = await VendorService.blockVendor(
      testVendorId,
      { reason: "Quality non-conformance on blockboard delivery" },
      sampleUserId
    );

    expect(blocked).toBeDefined();
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.blockedReason).toBe("Quality non-conformance on blockboard delivery");
  });
});
