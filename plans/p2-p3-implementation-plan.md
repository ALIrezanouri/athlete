# P2/P3 Implementation Plan — Athlete Feature Admin + Config Consistency

## Overview

P2: Add admin management for 13 athlete features (exercises, workouts, routines, body-stats, social, gym sub-entities, reviews, favorites, onboarding).
P3: Fix config system disconnect between `admin_config` and `feature_flags` tables + add translation/country management.

## Architecture Pattern

Each feature follows the established pattern:
1. **Types** → `adminpanel/app/actions/types.ts` (add interfaces)
2. **Server Actions** → new or extended action file with `'use server'` + `ActionResult<T>` + audit logging
3. **Page Component** → `'use client'` + `useTransition` + modal CRUD + dark gradient theme + RTL
4. **Sidebar** → add entry to `admin-sidebar.tsx`
5. **Audit Types** → extend `audit-log.ts` AuditActionType union
6. **RLS Migration** → add admin read policies for athlete-scoped tables

---

## P2.1 — Exercise Management (CRUD)

**Tables**: `exercises`, `exercise_translations`, `muscle_groups`, `equipment_types`, `user_custom_exercises`

### Types (types.ts)
```ts
export interface Exercise {
  id: string; name_en: string; slug: string; description: string | null;
  muscle_group_id: string; secondary_muscle_groups: string[];
  equipment_type_id: string | null; exercise_type: string;
  movement_pattern: string | null; image_url: string | null;
  video_url: string | null; is_compound: boolean; difficulty: string;
  is_active: boolean; sort_order: number; created_at: string; updated_at: string;
}

export interface ExerciseTranslation {
  id: string; exercise_id: string; locale: string;
  name: string; description: string | null; instructions: string | null;
  created_at: string; updated_at: string;
}

export interface MuscleGroup {
  id: string; name_en: string; icon: string | null;
  sort_order: number; created_at: string;
}

export interface EquipmentType {
  id: string; name_en: string; icon: string | null;
  sort_order: number; created_at: string;
}

export interface UserCustomExercise {
  id: string; user_id: string; name: string; description: string | null;
  muscle_group_id: string; equipment_type_id: string | null;
  exercise_type: string; image_url: string | null; is_active: boolean;
  created_at: string; updated_at: string;
}
```

### Server Actions (exercises.ts)
- `getMuscleGroups()` → read all
- `getEquipmentTypes()` → read all
- `getAllExercises(page, search, muscleGroup, equipment, exerciseType)` → paginated list with translations
- `getExerciseById(id)` → single with translations
- `createExercise(input)` → insert + audit
- `updateExercise(id, input)` → update + audit
- `deleteExercise(id)` → delete + audit
- `createExerciseTranslation(exerciseId, locale, name, description, instructions)` → insert + audit
- `updateExerciseTranslation(id, name, description, instructions)` → update + audit
- `deleteExerciseTranslation(id)` → delete + audit
- `getAllCustomExercises(page, search)` → read-only paginated list

### Page (exercises/page.tsx)
- Table: name_en, slug, muscle_group, equipment, type, difficulty, is_active, actions
- Filters: muscle group dropdown, equipment dropdown, exercise type dropdown, search
- Create/Edit modal: all exercise fields + translation sub-form (fa locale)
- View modal: exercise details + translations list
- Delete modal: confirmation
- Custom exercises tab: read-only table with user_id, name, muscle_group

### Sidebar Entry
```ts
{ name: 'تمرینات', href: '/dashboard/exercises', icon: '💪', roles: ['admin'] }
```

### Audit Types
`exercise_created`, `exercise_updated`, `exercise_deleted`, `exercise_translation_created`, `exercise_translation_updated`, `exercise_translation_deleted`

### RLS Migration
Add admin SELECT policies for `exercises`, `exercise_translations`, `muscle_groups`, `equipment_types`, `user_custom_exercises`

---

## P2.2 — Workout Session Viewing (Read-Only)

**Tables**: `workout_sessions`, `workout_exercises`, `workout_sets`

