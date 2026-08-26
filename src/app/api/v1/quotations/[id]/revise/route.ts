import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { QuotationService } from "@/modules/quotations/quotation.service";
import { CreateRevisionSchema } from "@/validators/quotation.schema";
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
    let notes: string | undefined = undefined;
    try {
      const body = await req.json();
      const validated = CreateRevisionSchema.parse(body);
      notes = validated.notes || undefined;
    } catch {
      // Optional notes
    }

    const newRevision = await QuotationService.createRevision(id, notes, session.userId);
    return successResponse(newRevision, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
