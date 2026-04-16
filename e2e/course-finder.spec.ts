import { test, expect, type Page } from "@playwright/test";

// Wait for the page to be ready (real data loaded and rendered)
async function waitForReady(page: Page) {
  await expect(page.getByText(/[\d,]+ courses/)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForReady(page);
});

// ─── Smoke ────────────────────────────────────────────────────────────────────

test("page loads with title and real course count", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "BC Course Finder" })).toBeVisible();

  // Real data: expect thousands of courses, not the 5 fake ones from unit tests
  const countText = await page.getByText(/[\d,]+ courses/).textContent();
  const count = parseInt(countText!.replace(/[^0-9]/g, ""), 10);
  expect(count).toBeGreaterThan(1000);
});

test("grade 8 and below courses are not shown", async ({ page }) => {
  // Grades 9-12 only — elementary courses must be filtered out at boot
  const gradeSelect = page.getByRole("combobox").first();
  const options = await gradeSelect.locator("option").allTextContents();
  const grades = options
    .map((o) => o.match(/Grade (\d+)/)?.[1])
    .filter(Boolean)
    .map(Number);
  expect(grades.every((g) => g >= 9)).toBe(true);
});

// ─── Search ───────────────────────────────────────────────────────────────────

test("search by title narrows results", async ({ page }) => {
  const input = page.getByPlaceholder("Search by course title, code, or subject...");
  await input.fill("Mathematics");

  await expect(page.getByText(/of [\d,]+ courses/)).toBeVisible();
  const countText = await page.getByText(/[\d,]+ of [\d,]+ courses/).textContent();
  const shown = parseInt(countText!.split(" of ")[0].replace(/[^0-9]/g, ""), 10);
  expect(shown).toBeGreaterThan(0);
  expect(shown).toBeLessThan(1000);
});

test("search by course code returns relevant results", async ({ page }) => {
  // Grab a real course code from the first visible card, then search for it
  const firstCode = await page.locator("span.font-mono").first().textContent();
  expect(firstCode).toBeTruthy();

  const input = page.getByPlaceholder("Search by course title, code, or subject...");
  await input.fill(firstCode!.trim());

  const countText = await page.getByText(/[\d,]+ of [\d,]+ courses/).textContent();
  const shown = parseInt(countText!.split(" of ")[0].replace(/[^0-9]/g, ""), 10);
  expect(shown).toBeGreaterThan(0);
});

test("search is case-insensitive", async ({ page }) => {
  const input = page.getByPlaceholder("Search by course title, code, or subject...");

  await input.fill("mathematics");
  const lower = await page.getByText(/[\d,]+ of [\d,]+ courses/).textContent();

  await input.fill("MATHEMATICS");
  const upper = await page.getByText(/[\d,]+ of [\d,]+ courses/).textContent();

  expect(lower).toBe(upper);
});

test("no results message appears for unmatched search", async ({ page }) => {
  const input = page.getByPlaceholder("Search by course title, code, or subject...");
  await input.fill("xyznonexistent99999");

  await expect(page.getByText("No courses match your filters")).toBeVisible();
  await expect(page.getByText("Clear filters")).toBeVisible();
});

// ─── Filters ──────────────────────────────────────────────────────────────────

test("grade filter narrows results", async ({ page }) => {
  const gradeSelect = page.getByRole("combobox").first();
  await gradeSelect.selectOption("10"); // select by option value

  await expect(page.getByText(/of [\d,]+ courses/)).toBeVisible();
  const countText = await page.getByText(/[\d,]+ of [\d,]+ courses/).textContent();
  const shown = parseInt(countText!.split(" of ")[0].replace(/[^0-9]/g, ""), 10);
  expect(shown).toBeGreaterThan(0);
  expect(shown).toBeLessThan(1000);
});

