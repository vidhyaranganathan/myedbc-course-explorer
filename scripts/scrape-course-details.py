"""
Scrape published_description from BC Course Registry for each course in the DB.

Steps:
  1. Reads env vars from .env.local (SUPABASE_URL, SUPABASE_SECRET_KEY, API_BASE_URL)
  2. Deletes ABE courses from the DB
  3. Reads remaining course codes from GET /api/courses
  4. Scrapes published_description for each code from BC Course Registry
  5. Writes published_description back to the DB via Supabase REST PATCH

Usage:
  python3 scripts/scrape-course-details.py                    # full run
  python3 scripts/scrape-course-details.py --test             # dry-run, no DB writes
  python3 scripts/scrape-course-details.py --test 3401401     # test specific code(s)

Resume: automatically resumes from where it left off (progress saved every 100 requests).
"""

import json
import re
import html as html_lib
import time
import subprocess
import os
import sys
import ssl
import certifi
import urllib.request
import urllib.parse

# Python 3.13 on macOS doesn't link to system CA certs by default.
# Use certifi's bundle so HTTPS calls to Supabase work without manual cert installation.
ssl_ctx = ssl.create_default_context(cafile=certifi.where())
https_handler = urllib.request.HTTPSHandler(context=ssl_ctx)
opener = urllib.request.build_opener(https_handler)
urllib.request.install_opener(opener)

SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
ROOT          = os.path.dirname(SCRIPT_DIR)
BASE          = "https://www.bced.gov.bc.ca/datacollections/course_registry_web_search"
COOKIE_JAR    = "/tmp/bced_detail_scrape.jar"
PROGRESS_FILE = "/tmp/bced_scrape_progress.json"
TEST_MODE     = "--test" in sys.argv
TEST_CODES    = ["3401401"]  # ACTIVE LIVING 12 — confirmed to return a description
MAX_RETRIES   = 3


# ── Env vars ──────────────────────────────────────────────────────────────────

def load_env(path):
    env = {}
    if not os.path.exists(path):
        return env
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            env[key.strip()] = val.strip().strip('"').strip("'")
    return env

env          = load_env(os.path.join(ROOT, ".env.local"))
SUPABASE_URL = env.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = env.get("SUPABASE_SECRET_KEY", "")
API_BASE_URL = env.get("API_BASE_URL", "http://localhost:3000").rstrip("/")

if not TEST_MODE and (not SUPABASE_URL or not SUPABASE_KEY):
    print("ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local")
    sys.exit(1)


# ── Supabase helpers ──────────────────────────────────────────────────────────

def delete_abe_courses():
    print("Deleting ABE courses from DB...")
    url = f"{SUPABASE_URL}/rest/v1/courses?title=ilike.*ABE*"
    req = urllib.request.Request(url, method="DELETE")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Prefer", "count=exact")
    with urllib.request.urlopen(req) as res:
        count = res.headers.get("Content-Range", "*/0").split("/")[-1]
    print(f"  Deleted {count} ABE courses.")


def write_description(code, description):
    url = f"{SUPABASE_URL}/rest/v1/courses?code=eq.{urllib.parse.quote(code)}"
    data = json.dumps({"published_description": description}).encode()
    req = urllib.request.Request(url, data=data, method="PATCH")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    with urllib.request.urlopen(req) as res:
        return res.status


# ── API helpers ───────────────────────────────────────────────────────────────

def get_courses_from_api():
    print(f"Loading courses from {API_BASE_URL}/api/courses ...")
    with urllib.request.urlopen(f"{API_BASE_URL}/api/courses") as res:
        courses = json.loads(res.read().decode())
    print(f"  {len(courses)} courses loaded.")
    return courses


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
    time.sleep(0.5)


def extract_text(raw):
    raw  = re.sub(r'<br\s*/?>', '\n', raw, flags=re.IGNORECASE)
    raw  = re.sub(r'</p>', '\n', raw, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', raw)
    text = html_lib.unescape(text.replace('&nbsp;', ' '))
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def parse_description(html_content):
    if not html_content or "No course matches" in html_content or len(html_content) < 500:
        return None
    m = re.search(r'Course Details(.*?)return-search', html_content, re.DOTALL)
    if not m:
        return None
    desc_match = re.search(
        r'Published Description:</td>\s*<td[^>]*>(.*?)</td>',
        m.group(1), re.DOTALL | re.IGNORECASE
    )
    if not desc_match:
        return None
    text = extract_text(desc_match.group(1))
    return text if text else None


def scrape_one(code):
    html = curl(f"{BASE}/run-details.php?courseCode={code}")
    if not html or len(html) < 500:
        print("  Session expired, refreshing...")
        new_session()
        html = curl(f"{BASE}/run-details.php?courseCode={code}")
    return parse_description(html)


# ── Test mode ─────────────────────────────────────────────────────────────────

if TEST_MODE:
    print("=== TEST MODE — no DB writes ===\n")
    try:
        courses = get_courses_from_api()
        print(f"API reachable: {len(courses)} courses.\n")
    except Exception as e:
        print(f"ERROR: Cannot reach API: {e}")
        sys.exit(1)

    codes = sys.argv[2:] or TEST_CODES
    new_session()
    found = 0
    for code in codes:
        print(f"[TEST] Scraping {code}...")
        desc = scrape_one(code)
        if desc:
            preview = desc[:120] + "..." if len(desc) > 120 else desc
            print(f"  publishedDescription: {preview!r}")
            found += 1
        else:
            print(f"  publishedDescription: None")
        time.sleep(0.3)

    print(f"\n[TEST] {found}/{len(codes)} had a published description.")
    print("[TEST] No DB writes were made.")
    sys.exit(0)


# ── Load progress ─────────────────────────────────────────────────────────────

progress = set()
if os.path.exists(PROGRESS_FILE):
    with open(PROGRESS_FILE) as f:
        progress = set(json.load(f))
    print(f"Resuming: {len(progress)} already scraped.")


# ── Delete ABE + load courses ─────────────────────────────────────────────────

delete_abe_courses()
all_courses = get_courses_from_api()
all_codes   = [c["code"] for c in all_courses]
remaining   = [c for c in all_codes if c not in progress]
print(f"Total: {len(all_codes)} | Done: {len(progress)} | Remaining: {len(remaining)}")

if not remaining:
    print("All done!")
    sys.exit(0)


# ── Scrape ────────────────────────────────────────────────────────────────────

new_session()
errors = 0

for i, code in enumerate(remaining):
    if (i + 1) % 50 == 0:
        print(f"[{len(progress)}/{len(all_codes)}] scraping...")

    for attempt in range(MAX_RETRIES):
        try:
            desc = scrape_one(code)
            print(f"  [{i + 1}/{len(remaining)}] {code}: {desc}")
            write_description(code, desc)
            progress.add(code)
            break
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                print(f"  FAILED {code}: {e}")
                errors += 1
            else:
                time.sleep(2 ** attempt)

    if len(progress) % 100 == 0:
        with open(PROGRESS_FILE, "w") as f:
            json.dump(list(progress), f)
        print(f"  Progress saved: {len(progress)}/{len(all_codes)}")

    time.sleep(0.3)

with open(PROGRESS_FILE, "w") as f:
    json.dump(list(progress), f)

print(f"\nComplete: {len(progress)} courses processed, {errors} errors.")