### Types (types.ts)
```ts
export interface WorkoutSession {
  id: string; user_id: string; name: string; start_time: string;
  end_time: string | null; duration_seconds: number | null;
  status: string; total_volume: number; total_sets: number;
  estimated_calories: number; notes: string | null;
  gym_id: string | null; routine_id: string | null;
  created_at: string; updated_at: string;
}

export interface WorkoutExercise {
  id: string; workout_session_id: string; exercise_id: string | null;
  custom_exercise_id: string | null; exercise_name: string;
  sort_order: number; is_superset: boolean; superset_group_id: string | null;
  notes: string | null; rest_seconds: number;
}

export interface WorkoutSet {
  id: string; workout_exercise_id: string; set_number: number;
  set_type: string; weight_kg: number; reps: number;
  duration_seconds: number | null; distance_meters: number | null;
  rpe: number | null; is_completed: boolean; completed_at: string | null;
  notes: string | null;
}
```

### Server Actions (workouts.ts)
- `getAllWorkoutSessions(page, search, status, userId)` → paginated list with user profile join
- `getWorkoutSessionDetail(id)` → session + exercises + sets nested
- No create/update/delete — read-only admin view

### Page (workouts/page.tsx)
- Table: user name, session name, start_time, duration, volume, sets, status
- Filters: status dropdown, user search, date range
- View modal: session detail with exercise/sets tree
- No create/edit/delete modals

### Sidebar Entry
```ts
{ name: 'جلسات تمرین', href: '/dashboard/workouts', icon: '🏋️', roles: ['admin'] }
```

### RLS Migration
Add admin SELECT policies for `workout_sessions`, `workout_exercises`, `workout_sets`

---

## P2.3 — Routine Management (Read + Moderate)

**Tables**: `routines`, `routine_days`, `routine_exercises`, `routine_sets`

### Types (types.ts)
```ts
export interface Routine {
  id: string; user_id: string; name: string; description: string | null;
  is_public: boolean; is_template: boolean; folder: string | null;
  sort_order: number; use_count: number; last_used_at: string | null;
  created_at: string; updated_at: string;
}

export interface RoutineDay {
  id: string; routine_id: string; name: string; sort_order: number;
}

export interface RoutineExercise {
  id: string; routine_day_id: string; exercise_id: string | null;
  custom_exercise_id: string | null; exercise_name: string;
  sort_order: number; rest_seconds: number; notes: string | null;
}

export interface RoutineSet {
  id: string; routine_exercise_id: string; set_number: number;
  set_type: string; weight_kg: number; reps: number; rpe: number | null;
}
```

### Server Actions (routines.ts)
- `getAllRoutines(page, search, isPublic, isTemplate)` → paginated list with user profile join
- `getRoutineDetail(id)` → routine + days + exercises + sets nested
- `updateRoutineVisibility(id, isPublic)` → toggle public + audit
- `updateRoutineTemplate(id, isTemplate)` → toggle template + audit
- `deleteRoutine(id)` → delete inappropriate + audit

### Page (routines/page.tsx)
- Table: user name, routine name, is_public, is_template, use_count, created_at, actions
- Filters: public/template toggles, search
- View modal: routine detail with day/exercise/set tree
- Edit modal: toggle is_public, is_template only
- Delete modal: confirmation

### Sidebar Entry
```ts
{ name: 'برنامه‌های تمرین', href: '/dashboard/routines', icon: '📋', roles: ['admin'] }
```

### Audit Types
`routine_updated`, `routine_deleted`

### RLS Migration
Add admin SELECT/UPDATE/DELETE policies for `routines`, `routine_days`, `routine_exercises`, `routine_sets`

---

## P2.4 — Body Measurement Viewing (Read-Only)

**Tables**: `body_measurements`

### Types (types.ts)
```ts
export interface BodyMeasurement {
  id: string; user_id: string; measured_at: string;
  weight_kg: number | null; body_fat_percentage: number | null;
  neck_cm: number | null; chest_cm: number | null; waist_cm: number | null;
  hip_cm: number | null; right_bicep_cm: number | null; left_bicep_cm: number | null;
  right_thigh_cm: number | null; left_thigh_cm: number | null;
  right_calf_cm: number | null; left_calf_cm: number | null;
  right_forearm_cm: number | null; left_forearm_cm: number | null;
  shoulders_cm: number | null; notes: string | null; photo_url: string | null;
  created_at: string; updated_at: string;
}
```

