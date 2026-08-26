import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { InventoryConfigService } from "@/modules/inventory/inventory-config.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const [categories, brands, units, conversions] = await Promise.all([
      InventoryConfigService.getCategories(),
      InventoryConfigService.getBrands(),
      InventoryConfigService.getUnits(),
      InventoryConfigService.getUnitConversions(),
    ]);

    return ApiResponse.success({
      categories,
      brands,
      units,
      conversions,
    });
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch inventory configuration", 500);
  }
}
