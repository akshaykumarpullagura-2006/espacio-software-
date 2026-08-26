import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import { AuditService } from "../audit/audit.service";
import { SettingsService } from "./settings.service";
import { GoogleDriveService } from "../documents/google-drive.service";

export type IntegrationStatus = "CONNECTED" | "DISCONNECTED" | "NOT_CONFIGURED" | "ERROR";

export interface GoogleDriveConfigView {
  status: IntegrationStatus;
  provider: "GOOGLE_DRIVE" | "LOCAL_DISK";
  rootFolderId: string;
  connectedAccount: string;
  lastSyncAt: string | null;
  lastErrorMessage: string | null;
  hasCredentialsConfigured: boolean;
}

export interface EmailIntegrationConfigView {
  status: IntegrationStatus;
  senderName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  isConfigured: boolean;
}

export interface UpdateGoogleDriveConfigInput {
  rootFolderId?: string;
  enabled?: boolean;
}

export class IntegrationsService {
  /**
   * Get Google Drive integration configuration and status (Zero secrets exposed)
   */
  public static async getGoogleDriveConfig(): Promise<GoogleDriveConfigView> {
    const raw = await SettingsService.get("integrations.google_drive", "");
    const driveStatus = await GoogleDriveService.getSyncStatus();

    let rootFolderId = "espacio-erp-root";
    let lastSyncAt: string | null = null;
    let lastErrorMessage: string | null = null;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        rootFolderId = parsed.rootFolderId || rootFolderId;
        lastSyncAt = parsed.lastSyncAt || null;
        lastErrorMessage = parsed.lastErrorMessage || null;
      } catch {
        // fallback
      }
    }

    const hasCreds = !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_DRIVE_CLIENT_ID);
    const status: IntegrationStatus = driveStatus.isConfigured ? "CONNECTED" : (hasCreds ? "DISCONNECTED" : "NOT_CONFIGURED");

    return {
      status,
      provider: driveStatus.isConfigured ? "GOOGLE_DRIVE" : "LOCAL_DISK",
      rootFolderId,
      connectedAccount: hasCreds ? "service-account@espacio-erp.iam.gserviceaccount.com" : "Not connected",
      lastSyncAt: driveStatus.lastSyncTimestamp ? driveStatus.lastSyncTimestamp.toISOString() : lastSyncAt,
      lastErrorMessage,
      hasCredentialsConfigured: hasCreds,
    };
  }

  /**
   * Update Google Drive settings
   */
  public static async updateGoogleDriveConfig(input: UpdateGoogleDriveConfigInput, actorId?: string): Promise<GoogleDriveConfigView> {
    const existing = await this.getGoogleDriveConfig();

    const updated = {
      rootFolderId: input.rootFolderId !== undefined ? input.rootFolderId : existing.rootFolderId,
      lastSyncAt: existing.lastSyncAt,
      lastErrorMessage: existing.lastErrorMessage,
    };

    await SettingsService.set(
      "integrations.google_drive",
      JSON.stringify(updated),
      "INTEGRATIONS",
      "Google Drive Workspace & Root Folder Configuration",
      actorId
    );

    await AuditService.logEvent({
      userId: actorId,
      action: "INTEGRATION_SETTINGS_UPDATED",
      entityType: "Integration",
      entityId: "google_drive",
      newValues: { rootFolderId: updated.rootFolderId },
    });

    return this.getGoogleDriveConfig();
  }

  /**
   * Test Connection to Google Drive integration
   */
  public static async testGoogleDriveConnection(actorId?: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      const status = await GoogleDriveService.getSyncStatus();
      const latencyMs = Date.now() - start;

      if (status.isConfigured) {
        return {
          success: true,
          message: "Google Drive API successfully reachable. Cloud folder connected.",
          latencyMs,
        };
      } else {
        return {
          success: false,
          message: "Google Drive credentials not detected in server environment. Operating on Local Disk Storage.",
          latencyMs,
        };
      }
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        success: false,
        message: err.message || "Failed to communicate with Google Drive service",
        latencyMs,
      };
    }
  }

  /**
   * Get Email Integration configuration (Zero SMTP passwords exposed)
   */
  public static async getEmailConfig(): Promise<EmailIntegrationConfigView> {
    const raw = await SettingsService.get("integrations.email", "");
    let senderName = "ESPACIO ERP Notifications";
    let senderEmail = "notifications@espacio.com";
    let smtpHost = "smtp.mailgun.org";
    let smtpPort = 587;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        senderName = parsed.senderName || senderName;
        senderEmail = parsed.senderEmail || senderEmail;
        smtpHost = parsed.smtpHost || smtpHost;
        smtpPort = parsed.smtpPort || smtpPort;
      } catch {
        // fallback
      }
    }

    const isConfigured = !!(process.env.SMTP_HOST || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);

    return {
      status: isConfigured ? "CONNECTED" : "NOT_CONFIGURED",
      senderName,
      senderEmail,
      smtpHost,
      smtpPort,
      isConfigured,
    };
  }

  /**
   * Update Email Integration configuration
   */
  public static async updateEmailConfig(
    input: { senderName?: string; senderEmail?: string; smtpHost?: string; smtpPort?: number },
    actorId?: string
  ): Promise<EmailIntegrationConfigView> {
    if (input.senderEmail && !input.senderEmail.includes("@")) {
      throw new ValidationError("Invalid sender email address");
    }

    const existing = await this.getEmailConfig();
    const updated = {
      senderName: input.senderName || existing.senderName,
      senderEmail: input.senderEmail || existing.senderEmail,
      smtpHost: input.smtpHost || existing.smtpHost,
      smtpPort: input.smtpPort || existing.smtpPort,
    };

    await SettingsService.set(
      "integrations.email",
      JSON.stringify(updated),
      "INTEGRATIONS",
      "Transactional Email Service Settings",
      actorId
    );

    await AuditService.logEvent({
      userId: actorId,
      action: "INTEGRATION_SETTINGS_UPDATED",
      entityType: "Integration",
      entityId: "email",
      newValues: { senderName: updated.senderName, senderEmail: updated.senderEmail, smtpHost: updated.smtpHost },
    });

    return this.getEmailConfig();
  }
}
