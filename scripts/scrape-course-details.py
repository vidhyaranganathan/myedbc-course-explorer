"""
Scrape per-course details from BC Course Registry.
~5,480 unique courses. Saves progress to resume if interrupted.

Usage: python3 scripts/scrape-course-details.py
Resume: Automatically resumes from where it left off.

Outputs: src/data/course-details.json
"""

import json
import re
import time
import subprocess
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
BASE = "https://www.bced.gov.bc.ca/datacollections/course_registry_web_search"
COOKIE_JAR = "/tmp/bced_detail_scrape.jar"
PROGRESS_FILE = "/tmp/bced_scrape_progress.json"
OUTPUT = os.path.join(ROOT, "src", "data", "course-details.json")

# Load courses to get unique codes
with open(os.path.join(ROOT, "src/data/courses.json")) as f:
    courses = json.load(f)

unique_codes = sorted(set(c["code"] for c in courses))
print(f"Total unique course codes: {len(unique_codes)}")

# Load progress
details = {}
if os.path.exists(PROGRESS_FILE):
    with open(PROGRESS_FILE) as f:
        details = json.load(f)
    print(f"Resuming: {len(details)} already scraped")

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
    """Start a fresh session."""
    if os.path.exists(COOKIE_JAR):
        os.remove(COOKIE_JAR)
    curl(f"{BASE}/simple-search.php")
    curl(f"{BASE}/run-search.php", "txtKeyword=a")
    time.sleep(0.5)

def parse_detail(html):
    """Extract course details from detail page HTML."""
    if "No course matches" in html or len(html) < 500:
        return None

    # Get all text between Course Details and footer
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

    # Extract key-value pairs
    for i, t in enumerate(texts):
        if i + 1 < len(texts):
            val = texts[i + 1]
            if t == "Program Guide Title:" and val:
                result["programGuideTitle"] = val
            elif t == "Published Description:" and val:
                result["publishedDescription"] = val
            elif t == "Generic Course Type:" and val:
                result["genericCourseType"] = val

    # Extract Grad Program Requirements
    req_match = re.search(r'\[Grad Program Requirements\](.*?)(?:\[|$)', content, re.DOTALL)
    if req_match:
        req_cells = re.findall(r'<td[^>]*>(.*?)</td>', req_match.group(1), re.DOTALL)
        req_texts = [re.sub(r'<[^>]+>', '', c).strip().replace('&nbsp;', '').strip() for c in req_cells]
        # Skip header row (5 columns: Program Name, Start Date, End Date, Requirement, Examinable)
        reqs = []
        i = 5  # skip headers
        while i + 4 < len(req_texts):
            name = req_texts[i]
            req = req_texts[i + 3]
            exam = req_texts[i + 4]
            if name:
                reqs.append({"program": name, "requirement": req, "examinable": exam})
            i += 5
        if reqs:
            result["gradRequirements"] = reqs

    # Extract Grad Program Electives
    elec_match = re.search(r'\[Grad Program Electives\](.*?)(?:\[|$)', content, re.DOTALL)
    if elec_match:
        elec_cells = re.findall(r'<td[^>]*>(.*?)</td>', elec_match.group(1), re.DOTALL)
        elec_texts = [re.sub(r'<[^>]+>', '', c).strip().replace('&nbsp;', '').strip() for c in elec_cells]
        # Skip header row (5 columns)
        elecs = []
        i = 5
        while i + 4 < len(elec_texts):
            name = elec_texts[i]
            if name:
                elecs.append(name)
            i += 5
        if elecs:
            result["gradElectives"] = list(set(elecs))  # deduplicate

    return result if result else None

# Start scraping
remaining = [c for c in unique_codes if c not in details]
print(f"Remaining to scrape: {len(remaining)}")

if not remaining:
    print("All done!")
else:
    new_session()
    session_count = 0
    errors = 0

    for i, code in enumerate(remaining):
        # Refresh session every 200 requests
        if session_count > 0 and session_count % 200 == 0:
            print("  Refreshing session...")
            new_session()

        if (i + 1) % 50 == 0 or i == 0:
            print(f"[{len(details)}/{len(unique_codes)}] Scraping {code}...")

        try:
            html = curl(f"{BASE}/run-details.php?courseCode={code}")
            parsed = parse_detail(html)

            if parsed:
                details[code] = parsed
            else:
                details[code] = {}  # Mark as scraped (empty)

        except Exception as e:
            print(f"  ERROR on {code}: {e}")
            details[code] = {"error": str(e)}
            errors += 1

        session_count += 1

        # Save progress every 100 courses
        if session_count % 100 == 0:
            with open(PROGRESS_FILE, "w") as f:
                json.dump(details, f)
            print(f"  Progress saved: {len(details)}/{len(unique_codes)}")

        time.sleep(0.3)  # ~3 requests/second

    # Final save
    with open(PROGRESS_FILE, "w") as f:
        json.dump(details, f)

# Write output
with open(OUTPUT, "w") as f:
    json.dump(details, f)

has_desc = sum(1 for v in details.values() if v.get("publishedDescription"))
has_guide = sum(1 for v in details.values() if v.get("programGuideTitle"))
print(f"\nComplete: {len(details)} courses scraped")
print(f"  With published description: {has_desc}")
print(f"  With program guide title: {has_guide}")
print(f"  Output: {OUTPUT}")
