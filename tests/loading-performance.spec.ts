import { test, expect, type Page } from "@playwright/test"

// ─── Constants ────────────────────────────────────────────────────────────────

/** Existing test user phone number (Iran format, without country code) */
const TEST_PHONE = "9127332842"

/** Dev OTP bypass code (set via DEV_OTP in .env.local) */
const TEST_OTP = "123456"

/** Routes that have loading.tsx skeletons with animate-pulse */
const SKELETON_ROUTES = [
  { path: "/home", description: "Home page skeleton" },
  { path: "/gyms", description: "Gyms list skeleton" },
  {
    path: "/gyms/a1b2c3d4-0001-4000-8000-000000000004",
    description: "Gym detail skeleton",
  },
  { path: "/bookings", description: "Bookings skeleton" },
  { path: "/explore", description: "Explore skeleton" },
] as const

/** Routes and thresholds for page load benchmarks (ms) */
const LOAD_BENCHMARKS = [
  { path: "/home", maxMs: 10_000, description: "Home page" },
  { path: "/gyms", maxMs: 8_000, description: "Gyms list" },
  {
    path: "/explore/a1b2c3d4-0001-4000-8000-000000000004",
    maxMs: 8_000,
    description: "Gym detail (explore)",
  },
  { path: "/bookings", maxMs: 8_000, description: "Bookings" },
] as const

// ─── Auth Helper ──────────────────────────────────────────────────────────────

/**
 * Authenticates a test user through the login page UI.
 *
 * Flow:
 *  1. Navigate to /login
 *  2. Enter phone number (9127332842)
 *  3. Click "Send OTP"
 *  4. Enter OTP (123456 — dev bypass)
 *  5. Click "Verify"
 *  6. Wait for redirect to /home or /onboarding
 *
 * Prerequisites:
 *  - Dev server running at localhost:3000
 *  - Supabase local instance running with the test user seeded
 *  - DEV_OTP=123456 in .env.local
 */
