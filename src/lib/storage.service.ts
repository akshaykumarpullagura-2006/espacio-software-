import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface UploadFileOptions {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  category?: string;
  documentId?: string;
  versionNumber?: number;
}

export interface StoredFileResult {
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  contentHash: string;
}

const STORAGE_SECRET = process.env.STORAGE_SECRET || "espacio_erp_storage_secret_key_2026";
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export class StorageService {
  private static ensureUploadDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  public static async saveFile(options: UploadFileOptions): Promise<StoredFileResult> {
    const { buffer, originalName, mimeType, category = "general", documentId = "doc", versionNumber = 1 } = options;

    // Sanitize filename
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const fileSize = buffer.length;

    // Relative storage key
    const relativeKey = `${category}/${documentId}/v${versionNumber}_${sanitizedName}`;
    const absolutePath = path.join(UPLOAD_DIR, relativeKey);

    this.ensureUploadDir(path.dirname(absolutePath));
    fs.writeFileSync(absolutePath, buffer);

    return {
      storageKey: relativeKey,
      fileName: sanitizedName,
      fileSize,
      mimeType,
      contentHash,
    };
  }

  public static async getFileBuffer(storageKey: string): Promise<Buffer> {
    const absolutePath = path.join(UPLOAD_DIR, storageKey);
    if (!fs.existsSync(absolutePath)) {
      throw new Error("File not found on storage provider");
    }
    return fs.readFileSync(absolutePath);
  }

  public static async deleteFile(storageKey: string): Promise<void> {
    const absolutePath = path.join(UPLOAD_DIR, storageKey);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }

  public static generateDownloadToken(versionId: string, userId: string): string {
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    const payload = `${versionId}:${userId}:${expiresAt}`;
    const signature = crypto.createHmac("sha256", STORAGE_SECRET).update(payload).digest("hex");
    return Buffer.from(`${payload}:${signature}`).toString("base64url");
  }

  public static verifyDownloadToken(token: string): { versionId: string; userId: string } | null {
    try {
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const parts = decoded.split(":");
      if (parts.length !== 4) return null;

      const [versionId, userId, expiresAtStr, signature] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);

      if (Date.now() > expiresAt) return null;

      const payload = `${versionId}:${userId}:${expiresAtStr}`;
      const expectedSignature = crypto.createHmac("sha256", STORAGE_SECRET).update(payload).digest("hex");

      if (signature !== expectedSignature) return null;

      return { versionId, userId };
    } catch {
      return null;
    }
  }
}
