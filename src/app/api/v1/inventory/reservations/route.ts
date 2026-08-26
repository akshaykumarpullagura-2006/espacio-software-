import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";
import { StockReservationService } from "@/modules/inventory/stock-reservation.service";
import { createStockReservationSchema } from "@/validators/inventory.schema";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const data = await StockReservationService.getReservations({
      materialId: searchParams.get("materialId") || undefined,
      warehouseId: searchParams.get("warehouseId") || undefined,
      projectId: searchParams.get("projectId") || undefined,
      status: searchParams.get("status") || undefined,
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "20", 10),
    });
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const validated = createStockReservationSchema.parse(body);
    const reservation = await StockReservationService.createReservation(validated, session.userId);
    return successResponse(reservation);
  } catch (error: any) {
    return errorResponse(error);
  }
}
