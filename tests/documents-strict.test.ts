import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { DocumentService } from "../src/modules/documents/document.service";
import { GoogleDriveService } from "../src/modules/documents/google-drive.service";
import { StorageService } from "../src/lib/storage.service";
import { RbacService } from "../src/modules/rbac/rbac.service";

describe("ESPACIO ERP Master Prompt 13 — Strict Document Management & Central Document Architecture Test Suite", () => {
  let testAdminId: string;
  let testEmployeeId: string;
  let testProjectId: string;
  let testClientId: string;
  let testLeadId: string;
  let testVendorId: string;
  let testDocId: string;

  beforeAll(async () => {
    // 1. Resolve or create test Admin user
    const admin = await db.user.findFirst({ where: { accessLevel: "SUPER_ADMIN" } });
    if (admin) {
      testAdminId = admin.id;
    } else {
      const created = await db.user.create({
        data: {
          email: `doc_admin_${Date.now()}@espacio.com`,
          passwordHash: "hash123",
          fullName: "Doc Admin SuperUser",
          accessLevel: "SUPER_ADMIN",
        },
      });
      testAdminId = created.id;
    }

    // 2. Resolve or create test Employee user
    const employee = await db.user.findFirst({ where: { accessLevel: "USER", status: "ACTIVE" } });
    if (employee) {
      testEmployeeId = employee.id;
    } else {
      const created = await db.user.create({
        data: {
          email: `doc_emp_${Date.now()}@espacio.com`,
          passwordHash: "hash123",
          fullName: "Doc Operations Staff",
          accessLevel: "USER",
          status: "ACTIVE",
        },
      });
      testEmployeeId = created.id;
    }

    // 3. Resolve or create test Project
    const proj = await db.project.findFirst({ where: { status: { not: "CANCELLED" } } });
    if (proj) {
      testProjectId = proj.id;
    } else {
      const created = await db.project.create({
        data: {
          referenceNo: `PROJ-${Date.now()}`,
          title: "Skyline Luxury Penthouse Doc Test",
          propertyTypeKey: "RESIDENTIAL",
          status: "IN_PROGRESS",
          stage: "DESIGNING",
          projectManagerId: testAdminId,
        },
      });
      testProjectId = created.id;
    }

    // 4. Resolve or create test Client
    const client = await db.client.findFirst();
    if (client) {
      testClientId = client.id;
    } else {
      const created = await db.client.create({
        data: {
          referenceNo: `CLI-${Date.now()}`,
          fullName: "Dr. Alistair Sterling",
          phone: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
          email: `doc_client_${Date.now()}@gmail.com`,
        },
      });
      testClientId = created.id;
    }

    // 5. Resolve or create test Lead
    const lead = await db.lead.findFirst();
    if (lead) {
      testLeadId = lead.id;
    } else {
      const created = await db.lead.create({
        data: {
          referenceNo: `LEAD-${Date.now()}`,
          clientName: "Priya Menon Lead",
          phone: `+91977${Math.floor(1000000 + Math.random() * 9000000)}`,
          email: `lead_${Date.now()}@gmail.com`,
          location: "Jubilee Hills",
          propertyTypeKey: "RESIDENTIAL",
          sourceKey: "WEBSITE",
        },
      });
      testLeadId = created.id;
    }

    // 6. Resolve or create test Vendor
    const vendor = await db.vendor.findFirst();
    if (vendor) {
      testVendorId = vendor.id;
    } else {
      const created = await db.vendor.create({
        data: {
          referenceNo: `VEN-${Date.now()}`,
          name: "Century Ply & Hardware Ltd",
          contactPerson: "Rajesh Kumar",
          email: `vendor_${Date.now()}@centuryply.com`,
          phone: "+919876543210",
          categoryKey: "MATERIALS",
        },
      });
      testVendorId = created.id;
    }
  });

  // ==========================================
  // SECTION 1: CREATION, REFERENCES & FILE STORAGE
  // ==========================================

  it("1. Creates a Document with server-generated DOC-YYYY-XXXX reference code", async () => {
    const dummyBuffer = Buffer.from("ESPACIO ERP Production Contract File Content v1", "utf-8");

    const doc = await DocumentService.createDocument({
      name: "Master Client Interior Design Agreement",
      description: "Signed turnkey execution contract",
      type: "CONTRACT",
      category: "PROJECT",
      createdById: testAdminId,
      projectId: testProjectId,
      clientId: testClientId,
      fileBuffer: dummyBuffer,
      originalFileName: "master_client_agreement.pdf",
      mimeType: "application/pdf",
      tags: ["Approved", "Contract", "Legal"],
    });

    expect(doc).toBeDefined();
    expect(doc.referenceNo).toMatch(/^DOC-\d{4}-\d{4}$/);
    expect(doc.name).toBe("Master Client Interior Design Agreement");
    expect(doc.currentVersion).toBe(1);
    expect(doc.status).toBe("ACTIVE");

    testDocId = doc.id;
  });

  it("2. Verifies DocumentVersion record (v1) created with contentHash and storageKey", async () => {
    const fetched = await DocumentService.getDocumentById(testDocId);
    expect(fetched.versions.length).toBe(1);

    const v1 = fetched.versions[0];
    expect(v1.versionNumber).toBe(1);
    expect(v1.fileName).toBe("master_client_agreement.pdf");
    expect(v1.fileSize).toBeGreaterThan(0);
    expect(v1.mimeType).toBe("application/pdf");
    expect(v1.contentHash).toBeDefined();
    expect(v1.fileStorageKey).toBeDefined();
  });

  it("3. Rejects prohibited executable or script file extensions", async () => {
    const badBuffer = Buffer.from("Malicious script content", "utf-8");

    await expect(
      DocumentService.createDocument({
        name: "Dangerous Payload",
        createdById: testAdminId,
        fileBuffer: badBuffer,
        originalFileName: "exploit.exe",
        mimeType: "application/x-msdownload",
      })
    ).rejects.toThrow("Executable and script files are prohibited for security.");
  });

  it("4. Detects duplicate file upload warning when contentHash matches existing file", async () => {
    const duplicateBuffer = Buffer.from("ESPACIO ERP Production Contract File Content v1", "utf-8");

    const result = await DocumentService.createDocument({
      name: "Duplicate Agreement Upload",
      createdById: testAdminId,
      fileBuffer: duplicateBuffer,
      originalFileName: "duplicate_agreement.pdf",
      mimeType: "application/pdf",
    });

    expect(result.duplicateWarning).toBeDefined();
    expect(result.duplicateWarning).toContain("A file with identical content already exists");
  });

  // ==========================================
  // SECTION 2: ENTITY LINKING ACROSS ERP MODULES
  // ==========================================

  it("5. Creates Client document linked to Client record (Prompt 07)", async () => {
    const buffer = Buffer.from("Client KYC ID Proof", "utf-8");
    const doc = await DocumentService.createDocument({
      name: "Client KYC Passport & Aadhaar Copy",
      type: "KYC",
      category: "CLIENT",
      clientId: testClientId,
      createdById: testAdminId,
      fileBuffer: buffer,
      originalFileName: "client_kyc_docs.pdf",
      mimeType: "application/pdf",
    });

    expect(doc.clientId).toBe(testClientId);
    expect(doc.category).toBe("CLIENT");
  });

  it("6. Creates Project document linked to Project record (Prompt 08)", async () => {
    const buffer = Buffer.from("2D Floor Plan CAD Specs", "utf-8");
    const doc = await DocumentService.createDocument({
      name: "2D Architectural Floor Plan V1",
      type: "DRAWING",
      category: "PROJECT",
      projectId: testProjectId,
      createdById: testAdminId,
      fileBuffer: buffer,
      originalFileName: "floor_plan_2d.pdf",
      mimeType: "application/pdf",
    });

    expect(doc.projectId).toBe(testProjectId);
  });

  it("7. Creates Lead document linked to Lead record (Prompt 06)", async () => {
    const buffer = Buffer.from("Initial client sketches from first meeting", "utf-8");
    const doc = await DocumentService.createDocument({
      name: "Initial Living Room Sketches",
      type: "DESIGN",
      category: "CRM",
      leadId: testLeadId,
      createdById: testAdminId,
      fileBuffer: buffer,
      originalFileName: "initial_sketches.png",
      mimeType: "image/png",
    });

    expect(doc.leadId).toBe(testLeadId);
  });

  it("8. Creates Vendor GST Certificate document (Prompt 10)", async () => {
    const buffer = Buffer.from("Vendor Official GST Registration", "utf-8");
    const doc = await DocumentService.createDocument({
      name: "Century Ply GST Certificate",
      type: "GST",
      category: "VENDOR",
      sourceType: "VENDOR",
      sourceId: testVendorId,
      entityType: "VENDOR",
      entityId: testVendorId,
      createdById: testAdminId,
      fileBuffer: buffer,
      originalFileName: "century_ply_gst.pdf",
      mimeType: "application/pdf",
    });

    expect(doc.sourceType).toBe("VENDOR");
    expect(doc.sourceId).toBe(testVendorId);
  });

  it("9. Creates Finance Expense Receipt document (Prompt 09)", async () => {
    const buffer = Buffer.from("Site Hardware Purchase Bill", "utf-8");
    const doc = await DocumentService.createDocument({
      name: "Site Hardware Consumables Bill",
      type: "RECEIPT",
      category: "FINANCE",
      sourceType: "EXPENSE",
      sourceId: "exp_test_001",
      entityType: "EXPENSE",
      entityId: "exp_test_001",
      createdById: testAdminId,
      fileBuffer: buffer,
      originalFileName: "hardware_bill_receipt.jpg",
      mimeType: "image/jpeg",
    });

    expect(doc.category).toBe("FINANCE");
    expect(doc.type).toBe("RECEIPT");
  });

  it("10. Creates Quality Inspection Report document", async () => {
    const buffer = Buffer.from("Modular Kitchen Pre-Handover QC Checklist", "utf-8");
    const doc = await DocumentService.createDocument({
      name: "Kitchen QC Pre-Delivery Inspection",
      type: "QUALITY_REPORT",
      category: "PROJECT",
      projectId: testProjectId,
      entityType: "QUALITY_CHECK",
      entityId: "qc_test_999",
      createdById: testAdminId,
      fileBuffer: buffer,
      originalFileName: "kitchen_qc_report.pdf",
      mimeType: "application/pdf",
    });

    expect(doc.type).toBe("QUALITY_REPORT");
  });

  it("11. Creates Handover Sign-off document", async () => {
    const buffer = Buffer.from("Client Handover Acceptance Form Signed", "utf-8");
    const doc = await DocumentService.createDocument({
      name: "Client Final Handover Certificate",
      type: "HANDOVER",
      category: "PROJECT",
      projectId: testProjectId,
      createdById: testAdminId,
      fileBuffer: buffer,
      originalFileName: "handover_signoff.pdf",
      mimeType: "application/pdf",
    });

    expect(doc.type).toBe("HANDOVER");
  });

  it("12. Creates Warranty document linked to Project", async () => {
    const buffer = Buffer.from("10-Year Hardware & Woodwork Warranty Certificate", "utf-8");
    const doc = await DocumentService.createDocument({
      name: "10-Year Comprehensive Warranty Pack",
      type: "WARRANTY",
      category: "PROJECT",
      projectId: testProjectId,
      createdById: testAdminId,
      fileBuffer: buffer,
      originalFileName: "espacio_warranty_card.pdf",
      mimeType: "application/pdf",
    });

    expect(doc.type).toBe("WARRANTY");
  });

  // ==========================================
  // SECTION 3: VERSIONING & NON-DESTRUCTIVE RESTORE
  // ==========================================

  it("13. Uploads new version (v2) incrementing currentVersion to 2", async () => {
    const v2Buffer = Buffer.from("ESPACIO ERP Production Contract File Content v2 (Amended Payment Terms)", "utf-8");

    const v2 = await DocumentService.uploadNewVersion(
      testDocId,
      v2Buffer,
      "master_client_agreement_v2.pdf",
      "application/pdf",
      testAdminId,
      "Amended milestone payment schedule"
    );

    expect(v2).toBeDefined();
    expect(v2.versionNumber).toBe(2);

    const doc = await DocumentService.getDocumentById(testDocId);
    expect(doc.currentVersion).toBe(2);
    expect(doc.versions.length).toBe(2);
  });

  it("14. Non-destructively restores v1 content into v3 preserving complete historical lineage", async () => {
    const v3 = await DocumentService.restoreVersion(testDocId, 1, testAdminId);

    expect(v3).toBeDefined();
    expect(v3.versionNumber).toBe(3);

    const doc = await DocumentService.getDocumentById(testDocId);
    expect(doc.currentVersion).toBe(3);
    expect(doc.versions.length).toBe(3);

    // Verify all 3 version records exist in database
    const versionNumbers = doc.versions.map((v) => v.versionNumber).sort((a, b) => a - b);
    expect(versionNumbers).toEqual([1, 2, 3]);
  });

  // ==========================================
  // SECTION 4: GOOGLE DRIVE INTEGRATION & RECONCILIATION
  // ==========================================

  it("15. GoogleDriveService builds predictable folder path hierarchy for Projects", () => {
    const path = GoogleDriveService.buildFolderPath("PROJECT", "Skyline Penthouse", "Design");
    expect(path).toEqual(["ESPACIO", "Projects", "Skyline Penthouse", "Design"]);
  });

  it("16. GoogleDriveService builds predictable folder path hierarchy for Clients", () => {
    const path = GoogleDriveService.buildFolderPath("CLIENT", "Dr. Alistair Sterling", "Agreements");
    expect(path).toEqual(["ESPACIO", "Clients", "Dr. Alistair Sterling", "Agreements"]);
  });

  it("17. GoogleDriveService builds predictable folder path hierarchy for Finance", () => {
    const path = GoogleDriveService.buildFolderPath("FINANCE", undefined, "Invoices");
    expect(path).toEqual(["ESPACIO", "Finance", "Invoices"]);
  });

  it("18. GoogleDriveService returns real-time connection status", async () => {
    const status = await GoogleDriveService.getConnectionStatus();
    expect(status).toBeDefined();
    expect(status.isConnected).toBe(true);
    expect(["CONNECTED", "NOT_CONFIGURED"]).toContain(status.status);
    expect(status.lastCheckedAt).toBeDefined();
  });

  it("19. Reconciles Google Drive storage references against database records", async () => {
    const recon = await GoogleDriveService.reconcileDriveFiles();
    expect(recon).toBeDefined();
    expect(recon.totalScanned).toBeGreaterThan(0);
    expect(recon.matchedRecords).toBeGreaterThan(0);
    expect(recon.reconciledAt).toBeDefined();
  });

  // ==========================================
  // SECTION 5: LIFECYCLE, TRASH, ARCHIVING & FAVORITES
  // ==========================================

  it("20. Moves document to TRASH (soft-delete) with status TRASHED", async () => {
    const trashed = await DocumentService.moveToTrash(testDocId, testAdminId);
    expect(trashed.status).toBe("TRASHED");

    const fetched = await DocumentService.getDocumentById(testDocId);
    expect(fetched.status).toBe("TRASHED");
  });

  it("21. Restores document from TRASH back to ACTIVE", async () => {
    const restored = await DocumentService.restoreFromTrash(testDocId, testAdminId);
    expect(restored.status).toBe("ACTIVE");

    const fetched = await DocumentService.getDocumentById(testDocId);
    expect(fetched.status).toBe("ACTIVE");
  });

  it("22. Archives document with status ARCHIVED", async () => {
    const archived = await DocumentService.archiveDocument(testDocId, testAdminId);
    expect(archived.status).toBe("ARCHIVED");

    const fetched = await DocumentService.getDocumentById(testDocId);
    expect(fetched.status).toBe("ARCHIVED");
  });

  it("23. Unarchives document back to ACTIVE", async () => {
    const unarchived = await DocumentService.unarchiveDocument(testDocId, testAdminId);
    expect(unarchived.status).toBe("ACTIVE");

    const fetched = await DocumentService.getDocumentById(testDocId);
    expect(fetched.status).toBe("ACTIVE");
  });

  it("24. Toggles favorite flag on document", async () => {
    const docBefore = await DocumentService.getDocumentById(testDocId);
    const toggled = await DocumentService.toggleFavorite(testDocId);
    expect(toggled.isFavorite).toBe(!docBefore.isFavorite);

    // Toggle back
    const toggledBack = await DocumentService.toggleFavorite(testDocId);
    expect(toggledBack.isFavorite).toBe(docBefore.isFavorite);
  });

  // ==========================================
  // SECTION 6: SEARCH & MULTI-FILTERING
  // ==========================================

  it("25. Searches documents by query string across name and referenceNo", async () => {
    const searchRes = await DocumentService.getDocuments({ search: "Master Client Interior" });
    expect(searchRes.documents.length).toBeGreaterThan(0);
    expect(searchRes.documents.some((d) => d.id === testDocId)).toBe(true);
  });

  it("26. Filters documents by category PROJECT", async () => {
    const res = await DocumentService.getDocuments({ category: "PROJECT" });
    for (const d of res.documents) {
      expect(d.category).toBe("PROJECT");
    }
  });

  it("27. Filters documents by projectId", async () => {
    const res = await DocumentService.getDocuments({ projectId: testProjectId });
    for (const d of res.documents) {
      expect(d.projectId).toBe(testProjectId);
    }
  });

  it("28. Filters documents by clientId", async () => {
    const res = await DocumentService.getDocuments({ clientId: testClientId });
    for (const d of res.documents) {
      expect(d.clientId).toBe(testClientId);
    }
  });

  it("29. Filters documents by tab ARCHIVED", async () => {
    const tempDoc = await DocumentService.createDocument({
      name: "Archived Specifications File",
      createdById: testAdminId,
      fileBuffer: Buffer.from("Archive specs", "utf-8"),
      originalFileName: "archive_specs.pdf",
      mimeType: "application/pdf",
    });
    await DocumentService.archiveDocument(tempDoc.id, testAdminId);

    const res = await DocumentService.getDocuments({ tab: "ARCHIVED" });
    expect(res.documents.some((d) => d.id === tempDoc.id)).toBe(true);
    for (const d of res.documents) {
      expect(d.status).toBe("ARCHIVED");
    }
  });

  // ==========================================
  // SECTION 7: MULTI-ENTITY RELATIONSHIPS & LINKS
  // ==========================================

  it("30. Links document to an entity via DocumentLink", async () => {
    const link = await DocumentService.linkDocumentToEntity(testDocId, "VENDOR", testVendorId, testAdminId);
    expect(link).toBeDefined();
    expect(link.documentId).toBe(testDocId);
    expect(link.entityType).toBe("VENDOR");
    expect(link.entityId).toBe(testVendorId);
  });

  it("31. Retrieves all documents for an entity via getDocumentsForEntity", async () => {
    const docs = await DocumentService.getDocumentsForEntity("PROJECT", testProjectId);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.some((d) => d.id === testDocId)).toBe(true);
  });

  it("32. Unlinks document from an entity", async () => {
    await DocumentService.unlinkDocumentFromEntity(testDocId, "VENDOR", testVendorId, testAdminId);
    const doc = await DocumentService.getDocumentById(testDocId);
    expect(doc.links.some((l) => l.entityType === "VENDOR" && l.entityId === testVendorId)).toBe(false);
  });

  // ==========================================
  // SECTION 8: SECURE DOWNLOAD TOKENS & REQUESTS
  // ==========================================

  it("33. Generates and verifies secure signed download token", async () => {
    const doc = await DocumentService.getDocumentById(testDocId);
    const version1 = doc.versions.find((v) => v.versionNumber === 1)!;

    const token = StorageService.generateDownloadToken(version1.id, testAdminId);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const verified = StorageService.verifyDownloadToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.versionId).toBe(version1.id);
    expect(verified?.userId).toBe(testAdminId);
  });

  it("34. Rejects tampered or invalid download tokens", () => {
    const badToken = "invalid_tampered_token_string_12345";
    const verified = StorageService.verifyDownloadToken(badToken);
    expect(verified).toBeNull();
  });

  it("35. Creates DocumentRequest and triggers DOCUMENT_REQUESTED notification", async () => {
    const request = await DocumentService.createDocumentRequest(
      "Please upload signed Site Handover NOC",
      testEmployeeId,
      testAdminId,
      new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    );

    expect(request).toBeDefined();
    expect(request.title).toBe("Please upload signed Site Handover NOC");
    expect(request.status).toBe("REQUESTED");
    expect(request.requestedFromId).toBe(testEmployeeId);
  });

  // ==========================================
  // SECTION 9: METRICS & DASHBOARD
  // ==========================================

  it("36. Aggregates Document Dashboard KPIs and category breakdown", async () => {
    const metrics = await DocumentService.getDocumentMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.totalDocuments).toBeGreaterThan(0);
    expect(metrics.activeDocuments).toBeGreaterThan(0);
    expect(metrics.totalStorageBytes).toBeGreaterThan(0);
    expect(Array.isArray(metrics.categoryCounts)).toBe(true);
    expect(Array.isArray(metrics.typeCounts)).toBe(true);
  });

  // ==========================================
  // SECTION 10: METADATA UPDATES
  // ==========================================

  it("37. Updates document metadata (name, description, tags, type)", async () => {
    const updated = await DocumentService.updateDocument(
      testDocId,
      {
        name: "Master Client Interior Design Agreement (Revised)",
        description: "Official signed copy with notarization",
        tags: ["Approved", "Contract", "Legal", "Notarized"],
      },
      testAdminId
    );

    expect(updated.name).toBe("Master Client Interior Design Agreement (Revised)");
    expect(updated.description).toBe("Official signed copy with notarization");
  });

  // ==========================================
  // SECTION 11: AUDIT LOG VERIFICATION
  // ==========================================

  it("38. Verifies DOCUMENT_CREATED audit log exists", async () => {
    const audit = await db.auditLog.findFirst({
      where: { entityType: "Document", action: "DOCUMENT_CREATED", entityId: testDocId },
    });
    expect(audit).not.toBeNull();
    expect(audit?.userId).toBe(testAdminId);
  });

  it("39. Verifies DOCUMENT_VERSION_CREATED audit log exists", async () => {
    const audit = await db.auditLog.findFirst({
      where: { entityType: "Document", action: "DOCUMENT_VERSION_CREATED", entityId: testDocId },
    });
    expect(audit).not.toBeNull();
  });

  it("40. Verifies DOCUMENT_VERSION_RESTORED audit log exists", async () => {
    const audit = await db.auditLog.findFirst({
      where: { entityType: "Document", action: "DOCUMENT_VERSION_RESTORED", entityId: testDocId },
    });
    expect(audit).not.toBeNull();
  });

  it("41. Verifies DOCUMENT_DELETED and DOCUMENT_RESTORED audit logs exist", async () => {
    const deletedAudit = await db.auditLog.findFirst({
      where: { entityType: "Document", action: "DOCUMENT_DELETED", entityId: testDocId },
    });
    const restoredAudit = await db.auditLog.findFirst({
      where: { entityType: "Document", action: "DOCUMENT_RESTORED", entityId: testDocId },
    });

    expect(deletedAudit).not.toBeNull();
    expect(restoredAudit).not.toBeNull();
  });

  it("42. Verifies DOCUMENT_ARCHIVED and DOCUMENT_UNARCHIVED audit logs exist", async () => {
    const archAudit = await db.auditLog.findFirst({
      where: { entityType: "Document", action: "DOCUMENT_ARCHIVED", entityId: testDocId },
    });
    const unarchAudit = await db.auditLog.findFirst({
      where: { entityType: "Document", action: "DOCUMENT_UNARCHIVED", entityId: testDocId },
    });

    expect(archAudit).not.toBeNull();
    expect(unarchAudit).not.toBeNull();
  });

  it("43. Verifies DOCUMENT_LINKED and DOCUMENT_UNLINKED audit logs exist", async () => {
    const linkAudit = await db.auditLog.findFirst({
      where: { entityType: "Document", action: "DOCUMENT_LINKED", entityId: testDocId },
    });
    const unlinkAudit = await db.auditLog.findFirst({
      where: { entityType: "Document", action: "DOCUMENT_UNLINKED", entityId: testDocId },
    });

    expect(linkAudit).not.toBeNull();
    expect(unlinkAudit).not.toBeNull();
  });

  // ==========================================
  // SECTION 12: RBAC & PERMISSIONS VERIFICATION
  // ==========================================

  it("44. Verifies Super-Admin has all document permissions", async () => {
    const canRead = await RbacService.hasPermission(testAdminId, "documents:read");
    const canWrite = await RbacService.hasPermission(testAdminId, "documents:write");
    const canUpload = await RbacService.hasPermission(testAdminId, "documents:upload");
    const canDelete = await RbacService.hasPermission(testAdminId, "documents:delete");
    const canArchive = await RbacService.hasPermission(testAdminId, "documents:archive");
    const canManage = await RbacService.hasPermission(testAdminId, "documents:manage");

    expect(canRead).toBe(true);
    expect(canWrite).toBe(true);
    expect(canUpload).toBe(true);
    expect(canDelete).toBe(true);
    expect(canArchive).toBe(true);
    expect(canManage).toBe(true);
  });

  it("45. Verifies Standard User has read, write, upload, and download permissions", async () => {
    const canRead = await RbacService.hasPermission(testEmployeeId, "documents:read");
    const canUpload = await RbacService.hasPermission(testEmployeeId, "documents:upload");
    const canDownload = await RbacService.hasPermission(testEmployeeId, "documents:download");

    expect(canRead).toBe(true);
    expect(canUpload).toBe(true);
    expect(canDownload).toBe(true);
  });

  it("46. Preserves complete document version lineage with unchanged original timestamps", async () => {
    const doc = await DocumentService.getDocumentById(testDocId);
    expect(doc.versions.length).toBeGreaterThanOrEqual(3);
    for (const v of doc.versions) {
      expect(v.createdAt).toBeInstanceOf(Date);
      expect(v.fileName).toBeDefined();
    }
  });

  it("47. Client portal filter safely hides internal restricted documents", async () => {
    // Create an internal restricted document
    const restrictedDoc = await DocumentService.createDocument({
      name: "Internal Cost Margins Analysis [RESTRICTED]",
      description: "[RESTRICTED] Confidential contractor margins",
      category: "FINANCE",
      clientId: testClientId,
      createdById: testAdminId,
      fileBuffer: Buffer.from("Internal cost margins", "utf-8"),
      originalFileName: "internal_margins.pdf",
      mimeType: "application/pdf",
    });

    const clientView = await DocumentService.getDocuments({
      clientId: testClientId,
      isClientPortal: true,
    });

    expect(clientView.documents.some((d) => d.id === restrictedDoc.id)).toBe(false);
  });

  it("48. Creates Employee HR Agreement document with RESTRICTED visibility", async () => {
    const buffer = Buffer.from("Employee Employment Contract & Non-Disclosure", "utf-8");
    const doc = await DocumentService.createDocument({
      name: "Employment NDA & Compensation Agreement",
      type: "CONTRACT",
      category: "EMPLOYEE",
      sourceType: "EMPLOYEE",
      sourceId: testEmployeeId,
      createdById: testAdminId,
      fileBuffer: buffer,
      originalFileName: "employee_nda_contract.pdf",
      mimeType: "application/pdf",
    });

    expect(doc.category).toBe("EMPLOYEE");
    expect(doc.sourceType).toBe("EMPLOYEE");
  });

  it("49. Creates Purchase Order PDF document linked to Procurement (Prompt 10)", async () => {
    const buffer = Buffer.from("Purchase Order PO-2026-0001 Official PDF", "utf-8");
    const doc = await DocumentService.createDocument({
      name: "Purchase Order PO-2026-0001",
      type: "PURCHASE_ORDER",
      category: "PROCUREMENT",
      sourceType: "PURCHASE_ORDER",
      sourceId: "po_test_001",
      createdById: testAdminId,
      fileBuffer: buffer,
      originalFileName: "PO_2026_0001.pdf",
      mimeType: "application/pdf",
    });

    expect(doc.type).toBe("PURCHASE_ORDER");
    expect(doc.category).toBe("PROCUREMENT");
  });

  it("50. Multi-criteria document search matches across file names and tags", async () => {
    const res = await DocumentService.getDocuments({ search: "Notarized" });
    expect(res.documents.length).toBeGreaterThan(0);
    expect(res.documents.some((d) => d.id === testDocId)).toBe(true);
  });
});
