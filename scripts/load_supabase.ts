/**
 * Push course data to the DB **through the write API** (ADR-007).
 *
 * Nothing writes to Supabase directly anymore — this script reads a JSON payload
 * file and POSTs it to /api/courses, which performs the secret-gated bulk upsert.
 * There is no Excel download and no committed JSON source: the DB is the single
 * source of truth, and re-syncs supply a transient payload file produced by
 * whatever upstream process generated it.
 *
 * Payload file shape (snake_case rows matching the DB columns):
 *   {
 *     "courses": [ { code, grade, title, credits, category, language,
 *                    subject, sub_category, myedb_code, trax_code,
 *                    developer, grad_requirement }, ... ]
 *   }
 *
 * (course_details is not written via the API — see ADR-009.)
 *
 * Usage:
 *   npm run db:load -- ./payload.json
 *
 * Env (.env.local):
 *   API_BASE_URL      base URL of the running app (default http://localhost:3000)
 *   API_WRITE_SECRET  shared secret sent as the X-Api-Key header
 *
 * (No Supabase URL/key here — this script only talks to the HTTP API.)
 */

import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const API_WRITE_SECRET = process.env.API_WRITE_SECRET;

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) {
    console.error("Usage: npm run db:load -- <payload.json>");
    process.exit(1);
  }
  if (!API_WRITE_SECRET) {
    console.error("Missing API_WRITE_SECRET in .env.local");
    process.exit(1);
  }
  if (!fs.existsSync(payloadPath)) {
    console.error(`Payload file not found: ${payloadPath}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf-8"));
  const courseCount = Array.isArray(payload.courses) ? payload.courses.length : 0;
  console.log(`Posting ${courseCount} courses to ${API_BASE_URL}/api/courses ...`);

  const res = await fetch(`${API_BASE_URL}/api/courses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_WRITE_SECRET,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`API responded ${res.status}: ${text}`);
    process.exit(1);
  }
  console.log(`Done. ${text}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
