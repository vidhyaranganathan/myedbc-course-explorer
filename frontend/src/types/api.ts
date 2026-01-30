// API types for frontend
export interface Course {
  id: number;
  code: string;
  myedbc_code: string | null;
  trax_code: string | null;
  grade: string;
  course_title: string;
  credit_value: string | null;
  category: string;
  language: string;
  developer: string | null;
  authorizer: string | null;
  open_date: string | null;
  close_date: string | null;
  completion_end_date: string | null;
  grad_program: string | null;
  grad_program_requirement: string | null;
  hst_main_category: string | null;
  hst_sub_category: string | null;
  ministry_subject_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseSearchResult {
  courses: Course[];
  total: number;
  limit: number;
  offset: number;
}

export interface FilterOptions {
  grades: { value: string; count: number }[];
  categories: { value: string; count: number }[];
  languages: { value: string; count: number }[];
  subjects: { value: string; count: number }[];
  credits: { value: string; count: number }[];
}

export interface SuggestResult {
  suggestions: {
    code: string;
    title: string;
    grade: string;
  }[];
}

export interface HealthStatus {
  status: "healthy" | "unhealthy";
  database: "connected" | "disconnected";
  courseCount: number;
  timestamp: string;
}

export interface SearchParams {
  q?: string;
  grade?: string;
  category?: string;
  language?: string;
  subject?: string;
  credits?: string;
  limit?: number;
  offset?: number;
}