test("combining search and grade filter narrows results further", async ({ page }) => {
  // Grade only
  const gradeSelect = page.getByRole("combobox").first();
  await gradeSelect.selectOption("11"); // select by option value
  const gradeOnlyText = await page.getByText(/[\d,]+ of [\d,]+ courses/).textContent();
  const gradeOnly = parseInt(gradeOnlyText!.split(" of ")[0].replace(/[^0-9]/g, ""), 10);

  // Grade + search
  const input = page.getByPlaceholder("Search by course title, code, or subject...");
  await input.fill("science");
  const combinedText = await page.getByText(/[\d,]+ of [\d,]+ courses/).textContent();
  const combined = parseInt(combinedText!.split(" of ")[0].replace(/[^0-9]/g, ""), 10);

  expect(combined).toBeLessThan(gradeOnly);
  expect(combined).toBeGreaterThan(0);
});

test("clear all filters resets to full count", async ({ page }) => {
  const fullCountText = await page.getByText(/[\d,]+ courses/).textContent();

  const input = page.getByPlaceholder("Search by course title, code, or subject...");
  await input.fill("math");
  await expect(page.getByText("Clear all filters")).toBeVisible();

  await page.getByText("Clear all filters").click();
  await expect(page.getByText("Clear all filters")).not.toBeVisible();

  const resetCountText = await page.getByText(/[\d,]+ courses/).textContent();
  expect(resetCountText).toBe(fullCountText);
});

test("five filter dropdowns are rendered", async ({ page }) => {
  const selects = page.getByRole("combobox");
  await expect(selects).toHaveCount(5);
});

// ─── Course cards ─────────────────────────────────────────────────────────────

test("clicking a course card expands it", async ({ page }) => {
  const firstCard = page.getByRole("button").filter({ hasText: /Grade/ }).first();
  await firstCard.click();

  // Expanded area should appear below — look for detail labels
  await expect(page.getByText("Course Code")).toBeVisible();
});

test("clicking an expanded card collapses it", async ({ page }) => {
  const firstCard = page.getByRole("button").filter({ hasText: /Grade/ }).first();
  await firstCard.click();
  await expect(page.getByText("Course Code")).toBeVisible();

  await firstCard.click();
  await expect(page.getByText("Course Code")).not.toBeVisible();
});

test("only one card is expanded at a time", async ({ page }) => {
  const cards = page.getByRole("button").filter({ hasText: /Grade/ });

  await cards.nth(0).click();
  await expect(page.getByText("Course Code")).toBeVisible();

  await cards.nth(1).click();
  // Still only one "Course Code" detail block visible
  await expect(page.getByText("Course Code")).toHaveCount(1);
});

// ─── Glossary ─────────────────────────────────────────────────────────────────

test("glossary is visible on initial load", async ({ page }) => {
  await expect(page.getByText("Course Categories")).toBeVisible();
});

test("glossary can be dismissed", async ({ page }) => {
  await page.getByLabel("Dismiss glossary").click();
  await expect(page.getByText("Course Categories")).not.toBeVisible();
  await expect(page.getByText("Show category guide")).toBeVisible();
});

test("glossary can be restored after dismissal", async ({ page }) => {
  await page.getByLabel("Dismiss glossary").click();
  await page.getByText("Show category guide").click();
  await expect(page.getByText("Course Categories")).toBeVisible();
});

// ─── Mobile viewport ──────────────────────────────────────────────────────────

test("page is usable on mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await waitForReady(page);

  await expect(page.getByRole("heading", { name: "BC Course Finder" })).toBeVisible();
  await expect(page.getByPlaceholder("Search by course title, code, or subject...")).toBeVisible();

  // No horizontal scroll
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
});

// ─── Pagination ───────────────────────────────────────────────────────────────

test("show more button loads additional courses", async ({ page }) => {
  // Default page size is 50 — total courses far exceeds that
  const showMore = page.getByRole("button", { name: /Show more/ });
  await expect(showMore).toBeVisible();

  const beforeCards = await page.getByRole("button").filter({ hasText: /Grade/ }).count();
  await showMore.click();
  const afterCards = await page.getByRole("button").filter({ hasText: /Grade/ }).count();

  expect(afterCards).toBeGreaterThan(beforeCards);
});