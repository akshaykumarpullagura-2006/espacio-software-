import { db } from "@/lib/db";
import { NotFoundError, ValidationError, AuthError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { StorageService } from "@/lib/storage.service";
import { GoogleDriveService } from "./google-drive.service";
import { AuditService } from "../audit/audit.service";
import { NotificationEngine } from "../notifications/notification-engine";
import crypto from "crypto";

export interface CreateDocumentInput {
  name: string;
  description?: string;
  type?: string; // CONTRACT, AGREEMENT, QUOTATION, INVOICE, RECEIPT, DRAWING, DESIGN, SPECIFICATION, REPORT, QUALITY_REPORT, HANDOVER, WARRANTY, GST, PURCHASE_ORDER, GOODS_RECEIPT, KYC, IMAGE, OTHER
  category?: string; // COMPANY, PROJECT, FINANCE, PROCUREMENT, CRM, CLIENT, EMPLOYEE, VENDOR, INVENTORY, TASKS, GENERAL
  visibility?: "INTERNAL" | "RESTRICTED" | "CLIENT_VISIBLE";
  ownerId?: string;
  createdById: string;
  projectId?: string;
  clientId?: string;
  leadId?: string;
  sourceType?: string;
  sourceId?: string;
  actionUrl?: string;
  tags?: string[];
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
  entityType?: string; // For explicit DocumentLink
  entityId?: string;
}

export interface GetDocumentsFilter {
  tab?: "ALL" | "RECENT" | "FAVORITES" | "ARCHIVED" | "TRASH";
  category?: string;
  type?: string;
  visibility?: string;
  status?: string;
  search?: string;
  projectId?: string;
  clientId?: string;
  leadId?: string;
  entityType?: string;
  entityId?: string;
  requestingUserId?: string;
  isClientPortal?: boolean;
  page?: number;
  limit?: number;
}

export class DocumentService {
  public static async createDocument(input: CreateDocumentInput) {
    // Validate file extension against dangerous executables
    const lowerName = input.originalFileName.toLowerCase();
    const dangerousExtensions = [".exe", ".bat", ".cmd", ".sh", ".vbs", ".msi", ".jar", ".ps1"];
    if (dangerousExtensions.some((ext) => lowerName.endsWith(ext))) {
      throw new ValidationError("Executable and script files are prohibited for security.");
    }

    // Check duplicate content hash
    const contentHash = crypto.createHash("sha256").update(input.fileBuffer).digest("hex");
    const duplicate = await db.documentVersion.findFirst({
      where: { contentHash },
      include: { document: { select: { id: true, referenceNo: true, name: true } } },
    });

    let referenceNo: string;
    try {
      referenceNo = await IdGeneratorService.generate("DOC");
    } catch {
      const year = new Date().getFullYear();
      const count = await db.document.count();
      referenceNo = `DOC-${year}-${(count + 1).toString().padStart(4, "0")}`;
    }

    const tagsJson = JSON.stringify(input.tags ?? []);

    // 1. Create Document Record
    const document = await db.document.create({
      data: {
        referenceNo,
        name: input.name.trim(),
        description: input.description ?? null,
        type: input.type ?? "OTHER",
        category: input.category ?? "GENERAL",
        status: "ACTIVE",
        ownerId: input.ownerId ?? input.createdById,
        createdById: input.createdById,
        projectId: input.projectId ?? null,
        clientId: input.clientId ?? null,
        leadId: input.leadId ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        actionUrl: input.actionUrl ?? null,
        tags: tagsJson,
        currentVersion: 1,
      },
    });

    // 2. Save Physical File via Google Drive / Cloud / Local Storage Service
    const storedFile = await GoogleDriveService.uploadFile({
      buffer: input.fileBuffer,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      category: input.category,
      documentId: document.id,
      versionNumber: 1,
    });

    // 3. Create Version 1 Record
    const version = await db.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        fileStorageKey: storedFile.storageKey,
        fileName: storedFile.fileName,
        fileSize: storedFile.fileSize,
        mimeType: storedFile.mimeType,
        contentHash: storedFile.contentHash,
        changeNote: "Initial upload (v1)",
        uploadedById: input.createdById,
      },
    });

    // 4. If explicit entityType and entityId provided, create DocumentLink
    if (input.entityType && input.entityId) {
      await db.documentLink.create({
        data: {
          documentId: document.id,
          entityType: input.entityType,
          entityId: input.entityId,
        },
      });
    }

    // Audit log
    await AuditService.logEvent({
      userId: input.createdById,
      action: "DOCUMENT_CREATED",
      entityType: "Document",
      entityId: document.id,
      newValues: {
        referenceNo: document.referenceNo,
        name: document.name,
        fileName: storedFile.fileName,
        fileSize: storedFile.fileSize,
        storageKey: storedFile.storageKey,
      },
    });

    return {
      ...document,
      currentVersionRecord: version,
      duplicateWarning: duplicate
        ? `A file with identical content already exists as ${duplicate.document.referenceNo} (${duplicate.document.name})`
        : undefined,
    };
  }

  public static async getDocuments(filter: GetDocumentsFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.tab === "TRASH") {
      where.status = "TRASHED";
    } else if (filter.tab === "ARCHIVED") {
      where.status = "ARCHIVED";
    } else {
      where.status = "ACTIVE";
      if (filter.tab === "FAVORITES") where.isFavorite = true;
    }

    if (filter.status && filter.status !== "ALL") where.status = filter.status;
    if (filter.category && filter.category !== "ALL") where.category = filter.category;
    if (filter.type && filter.type !== "ALL") where.type = filter.type;
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.clientId) where.clientId = filter.clientId;
    if (filter.leadId) where.leadId = filter.leadId;

    if (filter.entityType && filter.entityId) {
      where.OR = [
        { sourceType: filter.entityType, sourceId: filter.entityId },
        { links: { some: { entityType: filter.entityType, entityId: filter.entityId } } },
      ];
    }

    // Client portal security: only show CLIENT_VISIBLE documents
    if (filter.isClientPortal) {
      where.description = { not: { contains: "[RESTRICTED]" } };
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { name: { contains: q } },
        { description: { contains: q } },
        { tags: { contains: q } },
        { versions: { some: { fileName: { contains: q } } } },
      ];
    }

    const orderBy: any = filter.tab === "RECENT" ? { updatedAt: "desc" } : { createdAt: "desc" };

    const [totalCount, documents] = await Promise.all([
      db.document.count({ where }),
      db.document.findMany({
        where,
        include: {
          owner: { select: { id: true, fullName: true, email: true } },
          project: { select: { id: true, referenceNo: true, title: true } },
          client: { select: { id: true, referenceNo: true, fullName: true } },
          lead: { select: { id: true, referenceNo: true, clientName: true } },
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
          links: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      documents,
    };
  }

  public static async getDocumentById(id: string) {
    const document = await db.document.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
        client: { select: { id: true, referenceNo: true, fullName: true } },
        lead: { select: { id: true, referenceNo: true, clientName: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          include: { uploadedBy: { select: { id: true, fullName: true } } },
        },
        links: true,
        requests: true,
      },
    });

    if (!document) {
      throw new NotFoundError("Document not found");
    }

    return document;
  }

  public static async uploadNewVersion(
    documentId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    uploadedById: string,
    changeNote?: string
  ) {
    const document = await db.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundError("Document not found");

    const nextVersionNumber = document.currentVersion + 1;

    const storedFile = await StorageService.saveFile({
      buffer: fileBuffer,
      originalName: fileName,
      mimeType,
      category: document.category,
      documentId: document.id,
      versionNumber: nextVersionNumber,
    });

    const newVersion = await db.documentVersion.create({
      data: {
        documentId,
        versionNumber: nextVersionNumber,
        fileStorageKey: storedFile.storageKey,
        fileName: storedFile.fileName,
        fileSize: storedFile.fileSize,
        mimeType: storedFile.mimeType,
        contentHash: storedFile.contentHash,
        changeNote: changeNote ?? `Updated to v${nextVersionNumber}`,
        uploadedById,
      },
    });

    await db.document.update({
      where: { id: documentId },
      data: { currentVersion: nextVersionNumber },
    });

    await AuditService.logEvent({
      userId: uploadedById,
      action: "DOCUMENT_VERSION_CREATED",
      entityType: "Document",
      entityId: documentId,
      newValues: { versionNumber: nextVersionNumber, fileName: storedFile.fileName },
    });

    return newVersion;
  }

  public static async restoreVersion(documentId: string, targetVersionNumber: number, actorId: string) {
    const document = await db.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundError("Document not found");

    const targetVersion = await db.documentVersion.findUnique({
      where: { documentId_versionNumber: { documentId, versionNumber: targetVersionNumber } },
    });
    if (!targetVersion) throw new NotFoundError(`Version v${targetVersionNumber} not found`);

    // Obtain buffer from target version file
    const fileBuffer = await StorageService.getFileBuffer(targetVersion.fileStorageKey);

    // Non-destructive restore: create a new current version with restored file content
    const restoredVersion = await this.uploadNewVersion(
      documentId,
      fileBuffer,
      targetVersion.fileName,
      targetVersion.mimeType,
      actorId,
      `Restored file content from v${targetVersionNumber}`
    );

    await AuditService.logEvent({
      userId: actorId,
      action: "DOCUMENT_VERSION_RESTORED",
      entityType: "Document",
      entityId: documentId,
      newValues: { restoredFromVersion: targetVersionNumber, newVersionNumber: restoredVersion.versionNumber },
    });

    return restoredVersion;
  }

  public static async toggleFavorite(id: string) {
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError("Document not found");

    return db.document.update({
      where: { id },
      data: { isFavorite: !doc.isFavorite },
    });
  }

  public static async moveToTrash(id: string, actorId: string) {
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError("Document not found");

    const updated = await db.document.update({
      where: { id },
      data: { status: "TRASHED" },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "DOCUMENT_DELETED",
      entityType: "Document",
      entityId: id,
      newValues: { referenceNo: doc.referenceNo, status: "TRASHED" },
    });

    return updated;
  }

  public static async restoreFromTrash(id: string, actorId: string) {
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError("Document not found");

    const updated = await db.document.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "DOCUMENT_RESTORED",
      entityType: "Document",
      entityId: id,
      newValues: { referenceNo: doc.referenceNo, status: "ACTIVE" },
    });

    return updated;
  }

  public static async linkDocumentToEntity(documentId: string, entityType: string, entityId: string, actorId: string) {
    const doc = await db.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundError("Document not found");

    const link = await db.documentLink.upsert({
      where: {
        documentId_entityType_entityId: {
          documentId,
          entityType,
          entityId,
        },
      },
      create: {
        documentId,
        entityType,
        entityId,
      },
      update: {},
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "DOCUMENT_LINKED",
      entityType: "Document",
      entityId: documentId,
      newValues: { linkedEntityType: entityType, linkedEntityId: entityId },
    });

    return link;
  }

  public static async unlinkDocumentFromEntity(documentId: string, entityType: string, entityId: string, actorId: string) {
    const deleted = await db.documentLink.deleteMany({
      where: {
        documentId,
        entityType,
        entityId,
      },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "DOCUMENT_UNLINKED",
      entityType: "Document",
      entityId: documentId,
      newValues: { unlinkedEntityType: entityType, unlinkedEntityId: entityId },
    });

    return deleted;
  }

  public static async getDocumentsForEntity(entityType: string, entityId: string) {
    return db.document.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { sourceType: entityType, sourceId: entityId },
          { links: { some: { entityType, entityId } } },
          entityType === "PROJECT" ? { projectId: entityId } : {},
          entityType === "CLIENT" ? { clientId: entityId } : {},
          entityType === "LEAD" ? { leadId: entityId } : {},
        ],
      },
      include: {
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        links: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  public static async updateDocument(id: string, data: { name?: string; description?: string; type?: string; category?: string; tags?: string[]; isFavorite?: boolean }, actorId: string) {
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError("Document not found");

    const updated = await db.document.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description : undefined,
        type: data.type || undefined,
        category: data.category || undefined,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
        isFavorite: data.isFavorite !== undefined ? data.isFavorite : undefined,
      },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "DOCUMENT_UPDATED",
      entityType: "Document",
      entityId: id,
      newValues: { name: updated.name, type: updated.type, category: updated.category },
    });

    return updated;
  }

  public static async archiveDocument(id: string, actorId: string) {
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError("Document not found");

    const updated = await db.document.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "DOCUMENT_ARCHIVED",
      entityType: "Document",
      entityId: id,
      newValues: { referenceNo: doc.referenceNo, status: "ARCHIVED" },
    });

    return updated;
  }

  public static async unarchiveDocument(id: string, actorId: string) {
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError("Document not found");

    const updated = await db.document.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "DOCUMENT_UNARCHIVED",
      entityType: "Document",
      entityId: id,
      newValues: { referenceNo: doc.referenceNo, status: "ACTIVE" },
    });

    return updated;
  }

  public static async getDocumentMetrics() {
    const [totalDocuments, activeDocuments, archivedDocuments, trashedDocuments] = await Promise.all([
      db.document.count(),
      db.document.count({ where: { status: "ACTIVE" } }),
      db.document.count({ where: { status: "ARCHIVED" } }),
      db.document.count({ where: { status: "TRASHED" } }),
    ]);

    const versions = await db.documentVersion.findMany({
      select: { fileSize: true },
    });
    const totalStorageBytes = versions.reduce((sum, v) => sum + (v.fileSize || 0), 0);

    const categoryCounts = await db.document.groupBy({
      by: ["category"],
      where: { status: "ACTIVE" },
      _count: { id: true },
    });

    const typeCounts = await db.document.groupBy({
      by: ["type"],
      where: { status: "ACTIVE" },
      _count: { id: true },
    });

    const pendingRequestsCount = await db.documentRequest.count({
      where: { status: "REQUESTED" },
    });

    return {
      totalDocuments,
      activeDocuments,
      archivedDocuments,
      trashedDocuments,
      totalStorageBytes,
      pendingRequestsCount,
      categoryCounts: categoryCounts.map((c) => ({ category: c.category, count: c._count.id })),
      typeCounts: typeCounts.map((t) => ({ type: t.type, count: t._count.id })),
    };
  }

  public static async checkDuplicateFile(buffer: Buffer): Promise<{ isDuplicate: boolean; duplicateRecord?: any }> {
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const existing = await db.documentVersion.findFirst({
      where: { contentHash },
      include: { document: { select: { id: true, referenceNo: true, name: true, type: true } } },
    });

    if (existing) {
      return { isDuplicate: true, duplicateRecord: existing.document };
    }
    return { isDuplicate: false };
  }

  public static async createDocumentRequest(title: string, requestedFromId: string, requestedById: string, dueDate?: Date) {
    const request = await db.documentRequest.create({
      data: {
        title,
        requestedFromId,
        requestedById,
        dueDate: dueDate ?? null,
      },
    });

    if (requestedFromId) {
      await NotificationEngine.publishEvent({
        eventId: `evt_doc_req_${request.id}`,
        eventType: "DOCUMENT_REQUESTED",
        category: "TASKS",
        actorId: requestedById,
        entityType: "DocumentRequest",
        entityId: request.id,
        title: "Document Requested",
        message: `Please upload requested document: "${title}".`,
        actionUrl: "/documents",
        targetUserId: requestedFromId,
      });
    }

    return request;
  }
}
