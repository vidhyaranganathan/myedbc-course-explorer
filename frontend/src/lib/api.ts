import type {
  CourseSearchResult,
  FilterOptions,
  SuggestResult,
  HealthStatus,
  Course,
  SearchParams,
} from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new ApiError(
        error.error || `HTTP ${response.status}`,
        response.status,
        error.code
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error",
      0
    );
  }
}

export const api = {
  // Health check
  health: () => fetchApi<HealthStatus>("/api/health"),

  // Search courses
  searchCourses: (params: SearchParams) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return fetchApi<CourseSearchResult>(
      `/api/courses/search${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get filter options
  getFilters: () => fetchApi<FilterOptions>("/api/courses/filters"),

  // Get autocomplete suggestions
  getSuggestions: (query: string, limit = 10) =>
    fetchApi<SuggestResult>(
      `/api/courses/suggest?q=${encodeURIComponent(query)}&limit=${limit}`
    ),

  // Get course by code
  getCourse: (code: string) =>
    fetchApi<Course>(`/api/courses/${encodeURIComponent(code)}`),

  // Log search analytics
  logSearch: (data: {
    query: string;
    filters: Record<string, unknown>;
    resultCount: number;
    responseTimeMs: number;
  }) =>
    fetchApi("/api/analytics/search", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export { ApiError };
