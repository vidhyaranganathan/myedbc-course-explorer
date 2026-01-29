import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { handleDatabaseError } from "@/lib/errors";
import type { FilterOptions } from "@/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    // Fetch all filter options in parallel
    const [gradesResult, categoriesResult, languagesResult, subjectsResult, creditsResult] =
      await Promise.all([
        // Grades with counts
        supabase
          .from("courses")
          .select("grade")
          .not("grade", "is", null),
        // Categories with counts
        supabase
          .from("courses")
          .select("category")
          .not("category", "is", null),
        // Languages with counts
        supabase
          .from("courses")
          .select("language")
          .not("language", "is", null),
        // Subjects (using hst_main_category) with counts
        supabase
          .from("courses")
          .select("hst_main_category")
          .not("hst_main_category", "is", null),
        // Credits with counts
        supabase
          .from("courses")
          .select("credit_value")
          .not("credit_value", "is", null),
      ]);

    // Check for errors
    if (gradesResult.error) return handleDatabaseError(gradesResult.error);
    if (categoriesResult.error) return handleDatabaseError(categoriesResult.error);
    if (languagesResult.error) return handleDatabaseError(languagesResult.error);
    if (subjectsResult.error) return handleDatabaseError(subjectsResult.error);
    if (creditsResult.error) return handleDatabaseError(creditsResult.error);

    // Aggregate counts
    const grades = aggregateStringCounts(gradesResult.data?.map((r) => r.grade) || []);
    const categories = aggregateStringCounts(categoriesResult.data?.map((r) => r.category) || []);
    const languages = aggregateStringCounts(languagesResult.data?.map((r) => r.language) || []);
    const subjects = aggregateStringCounts(subjectsResult.data?.map((r) => r.hst_main_category) || []);
    const credits = aggregateStringCounts(creditsResult.data?.map((r) => r.credit_value) || []);

    const response: FilterOptions = {
      grades: grades.sort((a, b) => sortGrades(a.value, b.value)),
      categories: categories.sort((a, b) => a.value.localeCompare(b.value)),
      languages: languages.sort((a, b) => a.value.localeCompare(b.value)),
      subjects: subjects.sort((a, b) => a.value.localeCompare(b.value)),
      credits: credits.sort((a, b) => sortCredits(a.value, b.value)),
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleDatabaseError(error);
  }
}

function aggregateStringCounts(values: (string | null)[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
}

function sortGrades(a: string, b: string): number {
  // Extract numeric part for comparison (e.g., "10" from "10")
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);

  // If both are numbers, sort numerically
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  // Put "K" grades first, then numeric grades, then others
  if (a.startsWith("K") && !b.startsWith("K")) return -1;
  if (!a.startsWith("K") && b.startsWith("K")) return 1;

  return a.localeCompare(b);
}

function sortCredits(a: string, b: string): number {
  // Try to extract first number for sorting
  const numA = parseInt(a.split(",")[0], 10);
  const numB = parseInt(b.split(",")[0], 10);

  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  return a.localeCompare(b);
}
