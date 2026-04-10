/**
 * Load course data into Supabase.
 *
 * Usage:
 *   npm run db:load
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js dotenv
 *
 * Reads:
 *   src/data/courses.json
 *   src/data/course-details.json
 *   .env.local  (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY)
 *
 * Populates:
 *   courses                  (5,480 rows)
 *   course_grad_programs     (12,741 rows)
 *   course_grad_requirements (varies)
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌ Missing env vars. Make sure .env.local has:\n" +
    "   NEXT_PUBLIC_SUPABASE_URL\n" +
    "   SUPABASE_SECRET_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BATCH_SIZE = 200;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawCourse {
  code: string | number;
  grade: string;
  title: string;
  credits: string | null;
  category: string;
  language: string;
  subject: string | null;
  subCategory: string | null;
  gradProgram: string | null;
  gradRequirement: string | null;
}

interface CourseDetail {
  genericCourseType?: string;
  programGuideTitle?: string;
  publishedDescription?: string;
  gradElectives?: string[];
  gradRequirements?: {
    program: string;
    requirement: string;
    examinable: string;
  }[];
}

interface CourseRow {
  code: string;
  grade: string;
  title: string;
  credits: string | null;
  category: string;
  language: string;
  subject: string | null;
  sub_category: string | null;
  generic_course_type: string | null;
  program_guide_title: string | null;
  published_description: string | null;
  has_grad_elective: boolean;
}

interface GradProgramRow {
  course_code: string;
  grad_program: string;
  grad_requirement: string | null;
}

interface GradRequirementRow {
  course_code: string;
  requirement: string;
  examinable_date: string;
  program_end: string | null;
}

// ── HTML entity decoder (no external dep needed) ───────────────────────────────

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&Eacute;/g, "É")
    .replace(/&eacute;/g, "é")
    .replace(/&Agrave;/g, "À")
    .replace(/&agrave;/g, "à")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Egrave;/g, "È")
    .replace(/&Ecirc;/g, "Ê")
    .replace(/&ecirc;/g, "ê")
    .replace(/&Ocirc;/g, "Ô")
    .replace(/&ocirc;/g, "ô")
    .replace(/&Ucirc;/g, "Û")
    .replace(/&ucirc;/g, "û")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&ccedil;/g, "ç")
    .replace(/&Agrave;/g, "À")
    .replace(/&agrave;/g, "à")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-zA-Z]+;/g, ""); // strip any remaining unknown entities
}

// ── Load JSON files ────────────────────────────────────────────────────────────

const rawCourses: RawCourse[] = JSON.parse(
  fs.readFileSync(path.join("src", "data", "courses.json"), "utf-8")
);

const detailsMap: Record<string, CourseDetail> = JSON.parse(
  fs.readFileSync(path.join("src", "data", "course-details.json"), "utf-8")
);

// ── Transform ─────────────────────────────────────────────────────────────────

const seenCodes = new Map<string, CourseRow>();
const gradPrograms: GradProgramRow[] = [];
const gradRequirements: GradRequirementRow[] = [];

for (const row of rawCourses) {
  const code = String(row.code);

  // Table 2: collect every grad program row (including duplicates)
  if (row.gradProgram) {
    gradPrograms.push({
      course_code:      code,
      grad_program:     row.gradProgram,
      grad_requirement: row.gradRequirement ?? null,
    });
  }

  if (seenCodes.has(code)) continue; // already captured base course

  const detail = detailsMap[code] ?? {};

  seenCodes.set(code, {
    code,
    grade:                 row.grade.trim(),
    title:                 row.title.trim(),
    credits:               row.credits ?? null,
    category:              row.category.trim(),
    language:              (row.language || "English").trim(),
    subject:               row.subject ?? null,
    sub_category:          row.subCategory ?? null,
    generic_course_type:   detail.genericCourseType ?? null,
    program_guide_title:   detail.programGuideTitle
                             ? decodeHtml(detail.programGuideTitle)
                             : null,
    published_description: detail.publishedDescription ?? null,
    has_grad_elective:     Array.isArray(detail.gradElectives) &&
                           detail.gradElectives.length > 0,
  });
}

// Table 3: grad requirements from course-details.json
for (const [code, detail] of Object.entries(detailsMap)) {
  for (const req of detail.gradRequirements ?? []) {
    gradRequirements.push({
      course_code:     code,
      requirement:     req.requirement,
      examinable_date: req.examinable,       // already "YYYY-MM-DD"
      program_end:     req.program ?? null,  // "Program End Date" or a date
    });
  }
}

const courses = Array.from(seenCodes.values());

// ── Batch upsert ──────────────────────────────────────────────────────────────

async function upsertBatches<T extends object>(
  table: string,
  rows: T[],
  onConflict: string
): Promise<void> {
  const total = rows.length;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict });

    if (error) {
      console.error(`❌ Error on ${table} batch ${i}–${i + BATCH_SIZE}:`, error.message);
      process.exit(1);
    }

    process.stdout.write(`\r  ${table}: ${Math.min(i + BATCH_SIZE, total)}/${total}`);
  }
  console.log(); // newline after progress
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📦 courses.json:        ${rawCourses.length} raw rows`);
  console.log(`📦 course-details.json: ${Object.keys(detailsMap).length} entries`);
  console.log(`\n🔄 Unique courses:      ${courses.length}`);
  console.log(`🔄 Grad programs:       ${gradPrograms.length}`);
  console.log(`🔄 Grad requirements:   ${gradRequirements.length}\n`);

  await upsertBatches("courses", courses, "code");
  await upsertBatches("course_grad_programs", gradPrograms, "course_code,grad_program");
  await upsertBatches(
    "course_grad_requirements",
    gradRequirements,
    "course_code,requirement,examinable_date"
  );

  console.log("\n✅ Done. Verify in Supabase Table Editor or run:");
  console.log("   SELECT COUNT(*) FROM courses;                  -- expect 5480");
  console.log("   SELECT COUNT(*) FROM course_grad_programs;     -- expect 12741");
  console.log(`   SELECT COUNT(*) FROM course_grad_requirements; -- expect ${gradRequirements.length}`);
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