async function authenticate(page: Page): Promise<void> {
  await test.step("Authenticate via login page", async () => {
    await page.goto("/login")
    await page.waitForLoadState("domcontentloaded")

    // Wait for the phone input to appear (inside GlassInput component)
    const phoneInput = page.locator('input[dir="ltr"][maxlength="15"]')
    await phoneInput.waitFor({ state: "visible", timeout: 60_000 })

    // Fill phone number
    await phoneInput.fill(TEST_PHONE)

    // Click the send OTP button (first ShinyButton on the phone step)
    const sendButton = page.locator("button").first()
    await sendButton.click()

    // Wait for OTP step to appear (OTP input has maxLength=6)
    const otpInput = page.locator('input[dir="ltr"][maxlength="6"]')
    await otpInput.waitFor({ state: "visible", timeout: 90_000 })

    // Fill OTP
    await otpInput.fill(TEST_OTP)

    // Click the verify button (the ShinyButton on the OTP step)
    const verifyButton = page.locator("button").first()
    await verifyButton.click()

    // Wait for redirect to /home or /onboarding
    await page.waitForURL(/\/(home|onboarding)/, { timeout: 90_000 })

    // If redirected to onboarding, we still consider auth successful
    // (the test user should already be onboarded)
  })
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe("Loading Performance Tests", () => {
  // Authenticate once before all tests in this describe block
  let authDone = false

  test.beforeEach(async ({ page }) => {
    if (!authDone) {
      await authenticate(page)
      authDone = true
    } else {
      // For subsequent tests, just navigate to home to ensure we're authenticated
      // (cookies/session should persist within the same browser context)
      await page.goto("/home")
      await page.waitForLoadState("domcontentloaded")
    }
  })

  // ─── 1. Loading Skeleton Rendering ────────────────────────────────────────

  test.describe("Loading skeleton components render", () => {
    /**
     * Verifies that each route with a loading.tsx file renders the skeleton
     * component with the `animate-pulse` CSS class during page load.
     *
     * The skeleton is shown by Next.js App Router while the page data is
     * being fetched. In dev mode with slow responses, the skeleton should
     * be visible for several seconds.
     *
     * @see athlete-pwa/app/(athlete) — each subroute has a loading.tsx
     */
    for (const { path, description } of SKELETON_ROUTES) {
      test(`renders skeleton for ${description} (${path})`, async ({
        page,
      }) => {
        // Navigate without waiting for full load to catch the skeleton
        const responsePromise = page.goto(path)

        // Check for animate-pulse class while the page is still loading.
        // We use a short timeout because the skeleton should appear immediately.
        const skeletonVisible = await page
          .locator(".animate-pulse")
          .first()
          .waitFor({ state: "visible", timeout: 15_000 })
          .then(() => true)
          .catch(() => false)

        // Wait for the navigation to complete (regardless of skeleton result)
        await responsePromise

        expect(
          skeletonVisible,
          `Expected skeleton with 'animate-pulse' class to be visible on ${path}. ` +
            "This verifies the loading.tsx component renders correctly."
        ).toBeTruthy()
      })
    }
  })

  // ─── 2. Page Load Time Benchmarks ─────────────────────────────────────────

  test.describe("Page load time benchmarks", () => {
    /**
     * Warmup: Navigate to home first to trigger module-level TTL caches.
     * This simulates a real user who has already visited the app, so the
     * first cold-start penalty is excluded from benchmarks.
     */
    test("warmup: caches are primed", async ({ page }) => {
      const start = Date.now()
      await page.goto("/home", { waitUntil: "networkidle" })
      const elapsed = Date.now() - start

      // Warmup has no strict threshold — just log the time
      console.log(`  [warmup] /home loaded in ${elapsed}ms`)
    })

    /**
     * Measures the time from navigation start to the 'networkidle' event
     * for each benchmarked route. Asserts the load time is within the
     * specified threshold.
     *
     * These thresholds are generous for a dev server with Turbopack.
     * Production builds should be significantly faster.
     */
    for (const { path, maxMs, description } of LOAD_BENCHMARKS) {
      test(`${description} (${path}) loads in under ${maxMs / 1000}s`, async ({
        page,
      }) => {
        const start = Date.now()
        await page.goto(path, { waitUntil: "networkidle" })
        const elapsed = Date.now() - start

        console.log(
          `  [benchmark] ${path} loaded in ${elapsed}ms (threshold: ${maxMs}ms)`
        )

        expect(
          elapsed,
          `${description} (${path}) took ${elapsed}ms to load, ` +
            `which exceeds the ${maxMs}ms threshold. ` +
            "Investigate server action performance or network latency."
        ).toBeLessThan(maxMs)
      })
    }
  })

  // ─── 3. Cache Effectiveness ───────────────────────────────────────────────

  test.describe("Cache effectiveness (TTL cache verification)", () => {
    /**
     * Verifies that the module-level TTL cache is working by navigating
     * to the same route twice and asserting the second load is faster.
     *
     * The TTL cache is implemented in server actions like:
     *  - getAllConfig() in app/actions/config.ts
     *  - getSportTypes() in app/actions/config.ts
     *  - getPopularGyms() in app/actions/gyms.ts
     *
     * On the first visit, the cache is populated. On the second visit,
     * the cached data is returned immediately (within TTL window),
     * making the response significantly faster.
     */
    const CACHE_TEST_ROUTES = [
      { path: "/gyms", description: "Gyms list (getPopularGyms cache)" },
      { path: "/home", description: "Home page (getAllConfig cache)" },
    ] as const

    for (const { path, description } of CACHE_TEST_ROUTES) {
      test(`second load of ${description} is faster than first`, async ({
        page,
      }) => {
        // ── First load (cold cache for this route's data) ──
        const firstStart = Date.now()
        await page.goto(path, { waitUntil: "networkidle" })
        const firstElapsed = Date.now() - firstStart

        console.log(
          `  [cache] ${path} first load: ${firstElapsed}ms`
        )

        // Navigate away to clear any client-side state
        await page.goto("/home", { waitUntil: "networkidle" })

        // ── Second load (should hit TTL cache) ──
        const secondStart = Date.now()
        await page.goto(path, { waitUntil: "networkidle" })
        const secondElapsed = Date.now() - secondStart

        console.log(
          `  [cache] ${path} second load: ${secondElapsed}ms`
        )
        console.log(
          `  [cache] ${path} improvement: ${firstElapsed - secondElapsed}ms (${Math.round(((firstElapsed - secondElapsed) / firstElapsed) * 100)}%)`
        )

        expect(
          secondElapsed,
          `Second load of ${path} took ${secondElapsed}ms, which should be ` +
            `faster than the first load (${firstElapsed}ms). ` +
            "This verifies the TTL cache is working correctly."
        ).toBeLessThan(firstElapsed)
      })
    }
  })
})
