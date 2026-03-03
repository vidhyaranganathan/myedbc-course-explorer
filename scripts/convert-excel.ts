/**
 * Convert Excel course data to JSON for client-side use.
 *
 * Usage: npm run import
 *
 * Reads: ~/Downloads/open_courses (1).xlsx (or path passed as CLI arg)
 * Writes: src/data/courses.json
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

interface ExcelRow {
  "Course Code": number | string;
  Grade: string;
  "Course Title": string;
  "Credit Value": string | number | null;
  "MyEd BC Code": string | null;
  "TRAX Code": string | null;
  "Course Category": string;
  "Lang Of Inst": string;
  Developer: string | null;
  Authorizer: string | null;
  "Open Date": string | number | null;
  "Close Date": string | number | null;
  "Completion End Date": string | number | null;
  "Grad Program": string | null;
  "Grad Program Requirement": string | null;
  "HST Main Category": string | null;
  "HST Sub Category": string | null;
  "Ministry Subject Code": string | null;
}

export interface Course {
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
}

function clean(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value).trim();
}

function transformRow(row: ExcelRow): Course {
  return {
    code: String(row["Course Code"]),
    grade: String(row["Grade"]).trim(),
    title: String(row["Course Title"]).trim(),
    credits: clean(row["Credit Value"]),
    category: String(row["Course Category"]).trim(),
    language: String(row["Lang Of Inst"] || "English").trim(),
    subject: clean(row["HST Main Category"]),
    subCategory: clean(row["HST Sub Category"]),
    gradProgram: clean(row["Grad Program"]),
    gradRequirement: clean(row["Grad Program Requirement"]),
  };
}

const excelPath =
  process.argv[2] ||
  path.join(
    process.env.HOME || "~",
    "Downloads",
    "open_courses (1).xlsx"
  );

const outPath = path.join(__dirname, "..", "src", "data", "courses.json");

console.log(`Reading: ${excelPath}`);
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

const courses = rows
  .map(transformRow)
  .filter((c) => c.code && c.grade && c.title && c.category);

fs.writeFileSync(outPath, JSON.stringify(courses));

const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
console.log(`Wrote ${courses.length} courses to ${outPath} (${sizeKB} KB)`);
