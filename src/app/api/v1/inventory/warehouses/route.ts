import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { WarehouseService } from "@/modules/inventory/warehouse.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const data = await WarehouseService.getWarehouses();
    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const data = await WarehouseService.createWarehouse(body, session.userId);
    return successResponse(data, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
