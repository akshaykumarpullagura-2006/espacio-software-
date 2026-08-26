import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { MaterialService } from "@/modules/inventory/material.service";
import { createMaterialSchema } from "@/validators/inventory.schema";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { searchParams } = new URL(req.url);
    const categoryKey = searchParams.get("categoryKey") || undefined;
    const brandKey = searchParams.get("brandKey") || undefined;
    const status = searchParams.get("status") || undefined;
    const materialType = searchParams.get("materialType") || undefined;
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";
    const outOfStockOnly = searchParams.get("outOfStockOnly") === "true";
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const data = await MaterialService.getMaterials({
      categoryKey,
      brandKey,
      status,
      materialType,
      lowStockOnly,
      outOfStockOnly,
      search,
      page,
      limit,
    });

    return ApiResponse.success(data);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch materials", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = createMaterialSchema.parse(body);

    const material = await MaterialService.createMaterial(validated, currentUser.id);
    return ApiResponse.created(material);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to create material", 400);
  }
}
