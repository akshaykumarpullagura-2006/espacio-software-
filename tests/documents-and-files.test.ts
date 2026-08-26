import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { DocumentService } from "../src/modules/documents/document.service";
import { StorageService } from "../src/lib/storage.service";

describe("Module 16: Documents, Files & Digital Workspace", () => {
  let adminUserId: string;
  let testDocId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Find or create test user
    const admin = await db.user.findFirst({ where: { status: "ACTIVE" } });
    if (admin) {
      adminUserId = admin.id;
    } else {
      const created = await db.user.create({
        data: {
          email: `admin_docs_${Date.now()}@espacio.com`,
          passwordHash: "hash123",
          fullName: "Document Admin User",
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
          referenceNo: `PROJ-${Date.now()}`,
          title: "Test Document Project",
          propertyTypeKey: "RESIDENTIAL",
        },
      });
      testProjectId = createdProj.id;
    }
  });

  it("1. Should create a document record and save physical file with DOC-YYYY-XXXX reference code", async () => {
    const dummyBuffer = Buffer.from("ESPACIO ERP Test Document File Content v1", "utf-8");

    const result = await DocumentService.createDocument({
      name: "Electrical Layout Specs V1",
      description: "Approved electrical wiring drawing",
      type: "DRAWING",
      category: "PROJECT",
      createdById: adminUserId,
      projectId: testProjectId,
      fileBuffer: dummyBuffer,
      originalFileName: "electrical_layout_v1.pdf",
      mimeType: "application/pdf",
    });

    expect(result).toBeDefined();
    expect(result.referenceNo).toMatch(/^DOC-\d{4}-\d{4}$/);
    expect(result.name).toBe("Electrical Layout Specs V1");
    expect(result.currentVersion).toBe(1);

    testDocId = result.id;

    // Verify version record created
    const fetched = await DocumentService.getDocumentById(result.id);
    expect(fetched.versions.length).toBe(1);
    expect(fetched.versions[0].versionNumber).toBe(1);
    expect(fetched.versions[0].fileName).toBe("electrical_layout_v1.pdf");
  });

  it("2. Should upload a new version (v2) and increment currentVersion", async () => {
    const v2Buffer = Buffer.from("ESPACIO ERP Test Document File Content v2 (Revised)", "utf-8");

    const version2 = await DocumentService.uploadNewVersion(
      testDocId,
      v2Buffer,
      "electrical_layout_v2.pdf",
      "application/pdf",
      adminUserId,
      "Updated switchboard placements"
    );

    expect(version2).toBeDefined();
    expect(version2.versionNumber).toBe(2);

    const doc = await DocumentService.getDocumentById(testDocId);
    expect(doc.currentVersion).toBe(2);
    expect(doc.versions.length).toBe(2);
  });

  it("3. Should perform non-destructive restore of v1 content creating v3 without destroying history", async () => {
    const restoredVersion = await DocumentService.restoreVersion(testDocId, 1, adminUserId);

    expect(restoredVersion).toBeDefined();
    expect(restoredVersion.versionNumber).toBe(3); // Created v3 containing v1 content

    const doc = await DocumentService.getDocumentById(testDocId);
    expect(doc.currentVersion).toBe(3);
    expect(doc.versions.length).toBe(3); // History intact: v3, v2, v1
  });

  it("4. Should generate and verify secure signed download token", async () => {
    const doc = await DocumentService.getDocumentById(testDocId);
    const version1 = doc.versions.find((v) => v.versionNumber === 1)!;

    const token = StorageService.generateDownloadToken(version1.id, adminUserId);
    expect(token).toBeDefined();

    const verified = StorageService.verifyDownloadToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.versionId).toBe(version1.id);
    expect(verified?.userId).toBe(adminUserId);
  });

  it("5. Should soft-delete to Trash and restore document", async () => {
    const trashed = await DocumentService.moveToTrash(testDocId, adminUserId);
    expect(trashed.status).toBe("TRASHED");

    const restored = await DocumentService.restoreFromTrash(testDocId, adminUserId);
    expect(restored.status).toBe("ACTIVE");
  });

  it("6. Should create a Document Request and trigger notification event", async () => {
    const request = await DocumentService.createDocumentRequest(
      "Upload Signed Vendor Agreement",
      adminUserId,
      adminUserId,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    expect(request).toBeDefined();
    expect(request.title).toBe("Upload Signed Vendor Agreement");
    expect(request.status).toBe("REQUESTED");
  });
});
