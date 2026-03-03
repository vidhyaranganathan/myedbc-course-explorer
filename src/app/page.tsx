"use client";

import { useState, useMemo } from "react";
import coursesData from "@/data/courses.json";
import type { Course } from "@/lib/types";
import { filterCourses, getFilterOptions, emptyFilters, type Filters } from "@/lib/search";

const courses = coursesData as Course[];
const PAGE_SIZE = 50;

export default function Home() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filterOptions = useMemo(() => getFilterOptions(courses), []);
  const results = useMemo(() => filterCourses(courses, filters), [filters]);
  const paged = results.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paged.length < results.length;

  function update(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
    setExpanded(null);
  }

  function reset() {
    setFilters(emptyFilters);
    setPage(0);
    setExpanded(null);
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">BC Course Finder</h1>
          <p className="text-sm text-gray-500 mt-1">
            Search {courses.length.toLocaleString()} British Columbia courses
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <input
            type="text"
            value={filters.query}
            onChange={(e) => update("query", e.target.value)}
            placeholder="Search by course title, code, or subject..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
            <FilterSelect
              label="Grade"
              value={filters.grade}
              options={filterOptions.grades}
              onChange={(v) => update("grade", v)}
            />
            <FilterSelect
              label="Category"
              value={filters.category}
              options={filterOptions.categories}
              onChange={(v) => update("category", v)}
            />
            <FilterSelect
              label="Language"
              value={filters.language}
              options={filterOptions.languages}
              onChange={(v) => update("language", v)}
            />
            <FilterSelect
              label="Subject"
              value={filters.subject}
              options={filterOptions.subjects}
              onChange={(v) => update("subject", v)}
            />
            <FilterSelect
              label="Credits"
              value={filters.credits}
              options={filterOptions.credits}
              onChange={(v) => update("credits", v)}
            />
          </div>

          {hasFilters && (
            <button
              onClick={reset}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-500 mb-3">
          {hasFilters
            ? `${results.length.toLocaleString()} of ${courses.length.toLocaleString()} courses`
            : `${courses.length.toLocaleString()} courses`}
        </div>

        {/* Results */}
        <div className="space-y-2">
          {paged.map((course, i) => {
            const key = `${course.code}-${i}`;
            const isExpanded = expanded === key;
            return (
              <div
                key={key}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className="w-full px-4 py-3 text-left flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {course.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span>{course.code}</span>
                      <span>Grade {course.grade}</span>
                      <span>{course.category}</span>
                      {course.credits && <span>{course.credits} cr</span>}
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-gray-100 pt-3">
                    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      <Detail label="Code" value={course.code} />
                      <Detail label="Grade" value={course.grade} />
                      <Detail label="Credits" value={course.credits} />
                      <Detail label="Category" value={course.category} />
                      <Detail label="Language" value={course.language} />
                      <Detail label="Subject" value={course.subject} />
                      <Detail label="Sub-category" value={course.subCategory} />
                      <Detail label="Grad Program" value={course.gradProgram} />
                      <Detail label="Grad Requirement" value={course.gradRequirement} />
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Load more */}
        {hasMore && (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="mt-4 w-full py-2 text-sm text-blue-600 hover:text-blue-800 bg-white rounded-lg shadow-sm border border-gray-200"
          >
            Show more ({results.length - paged.length} remaining)
          </button>
        )}

        {results.length === 0 && hasFilters && (
          <div className="text-center text-gray-500 py-12 text-sm">
            No courses match your filters.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; count: number }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
    >
      <option value="">All {label}s</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value} ({o.count})
        </option>
      ))}
    </select>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-gray-500 text-xs">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
