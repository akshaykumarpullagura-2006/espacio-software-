import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { QuotationService } from "@/modules/quotations/quotation.service";
import { ApproveQuotationSchema } from "@/validators/quotation.schema";
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
    let input = {};
    try {
      const body = await req.json();
      input = ApproveQuotationSchema.parse(body);
    } catch {
      input = {};
    }

    const approved = await QuotationService.approveQuotation(id, input, session.userId);
    return successResponse(approved);
  } catch (err) {
    return errorResponse(err);
  }
}
