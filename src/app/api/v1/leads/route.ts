import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { LeadService } from "@/modules/leads/lead.service";
import { createLeadSchema } from "@/validators/lead.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:read", "GET_LEADS_LIST");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || searchParams.get("stage") || undefined;
    const source = searchParams.get("source") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const assignedToId = searchParams.get("assignedToId") || undefined;
    const tags = searchParams.get("tags") || undefined;
    const search = searchParams.get("search") || undefined;
    const minBudget = searchParams.get("minBudget") ? parseFloat(searchParams.get("minBudget")!) : undefined;
    const maxBudget = searchParams.get("maxBudget") ? parseFloat(searchParams.get("maxBudget")!) : undefined;
    const createdFrom = searchParams.get("createdFrom") || undefined;
    const createdTo = searchParams.get("createdTo") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const data = await LeadService.getLeads(
      {
        status,
        source,
        priority,
        assignedToId,
        tags,
        minBudget,
        maxBudget,
        createdFrom,
        createdTo,
        search,
        page,
        limit,
      },
      session.userId
    );

    return successResponse(data.leads, data.pagination);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:write", "CREATE_LEAD");

    const body = await req.json();
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid lead payload", parsed.error.format());
    }

    const result = await LeadService.createLead(parsed.data, session.userId);

    return successResponse(
      result.lead,
      {
        duplicateWarning: result.duplicateWarning,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}
