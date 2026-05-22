/**
 * Load course data into Supabase.
 *
 * Usage:
 *   npm run db:load                          # uses courses.json fallback
 *   npm run db:load -- /path/to/open_courses.xlsx  # full data from Excel
 *
 * Reads (Excel mode):
 *   <excel path>               all columns including trax_code, myedb_code, dates, etc.
 *   src/data/course-details.json
 *
 * Reads (fallback mode — no Excel):
 *   src/data/courses.json      (extra Excel-only fields will be null)
 *   src/data/course-details.json
 *
 * Populates:
 *   courses                  — one row per (code, grade)
 *   course_grad_programs     — one row per (code, grade, grad_program)
 *   course_details           — one row per code  (scraped data)
 *   course_grad_requirements — one row per (code, requirement, examinable_date)
 *   course_grad_electives    — one row per (code, grad_program)
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
  authorizer: string | null;
  open_date: string | null;
  close_date: string | null;
  completion_end_date: string | null;
  ministry_subject_code: string | null;
}

interface GradProgramRow {
  course_code: string;
  course_grade: string;
  grad_program: string;
  grad_requirement: string | null;
}

interface CourseDetailRow {
  code: string;
  generic_course_type: string | null;
  program_guide_title: string | null;
  published_description: string | null;
}

interface GradRequirementRow {
  course_code: string;
  requirement: string;
  examinable_date: string;
  program_end: string | null;
}

interface GradElectiveRow {
  course_code: string;
  grad_program: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clean(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

/** Convert an Excel serial date number or date string to ISO YYYY-MM-DD, or null. */
function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  // Already a string date
  if (typeof value === "string") {
    const s = value.trim();
    if (s === "") return null;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
  }
  // Excel serial number (days since 1900-01-01, with Lotus 1-2-3 leap year bug)
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
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
  authorizer: string | null;
  openDate: unknown;
  closeDate: unknown;
  completionEndDate: unknown;
  ministrySubjectCode: string | null;
}

let rawRows: RawRow[];

