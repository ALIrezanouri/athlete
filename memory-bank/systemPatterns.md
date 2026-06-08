# System Patterns: Rokhdad FIT Platform

## System Architecture
- **Framework:** Next.js 16 (App Router) with Turbopack
- **Auth:** Supabase Auth (phone + OTP for athlete, email+password for admin) with `@supabase/ssr` cookie-based sessions
- **State:** React Context (GlobalEngineProvider) for i18n, feature flags, locale
- **UI:** Magic UI + custom glassmorphic components, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + Storage) running locally on Docker
- **Two-app architecture:** `athlete-pwa/` (port 3000) + `adminpanel/` (port 3001), shared Supabase DB

## Key Technical Decisions
1. **Server Actions over API Routes:** All mutations use `"use server"` — no REST endpoints
2. **Cookie-based sessions:** `@supabase/ssr` manages auth tokens in httpOnly cookies
3. **Service Role for auth operations:** Admin client bypasses RLS for user creation, profile upsert
4. **Magic link session generation:** Service role → magic link → extract tokens → set cookies
5. **Internal email pattern:** `{phone}@auth.rokhdad.internal` for auth.users
6. **TEXT PKs for reference tables:** `equipment_types.id` and `muscle_groups.id` are TEXT (e.g., 'barbell', 'chest'), NOT UUIDs
7. **Default exports for sheet components:** `GymSuggestionSheet` is default export — `import X from ...`
8. **Single-object param pattern:** Server actions like `getGymSuggestionsForRoutine({ routineId, userLocation? })` use single object params

## Component Relationships
```
app/layout.tsx
  └── GlobalEngineProvider (wraps all pages)
        ├── app/login/page.tsx (Phone OTP auth)
        ├── app/(athlete)/layout.tsx (Bottom tab nav)
        │     ├── home/page.tsx → Smart Workout Builder card + Gym Suggestion Sheet
        │     ├── exercises/page.tsx → Exercise list → exercises/[id]/page.tsx (detail + body map)
        │     ├── workout-builder/page.tsx → 3-step wizard (muscles → equipment → preview)
        │     │     ├── actions/workouts.ts (getMuscleGroups, getEquipmentTypes)
        │     │     └── actions/routines.ts (generateSmartWorkout, saveGeneratedRoutine, startDirectWorkout)
        │     ├── routines/page.tsx → Smart Workout Builder card
        │     └── [other athlete pages]
        ├── app/(dashboard)/layout.tsx (Admin sidebar)
        │     ├── dashboard/gyms/page.tsx → Equipment tab (checkbox grid)
        │     ├── dashboard/gym-profile/page.tsx → Equipment section (view/edit)
        │     ├── dashboard/exercises/page.tsx → CSV upload UI
        │     └── [other admin pages]
        └── app/design-system/page.tsx
```

## Data Flow: Gym Suggestion Engine
```
User routine → getRoutineById() → extract equipment_type_ids from routine_exercises
  → getGymSuggestionsForRoutine({ routineId, userLocation? })
    → Query gyms with matching gym_equipment rows
    → Score: equipment_match_pct + proximity_bonus (if userLocation provided)
    → Sort by score DESC → return GymSuggestion[]
  → GymSuggestionSheet (bottom sheet) displays ranked gyms
```

## Data Flow: Smart Workout Builder
```
User selects muscle groups + equipment types
  → generateSmartWorkout({ muscleGroupIds, equipmentTypeIds })
    → Phase A: 1 compound per muscle group (same equipment)
    → Phase B: isolation for uncovered muscles
    → Phase C: fill remaining up to MAX_EXERCISES=7
    → Return GeneratedExercise[] with sets/reps/rest
  → Preview step → User can:
    → saveGeneratedRoutine() → creates routine (is_template, folder="smart_builder")
    → startDirectWorkout() → creates workout_session (status="in_progress")
    → Regenerate with same/different selections
```

## Data Flow: Exercise CSV Import
```
Admin uploads CSV → importExercisesFromCsv()
  → Parse 413 rows (name, equipment, primary_muscle, secondary_muscle, source, sourceType)
  → Map equipment names → equipment_type_ids via EQUIPMENT_MAP
  → Map muscle names → muscle_group_ids via MUSCLE_MAP
  → Auto-generate Persian translations via PERSIAN_TRANSLATIONS (~120 entries)
  → Insert exercises + exercise_translations rows
```

## Supabase Client Pattern
- **Browser:** `lib/supabase/client.ts` — singleton via `createBrowserClient`
- **Server:** `lib/supabase/server.ts` — `createServerClient` with `cookies()`
- **Admin:** Inline in server actions — `createClient` with service role key
- **Middleware:** `lib/supabase/middleware.ts` — `createServerClient` with cookie read/write

## New DB Tables
- **`gym_equipment`**: `gym_id (UUID FK→gyms)`, `equipment_type_id (TEXT FK→equipment_types)`, UNIQUE(gym_id, equipment_type_id)
  - 25 seed rows for 6 existing gyms

## Design Patterns in Use
- **Provider Pattern:** GlobalEngineProvider wraps app for i18n/state
- **Server Actions Pattern:** All mutations go through `"use server"` functions
- **Glassmorphism:** `.glass` CSS class + `bg-white/[0.05] backdrop-blur-[10px] border-white/10`
- **Dynamic Layout Engine:** JSON config → component registry → rendered cards
- **Feature Flags:** Simple key→boolean map in GlobalEngine, toggled per country
- **Smart Selection Algorithm:** Phase A (compound) → Phase B (isolation) → Phase C (fill) with equipment matching
- **Gym Scoring Algorithm:** equipment_match_pct (0-100) + proximity_bonus (0-30 if userLocation) → sort DESC
- **Fallback Data Pattern:** Hardcoded fallback arrays for muscle groups (16) and equipment types (10) matching DB seeded data