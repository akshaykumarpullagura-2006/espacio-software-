import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { MaterialService } from "@/modules/inventory/material.service";
import { createMaterialSchema } from "@/validators/inventory.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { id } = await params;
    const material = await MaterialService.getMaterialById(id);
    return ApiResponse.success(material);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Material not found", 404);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { id } = await params;
    const body = await req.json();
    const validated = createMaterialSchema.partial().parse(body);

    const updated = await MaterialService.updateMaterial(id, validated, currentUser.id);
    return ApiResponse.success(updated);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to update material", 400);
  }
}
