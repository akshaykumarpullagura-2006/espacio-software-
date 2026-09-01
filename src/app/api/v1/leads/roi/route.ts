import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { LeadService } from "@/modules/leads/lead.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized access");

    const roiData = await LeadService.getLeadSourceRoi();
    return successResponse(roiData);
  } catch (err) {
    return errorResponse(err);
  }
}
