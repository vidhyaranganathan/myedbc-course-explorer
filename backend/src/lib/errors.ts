import { NextResponse } from "next/server";
import type { ApiError } from "@/types/database";

export type ErrorCode =
  | "INVALID_PARAMS"
  | "NOT_FOUND"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

const errorStatusMap: Record<ErrorCode, number> = {
  INVALID_PARAMS: 400,
  NOT_FOUND: 404,
  DATABASE_ERROR: 503,
  INTERNAL_ERROR: 500,
};

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: string
): NextResponse<ApiError> {
  const status = errorStatusMap[code] || 500;
  return NextResponse.json(
    {
      error: message,
      code,
      details,
    },
    { status }
  );
}

export function handleDatabaseError(error: unknown): NextResponse<ApiError> {
  console.error("Database error:", error);
  const message =
    error instanceof Error ? error.message : "Unknown database error";
  return createErrorResponse(
    "DATABASE_ERROR",
    "Database operation failed",
    message
  );
}

export function handleValidationError(error: unknown): NextResponse<ApiError> {
  const message =
    error instanceof Error ? error.message : "Validation failed";
  return createErrorResponse("INVALID_PARAMS", message);
}