if (excelArg && fs.existsSync(excelArg)) {
  console.log(`Reading Excel: ${excelArg}`);
  // Dynamic import — xlsx is a devDependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx");
  const workbook = XLSX.readFile(excelArg);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  rawRows = rows.map((r) => ({
    code:                 String(r["Course Code"] ?? "").trim(),
    grade:                String(r["Grade"] ?? "").trim(),
    title:                String(r["Course Title"] ?? "").trim(),
    credits:              clean(r["Credit Value"]),
    category:             String(r["Course Category"] ?? "").trim(),
    language:             String(r["Lang Of Inst"] || "English").trim(),
    subject:              clean(r["HST Main Category"]),
    subCategory:          clean(r["HST Sub Category"]),
    gradProgram:          clean(r["Grad Program"]),
    gradRequirement:      clean(r["Grad Program Requirement"]),
    myedbCode:            clean(r["MyEd BC Code"]),
    traxCode:             clean(r["TRAX Code"]),
    developer:            clean(r["Developer"]),
    authorizer:           clean(r["Authorizer"]),
    openDate:             r["Open Date"] ?? null,
    closeDate:            r["Close Date"] ?? null,
    completionEndDate:    r["Completion End Date"] ?? null,
    ministrySubjectCode:  clean(r["Ministry Subject Code"]),
  })).filter((r) => r.code && r.grade && r.title && r.category);
} else {
  if (excelArg) console.warn(`Excel file not found at ${excelArg}, falling back to courses.json`);
  else console.log("No Excel path provided — using courses.json (extra Excel fields will be null)");

  const jsonRows = JSON.parse(
    fs.readFileSync(path.join("src", "data", "courses.json"), "utf-8")
  ) as Array<{
    code: string | number; grade: string; title: string; credits: string | null;
    category: string; language: string; subject: string | null;
    subCategory: string | null; gradProgram: string | null; gradRequirement: string | null;
  }>;

  rawRows = jsonRows.map((r) => ({
    code:                String(r.code).trim(),
    grade:               r.grade.trim(),
    title:               r.title.trim(),
    credits:             r.credits ?? null,
    category:            r.category.trim(),
    language:            (r.language || "English").trim(),
    subject:             r.subject ?? null,
    subCategory:         r.subCategory ?? null,
    gradProgram:         r.gradProgram ?? null,
    gradRequirement:     r.gradRequirement ?? null,
    myedbCode:           null,
    traxCode:            null,
    developer:           null,
    authorizer:          null,
    openDate:            null,
    closeDate:           null,
    completionEndDate:   null,
    ministrySubjectCode: null,
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

const courseMap = new Map<string, CourseRow>();         // key: "code|grade"
const gradPrograms: GradProgramRow[] = [];
const courseDetails: CourseDetailRow[] = [];
const gradRequirements: GradRequirementRow[] = [];
const gradElectives: GradElectiveRow[] = [];

// Track seen grad programs to avoid duplicates within the same (code, grade, program)
const seenGradPrograms = new Set<string>();

for (const row of rawRows) {
  const key = `${row.code}|${row.grade}`;

  if (!courseMap.has(key)) {
    courseMap.set(key, {
      code:                 row.code,
      grade:                row.grade,
      title:                row.title,
      credits:              row.credits,
      category:             row.category,
      language:             row.language,
      subject:              row.subject,
      sub_category:         row.subCategory,
      myedb_code:           row.myedbCode,
      trax_code:            row.traxCode,
      developer:            row.developer,
      authorizer:           row.authorizer,
      open_date:            toIsoDate(row.openDate),
      close_date:           toIsoDate(row.closeDate),
      completion_end_date:  toIsoDate(row.completionEndDate),
      ministry_subject_code: row.ministrySubjectCode,
    });
  }

  if (row.gradProgram) {
    const gpKey = `${row.code}|${row.grade}|${row.gradProgram}`;
    if (!seenGradPrograms.has(gpKey)) {
      seenGradPrograms.add(gpKey);
      gradPrograms.push({
        course_code:     row.code,
        course_grade:    row.grade,
        grad_program:    row.gradProgram,
        grad_requirement: row.gradRequirement ?? null,
      });
    }
  }
}

// course_details, course_grad_requirements, course_grad_electives — from scraper
const seenDetailCodes = new Set<string>();

for (const [code, detail] of Object.entries(detailsMap)) {
  if (!seenDetailCodes.has(code)) {
    seenDetailCodes.add(code);
    courseDetails.push({
      code,
      generic_course_type:   detail.genericCourseType ?? null,
      program_guide_title:   detail.programGuideTitle ? decodeHtml(detail.programGuideTitle) : null,
      published_description: detail.publishedDescription ?? null,
    });
  }

  for (const req of detail.gradRequirements ?? []) {
    gradRequirements.push({
      course_code:     code,
      requirement:     req.requirement,
      examinable_date: req.examinable,
      program_end:     req.program ?? null,
    });
  }

  for (const prog of detail.gradElectives ?? []) {
    gradElectives.push({ course_code: code, grad_program: prog });
  }
}

const courses = Array.from(courseMap.values());

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
  console.log(`  courses:                  ${courses.length}`);
  console.log(`  course_grad_programs:     ${gradPrograms.length}`);
  console.log(`  course_details:           ${courseDetails.length}`);
  console.log(`  course_grad_requirements: ${gradRequirements.length}`);
  console.log(`  course_grad_electives:    ${gradElectives.length}`);
  console.log(`\nLoading...`);

  await upsertBatches("courses", courses, "code,grade");
  await upsertBatches("course_grad_programs", gradPrograms, "course_code,course_grade,grad_program");
  await upsertBatches("course_details", courseDetails, "code");
  await upsertBatches("course_grad_requirements", gradRequirements, "course_code,requirement,examinable_date");
  await upsertBatches("course_grad_electives", gradElectives, "course_code,grad_program");

  console.log("\nDone. Verifying row counts...");

  const tables = [
    { name: "courses",                  expected: courses.length },
    { name: "course_grad_programs",     expected: gradPrograms.length },
    { name: "course_details",           expected: courseDetails.length },
    { name: "course_grad_requirements", expected: gradRequirements.length },
    { name: "course_grad_electives",    expected: gradElectives.length },
  ];

  for (const { name, expected } of tables) {
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
