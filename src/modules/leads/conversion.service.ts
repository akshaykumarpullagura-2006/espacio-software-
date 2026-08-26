import { db } from "@/lib/db";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";

export class LeadConversionService {
  public static async convertLeadToProject(leadId: string, userId?: string) {
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { client: true, project: true, quotations: true },
    });

    if (!lead) {
      throw new NotFoundError("Lead not found");
    }

    if (lead.project) {
      throw new ConflictError(`Lead ${lead.referenceNo} has already been converted into Project #${lead.project.referenceNo}.`);
    }

    if (lead.stage !== "WON") {
      throw new BusinessRuleError(`Lead conversion requires stage "WON". Current stage: [${lead.stage}]`);
    }

    const result = await db.$transaction(async (tx) => {
      let clientId = lead.client?.id;

      if (!clientId) {
        // Check if a client with this phone number already exists
        const existingClient = await tx.client.findFirst({
          where: { phone: lead.phone },
        });

        if (existingClient) {
          clientId = existingClient.id;
          await tx.client.update({
            where: { id: existingClient.id },
            data: { leadId: lead.id },
          });
        } else {
          const clientRefNo = await IdGeneratorService.generate("CLI");
          const client = await tx.client.create({
            data: {
              referenceNo: clientRefNo,
              leadId: lead.id,
              fullName: lead.clientName,
              phone: lead.phone,
              email: lead.email ?? null,
              address: lead.location ?? null,
            },
          });
          clientId = client.id;
        }
      }

      const projectRefNo = await IdGeneratorService.generate("PROJ");
      const projectTitle = `${lead.clientName} - Interior Execution`;

      const approvedQuote = lead.quotations.find((q) => q.status === "APPROVED");
      const contractValue = approvedQuote ? approvedQuote.totalAmount : (lead.estimatedBudget || 0.0);

      const project = await tx.project.create({
        data: {
          referenceNo: projectRefNo,
          leadId: lead.id,
          title: projectTitle,
          clientId: clientId,
          stage: "INITIATED",
          propertyTypeKey: lead.propertyTypeKey || "APARTMENT_INTERIOR",
          contractValue: contractValue,
          revisedBudget: contractValue,
          siteAddress: lead.location || null,
        },
      });

      // Link all quotations of this lead to the newly created project and client
      await tx.quotation.updateMany({
        where: { leadId: lead.id },
        data: {
          projectId: project.id,
          clientId: clientId,
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          stage: "WON",
        },
      });

      return { client: lead.client || clientId, project };
    });

    await AuditService.logEvent({
      userId,
      action: "LEAD_CONVERTED_TO_PROJECT",
      entityType: "Lead",
      entityId: lead.id,
      newValues: { projectId: result.project.id, referenceNo: result.project.referenceNo },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: result.project.id,
      type: "STATUS_CHANGE",
      title: `Project Initialized from Lead ${lead.referenceNo}`,
    });

    return result;
  }
}
