import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { logger } from "./logger";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function successResponse<T>(data: T, meta?: Record<string, unknown>, statusCode = 200) {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(payload, { status: statusCode });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    logger.warn(`API Expected Error: [${error.code}] ${error.message}`, "API_RESPONSE", {
      statusCode: error.statusCode,
      details: error.details,
    });

    const payload: ApiResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
    return NextResponse.json(payload, { status: error.statusCode });
  }

  logger.error("Unhandled Internal API Error", error, "API_RESPONSE");

  const payload: ApiResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    },
  };
  return NextResponse.json(payload, { status: 500 });
}

export const ApiResponse = {
  success: <T>(data: T, meta?: Record<string, unknown>, statusCode = 200) => successResponse(data, meta, statusCode),
  created: <T>(data: T, meta?: Record<string, unknown>) => successResponse(data, meta, 201),
  unauthorized: (message = "Unauthorized") =>
    NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message } }, { status: 401 }),
  error: (message: string | unknown, statusCode = 400) =>
    typeof message === "string"
      ? NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message } }, { status: statusCode })
      : errorResponse(message),
};