### Server Actions (add to workouts.ts)
- `getAllBodyMeasurements(page, search, userId)` → paginated list with user profile join
- `getBodyMeasurementDetail(id)` → single measurement

### Page (body-stats/page.tsx)
- Table: user name, measured_at, weight_kg, body_fat, waist, key measurements
- Filters: user search, date range
- View modal: all measurement fields displayed
- No create/edit/delete

### Sidebar Entry
```ts
{ name: 'اندازه‌های بدن', href: '/dashboard/body-stats', icon: '📏', roles: ['admin'] }
```

### RLS Migration
Add admin SELECT policy for `body_measurements`

---

## P2.5 — Social Feature Management (Read + Moderate)

**Tables**: `user_follows`, `workout_likes`, `workout_comments`, `shared_workouts` (is_shared on workout_sessions)

### Types (types.ts)
```ts
export interface UserFollow {
  id: string; follower_id: string; following_id: string; created_at: string;
}

export interface WorkoutLike {
  id: string; user_id: string; workout_session_id: string; created_at: string;
}

export interface WorkoutComment {
  id: string; user_id: string; workout_session_id: string;
  comment: string; created_at: string; updated_at: string;
}
```

### Server Actions (social.ts)
- `getAllUserFollows(page, search)` → paginated list with follower/following profile names
- `getAllWorkoutLikes(page)` → paginated list with user + workout names
- `getAllWorkoutComments(page, search)` → paginated list with user + workout + comment text
- `deleteWorkoutComment(id)` → moderate inappropriate comment + audit

### Page (social/page.tsx)
- Tabs: Comments (main), Follows, Likes
- Comments tab: table with user, workout, comment text, date, delete action
- Follows tab: table with follower, following, date
- Likes tab: table with user, workout, date
- Delete modal for comments only

### Sidebar Entry
```ts
{ name: 'شبکه اجتماعی', href: '/dashboard/social', icon: '👥', roles: ['admin'] }
```

### Audit Types
`workout_comment_deleted`

### RLS Migration
Add admin SELECT policies for `user_follows`, `workout_likes`, `workout_comments`; admin DELETE for `workout_comments`

---

## P2.6 — Gym Sub-Entity Management (CRUD within Gym Detail)

**Tables**: `gym_photos`, `gym_amenities`, `gym_sport_types`

Types already exist in `types.ts`: `GymPhoto`, `GymAmenity`, `GymSportType`

### Server Actions (add to gyms.ts)
- `getGymPhotos(gymId)` → list photos
- `addGymPhoto(gymId, url, isPrimary, sortOrder)` → insert + audit
- `deleteGymPhoto(id)` → delete + audit
- `getGymAmenities(gymId)` → list amenities
- `addGymAmenity(gymId, amenityKey)` → insert + audit
- `deleteGymAmenity(id)` → delete + audit
- `getGymSportTypes(gymId)` → list sport types
- `addGymSportType(gymId, sportKey)` → insert + audit
- `deleteGymSportType(id)` → delete + audit

### Page Modification (gyms/page.tsx)
- Add "Detail" button in table actions → opens gym detail view
- Gym detail view: tabs for Photos, Amenities, Sport Types
- Each tab: list + add/delete actions
- Photo tab: URL input + is_primary toggle + sort_order
- Amenity tab: amenity_key dropdown + add button
- Sport type tab: sport_key dropdown + add button

### Audit Types
`gym_photo_added`, `gym_photo_deleted`, `gym_amenity_added`, `gym_amenity_deleted`, `gym_sport_type_added`, `gym_sport_type_deleted`

### RLS Migration
Add admin INSERT/DELETE policies for `gym_photos`, `gym_amenities`, `gym_sport_types`

---

## P2.7 — Gym Review Management (Read + Moderate)

**Tables**: `gym_reviews`

### Types (types.ts)
```ts
export interface GymReview {
  id: string; gym_id: string; athlete_id: string; booking_id: string;
  rating: number; comment: string | null; created_at: string;
}
```

### Server Actions (add to gyms.ts or reviews.ts)
- `getAllGymReviews(page, gymId, rating)` → paginated list with gym + athlete names
- `deleteGymReview(id)` → moderate inappropriate review + audit

