import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ClientService } from "@/modules/clients/client.service";
import { clientFilterSchema, createClientSchema } from "@/validators/client.schema";
import { errorResponse, successResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "clients:read", "VIEW_CLIENTS");

    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams.entries());

    const parsed = clientFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.format());
    }

    const result = await ClientService.getClients(parsed.data, session.userId);
    return successResponse(result.clients, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      canViewFinancials: result.canViewFinancials,
    }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "clients:write", "CREATE_CLIENT");

    const body = await req.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid client payload", parsed.error.format());
    }

    const { client, duplicateWarning } = await ClientService.createClient(parsed.data, session.userId);
    return successResponse(
      client,
      duplicateWarning ? { duplicateWarning } : undefined,
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
