"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Course, FilterOptions } from "@/types/api";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Load filters on mount
  useEffect(() => {
    api
      .getFilters()
      .then(setFilters)
      .catch((err) => console.error("Failed to load filters:", err));
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const result = await api.searchCourses({
        q: query,
        grade: selectedGrade,
        category: selectedCategory,
        limit: 20,
        offset: 0,
      });

      setCourses(result.courses);
      setTotal(result.total);

      // Log analytics
      const responseTime = Date.now() - startTime;
      api.logSearch({
        query,
        filters: { grade: selectedGrade, category: selectedCategory },
        resultCount: result.total,
        responseTimeMs: responseTime,
      }).catch(() => {
        // Ignore analytics errors
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setCourses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Search BC Courses
        </h1>

        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search courses
              </label>
              <input
                id="search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter course name, code, or subject..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                  Grade
                </label>
                <select
                  id="grade"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Grades</option>
                  {filters?.grades.map((g) => (
                    <option key={g.value} value={g.value}>
                      Grade {g.value} ({g.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {filters?.categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.value} ({c.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Results */}
        {total > 0 && (
          <div className="mb-4 text-gray-600">
            Found {total} course{total !== 1 ? "s" : ""}
          </div>
        )}

        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  {course.course_title}
                </h3>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  Grade {course.grade}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-4">
                <div>
                  <span className="font-medium">Code:</span> {course.code}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {course.category}
                </div>
                <div>
                  <span className="font-medium">Language:</span> {course.language}
                </div>
                {course.credit_value && (
                  <div>
                    <span className="font-medium">Credits:</span> {course.credit_value}
                  </div>
                )}
              </div>

              {course.hst_main_category && (
                <div className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">Subject:</span> {course.hst_main_category}
                  {course.hst_sub_category && ` - ${course.hst_sub_category}`}
                </div>
              )}
            </div>
          ))}
        </div>

        {courses.length === 0 && !loading && !error && (
          <div className="text-center text-gray-500 py-12">
            Enter a search query to find courses
          </div>
        )}
      </div>
    </div>
  );
}