### Page (reviews/page.tsx)
- Table: gym name, athlete name, rating (stars), comment, date, actions
- Filters: gym dropdown, rating filter
- Delete modal: confirmation

### Sidebar Entry
```ts
{ name: 'نظرات باشگاه', href: '/dashboard/reviews', icon: '⭐', roles: ['admin'] }
```

### Audit Types
`gym_review_deleted`

### RLS Migration
Add admin SELECT/DELETE policy for `gym_reviews`

---

## P2.8 — Favorite Gym Viewing (Read-Only)

**Tables**: `favorite_gyms`

### Server Actions (add to social.ts)
- `getAllFavoriteGyms(page, userId)` → paginated list with gym + athlete names

### Page Integration
- Add as tab in social/page.tsx or as section in users detail view
- Table: athlete name, gym name, date
- No CRUD actions

### RLS Migration
Add admin SELECT policy for `favorite_gyms`

---

## P2.9 — Onboarding Data Viewing (Read-Only)

**Tables**: `athlete_profiles`

### Types (types.ts)
```ts
export interface AthleteProfile {
  id: string; sport_preferences: string[] | null;
  fitness_level: string | null; height_cm: number | null;
  weight_kg: number | null; date_of_birth: string | null;
  gender: string | null; emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string; updated_at: string;
}
```

### Server Actions (add to users.ts)
- `getAthleteProfile(userId)` → single athlete profile data

### Page Integration
- Add "Athlete Profile" section in users detail view/modal
- Display: sport_preferences, fitness_level, height, weight, DOB, gender, emergency contacts

### RLS Migration
Add admin SELECT policy for `athlete_profiles`

---

## P3.1 — Bridge Config Systems (admin_config → feature_flags)

### Problem
Admin panel writes feature toggles to `admin_config` JSON. Athlete PWA reads from `feature_flags` table. Changes in admin panel don't propagate to athlete PWA.

### Solution
1. Modify `config.ts` `updateSystemConfig()` to also sync feature flag fields to `feature_flags` table
2. Modify `config/page.tsx` to show feature_flags status alongside admin_config toggles
3. Add `getFeatureFlags()` and `syncFeatureFlags()` server actions
4. Migration: add admin RLS policies for `feature_flags` table

### Server Actions (add to config.ts)
- `getFeatureFlags()` → read all feature_flags rows
- `syncFeatureFlags(config)` → for each feature key in admin_config, upsert matching feature_flags row

### Page Modification (config/page.tsx)
- Add "Feature Flags Sync" section showing current feature_flags state
- Add sync button that calls syncFeatureFlags
- Show warning when admin_config and feature_flags are out of sync

### RLS Migration
Add admin SELECT/INSERT/UPDATE policies for `feature_flags`

---

## P3.2 — Translation Management (CRUD)

**Tables**: `translations`

### Types (types.ts)
```ts
export interface Translation {
  id: string; locale: string; key: string; value: string;
  created_at: string; updated_at: string;
}
```

### Server Actions (translations.ts)
- `getAllTranslations(page, locale, search)` → paginated list
- `getTranslationById(id)` → single
- `createTranslation(locale, key, value)` → insert + audit
- `updateTranslation(id, value)` → update + audit
- `deleteTranslation(id)` → delete + audit

### Page (translations/page.tsx)
- Table: locale, key, value, actions
- Filters: locale dropdown (en/fa), key search
- Create/Edit modal: locale select, key input, value textarea
- Delete modal: confirmation

### Sidebar Entry
```ts
{ name: 'ترجمه‌ها', href: '/dashboard/translations', icon: '🌐', roles: ['admin'] }
```

### Audit Types
`translation_created`, `translation_updated`, `translation_deleted`

### RLS Migration
Add admin SELECT/INSERT/UPDATE/DELETE policies for `translations`

---

## P3.3 — Country Management (Read + Update)

**Tables**: `countries`

### Types (types.ts) — extend Country
```ts
export interface Country {
  id: string; name_en: string; name_local: string;
  is_rtl: boolean; is_active: boolean;
  currency_code: string; currency_symbol: string; phone_prefix: string | null;
  currency_decimals: number; currency_display_unit: string | null;
  currency_unit_divisor: number | null; currency_locale: string;
  created_at: string;
}
```

