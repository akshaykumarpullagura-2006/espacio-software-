import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface SendEmailOptions {
  eventType: string; // e.g. LEAD_FOLLOWUP, PROJECT_DELAY, PAYMENT_DUE, PAYMENT_OVERDUE, QUOTATION_APPROVAL, PO_APPROVAL, VENDOR_PAYMENT, REPORT_READY, SYSTEM_ALERT
  recipientEmail: string;
  recipientId?: string;
  variables: Record<string, string | number | boolean | null | undefined>;
}

export class EmailService {
  public static parseTemplateVariables(
    str: string,
    vars: Record<string, string | number | boolean | null | undefined>
  ): string {
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = vars[key];
      return val !== undefined && val !== null ? String(val) : "";
    });
  }

  public static async getOrCreateTemplate(eventType: string) {
    let template = await db.emailTemplate.findUnique({ where: { eventType } });

    if (!template) {
      const defaults: Record<string, { name: string; subject: string; body: string }> = {
        LEAD_FOLLOWUP: {
          name: "Lead Follow-up Reminder",
          subject: "Follow-up Reminder: {{clientName}}",
          body: "Hello {{userName}},\n\nReminder to follow up with {{clientName}} regarding Requirement: {{requirement}}.\nDue Date: {{dueDate}}.",
        },
        PROJECT_DELAY: {
          name: "Project Delay Alert",
          subject: "Project Delayed: {{projectName}} ({{projectNumber}})",
          body: "Hello {{userName}},\n\nProject {{projectName}} (Ref: {{projectNumber}}) is delayed at Stage: {{stage}}. Please inspect milestone schedule.",
        },
        PAYMENT_DUE: {
          name: "Client Payment Due Notice",
          subject: "Payment Notice: {{projectName}} - {{amount}}",
          body: "Dear {{clientName}},\n\nPayment of {{amount}} for Project {{projectName}} is due on {{dueDate}}.",
        },
        PAYMENT_OVERDUE: {
          name: "Client Payment Overdue Alert",
          subject: "OVERDUE PAYMENT ALERT: {{projectName}} - {{amount}}",
          body: "Attention {{userName}},\n\nPayment of {{amount}} for {{projectName}} is overdue since {{dueDate}}.",
        },
        QUOTATION_APPROVAL: {
          name: "Quotation Approval Required",
          subject: "Quotation Approval Required: {{quotationNumber}}",
          body: "Hello {{userName}},\n\nQuotation {{quotationNumber}} for {{clientName}} (Amount: {{amount}}) requires management approval.",
        },
        PO_APPROVAL: {
          name: "Purchase Order Approval Required",
          subject: "PO Approval Required: {{poNumber}} - {{vendorName}}",
          body: "Hello {{userName}},\n\nPurchase Order {{poNumber}} for {{vendorName}} (Amount: {{amount}}) requires approval.",
        },
        VENDOR_PAYMENT: {
          name: "Vendor Payment Confirmation",
          subject: "Vendor Payment Confirmation: {{poNumber}}",
          body: "Dear {{vendorName}},\n\nPayment of {{amount}} has been recorded for PO {{poNumber}}.",
        },
        REPORT_READY: {
          name: "Automated Report Snapshot Ready",
          subject: "ESPACIO ERP Automated Executive Report: {{reportType}}",
          body: "Hello Leadership Team,\n\nYour automated {{reportType}} report snapshot for {{period}} is attached and ready for review.",
        },
        SYSTEM_ALERT: {
          name: "System Security Alert",
          subject: "ESPACIO ERP Alert: {{title}}",
          body: "System Alert: {{message}}\n\nTimestamp: {{timestamp}}.",
        },
      };

      const def = defaults[eventType] || {
        name: `${eventType} Notification`,
        subject: "ESPACIO ERP Notification: {{eventType}}",
        body: "Hello {{userName}},\n\nEvent {{eventType}} triggered for {{projectName}}.",
      };

      template = await db.emailTemplate.create({
        data: {
          name: def.name,
          eventType,
          subject: def.subject,
          body: def.body,
          isEnabled: true,
        },
      });
    }

    return template;
  }

  public static async sendTemplatedEmail(options: SendEmailOptions) {
    try {
      const template = await this.getOrCreateTemplate(options.eventType);
      if (!template.isEnabled) {
        return { success: false, reason: "Template disabled" };
      }

      const parsedSubject = this.parseTemplateVariables(template.subject, options.variables);
      const parsedBody = this.parseTemplateVariables(template.body, options.variables);

      // Log delivery attempt in NotificationDeliveryLog
      await db.notificationDeliveryLog.create({
        data: {
          recipientId: options.recipientId || options.recipientEmail,
          channel: "EMAIL",
          status: "SENT",
        },
      });

      logger.info(`[EMAIL_SERVICE] Sent email to ${options.recipientEmail} | Subject: ${parsedSubject}`);

      return {
        success: true,
        recipientEmail: options.recipientEmail,
        parsedSubject,
        parsedBody,
      };
    } catch (err: any) {
      logger.error(`[EMAIL_SERVICE] Failed sending email: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
