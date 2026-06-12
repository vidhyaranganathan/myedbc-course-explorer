"""
Scrape per-course details from BC Course Registry.

Course code list is sourced from the live BC Ministry Excel file — the same
source used by load_supabase.ts — so this script stays in sync automatically.

All unique course codes across all grad programs are scraped (course_details
is a superset; the courses table filters to 2023 only at load time).

Usage: python3 scripts/scrape-course-details.py
Resume: Automatically resumes from where it left off (skips already-scraped codes).

Outputs: src/data/course-details.json
"""

import json
import re
import time
import subprocess
import os
import tempfile
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
BASE = "https://www.bced.gov.bc.ca/datacollections/course_registry_web_search"
EXCEL_URL = "https://www.bced.gov.bc.ca/datacollections/course_registry_web_search/data/open_courses.xlsx"
COOKIE_JAR = "/tmp/bced_detail_scrape.jar"
PROGRESS_FILE = "/tmp/bced_scrape_progress.json"
OUTPUT = os.path.join(ROOT, "src", "data", "course-details.json")


# ── Load unique course codes from live Excel ──────────────────────────────────

def get_unique_codes_from_excel():
    """Download the live Ministry Excel and extract all unique course codes."""
    print(f"Downloading course list from Ministry: {EXCEL_URL}")
    tmp = tempfile.mktemp(suffix=".xlsx")
    try:
        urllib.request.urlretrieve(EXCEL_URL, tmp)
        print("Download complete.")
    except Exception as e:
        print(f"Download failed: {e}")
        print("Falling back to courses.json for code list...")
        fallback = os.path.join(ROOT, "src", "data", "courses.json")
        with open(fallback) as f:
            courses = json.load(f)
        return sorted(set(str(c["code"]).strip() for c in courses))

    try:
        import subprocess as sp
        result = sp.run(
            ["node", "-e", f"""
const XLSX = require('xlsx');
const wb = XLSX.readFile('{tmp}');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);
const codes = [...new Set(rows.map(r => String(r['Course Code']).trim()))].sort();
console.log(JSON.stringify(codes));
"""],
            capture_output=True, text=True, cwd=ROOT
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        codes = json.loads(result.stdout.strip())
        print(f"Unique course codes from Excel: {len(codes)}")
        return codes
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


unique_codes = get_unique_codes_from_excel()
print(f"Total unique course codes: {len(unique_codes)}")

# ── Load existing progress ────────────────────────────────────────────────────

details = {}
if os.path.exists(PROGRESS_FILE):
    with open(PROGRESS_FILE) as f:
        details = json.load(f)
    print(f"Resuming: {len(details)} already scraped")

# Merge any existing output file so we don't lose previously scraped data
if os.path.exists(OUTPUT):
    with open(OUTPUT) as f:
        existing = json.load(f)
    before = len(details)
    for code, val in existing.items():
        if code not in details:
            details[code] = val
    merged = len(details) - before
    if merged > 0:
        print(f"Merged {merged} entries from existing course-details.json")


# ── Scraping helpers ──────────────────────────────────────────────────────────

def curl(url, post_data=None):
    cmd = ["curl", "-sL", "-b", COOKIE_JAR, "-c", COOKIE_JAR, "--max-time", "15"]
    if post_data:
        cmd += ["-X", "POST", "-d", post_data]
    cmd.append(url)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        return result.stdout
    except subprocess.TimeoutExpired:
        return ""


def new_session():
    if os.path.exists(COOKIE_JAR):
        os.remove(COOKIE_JAR)
    curl(f"{BASE}/simple-search.php")
    curl(f"{BASE}/run-search.php", "txtKeyword=a")
    time.sleep(0.5)


def parse_detail(html):
    if "No course matches" in html or len(html) < 500:
        return None

    m = re.search(r'Course Details(.*?)return-search', html, re.DOTALL)
    if not m:
        return None

    content = m.group(1)
    cells = re.findall(r'<td[^>]*>(.*?)</td>', content, re.DOTALL)
    texts = []
    for c in cells:
        text = re.sub(r'<[^>]+>', '', c).strip()
        text = re.sub(r'\s+', ' ', text)
        text = text.replace('&nbsp;', '').replace('&amp;', '&').strip()
        texts.append(text)

    result = {}

    for i, t in enumerate(texts):
        if i + 1 < len(texts):
            val = texts[i + 1]
            if t == "Program Guide Title:" and val:
                result["programGuideTitle"] = val
            elif t == "Published Description:" and val:
                result["publishedDescription"] = val
            elif t == "Generic Course Type:" and val:
                result["genericCourseType"] = val

    req_match = re.search(r'\[Grad Program Requirements\](.*?)(?:\[|$)', content, re.DOTALL)
    if req_match:
        req_cells = re.findall(r'<td[^>]*>(.*?)</td>', req_match.group(1), re.DOTALL)
        req_texts = [re.sub(r'<[^>]+>', '', c).strip().replace('&nbsp;', '').strip() for c in req_cells]
        reqs = []
        i = 5
        while i + 4 < len(req_texts):
            name = req_texts[i]
            req = req_texts[i + 3]
            exam = req_texts[i + 4]
            if name:
                reqs.append({"program": name, "requirement": req, "examinable": exam})
            i += 5
        if reqs:
            result["gradRequirements"] = reqs

    elec_match = re.search(r'\[Grad Program Electives\](.*?)(?:\[|$)', content, re.DOTALL)
    if elec_match:
        elec_cells = re.findall(r'<td[^>]*>(.*?)</td>', elec_match.group(1), re.DOTALL)
        elec_texts = [re.sub(r'<[^>]+>', '', c).strip().replace('&nbsp;', '').strip() for c in elec_cells]
        elecs = []
        i = 5
        while i + 4 < len(elec_texts):
            name = elec_texts[i]
            if name:
                elecs.append(name)
            i += 5
        if elecs:
            result["gradElectives"] = list(set(elecs))

    return result if result else None


# ── Scrape ────────────────────────────────────────────────────────────────────

remaining = [c for c in unique_codes if c not in details]
print(f"Remaining to scrape: {len(remaining)}")

if not remaining:
    print("All done!")
else:
    new_session()
    session_count = 0
    errors = 0

    for i, code in enumerate(remaining):
        if session_count > 0 and session_count % 200 == 0:
            print("  Refreshing session...")
            new_session()

        if (i + 1) % 50 == 0 or i == 0:
            print(f"[{len(details)}/{len(unique_codes)}] Scraping {code}...")

        try:
            html = curl(f"{BASE}/run-details.php?courseCode={code}")
            parsed = parse_detail(html)
            details[code] = parsed if parsed else {}
        except Exception as e:
            print(f"  ERROR on {code}: {e}")
            details[code] = {"error": str(e)}
            errors += 1

        session_count += 1

        if session_count % 100 == 0:
            with open(PROGRESS_FILE, "w") as f:
                json.dump(details, f)
            print(f"  Progress saved: {len(details)}/{len(unique_codes)}")

        time.sleep(0.3)

    with open(PROGRESS_FILE, "w") as f:
        json.dump(details, f)

# ── Write output ──────────────────────────────────────────────────────────────

with open(OUTPUT, "w") as f:
    json.dump(details, f)

has_desc  = sum(1 for v in details.values() if v.get("publishedDescription"))
has_guide = sum(1 for v in details.values() if v.get("programGuideTitle"))
print(f"\nComplete: {len(details)} courses scraped")
print(f"  With published description: {has_desc}")
print(f"  With program guide title:   {has_guide}")
print(f"  Output: {OUTPUT}")