### Server Actions (add to config.ts)
- `getAllCountriesAdmin()` → all countries (not just active)
- `updateCountry(id, input)` → update currency/RTL settings + audit

### Page (countries/page.tsx)
- Table: name, currency_code, symbol, is_rtl, is_active, phone_prefix, actions
- Edit modal: currency fields, RTL toggle, active toggle
- No create/delete (countries are reference data)

### Sidebar Entry
```ts
{ name: 'کشورها', href: '/dashboard/countries', icon: '🌍', roles: ['admin'] }
```

### Audit Types
`country_updated`

### RLS Migration
Add admin SELECT/UPDATE policy for `countries`

---

## Implementation Order (Babysteps)

Each step: implement → verify build → proceed.

| Step | Feature | Files | Verify |
|------|---------|-------|--------|
| 1 | P2.1: Types + exercises action | types.ts, exercises.ts | build |
| 2 | P2.1: Exercises page + sidebar | exercises/page.tsx, sidebar | build |
| 3 | P2.1: Audit types + RLS migration | audit-log.ts, migration | build |
| 4 | P2.2: Types + workouts action | types.ts, workouts.ts | build |
| 5 | P2.2: Workouts page + sidebar | workouts/page.tsx, sidebar | build |
| 6 | P2.3: Types + routines action | types.ts, routines.ts | build |
| 7 | P2.3: Routines page + sidebar | routines/page.tsx, sidebar | build |
| 8 | P2.4: Body-stats action + page | workouts.ts, body-stats/page.tsx | build |
| 9 | P2.5: Types + social action | types.ts, social.ts | build |
| 10 | P2.5: Social page + sidebar | social/page.tsx, sidebar | build |
| 11 | P2.6: Gym sub-entity actions | gyms.ts | build |
| 12 | P2.6: Gym detail view in page | gyms/page.tsx | build |
| 13 | P2.7: Reviews action + page | gyms.ts, reviews/page.tsx | build |
| 14 | P2.8: Favorites in social | social.ts, social/page.tsx | build |
| 15 | P2.9: Athlete profile in users | users.ts, users/page.tsx | build |
| 16 | P3.1: Config bridge | config.ts, config/page.tsx | build |
| 17 | P3.2: Translations action + page | translations.ts, translations/page.tsx | build |
| 18 | P3.3: Countries action + page | config.ts, countries/page.tsx | build |
| 19 | RLS migration (all tables) | migration SQL | review |
| 20 | Final build verification | full build | ✅ |

---

## File Summary

### New Files (12)
- `adminpanel/app/actions/exercises.ts`
- `adminpanel/app/actions/workouts.ts`
- `adminpanel/app/actions/routines.ts`
- `adminpanel/app/actions/social.ts`
- `adminpanel/app/actions/translations.ts`
- `adminpanel/app/(dashboard)/dashboard/exercises/page.tsx`
- `adminpanel/app/(dashboard)/dashboard/workouts/page.tsx`
- `adminpanel/app/(dashboard)/dashboard/routines/page.tsx`
- `adminpanel/app/(dashboard)/dashboard/body-stats/page.tsx`
- `adminpanel/app/(dashboard)/dashboard/social/page.tsx`
- `adminpanel/app/(dashboard)/dashboard/reviews/page.tsx`
- `adminpanel/app/(dashboard)/dashboard/translations/page.tsx`
- `adminpanel/app/(dashboard)/dashboard/countries/page.tsx`
- `athlete-pwa/supabase/migrations/20240601000000_add_admin_rls_policies_p2.sql`

### Modified Files (7)
- `adminpanel/app/actions/types.ts` — add 15+ new interfaces
- `adminpanel/app/actions/gyms.ts` — add gym sub-entity + review actions
- `adminpanel/app/actions/config.ts` — add feature flag sync + country CRUD
- `adminpanel/app/actions/users.ts` — add athlete profile viewing
- `adminpanel/app/actions/audit-log.ts` — add 15+ new audit action types
- `adminpanel/components/admin/admin-sidebar.tsx` — add 7 new entries
- `adminpanel/app/(dashboard)/dashboard/gyms/page.tsx` — add gym detail view with sub-entity tabs