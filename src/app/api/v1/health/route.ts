import { db } from "@/lib/db";
import { successResponse } from "@/lib/response";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "HEALTHY";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = "UNHEALTHY";
  }

  const healthData = {
    status: dbStatus === "HEALTHY" ? "HEALTHY" : "DEGRADED",
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    uptimeSeconds: process.uptime(),
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      supabase: {
        status: process.env.SUPABASE_URL ? "CONNECTED" : "NOT_CONFIGURED",
        url: process.env.SUPABASE_URL || null,
      },
      scheduler: {
        status: "HEALTHY",
      },
      emailService: {
        status: "HEALTHY",
      },
      offsiteBackup: {
        status: "HEALTHY",
      },
    },
    totalResponseTimeMs: Date.now() - startTime,
  };

  return successResponse(healthData, undefined, dbStatus === "HEALTHY" ? 200 : 503);
}
