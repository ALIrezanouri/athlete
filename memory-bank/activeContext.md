# Active Context: Rokhdad FIT Platform

## Current Work Focus
**Next.js 16 Warning Cleanup — Turbopack Root + Middleware→Proxy Migration (2026-06-26) ✅ DONE**

### Problem
`npm run dev` in `athlete-pwa` emitted two warnings on Next.js 16.2.6:
1. **Multiple lockfiles**: Turbopack auto-detected the parent `rokhdad_FIT/package-lock.json` as workspace root (monorepo with nested apps), instead of the app-local `athlete-pwa/package-lock.json`.
2. **`middleware` deprecated**: Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`.

### Fix
1. **`athlete-pwa/next.config.ts`** — Added `turbopack: { root: path.resolve(__dirname) }` (and `import path from "node:path"`). Pins Turbopack's root to the app directory, silencing the warning and keeping filesystem watching scoped.
2. **`athlete-pwa/middleware.ts` → `athlete-pwa/proxy.ts`** — Renamed the file and the exported function (`middleware` → `proxy`). The internal helper `lib/supabase/middleware.ts` is left untouched (it's a module, not a file convention). No other files referenced the `middleware.ts` file path directly.

### Verified
Clean dev server output (port 3000) shows neither warning. Turbopack correctly reports `dir: '.../athlete-pwa'`.

---

**Bug Fix: Empty Gym List — Auth Gate on Public Data (2026-06-26) ✅ FIXED**

### Problem
The `/gyms` page showed "باشگاهی یافت نشد" (empty state) for users whose session cookie wasn't available. Root cause: 6 public read-only server actions in `athlete-pwa/app/actions/gyms.ts` (`getGyms`, `getGymDetail`, `getSportTypes`, `getGymTimeSlots`, `getGymTimeSlotsForDateRange`, `getPopularGyms`) all called `supabase.auth.getUser()` and returned `{ success: false, error: "Unauthorized" }` when no session existed.

### Fix
Removed the `getUser()` auth gate from all 6 public actions. They now call their cached fetch helpers directly. The cached helpers already use `createPlainSupabaseClient()` (anon key, no cookies) inside `unstable_cache` — which is correct since they run outside request context.

### Principle Enforced
**Public catalog data (listings, details, availability) must NOT gate on `getUser()`.** Only user-specific data (bookings, wallet, personal routines, suggestions) requires auth. The RLS policy is the single source of truth for access control — if RLS allows anon reads, the server action should match.

### Files Changed
- `athlete-pwa/app/actions/gyms.ts` — Removed auth gate from 6 public actions; user-specific actions (`getUpcomingBookings`, `getGymSuggestionsForWorkout`, `getGymSuggestionsForRoutine`) retain auth checks.

---

**Marketing UX Strategy Implementation — Phase 1, 2 & 2.2 COMPLETE**

### Phase 1 — Hevy-style Home & Profile (✅ Done)
- Home: 8 Quick Actions, Continue Workout card, Today's Routine + Gym Suggestions, Weekly Activity
- Profile: 8-item Feature Hub grid, My Reservations card, Stats Bento

### Phase 2 — Airbnb for Clubs Gym Discovery (✅ Done)
- `/gyms` — Airbnb-style gym discovery with search, filter by sport type, sort by rating/price
- Linked from Home "مشاهده همه ←" button in Popular Gyms section
- Cards link to `/gyms/[id]` for detail view

### Phase 2.2 — Gym Detail & Booking Flow (✅ Done)
- New page: `athlete-pwa/app/(athlete)/gyms/[id]/page.tsx`
- New server actions: `getGymDetail()`, `getGymTimeSlots()` in `athlete-pwa/app/actions/gyms.ts`
- Features: Photo gallery, sport types, amenities grid, contact info, trainer list, reviews
- 7-day date selector with time slot grid (3-col)
- Booking modal: confirmation → wallet check → booking → success ticket with check-in code
- Sticky bottom bar with price + "رزرو و پرداخت" CTA
- Wallet balance check + insufficient balance warning
- Success state shows ticket-style check-in code

**Plan file**: `plans/marketing-ux-strategy.md`  
**Next**: Phase 3 (Social/Viral features — Onboarding redesign)

## Social Feed — Seed Data & Feed Infrastructure (2026-06-04)

**Migration**: `athlete-pwa/supabase/migrations/20240603000000_seed_social_data.sql`

**Data seeded** (no auth users needed — direct profile inserts with fixed UUIDs):
- 10 athlete profiles with Persian names/bios (علی، سارا، محمد، فاطمه، امیر، نازنین، رضا، زهرا، حسین، مینا)
- 10 athlete_profiles with sport_preferences, fitness_level, gender
- 28 user_follows (cross-follow network)
- 14 shared workout sessions (completed, with like_count/comment_count)
- 45 workout_exercises (Persian exercise names)
- 50+ workout_sets (realistic weights/reps)
- 32 workout_likes across 8 workouts
- 24 workout_comments in Persian

**RLS policies added** (critical for community feed to work):
- `profiles`: "Public profiles are readable" (`is_public = true AND deleted_at IS NULL`)
- `workout_sessions`: "Shared workouts are publicly readable" (`is_shared = true`)
- `workout_exercises`: "Exercises of shared workouts are readable" (EXISTS subquery)
- `workout_sets`: "Sets of shared workout exercises are readable" (EXISTS subquery)

**Trigger handling**: All count triggers (follow, like, comment, workout) temporarily disabled during seed to prevent double-counting, then re-enabled.

**Seed user UUIDs**: `a0000001-0000-0000-0000-000000000001` through `...0000000010`

## Architecture: Two Separate Next.js Apps

### 1. `athlete-pwa/` — Athlete PWA (Phone OTP Auth)
- Auth: Phone OTP login via Supabase
- Route group: `app/(athlete)/` for authenticated athlete pages
- Middleware: Session refresh + route protection
- Port: 3000 (development)

### 2. `adminpanel/` — Admin Panel (Email + Password Auth)
- Auth: Email + Password login via Supabase `signInWithPassword`
- Roles: admin, manager, coach, doctor
- Route group: `app/(dashboard)/dashboard/` for authenticated admin pages
- Login: `app/(auth)/login/` — standalone login page
- Middleware: Session refresh + admin role verification
- Port: 3001 (development)
- Same Supabase project/database as athlete-pwa

## Completed Feature: Exercise Library & Gym Suggestion (2026-05-31)

**Plan files**:
- Master plan: `.kilo/plans/exercise-library-gym-suggestion.md`
- Baby Steps™ plan: `.kilo/plans/exercise-library-implementation-babysteps.md`

**3 Features Implemented**:
1. **Exercise Library** — 413 exercises importable from CSV, browsable library with detail pages, body map integration
2. **Gym Suggestion Engine** — Match routine/workout equipment requirements to nearby gyms with scoring algorithm
3. **Smart Workout Builder** — 3-step wizard (muscles → equipment → preview) with generate/save/start actions

**New Files Created (6)**:
- `athlete-pwa/supabase/migrations/20240601000000_create_gym_equipment.sql` — gym_equipment table (TEXT FK to equipment_types)
- `athlete-pwa/supabase/migrations/20240601000001_seed_gym_equipment.sql` — 25 seed rows for 6 gyms
- `adminpanel/app/actions/exercises.ts` — 11 server actions (CRUD + CSV import + Persian translations)
- `athlete-pwa/components/gym-suggestion/gym-suggestion-sheet.tsx` — bottom sheet component (default export)
- `athlete-pwa/app/(athlete)/exercises/[id]/page.tsx` — exercise detail page with body map
- `athlete-pwa/app/(athlete)/workout-builder/page.tsx` — 3-step smart workout builder wizard

**Modified Files (11)**:
- `athlete-pwa/app/actions/routines.ts` — added `generateSmartWorkout()`, `getAlternativeExercises()`, `saveGeneratedRoutine()`, `startDirectWorkout()`, `GeneratedExercise` type
- `athlete-pwa/app/actions/gyms.ts` — added `getGymSuggestionsForWorkout()`, `getGymSuggestionsForRoutine()`, exported `GymSuggestion` interface
- `athlete-pwa/app/(athlete)/exercises/page.tsx` — added onClick navigation to detail page
- `athlete-pwa/app/(athlete)/home/page.tsx` — added Smart Workout Builder card + Gym Suggestion Sheet
- `athlete-pwa/app/(athlete)/routines/page.tsx` — added Smart Workout Builder card
- `athlete-pwa/lib/body-map/muscle-mapping.ts` — added `getExerciseHighlightData()`
- `adminpanel/app/actions/gyms.ts` — added `getGymEquipment()`, `updateGymEquipment()`
- `adminpanel/app/actions/audit-log.ts` — added `'gym_equipment_updated'` to AuditActionType
- `adminpanel/app/(dashboard)/dashboard/gyms/page.tsx` — added equipment tab
- `adminpanel/app/(dashboard)/dashboard/gym-profile/page.tsx` — added equipment section
- `adminpanel/app/(dashboard)/dashboard/exercises/page.tsx` — added CSV upload UI

**Key Technical Patterns Learned**:
- `equipment_types.id` and `muscle_groups.id` are TEXT PKs (e.g., 'barbell', 'chest'), NOT UUIDs
- `GymSuggestionSheet` is a DEFAULT export — must `import GymSuggestionSheet from ...`
- `GymSuggestion` interface is exported from `gyms.ts` — type-only imports OK in client components
- `getGymSuggestionsForRoutine()` takes single object `{ routineId, userLocation? }` — returns `{ success, data? }`
- `AnimatePresence` nesting: `GymSuggestionSheet` wraps itself internally — don't add outer wrapper
- `apply_diff` can silently fail on multi-block edits — use `edit_file` for reliability
- Shell paths with parentheses `(athlete)` need quoting or `find` command

## Active Decisions & Considerations
- **Mock OTP approach:** OTP check is client-side (`123456`)
- **Internal email pattern:** `{phone}@auth.rokhdad.internal` for auth.users
- **Session via magic link:** Service role generates magic link → extracts tokens → sets session
- **No `next-themes`:** App is dark-only (pure black)
- **Global Engine pattern:** `useGlobalEngine()` hook provides `t()`, `formatPrice()`, `isFeatureEnabled()`, `dir`, `locale`
- **`motion` over `framer-motion`:** Magic UI components use `motion/react` import path
- **Supabase local Docker:** RUNNING. API at `127.0.0.1:54425`, Studio at `127.0.0.1:54423`, Auth direct at `127.0.0.1:54420`
- **Key fix:** GoTrue DATABASE_URL needs `?search_path=auth` suffix; GoTrue internal migrations must be pre-seeded in `auth.schema_migrations` when using `supabase/postgres` image (which creates auth schema without running GoTrue migrations)

## Supabase Local Docker Setup (2026-06-02)
- **docker-compose.yml** at project root with 10 services: db, kong, auth, rest, realtime, storage, imgproxy, inbucket, studio, meta
- **Port mapping:** Kong API=54425, DB=54322, Studio=54423, Auth direct=54420, Inbucket=54424, Realtime=54427
- **All 21 migrations** ran successfully via `docker exec -i supabase-db psql -U postgres < migration.sql`
- **Auth fix:** GoTrue `DATABASE_URL` needs `?sslmode=disable&search_path=auth` — without `search_path=auth`, GoTrue can't find `auth.identities` table
- **GoTrue migrations fix:** The `supabase/postgres:15.1.0.147` image creates auth schema but GoTrue's internal backfill migrations fail (e.g., `provider_id` NOT NULL, uuid=text cast errors). Fix: insert all migration version strings into `auth.schema_migrations` with `ON CONFLICT DO NOTHING`
- **JWT key fix (2026-06-02):** The `.env` file had JWTs with invalid signatures (not matching the `SUPABASE_JWT_SECRET`). Generated correct anon_key and service_role_key using `crypto.createHmac('sha256', secret)`. Updated `.env`, `athlete-pwa/.env.local`, and `adminpanel/.env.local`.
- **Admin user:** Needs re-creation via migration (was deleted during auth fix)

## Admin Panel Performance Refactoring Plan (2026-06-05)

**Plan file**: `plans/admin-panel-performance-refactoring.md`

### Critical Findings
- **C1**: N+1 query in `getRoutineDetail()` — 36 serial HTTP round-trips for a single routine (3-15s)
- **C2/C3**: Full-table fetch in `analytics.ts` — entire bookings table transferred for client-side counting/summing (5-30s)
- **C4**: ALL 18 dashboard pages are `'use client'` — zero Server Components, no SSR/streaming
- **C5**: Both `framer-motion` AND `motion` installed — ~150KB duplicate bundle waste
- **H2**: `select('*')` used universally across all server actions — 2-10x payload bloat
- **H3**: Missing database indexes on status, date, role, foreign key columns — sequential scans
- **H5**: No `loading.tsx` files for any dashboard route — blank screen during data fetch
- **M1**: Client-side pagination — full datasets fetched, sliced in JS

### 6-Phase Execution Plan
| Phase | Focus | Duration | Risk |
|---|---|---|---|
| 0 | Measurement infrastructure (bundle analyzer, timing wrapper) | 1 day | None |
| 1 | Emergency backend hotfixes (N+1, full-table, selects, pagination) | 2-3 days | Low |
| 2 | Frontend RSC conversion + Suspense/loading states | 5-7 days | Medium |
| 3 | Database indexes + analytics RPC functions | 2-3 days | Low-Medium |
| 4 | Multi-layer caching (ISR, unstable_cache, HTTP headers) | 3-4 days | Medium |
| 5 | Dependency cleanup + bundle optimization | 1-2 days | Low |

### Target Metrics
- TTI: < 2s (from ~8-12s) | LCP: < 1.5s | API p95: < 200ms | Initial JS: < 300KB gzipped

## Next Steps
1. **Execute Phase 0** — Set up measurement tools, capture baselines
2. **Execute Phase 1** — Fix N+1 queries, full-table scans, add column selects & pagination
3. Re-create admin user for admin panel login
4. ~~Migrate middleware → proxy convention (Next.js 16 deprecation warning)~~ ✅ Done (2026-06-26)
5. Connect Global Engine to Supabase (replace mock translations/flags with live queries)
6. Set up PWA manifest and service worker
7. Build onboarding flow (for `onboarding_completed: false` users)
