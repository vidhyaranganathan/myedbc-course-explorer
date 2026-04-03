import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import * as fs from "fs/promises";
import * as path from "path";
import type { Course } from "@/lib/types";

interface ExcelRow {
  "Course Code": number | string;
  Grade: string;
  "Course Title": string;
  "Credit Value": string | number | null;
  "Course Category": string;
  "Lang Of Inst": string;
  "HST Main Category": string | null;
  "HST Sub Category": string | null;
  "Grad Program": string | null;
  "Grad Program Requirement": string | null;
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

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const workbook = XLSX.read(await file.arrayBuffer());
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

  const courses = rows
    .map(transformRow)
    .filter((c) => c.code && c.grade && c.title && c.category);

  const outPath = path.join(process.cwd(), "src", "data", "courses.json");
  await fs.writeFile(outPath, JSON.stringify(courses));

  return NextResponse.json({
    message: `Imported ${courses.length} courses`,
    count: courses.length,
  });
}
