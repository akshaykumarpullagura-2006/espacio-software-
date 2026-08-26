import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";
import { StockReservationService } from "@/modules/inventory/stock-reservation.service";
import { releaseReservationSchema } from "@/validators/inventory.schema";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const validated = releaseReservationSchema.parse(body);
    const reservation = await StockReservationService.releaseReservation(params.id, validated.resolution, session.userId);
    return successResponse(reservation);
  } catch (error: any) {
    return errorResponse(error);
  }
}
