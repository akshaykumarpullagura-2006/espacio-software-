import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { QuotationService } from "@/modules/quotations/quotation.service";
import { UpdateQuotationStatusSchema } from "@/validators/quotation.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();
    const validated = UpdateQuotationStatusSchema.parse(body);

    const updated = await QuotationService.updateStatus(id, validated, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
