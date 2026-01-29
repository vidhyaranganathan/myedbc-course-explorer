import { z } from "zod";

// Search query parameters schema
export const searchParamsSchema = z.object({
  q: z.string().max(200).optional(),
  grade: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
  subject: z.string().max(100).optional(),
  credits: z.string().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchParamsInput = z.infer<typeof searchParamsSchema>;

// Suggest query parameters schema
export const suggestParamsSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type SuggestParamsInput = z.infer<typeof suggestParamsSchema>;

// Course code parameter schema
export const courseCodeSchema = z.object({
  code: z.string().regex(/^\d+$/, "Course code must be numeric"),
});

// Analytics log schema
export const analyticsSearchSchema = z.object({
  query: z.string().max(200),
  filters: z.record(z.unknown()).optional(),
  resultCount: z.number().int().min(0),
  responseTimeMs: z.number().int().min(0),
});

export type AnalyticsSearchInput = z.infer<typeof analyticsSearchSchema>;

// Helper to parse URL search params into an object
export function parseSearchParams(
  searchParams: URLSearchParams
): Record<string, string> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
