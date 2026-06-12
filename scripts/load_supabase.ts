/**
 * Load course data into Supabase.
 *
 * Primary source: BC Ministry of Education open courses Excel file (downloaded at runtime).
 * Fallback:       src/data/courses.json (myedb_code, trax_code, developer will be null).
 *
 * Usage:
 *   npm run db:load                               # downloads live Excel from Ministry
 *   npm run db:load -- /path/to/open_courses.xlsx # use a local Excel file
 *   npm run db:load -- --json                     # force fallback to courses.json
 *
 * Populates:
 *   courses        — filtered to 2023 Graduation Program only (~3,951 rows).
 *                    One row per (code, grade). grad_requirement is flat text.
 *   course_details — one row per code (scraped data). grad_requirements and
 *                    grad_electives stored as jsonb arrays.
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

// ── Config ────────────────────────────────────────────────────────────────────

const EXCEL_URL =
  "https://www.bced.gov.bc.ca/datacollections/course_registry_web_search/data/open_courses.xlsx";
const GRAD_PROGRAM_2023 = "2023 Graduation Program";
const BATCH_SIZE = 200;

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
  grad_requirement: string | null;
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

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// ── Load source data ──────────────────────────────────────────────────────────

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

async function loadRawRows(): Promise<RawRow[]> {
  const arg = process.argv[2];

  // Force JSON fallback
  if (arg === "--json") {
    console.log("Using courses.json fallback (myedb_code, trax_code, developer will be null)");
    return loadFromJson();
  }

  // Local Excel file passed as argument
  if (arg && fs.existsSync(arg)) {
    console.log(`Reading local Excel: ${arg}`);
    return loadFromExcel(arg);
  }

  // Download live Excel from Ministry
  const tmpPath = "/tmp/open_courses_bc.xlsx";
  console.log(`Downloading Excel from Ministry: ${EXCEL_URL}`);
  try {
    await downloadFile(EXCEL_URL, tmpPath);
    console.log("Download complete.");
    return loadFromExcel(tmpPath);
  } catch (err) {
    console.warn(`Download failed (${(err as Error).message}), falling back to courses.json`);
    return loadFromJson();
  }
}

function loadFromExcel(filePath: string): RawRow[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  return rows.map((r) => ({
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
}

function loadFromJson(): RawRow[] {
  const jsonRows = JSON.parse(
    fs.readFileSync(path.join("src", "data", "courses.json"), "utf-8")
  ) as Array<{
    code: string | number; grade: string; title: string; credits: string | null;
    category: string; language: string; subject: string | null;
    subCategory: string | null; gradProgram: string | null; gradRequirement: string | null;
  }>;
  return jsonRows.map((r) => ({
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
  const rawRows = await loadRawRows();

  // Filter to 2023 Graduation Program — each (code, grade) is unique at this filter
  const seen = new Set<string>();
  const courses: CourseRow[] = [];

  for (const row of rawRows) {
    if (row.gradProgram !== GRAD_PROGRAM_2023) continue;
    const key = `${row.code}|${row.grade}`;
    if (seen.has(key)) continue;
    seen.add(key);
    courses.push({
      code:             row.code,
      grade:            row.grade,
      title:            row.title,
      credits:          row.credits,
      category:         row.category,
      language:         row.language,
      subject:          row.subject,
      sub_category:     row.subCategory,
      myedb_code:       row.myedbCode,
      trax_code:        row.traxCode,
      developer:        row.developer,
      grad_requirement: row.gradRequirement,
    });
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

  const courseDetails: CourseDetailRow[] = Object.entries(detailsMap).map(([code, detail]) => ({
    code,
    generic_course_type:   detail.genericCourseType ?? null,
    program_guide_title:   detail.programGuideTitle ? decodeHtml(detail.programGuideTitle) : null,
    published_description: detail.publishedDescription ?? null,
    grad_requirements:     detail.gradRequirements ?? [],
    grad_electives:        detail.gradElectives ?? [],
  }));

  console.log(`\nTransformed (${GRAD_PROGRAM_2023} only):`);
  console.log(`  courses:        ${courses.length}`);
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
