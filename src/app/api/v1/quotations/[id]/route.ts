import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { QuotationService } from "@/modules/quotations/quotation.service";
import { UpdateQuotationSchema } from "@/validators/quotation.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const isClientFacing = searchParams.get("clientFacing") === "true";

    const quotation = await QuotationService.getQuotationById(id, session.userId, isClientFacing);
    return successResponse(quotation);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();
    const validated = UpdateQuotationSchema.parse(body);

    const updated = await QuotationService.updateQuotation(id, validated, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const result = await QuotationService.deleteQuotation(id, session.userId);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
