export interface Filters {
  query: string;
  grades: string[];
  categories: string[];
  languages: string[];
  subjects: string[];
  credits: string[];
}

export const emptyFilters: Filters = {
  query: "",
  grades: [],
  categories: [],
  languages: [],
  subjects: [],
  credits: [],
};

interface Searchable {
  code: string;
  grade: string;
  title: string;
  credits: string | null;
  category: string;
  language: string;
  subject: string | null;
}

export function filterCourses<T extends Searchable>(courses: T[], filters: Filters): T[] {
  const q = filters.query.toLowerCase();

  return courses.filter((c) => {
    if (q && !c.title.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q) && !(c.subject?.toLowerCase().includes(q))) {
      return false;
    }
    if (filters.grades.length && !filters.grades.includes(c.grade)) return false;
    if (filters.categories.length && !filters.categories.includes(c.category)) return false;
    if (filters.languages.length && !filters.languages.includes(c.language)) return false;
    if (filters.subjects.length && !filters.subjects.includes(c.subject ?? "")) return false;
    if (filters.credits.length && !filters.credits.includes(c.credits ?? "")) return false;
    return true;
  });
}

export function getFilterOptions<T extends Searchable>(courses: T[]) {
  const count = (arr: (string | null)[]) => {
    const map = new Map<string, number>();
    for (const v of arr) {
      if (v) map.set(v, (map.get(v) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  };

  return {
    grades: count(courses.map((c) => c.grade)),
    categories: count(courses.map((c) => c.category)),
    languages: count(courses.map((c) => c.language)),
    subjects: count(courses.map((c) => c.subject)),
    credits: count(courses.map((c) => c.credits)),
  };
}
