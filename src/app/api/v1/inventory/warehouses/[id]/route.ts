import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { WarehouseService } from "@/modules/inventory/warehouse.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const data = await WarehouseService.getWarehouseById(id);
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();
    const data = await WarehouseService.updateWarehouse(id, body, session.userId);
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}
