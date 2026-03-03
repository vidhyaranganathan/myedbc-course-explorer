"use client";

import { useState, useMemo } from "react";
import coursesData from "@/data/courses.json";
import type { Course } from "@/lib/types";
import { filterCourses, getFilterOptions, emptyFilters, type Filters } from "@/lib/search";

const allCourses = coursesData as Course[];
const HIGH_SCHOOL_GRADES = new Set(["09", "10", "11", "12"]);
const courses = allCourses.filter((c) => HIGH_SCHOOL_GRADES.has(c.grade));
const PAGE_SIZE = 50;

const CATEGORY_INFO: Record<string, { color: string; bg: string; description: string }> = {
  "External Credential": {
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    description: "Approved external courses students can take to earn course credits",
  },
  Ministry: {
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    description: "Courses developed by the BC Ministry of Education",
  },
  "Board Authority Authorized": {
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    description: "Courses approved by local school boards",
  },
  "Locally Developed": {
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    description: "Courses developed by individual schools",
  },
};

function getCategoryBadge(category: string) {
  const info = CATEGORY_INFO[category];
  if (!info) return { color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
  return info;
}

export default function Home() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showGlossary, setShowGlossary] = useState(true);

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
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            BC Course Finder
          </h1>
          <p className="text-base text-gray-500 mt-2">
            Explore {courses.length.toLocaleString()} British Columbia courses
          </p>
        </div>

        {/* Glossary */}
        {showGlossary && (
          <div className="animate-fade-in mb-5 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Course Categories
              </h2>
              <button
                onClick={() => setShowGlossary(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors -mt-1"
                aria-label="Dismiss glossary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(CATEGORY_INFO).map(([name, info]) => (
                <div key={name} className={`rounded-lg border px-3 py-2 ${info.bg}`}>
                  <span className={`text-sm font-semibold ${info.color}`}>{name}</span>
                  <p className="text-xs text-gray-600 mt-0.5">{info.description}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              <strong>Credits</strong> indicate how many credits a course earns toward graduation.
            </p>
          </div>
        )}

        {!showGlossary && (
          <button
            onClick={() => setShowGlossary(true)}
            className="mb-4 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Show category guide
          </button>
        )}

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-5">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={filters.query}
              onChange={(e) => update("query", e.target.value)}
              placeholder="Search by course title, code, or subject..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 placeholder-gray-400 transition-shadow"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
            <FilterSelect
              label="Grade"
              value={filters.grade}
              options={filterOptions.grades}
              onChange={(v) => update("grade", v)}
              formatOption={(v) => `Grade ${v}`}
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
                formatOption={(v) => `${v} credits`}
              />
          </div>

          {hasFilters && (
            <button
              onClick={reset}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all filters
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-500 mb-3 font-medium">
          {hasFilters
            ? `${results.length.toLocaleString()} of ${courses.length.toLocaleString()} courses`
            : `${courses.length.toLocaleString()} courses`}
        </div>

        {/* Results */}
        <div className="space-y-2">
          {paged.map((course, i) => {
            const key = `${course.code}-${course.gradProgram}-${i}`;
            const isExpanded = expanded === key;
            const badge = getCategoryBadge(course.category);

            return (
              <div
                key={key}
                className="animate-fade-in bg-white rounded-xl shadow-sm border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className="w-full px-4 sm:px-5 py-3.5 text-left flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-900 text-sm sm:text-base leading-tight block truncate">
                      {course.title}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs font-mono text-gray-600">
                        {course.code}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-xs font-medium text-blue-700">
                        Grade {course.grade}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${badge.color} ${badge.bg}`}>
                        {course.category}
                      </span>
                      {course.credits && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
                          {course.credits} cr
                        </span>
                      )}
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="animate-slide-down px-4 sm:px-5 pb-4 border-t border-gray-100 pt-4">
                    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      <Detail label="Course Code" value={course.code} />
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
            className="mt-5 w-full py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
          >
            Show more ({(results.length - paged.length).toLocaleString()} remaining)
          </button>
        )}

        {results.length === 0 && hasFilters && (
          <div className="text-center py-16">
            <div className="text-gray-400 text-4xl mb-3">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">No courses match your filters</p>
            <button onClick={reset} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
              Clear filters
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          Data sourced from the BC Ministry of Education
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  formatOption,
}: {
  label: string;
  value: string;
  options: { value: string; count: number }[];
  onChange: (v: string) => void;
  formatOption?: (v: string) => string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-shadow appearance-none cursor-pointer"
    >
      <option value="">All {label}s</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {formatOption ? formatOption(o.value) : o.value} ({o.count.toLocaleString()})
        </option>
      ))}
    </select>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">{label}</dt>
      <dd className="text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}
