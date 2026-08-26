import { NextRequest } from "next/server";
import { StorageService } from "@/lib/storage.service";
import { db } from "@/lib/db";
import { AuditService } from "@/modules/audit/audit.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: versionId } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return new Response("Unauthorized download request: token missing", { status: 401 });
    }

    const verification = StorageService.verifyDownloadToken(token);
    if (!verification || verification.versionId !== versionId) {
      return new Response("Unauthorized download request: invalid or expired token", { status: 403 });
    }

    const version = await db.documentVersion.findUnique({
      where: { id: versionId },
      include: { document: true },
    });

    if (!version) {
      return new Response("Requested file version not found", { status: 404 });
    }

    const fileBuffer = await StorageService.getFileBuffer(version.fileStorageKey);

    // Audit download
    await AuditService.logEvent({
      userId: verification.userId,
      action: "DOCUMENT_DOWNLOADED",
      entityType: "DocumentVersion",
      entityId: versionId,
      newValues: { fileName: version.fileName, fileSize: version.fileSize },
    });

    const isInlinePreview = searchParams.get("inline") === "true";
    const disposition = isInlinePreview
      ? `inline; filename="${version.fileName}"`
      : `attachment; filename="${version.fileName}"`;

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": version.mimeType || "application/octet-stream",
        "Content-Disposition": disposition,
        "Content-Length": version.fileSize.toString(),
      },
    });
  } catch (err: any) {
    return new Response(err.message || "Internal server error during download", { status: 500 });
  }
}
