"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { CourseListItem } from "@/lib/types";
import { filterCourses, getFilterOptions, emptyFilters, type Filters } from "@/lib/search";

const PAGE_SIZE = 50;

const CATEGORY_GLOSSARY = [
  { name: "External Credential", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", description: "Approved external courses students can take to earn course credits" },
  { name: "Ministry", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", description: "Courses developed by the BC Ministry of Education" },
  { name: "Board Authority Authorized", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", description: "Courses approved by local school boards" },
  { name: "Locally Developed", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", description: "Courses developed by individual schools" },
];

export default function Home() {
  const [courses, setCourses] = useState<CourseListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showGlossary, setShowGlossary] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/courses")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load courses (${r.status})`);
        return r.json();
      })
      .then((data: CourseListItem[]) => {
        if (!cancelled) setCourses(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e.message);
      });
    return () => { cancelled = true; };
  }, []);

  const filterOptions = useMemo(() => getFilterOptions(courses ?? []), [courses]);
  const results = useMemo(() => filterCourses(courses ?? [], filters), [courses, filters]);
  const paged = useMemo(() => results.slice(0, (page + 1) * PAGE_SIZE), [results, page]);
  const hasMore = paged.length < results.length;

  function updateQuery(value: string) {
    setFilters((f) => ({ ...f, query: value }));
    setPage(0);
    setExpanded(null);
  }

  function toggleFilter(key: keyof Omit<Filters, "query">, value: string) {
    setFilters((f) => {
      const current = f[key] as string[];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...f, [key]: next };
    });
    setPage(0);
    setExpanded(null);
  }

  function reset() {
    setFilters(emptyFilters);
    setPage(0);
    setExpanded(null);
  }

  function toggleExpand(course: CourseListItem) {
    const key = `${course.code}-${course.grade}`;
    setExpanded((cur) => (cur === key ? null : key));
  }

  const hasFilters =
    filters.query !== "" ||
    filters.grades.length > 0 ||
    filters.categories.length > 0 ||
    filters.languages.length > 0 ||
    filters.subjects.length > 0 ||
    filters.credits.length > 0;
  const isLoading = courses === null && !loadError;
  const total = courses?.length ?? 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-[880px] mx-auto px-4 py-8 sm:py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1D21]">
            BC Course Finder
          </h1>
          <p className="text-base text-[#6B7075] mt-2">
            Explore {courses ? total.toLocaleString() : "…"} British Columbia courses
          </p>
        </div>

        {/* Glossary */}
        {showGlossary && (
          <div className="animate-fade-in mb-5 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#1A1D21] uppercase tracking-wide">
                Course Categories
              </h2>
              <button
                onClick={() => setShowGlossary(false)}
                className="text-[#9AA0A6] hover:text-[#3C4043] transition-colors -mt-1"
                aria-label="Dismiss glossary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORY_GLOSSARY.map((cat) => (
                <div key={cat.name} className={`rounded-lg border px-3 py-2 ${cat.bg}`}>
                  <span className={`text-sm font-semibold ${cat.color}`}>{cat.name}</span>
                  <p className="text-xs text-gray-600 mt-0.5">{cat.description}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#6B7075] mt-3">
              <strong>Credits</strong> indicate how many credits a course earns toward graduation.
            </p>
          </div>
        )}

        {!showGlossary && (
          <button
            onClick={() => setShowGlossary(true)}
            className="mb-4 text-xs text-[#9AA0A6] hover:text-[#3C4043] transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Show category guide
          </button>
        )}

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E6E8EB] p-4 sm:p-5 mb-5">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA0A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={filters.query}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder="Search by course title, code, or subject..."
              disabled={isLoading || !!loadError}
              className="w-full pl-10 pr-4 py-2.5 border border-[#E6E8EB] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-[#F6F7F9] placeholder-[#9AA0A6] transition-shadow disabled:opacity-60"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#9AA0A6] uppercase tracking-wide shrink-0">Grade</span>
            {filterOptions.grades.map((o) => (
              <button
                key={o.value}
                onClick={() => toggleFilter("grades", o.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filters.grades.includes(o.value)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-[#F6F7F9] text-[#6B7075] border-[#E6E8EB] hover:border-gray-300 hover:text-[#3C4043]"
                }`}
              >
                Grade {o.value}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <MultiSelectDropdown label="Category" selected={filters.categories} options={filterOptions.categories} onToggle={(v) => toggleFilter("categories", v)} />
            <MultiSelectDropdown label="Language" selected={filters.languages} options={filterOptions.languages} onToggle={(v) => toggleFilter("languages", v)} />
            <MultiSelectDropdown label="Subject" selected={filters.subjects} options={filterOptions.subjects} onToggle={(v) => toggleFilter("subjects", v)} />
            <MultiSelectDropdown label="Credits" selected={filters.credits} options={filterOptions.credits} onToggle={(v) => toggleFilter("credits", v)} formatOption={(v) => `${v} credits`} />
          </div>

          {hasFilters && (
            <button onClick={reset} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all filters
            </button>
          )}
        </div>

        {/* Load error */}
        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {`Couldn’t load courses:`} {loadError}. Please refresh to try again.
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16 text-sm text-[#6B7075] font-medium animate-fade-in">
            Loading courses…
          </div>
        )}

        {/* Results */}
        {!isLoading && !loadError && (
          <>
            <div className="text-sm text-[#6B7075] mb-3 font-medium">
              {hasFilters
                ? `${results.length.toLocaleString()} of ${total.toLocaleString()} courses`
                : `${total.toLocaleString()} courses`}
            </div>

            <div className="space-y-2">
              {paged.map((course) => {
                const courseKey = `${course.code}-${course.grade}`;
                return (
                  <CourseCard
                    key={courseKey}
                    course={course}
                    expanded={expanded === courseKey}
                    onToggle={() => toggleExpand(course)}
                  />
                );
              })}
            </div>

            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="mt-5 w-full py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white rounded-xl shadow-sm border border-[#E6E8EB] hover:border-gray-300 hover:shadow-md transition-all duration-200"
              >
                Show more ({(results.length - paged.length).toLocaleString()} remaining)
              </button>
            )}

            {results.length === 0 && hasFilters && (
              <div className="text-center py-16">
                <svg className="w-12 h-12 mx-auto text-[#9AA0A6] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-[#6B7075] text-sm font-medium">No courses match your filters</p>
                <button onClick={reset} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#E6E8EB] text-center text-xs text-[#9AA0A6]">
          Data sourced from the BC Ministry of Education
        </div>
      </div>
    </div>
  );
}

function pluralLabel(label: string): string {
  if (label.endsWith("s")) return label;
  if (label.endsWith("y")) return label.slice(0, -1) + "ies";
  return label + "s";
}

function MultiSelectDropdown({
  label,
  selected,
  options,
  onToggle,
  formatOption,
}: {
  label: string;
  selected: string[];
  options: { value: string; count: number }[];
  onToggle: (value: string) => void;
  formatOption?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const buttonLabel =
    selected.length === 0
      ? `All ${pluralLabel(label)}`
      : selected.length === 1
      ? (formatOption ? formatOption(selected[0]) : selected[0])
      : `${selected.length} ${pluralLabel(label).toLowerCase()}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full px-3 py-2 border border-[#E6E8EB] rounded-lg text-sm text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#F6F7F9] transition-shadow flex items-center justify-between gap-2 cursor-pointer"
      >
        <span className={selected.length === 0 ? "text-[#6B7075]" : "text-[#1A1D21] font-medium truncate"}>
          {buttonLabel}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 text-[#9AA0A6] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-[#E6E8EB] rounded-lg shadow-lg"
        >
          {options.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F6F7F9] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => onToggle(o.value)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600 cursor-pointer"
              />
              <span className="text-sm text-[#3C4043] flex-1 leading-snug">
                {formatOption ? formatOption(o.value) : o.value}
              </span>
              <span className="text-xs text-[#9AA0A6]">{o.count.toLocaleString()}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({
  course, expanded, onToggle,
}: {
  course: CourseListItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const description = (course.publishedDescription ?? "").trim();

  return (
    <article className="bg-white border border-[#E6E8EB] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.04)]">
      {/* Header */}
      <div className="flex items-start gap-5 px-[26px] py-[22px]">
        <div className="flex-1 min-w-0 flex flex-col gap-[14px]">
          <p className="text-[20px] font-bold tracking-[-0.01em] leading-[1.25] text-[#1A1D21]">
            {course.title}
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <span
              className="font-mono text-[12px] font-medium text-[#5F6368] bg-[#F1F3F4] px-[9px] py-1 rounded-[6px] tracking-[0.02em]"
            >
              {course.code}
            </span>
            <span className="text-[12.5px] font-semibold text-[#1A56DB] bg-[#E8F0FE] px-[10px] py-1 rounded-full">
              Grade {course.grade}
            </span>
            <span className="text-[12.5px] font-semibold text-[#7C3AED] bg-[#F3EBFE] px-[10px] py-1 rounded-full">
              {course.category}
            </span>
            {course.credits && (
              <span className="text-[12.5px] font-medium text-[#6B7075] bg-[#F1F3F4] px-[10px] py-1 rounded-full">
                {course.credits} cr
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onToggle}
          aria-label="Toggle details"
          className="flex-shrink-0 w-[34px] h-[34px] flex items-center justify-center border border-[#E6E8EB] bg-white rounded-[9px] text-[#6B7075] hover:bg-[#F1F3F4] hover:text-[#1A1D21] transition-[background-color,color] duration-150"
        >
          <span className={`inline-flex transition-transform duration-200 ease-in-out ${expanded ? "rotate-0" : "rotate-180"}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </span>
        </button>
      </div>

      {/* Detail panel */}
      {expanded && (
        <div className="border-t border-[#EEF0F2] px-[26px] py-[26px] flex flex-col gap-[26px]">
          <div className="grid grid-cols-[1.15fr_1fr] gap-[36px]">
            {/* Left: category, then subject with nested sub-category */}
            <div className="flex flex-col gap-[22px]">
              <DetailField label="Category" value={course.category} />
              <div className="flex flex-col gap-[5px]">
                <span className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#9AA0A6]">Subject</span>
                <span className="text-[16px] text-[#3C4043]">{course.subject ?? "—"}</span>
                {course.subCategory && (
                  <div className="mt-[10px] pl-[14px] border-l-2 border-[#E6E8EB] flex flex-col gap-1">
                    <span className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#9AA0A6]">Sub-category</span>
                    <span className="text-[15px] text-[#5F6368]">{course.subCategory}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Right: language, grad requirement */}
            <div className="flex flex-col gap-[22px]">
              <DetailField label="Language" value={course.language} />
              <DetailField label="Grad requirement" value={course.gradRequirement} />
            </div>
          </div>

          {description.length > 0 && (
            <div className="border-t border-[#EEF0F2] pt-[22px] flex flex-col gap-2">
              <span className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#9AA0A6]">Published description</span>
              <p className="text-[15px] leading-[1.6] text-[#3C4043] whitespace-pre-line">{description}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-[5px]">
      <span className="text-[11px] font-semibold tracking-[0.07em] uppercase text-[#9AA0A6]">{label}</span>
      <span className="text-[16px] text-[#3C4043]">{value}</span>
    </div>
  );
}
