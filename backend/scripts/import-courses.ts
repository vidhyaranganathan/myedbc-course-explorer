/**
 * Import courses from Excel file into Supabase
 *
 * Usage: npm run import
 *
 * Prerequisites:
 * 1. Set up .env file with SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
 * 2. Run migrations in Supabase SQL editor
 * 3. Place open_courses.xlsx in backend/data/
 */

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const BATCH_SIZE = 1000;

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

interface CourseInsert {
  code: string;
  myedbc_code: string | null;
  trax_code: string | null;
  grade: string;
  course_title: string;
  credit_value: string | null;
  category: string;
  language: string;
  developer: string | null;
  authorizer: string | null;
  open_date: string | null;
  close_date: string | null;
  completion_end_date: string | null;
  grad_program: string | null;
  grad_program_requirement: string | null;
  hst_main_category: string | null;
  hst_sub_category: string | null;
  ministry_subject_code: string | null;
}

function parseExcelDate(value: string | number | null): string | null {
  if (!value) return null;

  // If it's a number (Excel serial date)
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const year = date.y;
      const month = String(date.m).padStart(2, "0");
      const day = String(date.d).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  // If it's a string, try to parse it
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  }

  return null;
}

function cleanString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value).trim();
}

function transformRow(row: ExcelRow): CourseInsert {
  return {
    code: String(row["Course Code"]),
    myedbc_code: cleanString(row["MyEd BC Code"]),
    trax_code: cleanString(row["TRAX Code"]),
    grade: String(row["Grade"]).trim(),
    course_title: String(row["Course Title"]).trim(),
    credit_value: cleanString(row["Credit Value"]),
    category: String(row["Course Category"]).trim(),
    language: String(row["Lang Of Inst"] || "English").trim(),
    developer: cleanString(row["Developer"]),
    authorizer: cleanString(row["Authorizer"]),
    open_date: parseExcelDate(row["Open Date"]),
    close_date: parseExcelDate(row["Close Date"]),
    completion_end_date: parseExcelDate(row["Completion End Date"]),
    grad_program: cleanString(row["Grad Program"]),
    grad_program_requirement: cleanString(row["Grad Program Requirement"]),
    hst_main_category: cleanString(row["HST Main Category"]),
    hst_sub_category: cleanString(row["HST Sub Category"]),
    ministry_subject_code: cleanString(row["Ministry Subject Code"]),
  };
}

function validateRow(row: CourseInsert, index: number): string | null {
  if (!row.code) return `Row ${index}: Missing course code`;
  if (!row.grade) return `Row ${index}: Missing grade`;
  if (!row.course_title) return `Row ${index}: Missing course title`;
  if (!row.category) return `Row ${index}: Missing category`;
  return null;
}

async function main() {
  console.log("=== BC Course Import Script ===\n");

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: Missing required environment variables.");
    console.error("Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file.");
    process.exit(1);
  }

  // Create Supabase client with service key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read Excel file
  const excelPath = path.join(__dirname, "..", "data", "open_courses.xlsx");
  console.log(`Reading Excel file: ${excelPath}`);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(excelPath);
  } catch (error) {
    console.error(`Error reading Excel file: ${error}`);
    console.error("\nMake sure open_courses.xlsx is in the backend/data/ directory.");
    process.exit(1);
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${rows.length} rows in sheet "${sheetName}"\n`);

  // Transform and validate rows
  const courses: CourseInsert[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const course = transformRow(rows[i]);
      const validationError = validateRow(course, i + 2); // +2 for header row and 1-indexing

      if (validationError) {
        errors.push(validationError);
      } else {
        courses.push(course);
      }
    } catch (error) {
      errors.push(`Row ${i + 2}: Transform error - ${error}`);
    }
  }

  console.log(`Validated: ${courses.length} courses, ${errors.length} errors\n`);

  if (errors.length > 0) {
    console.log("Validation errors (first 10):");
    errors.slice(0, 10).forEach((err) => console.log(`  - ${err}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
    console.log();
  }

  // Clear existing data
  console.log("Clearing existing courses...");
  const { error: deleteError } = await supabase.from("courses").delete().neq("id", 0);
  if (deleteError) {
    console.error("Error clearing courses:", deleteError);
    process.exit(1);
  }

  // Insert in batches
  console.log(`Inserting ${courses.length} courses in batches of ${BATCH_SIZE}...\n`);

  let imported = 0;
  let failed = 0;

  for (let i = 0; i < courses.length; i += BATCH_SIZE) {
    const batch = courses.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(courses.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches}: `);

    const { error } = await supabase.from("courses").insert(batch);

    if (error) {
      console.log(`FAILED - ${error.message}`);
      failed += batch.length;
      errors.push(`Batch ${batchNum}: ${error.message}`);
    } else {
      console.log(`OK (${batch.length} rows)`);
      imported += batch.length;
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`Imported: ${imported}`);
  console.log(`Failed: ${failed}`);
  console.log(`Validation Errors: ${errors.length}`);

  // Log import to data_imports table
  const { error: logError } = await supabase.from("data_imports").insert({
    filename: "open_courses.xlsx",
    rows_imported: imported,
    rows_failed: failed,
    errors: errors.length > 0 ? errors.slice(0, 100) : null,
  });

  if (logError) {
    console.log(`\nWarning: Could not log import: ${logError.message}`);
  } else {
    console.log("\nImport logged to data_imports table.");
  }

  // Verify import
  const { count } = await supabase.from("courses").select("*", { count: "exact", head: true });
  console.log(`\nTotal courses in database: ${count}`);
}

main().catch(console.error);
