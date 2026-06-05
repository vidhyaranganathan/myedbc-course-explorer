/**
 * Load course data into Supabase.
 *
 * Usage:
 *   npm run db:load                               # uses courses.json fallback
 *   npm run db:load -- /path/to/open_courses.xlsx # full data from Excel
 *
 * Reads (Excel mode):
 *   <excel path>               all columns including trax_code, myedb_code, developer, etc.
 *   src/data/course-details.json
 *
 * Reads (fallback mode — no Excel):
 *   src/data/courses.json      (myedb_code, trax_code, developer will be null)
 *   src/data/course-details.json
 *
 * Populates:
 *   courses        — one row per (code, grade), grad_info jsonb aggregates all
 *                    grad program associations for that course
 *   course_details — one row per code (scraped data), grad_requirements and
 *                    grad_electives stored as jsonb arrays
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing env vars. Make sure .env.local has:\n" +
    "  NEXT_PUBLIC_SUPABASE_URL\n" +
    "  SUPABASE_SECRET_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BATCH_SIZE = 200;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GradInfoEntry {
  program: string;
  requirement: string | null;
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
  myedb_code: string | null;
  trax_code: string | null;
  developer: string | null;
  grad_info: GradInfoEntry[];
}

interface CourseDetailRow {
  code: string;
  generic_course_type: string | null;
  program_guide_title: string | null;
  published_description: string | null;
  grad_requirements: { program: string; requirement: string; examinable: string }[];
  grad_electives: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clean(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&Eacute;/g, "É").replace(/&eacute;/g, "é")
    .replace(/&Agrave;/g, "À").replace(/&agrave;/g, "à")
    .replace(/&Aacute;/g, "Á").replace(/&aacute;/g, "á")
    .replace(/&Egrave;/g, "È").replace(/&egrave;/g, "è")
    .replace(/&Ecirc;/g, "Ê").replace(/&ecirc;/g, "ê")
    .replace(/&Ocirc;/g, "Ô").replace(/&ocirc;/g, "ô")
    .replace(/&Ucirc;/g, "Û").replace(/&ucirc;/g, "û")
    .replace(/&Ccedil;/g, "Ç").replace(/&ccedil;/g, "ç")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-zA-Z]+;/g, "");
}

// ── Load source data ──────────────────────────────────────────────────────────

const excelArg = process.argv[2];

interface RawRow {
  code: string;
  grade: string;
  title: string;
  credits: string | null;
  category: string;
  language: string;
  subject: string | null;
  subCategory: string | null;
  gradProgram: string | null;
  gradRequirement: string | null;
  myedbCode: string | null;
  traxCode: string | null;
  developer: string | null;
}

let rawRows: RawRow[];

if (excelArg && fs.existsSync(excelArg)) {
  console.log(`Reading Excel: ${excelArg}`);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx");
  const workbook = XLSX.readFile(excelArg);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  rawRows = rows.map((r) => ({
    code:            String(r["Course Code"] ?? "").trim(),
    grade:           String(r["Grade"] ?? "").trim(),
    title:           String(r["Course Title"] ?? "").trim(),
    credits:         clean(r["Credit Value"]),
    category:        String(r["Course Category"] ?? "").trim(),
    language:        String(r["Lang Of Inst"] || "English").trim(),
    subject:         clean(r["HST Main Category"]),
    subCategory:     clean(r["HST Sub Category"]),
    gradProgram:     clean(r["Grad Program"]),
    gradRequirement: clean(r["Grad Program Requirement"]),
    myedbCode:       clean(r["MyEd BC Code"]),
    traxCode:        clean(r["TRAX Code"]),
    developer:       clean(r["Developer"]),
  })).filter((r) => r.code && r.grade && r.title && r.category);
} else {
  if (excelArg) console.warn(`Excel file not found at ${excelArg}, falling back to courses.json`);
  else console.log("No Excel path provided — using courses.json (myedb_code, trax_code, developer will be null)");

  const jsonRows = JSON.parse(
    fs.readFileSync(path.join("src", "data", "courses.json"), "utf-8")
  ) as Array<{
    code: string | number; grade: string; title: string; credits: string | null;
    category: string; language: string; subject: string | null;
    subCategory: string | null; gradProgram: string | null; gradRequirement: string | null;
  }>;

  rawRows = jsonRows.map((r) => ({
    code:            String(r.code).trim(),
    grade:           r.grade.trim(),
    title:           r.title.trim(),
    credits:         r.credits ?? null,
    category:        r.category.trim(),
    language:        (r.language || "English").trim(),
    subject:         r.subject ?? null,
    subCategory:     r.subCategory ?? null,
    gradProgram:     r.gradProgram ?? null,
    gradRequirement: r.gradRequirement ?? null,
    myedbCode:       null,
    traxCode:        null,
    developer:       null,
  }));
}

interface CourseDetailSource {
  genericCourseType?: string;
  programGuideTitle?: string;
  publishedDescription?: string;
  gradElectives?: string[];
  gradRequirements?: { program: string; requirement: string; examinable: string }[];
}

const detailsMap: Record<string, CourseDetailSource> = JSON.parse(
  fs.readFileSync(path.join("src", "data", "course-details.json"), "utf-8")
);

// ── Transform ─────────────────────────────────────────────────────────────────
//
// courses: group by (code, grade), accumulate grad programs into grad_info array.
// course_details: one row per code, arrays kept as-is from the scraper.

const courseMap = new Map<string, CourseRow>();

for (const row of rawRows) {
  const key = `${row.code}|${row.grade}`;

  if (!courseMap.has(key)) {
    courseMap.set(key, {
      code:         row.code,
      grade:        row.grade,
      title:        row.title,
      credits:      row.credits,
      category:     row.category,
      language:     row.language,
      subject:      row.subject,
      sub_category: row.subCategory,
      myedb_code:   row.myedbCode,
      trax_code:    row.traxCode,
      developer:    row.developer,
      grad_info:    [],
    });
  }

  if (row.gradProgram !== null) {
    const course = courseMap.get(key)!;
    // Avoid duplicates within the same (code, grade, program) combination
    const already = course.grad_info.some((g) => g.program === row.gradProgram);
    if (!already) {
      course.grad_info.push({
        program:     row.gradProgram,
        requirement: row.gradRequirement ?? null,
      });
    }
  }
}

const courses = Array.from(courseMap.values());

const courseDetails: CourseDetailRow[] = Object.entries(detailsMap).map(([code, detail]) => ({
  code,
  generic_course_type:   detail.genericCourseType ?? null,
  program_guide_title:   detail.programGuideTitle ? decodeHtml(detail.programGuideTitle) : null,
  published_description: detail.publishedDescription ?? null,
  grad_requirements:     detail.gradRequirements ?? [],
  grad_electives:        detail.gradElectives ?? [],
}));

// ── Batch upsert ──────────────────────────────────────────────────────────────

async function upsertBatches<T extends object>(
  table: string,
  rows: T[],
  onConflict: string
): Promise<void> {
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows — skipped`);
    return;
  }
  const total = rows.length;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      console.error(`\nError on ${table} batch ${i}–${i + BATCH_SIZE}:`, error.message);
      process.exit(1);
    }
    process.stdout.write(`\r  ${table}: ${Math.min(i + BATCH_SIZE, total)}/${total}`);
  }
  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSource data:`);
  console.log(`  Raw rows:            ${rawRows.length}`);
  console.log(`  course-details.json: ${Object.keys(detailsMap).length} entries`);
  console.log(`\nTransformed:`);
  console.log(`  courses:        ${courses.length} (unique code+grade pairs)`);
  console.log(`  course_details: ${courseDetails.length}`);
  console.log(`\nLoading...`);

  await upsertBatches("courses", courses, "code,grade");
  await upsertBatches("course_details", courseDetails, "code");

  console.log("\nDone. Verifying row counts...");

  for (const { name, expected } of [
    { name: "courses",        expected: courses.length },
    { name: "course_details", expected: courseDetails.length },
  ]) {
    const { count, error } = await supabase
      .from(name)
      .select("*", { count: "exact", head: true });
    if (error) {
      console.error(`  ${name}: ERROR — ${error.message}`);
    } else {
      const match = count === expected ? "OK" : "MISMATCH";
      console.log(`  ${name}: ${count} rows (expected ${expected}) — ${match}`);
    }
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
