import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { SettingsService } from "@/modules/settings/settings.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ForbiddenError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const [invoice, quotation, purchaseOrder, document] = await Promise.all([
      SettingsService.getInvoiceSettings(),
      SettingsService.getQuotationSettings(),
      SettingsService.getPurchaseOrderSettings(),
      SettingsService.getDocumentSettings(),
    ]);

    return successResponse({
      invoice,
      quotation,
      purchaseOrder,
      document,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const hasPermission = await RbacService.hasPermission(session.userId, "settings:documents");
    const isSuperAdmin = await RbacService.isUserSuperAdmin(session.userId);
    if (!hasPermission && !isSuperAdmin) {
      throw new ForbiddenError("Forbidden: Insufficient permissions to update document settings");
    }

    const body = await req.json();

    if (body.invoice) await SettingsService.updateInvoiceSettings(body.invoice, session.userId);
    if (body.quotation) await SettingsService.updateQuotationSettings(body.quotation, session.userId);
    if (body.purchaseOrder) await SettingsService.updatePurchaseOrderSettings(body.purchaseOrder, session.userId);
    if (body.document) await SettingsService.updateDocumentSettings(body.document, session.userId);

    const [invoice, quotation, purchaseOrder, document] = await Promise.all([
      SettingsService.getInvoiceSettings(),
      SettingsService.getQuotationSettings(),
      SettingsService.getPurchaseOrderSettings(),
      SettingsService.getDocumentSettings(),
    ]);

    return successResponse({ invoice, quotation, purchaseOrder, document }, { message: "Commercial document settings updated successfully" });
  } catch (err) {
    return errorResponse(err);
  }
}
