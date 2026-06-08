# rokhdad — Product Analysis: Features, User Flows & Roadmap

> **Document Version**: 1.0  
> **Date**: June 2026  
> **Author**: Product Manager (AI-assisted codebase analysis)

---

## 1. Product Overview

**rokhdad** (روخداد) is a Persian-first fitness platform targeting 18–35 year-old Iranian gym-goers. It consists of two applications sharing a single Supabase backend:

| App | Port | Purpose | Tech |
|-----|------|---------|------|
| **athlete-pwa** | 3000 | Mobile PWA for athletes | Next.js 16.2.6, React 19, motion/react, Supabase SSR |
| **adminpanel** | 3001 | Admin dashboard for managers | Next.js 16.2.6, React 19, Supabase SSR |

**Design System**: Pure black (#000) background, glassmorphism surfaces (rgba 255,255,255,0.05 + backdrop-blur 10px), Electric Blue (#3A86FF) accent, Vazirmatn font, RTL-first (dir="rtl", lang="fa"), Jalali dates.

**Backend**: Self-hosted Supabase (Docker) — PostgreSQL, Auth, Realtime, Storage, Kong gateway. Phone OTP authentication via Kavenegar SMS provider with dev-mode bypass.

---

## 2. Feature Catalog

### 2.1 Authentication & Onboarding

#### F1: Phone OTP Login
- **Description**: Users authenticate via Iranian mobile number + SMS OTP code
- **Server Actions**: [`sendOtp()`](athlete-pwa/app/actions/auth.ts:1), [`verifyOtp()`](athlete-pwa/app/actions/auth.ts:1)
- **Dev Mode**: Magic link session creation bypasses SMS when `DEV_OTP_BYPASS=true`
- **Flow**: Enter phone → receive OTP → verify → session created via cookie-based SSR auth (`@supabase/ssr`)
- **Edge Cases**: Pagination-based user lookup in dev mode, phone format validation

#### F2: 3-Step Onboarding Wizard
- **Description**: Animated 3-step onboarding with MagicCard gradient effects
- **Server Actions**: [`completeOnboarding()`](athlete-pwa/app/actions/auth.ts:1), [`getGymsForOnboarding()`](athlete-pwa/app/actions/auth.ts:1)
- **Steps**:
  1. **Personal Info**: Full name (required, min 2 chars), date of birth, gender (male/female/other)
  2. **Fitness Profile**: Fitness level (beginner/intermediate/advanced/professional), sport preferences (weight_loss/muscle_gain/endurance/flexibility/general_fitness) — multi-select
  3. **Gym Selection**: Choose home gym from available list, or skip ("بدون باشگاه")
- **UX**: Animated slide transitions (direction-aware), progress bar with step dots, Persian numeral display, skip button available
- **Validation**: Step 1 requires name ≥ 2 chars; Step 2 requires at least 1 sport preference
- **Skip Path**: Sets name to "کاربر", level to "beginner", no gym — redirects to `/home`

### 2.2 Workout Tracking (Hevy-style)

#### F3: Workout Start Hub
- **Description**: Landing page when no active workout exists
- **Components**: [`WorkoutStartHub`](athlete-pwa/app/(athlete)/workout/page.tsx:42)
- **Sections**:
  - Primary CTA: "شروع تمرین خالی" (Start Empty Workout) with pulse-glow animation
  - My Routines: Horizontal scrollable cards showing user's routines with day count + use count
  - Template Suggestions: Push/Pull/Legs, Upper/Lower, Full Body, Bro Split — links to `/routines/templates`
  - Recent Workouts: Last 3 workout sessions with date, exercise count, duration
  - Quick Links: Body Map, History — bento grid layout

#### F4: Active Workout Tracker
- **Description**: Full workout tracking interface when a session is active
- **Components**: [`ActiveWorkout`](athlete-pwa/app/(athlete)/workout/page.tsx:480), [`SetRow`](athlete-pwa/app/(athlete)/workout/page.tsx:399), [`CircularRestTimer`](athlete-pwa/app/(athlete)/workout/page.tsx:247)
- **Server Actions**: [`startWorkout()`](athlete-pwa/app/actions/workouts.ts:1), [`addExerciseToWorkout()`](athlete-pwa/app/actions/workouts.ts:1), [`addSet()`](athlete-pwa/app/actions/workouts.ts:1), [`updateSet()`](athlete-pwa/app/actions/workouts.ts:1), [`completeWorkout()`](athlete-pwa/app/actions/workouts.ts:1), [`discardWorkout()`](athlete-pwa/app/actions/workouts.ts:1)
- **Features**:
  - Sticky header with editable session name, elapsed time (live timer), estimated calories, total volume
  - Exercise cards with set rows: set number, previous performance, weight input, reps input, check button
  - **PR Detection**: Real-time personal record detection — gold trophy badge + "🏆 رکورد جدید!" celebration animation
  - **Rest Timer**: Circular SVG progress timer with preset durations (60s, 90s, 120s, 180s), start/pause/toggle
  - **Exercise Picker**: Full-screen modal with search + muscle group filter chips (9 groups), debounced search
  - **Completion Modal**: Trophy animation, stats grid (duration, sets, volume), "بازگشت به خانه" button
  - Discard with confirmation dialog

#### F5: Workout History
- **Description**: List of completed workout sessions
- **Server Actions**: [`getWorkoutHistory()`](athlete-pwa/app/actions/workouts.ts:1)
- **Route**: `/history`

### 2.3 Smart Workout Builder

#### F6: AI-Powered Workout Generator (3-Phase Algorithm)
- **Description**: Wizard-based smart workout generation from muscle + equipment selection
- **Route**: `/workout-builder`
- **Server Actions**: [`generateSmartWorkout()`](athlete-pwa/app/actions/routines.ts:1), [`saveGeneratedRoutine()`](athlete-pwa/app/actions/routines.ts:1), [`startDirectWorkout()`](athlete-pwa/app/actions/routines.ts:1)
- **Algorithm**:
  - **Phase A**: For each selected muscle group, pick 1 compound exercise (prioritizes multi-joint movements)
  - **Phase B**: For uncovered muscle groups, add isolation exercises
  - **Phase C**: Fill remaining slots up to MAX_EXERCISES=7 with varied exercises
  - Equipment filtering: Only selects exercises matching user's chosen equipment types
- **Wizard Steps**:
  1. **Muscles**: Grid of 16 muscle groups with color-coded selection, Persian labels, count indicator
  2. **Equipment**: Grid of 10 equipment types (barbell, dumbbell, machine, cable, kettlebell, bodyweight, band, plate, other, none)
  3. **Preview**: Generated exercise list with muscle group, compound/isolation badge, sets × reps
- **Actions**: Save as routine → `/routines`, or start direct workout → `/workout`, or regenerate

### 2.4 Routines (Workout Programs)

#### F7: Routine Management
- **Description**: CRUD for multi-day workout programs
- **Route**: `/routines`
- **Server Actions**: [`getRoutines()`](athlete-pwa/app/actions/routines.ts:1), [`createRoutine()`](athlete-pwa/app/actions/routines.ts:1), [`deleteRoutine()`](athlete-pwa/app/actions/routines.ts:1), [`updateRoutine()`](athlete-pwa/app/actions/routines.ts:1), [`startWorkoutFromRoutine()`](athlete-pwa/app/actions/routines.ts:1)
- **Data Model**: routines → routine_days → routine_exercises → routine_sets (4-level tree)
- **Features**:
  - Routine cards with color-coded gradients, expand/collapse, day/exercise/use_count stats
  - Context menu: Edit, Copy, Share, Delete
  - Expanded view: Day-by-day exercise list with set counts
  - Action buttons: Start Workout, Find Suitable Gym (suggestion engine), Edit
  - Create modal: Bottom sheet with name input, day tabs, exercise search + inline add, set configuration (weight × reps)
  - **Gym Suggestion**: "باشگاه مناسب" button triggers [`getGymSuggestionsForRoutine()`](athlete-pwa/app/actions/gyms.ts:1) — uses geolocation + equipment matching

#### F8: Routine Templates
- **Description**: Pre-built workout program templates
- **Route**: `/routines/templates`
- **Templates**: Push/Pull/Legs (6 days), Upper/Lower (4 days), Full Body (3 days), Bro Split (5 days)

#### F9: Routine Editor
- **Description**: Full edit page for existing routines
- **Route**: `/routines/[id]/edit`

### 2.5 Gym Discovery & Booking

#### F10: Gym Discovery
- **Description**: Searchable, filterable gym listing
- **Route**: `/gyms`
- **Server Actions**: [`getGyms()`](athlete-pwa/app/actions/gyms.ts:1), [`getSportTypes()`](athlete-pwa/app/actions/gyms.ts:1)
- **Features**:
  - Search bar with debounced input (300ms) + clear button
  - Filter panel: Sort by rating/price, Sport type chips (12 types: bodybuilding, powerlifting, crossfit, yoga, pilates, swimming, boxing, martial_arts, spinning, functional, olympic_weightlifting, calisthenics)
  - Active filter chips with remove buttons
  - Gym cards: Image/gradient placeholder, price badge (/جلسه), rating badge, name, address, hours, sport type tags
  - Empty state with clear filters button
  - CTA banner: "باشگاهت رو نمی‌بینی؟" — contact us to add

#### F11: Gym Detail Page
- **Description**: Full gym information with time slots and booking
- **Route**: `/gyms/[id]`
- **Server Actions**: [`getGymDetail()`](athlete-pwa/app/actions/gyms.ts:1), [`getGymTimeSlots()`](athlete-pwa/app/actions/gyms.ts:1)
- **Data**: Photos, amenities, sport types, trainers, reviews, time slots

#### F12: Gym Booking System
- **Description**: 6-step atomic booking flow with wallet integration
- **Server Actions**: [`createBooking()`](athlete-pwa/app/actions/bookings.ts:1), [`getBookings()`](athlete-pwa/app/actions/bookings.ts:1), [`cancelBooking()`](athlete-pwa/app/actions/bookings.ts:1), [`rateBooking()`](athlete-pwa/app/actions/bookings.ts:1)
- **6-Step Flow**:
  1. Validate time slot availability
  2. Get session price from gym
  3. Check wallet balance ≥ price
  4. Generate 6-char alphanumeric check-in code
  5. Insert booking record
  6. Charge wallet (DB trigger auto-updates balance)
- **Booking States**: upcoming → active → completed | cancelled | expired
- **Auto-expire**: Cron job expires bookings past their time slot

#### F13: Booking Management
- **Description**: Tabbed booking list with actions per status
- **Route**: `/bookings`
- **Tabs**: Upcoming, Active, Completed, Cancelled — with count badges
- **Actions per status**:
  - **Upcoming**: Cancel (with confirmation modal), Add to Google Calendar, View Gym, Show Ticket
  - **Active**: View Gym, Show Ticket
  - **Completed (unrated)**: Rate & Review (star rating + comment modal), Rebook
  - **Completed (rated)**: Completed badge, Rebook
  - **Expired**: Rebook
  - **Cancelled**: Cancelled badge

#### F14: Check-in Ticket
- **Description**: QR code + alphanumeric code for gym entry
- **Feature Flag**: `booking_ticket` — only shown when enabled
- **UI**: Full-screen overlay with white background (contrast for scanning), QR code (dynamic import of qrcode.react), check-in code in monospace font, booking details (gym, date, time, price), status badge

### 2.6 Gym Suggestion Engine

#### F15: Smart Gym Recommendations
- **Description**: Suggests gyms based on workout equipment requirements + user proximity
- **Server Actions**: [`getGymSuggestionsForWorkout()`](athlete-pwa/app/actions/gyms.ts:1), [`getGymSuggestionsForRoutine()`](athlete-pwa/app/actions/gyms.ts:1)
- **Algorithm**:
  1. Extract equipment types needed for the workout/routine exercises
  2. Query gyms that have matching equipment (`gym_equipment` table)
  3. Calculate **equipment match percentage** = (matched equipment / required equipment) × 100
  4. Calculate **Haversine distance** from user coordinates (optional, falls back to no distance bonus)
  5. **Proximity bonus**: Gyms within 5km get +20%, within 10km get +10%
  6. Sort by combined score (match % + proximity bonus)
- **UI**: [`GymSuggestionSheet`](athlete-pwa/components/gym-suggestion/gym-suggestion-sheet.tsx) bottom sheet component

### 2.7 Wallet & Payments

#### F16: Digital Wallet
- **Description**: In-app wallet for gym session payments
- **Server Actions**: [`getWallet()`](athlete-pwa/app/actions/wallet.ts:1), [`getTransactions()`](athlete-pwa/app/actions/wallet.ts:1), [`topUpWallet()`](athlete-pwa/app/actions/wallet.ts:1)
- **Features**:
  - Balance display with country-specific currency formatting
  - Top-up modal: 4 preset amounts (500K, 1M, 2M, 5M IRR), bottom sheet animation
  - Transaction history: Type-coded (top_up=green, booking_charge=red, refund=green, bonus=green)
  - Atomic balance updates via DB trigger `update_wallet_balance()`
- **Admin Actions**: [`addFunds()`](adminpanel/app/actions/wallet.ts:266), [`deductFunds()`](adminpanel/app/actions/wallet.ts:346) — uses RPC `deduct_wallet_funds` for atomic check+deduct

### 2.8 Social Features

#### F17: Community Feed
- **Description**: Instagram-like feed of shared workouts from followed users
- **Route**: `/community`
- **Server Actions**: [`getFeed()`](athlete-pwa/app/actions/social.ts:1), [`likeWorkout()`](athlete-pwa/app/actions/social.ts:1), [`unlikeWorkout()`](athlete-pwa/app/actions/social.ts:1), [`addComment()`](athlete-pwa/app/actions/social.ts:1), [`getComments()`](athlete-pwa/app/actions/social.ts:1)
- **Features**:
  - Infinite scroll pagination (15 items per page via [`useInfiniteScroll`](athlete-pwa/lib/hooks/useInfiniteScroll.ts))
  - Workout cards: User avatar+name (clickable → public profile), workout name, duration, volume, sets, exercise summary (top 5)
  - Like button with heart emoji toggle + count
  - Comment section: Expandable, threaded display, inline comment input with Enter-to-submit
  - Optimistic UI updates for likes and comments

#### F18: Workout Sharing
- **Server Actions**: [`shareWorkout()`](athlete-pwa/app/actions/social.ts:1), [`unshareWorkout()`](athlete-pwa/app/actions/social.ts:1)
- **Route**: `/share-workout`

#### F19: User Follow System
- **Server Actions**: [`followUser()`](athlete-pwa/app/actions/social.ts:1), [`unfollowUser()`](athlete-pwa/app/actions/social.ts:1), [`getFollowers()`](athlete-pwa/app/actions/social.ts:1), [`getFollowing()`](athlete-pwa/app/actions/social.ts:1), [`getSuggestedUsers()`](athlete-pwa/app/actions/social.ts:1)
- **DB Triggers**: Auto-update follower/following counts on profiles

#### F20: User Search & Profiles
- **Server Actions**: [`searchUsers()`](athlete-pwa/app/actions/social.ts:1), [`getUserProfile()`](athlete-pwa/app/actions/social.ts:1), [`getUserSharedWorkouts()`](athlete-pwa/app/actions/social.ts:1)
- **Route**: `/profile/[id]` — public profile view

### 2.9 Analytics & Progress

#### F21: Workout Analytics Dashboard
- **Description**: Comprehensive stats dashboard with multiple visualization types
- **Route**: `/analytics`
- **Server Actions**: [`getWorkoutStats()`](athlete-pwa/app/actions/analytics.ts:1), [`getCalendarDataWithIntensity()`](athlete-pwa/app/actions/analytics.ts:1)
- **Periods**: Week, Month, Year, All — tab selector
- **Visualizations**:
  - **Streak Hero**: Current streak days + best streak (gradient card with trophy icon)
  - **Circular Progress**: 4 rings — workouts (max 20), volume in tons (max 100T), sets (max 200), calories (max 5000)
  - **Stats Bento Grid**: 6 cells — total workouts, total volume, total sets, estimated calories, total duration, avg duration
  - **Volume Trend**: Mini bar chart (7-day or 4-week) with trend percentage (↑/↓)
  - **Activity Heatmap**: GitHub-style 84-day heatmap (4 intensity levels: none/light/moderate/heavy)
  - **Muscle Distribution**: Animated progress bars with percentage labels for top 8 muscle groups

#### F22: Personal Records
- **Route**: `/pr`
- **Server Actions**: [`getPersonalRecords()`](athlete-pwa/app/actions/analytics.ts:1)
- **Algorithm**: 2-query strategy — SQL aggregation for max weight per exercise + JS merge with exercise details

#### F23: Calendar View
- **Route**: `/calendar`
- **Server Actions**: [`getCalendarData()`](athlete-pwa/app/actions/analytics.ts:1), [`getCalendarDataWithIntensity()`](athlete-pwa/app/actions/analytics.ts:1)
- **Features**: Jalali date support, intensity markers (heavy/moderate/light/rest)

#### F24: Body Measurements
- **Route**: `/body-stats`
- **Server Actions**: [`getBodyMeasurements()`](athlete-pwa/app/actions/analytics.ts:1), [`saveBodyMeasurement()`](athlete-pwa/app/actions/analytics.ts:1)
- **15 Body Parts**: weight, chest, waist, hips, biceps_left, biceps_right, forearm_left, forearm_right, neck, shoulders, thigh_left, thigh_right, calf_left, calf_right, abdomen

#### F25: Body Map
- **Route**: `/body-map`
- **Component**: [`BodyHighlighter`](athlete-pwa/components/body-map/BodyHighlighter.tsx) using `simple-body-highlighter-react`
- **Features**: Interactive muscle selection, exercise results panel, muscle selector chips

### 2.10 Tools & Utilities

#### F26: Plate Calculator
- **Route**: `/plate-calculator`
- **Description**: Calculate barbell plate combinations for target weight

#### F27: Exercise Library
- **Route**: `/exercises`, `/exercises/[id]`
- **Server Actions**: [`getExercises()`](athlete-pwa/app/actions/workouts.ts:1), [`getExerciseById()`](athlete-pwa/app/actions/workouts.ts:1)
- **Features**: Search + muscle group filter, bilingual names (Persian + English), translations via `exercise_translations` table

### 2.11 Profile & Settings

#### F28: User Profile
- **Route**: `/profile`
- **Server Actions**: [`getProfile()`](athlete-pwa/app/actions/profile.ts:1), [`updateProfile()`](athlete-pwa/app/actions/profile.ts:1), [`getFavoriteGyms()`](athlete-pwa/app/actions/profile.ts:1)
- **Sections**:
  - Profile Hero: Avatar (gradient), editable name (inline edit with save/cancel), member since date
  - Stats Bento: 3 cells — total sessions, total hours, PR count
  - Wallet Card: Balance + top-up button
  - Feature Hub: 8-item grid (Analytics, PRs, Body Map, Measurements, Calendar, Exercises, Tools, History)
  - My Reservations: Link to bookings with upcoming count badge
  - Recent Transactions: Last 5 transactions with type-coded icons
  - Settings: Theme toggle (dark/light iOS-style switch), Tools, Achievements, Notifications, Favorites, Help, About
  - Logout button

#### F29: Theme Toggle
- **Description**: Dark/light mode switch with iOS-style toggle UI
- **Provider**: [`ThemeProvider`](athlete-pwa/lib/ThemeProvider.tsx)

### 2.12 Navigation

#### F30: Bottom Tab Navigation
- **Component**: [`BottomTabNav`](athlete-pwa/components/layout/bottom-tab-nav.tsx:33)
- **5 Tabs**: Home (`/home`), Routines (`/routines`), Workout (`/workout` — center CTA with pulse-glow), History (`/history`), Profile (`/profile`)
- **UX**: Haptic feedback on touch (navigator.vibrate 5ms), active indicator dot, motion whileTap scale, gradient fade above nav, safe area spacer for notched devices
- **Hidden on**: Onboarding page, gym detail pages (immersive experience)

#### F31: Top Progress Bar
- **Component**: [`TopProgressBar`](athlete-pwa/components/layout/top-progress-bar.tsx)
- **Description**: NProgress-style bar for route transitions

#### F32: Pull-to-Refresh
- **Component**: [`pull-to-refresh`](athlete-pwa/components/layout/pull-to-refresh.tsx)
- **Description**: Mobile pull-to-refresh gesture support

### 2.13 Configuration & Internationalization

#### F33: Translation System
- **Server Actions**: [`getTranslations()`](athlete-pwa/app/actions/config.ts:1), [`getAllTranslations()`](athlete-pwa/app/actions/config.ts:1)
- **DB Table**: `translations` — key-value pairs per locale
- **Context**: [`GlobalEngineContext`](athlete-pwa/lib/GlobalEngineContext.tsx) — provides `t()` function, `dir`, `locale`, `formatPrice()`, `isFeatureEnabled()`

#### F34: Feature Flags
- **Server Actions**: [`getFeatureFlags()`](athlete-pwa/app/actions/config.ts:1)
- **DB Table**: `feature_flags` — per-country boolean flags
- **Current Flags**: `booking_ticket` (check-in QR code visibility)
- **Caching**: Module-level TTL cache + `unstable_cache` for public data, per-userId cache for user-specific data

#### F35: RTL Support
- **Server Actions**: [`getRtlMap()`](athlete-pwa/app/actions/config.ts:1)
- **DB Table**: `rtl_map` — locale → isRTL mapping
- **Default**: Persian (fa) = RTL, dir="rtl"

#### F36: Currency Configuration
- **Server Actions**: [`getCurrencyConfigs()`](athlete-pwa/app/actions/config.ts:1)
- **Per-country**: Currency symbol, code, format pattern

### 2.14 PWA & Offline

#### F37: Progressive Web App
- **Manifest**: [`manifest.ts`](athlete-pwa/app/manifest.ts)
- **Service Worker**: [`sw.js`](athlete-pwa/public/sw.js), [`sw-register.tsx`](athlete-pwa/components/pwa/sw-register.tsx)
- **Offline Page**: [`offline/page.tsx`](athlete-pwa/app/offline/page.tsx)

### 2.15 Admin Panel

#### F38: Role-Based Admin Dashboard
- **Route**: `/dashboard` (adminpanel app, port 3001)
- **Layout**: [`DashboardLayout`](adminpanel/app/(dashboard)/layout.tsx) — server component with auth + role check
- **Allowed Roles**: admin, gym_manager, coach, doctor
- **Role Redirects**:
  - admin → `/dashboard/users`
  - gym_manager → `/dashboard/gyms`
  - coach → `/dashboard/bookings`
  - doctor → `/dashboard/users`
- **Components**: [`AdminHeader`](adminpanel/components/admin/admin-header.tsx), [`AdminSidebar`](adminpanel/components/admin/admin-sidebar.tsx), [`RoleBadge`](adminpanel/components/admin/role-badge.tsx)

#### F39: Admin Pages (17 sections)
| Page | Route | Purpose |
|------|-------|---------|
| Users | `/dashboard/users` | User management, profile editing |
| Gyms | `/dashboard/gyms` | Gym CRUD, photos, amenities, sport types |
| Gym Profile | `/dashboard/gym-profile` | Gym manager's own gym profile |
| Bookings | `/dashboard/bookings` | Booking oversight, status management |
| Time Slots | `/dashboard/time-slots` | Time slot configuration for gyms |
| Trainers | `/dashboard/trainers` | Trainer management |
| Wallets | `/dashboard/wallets` | Wallet balance view, add/deduct funds |
| Workouts | `/dashboard/workouts` | Workout session oversight |
| Routines | `/dashboard/routines` | Routine management |
| Exercises | `/dashboard/exercises` | Exercise + translation management |
| Body Stats | `/dashboard/body-stats` | Body measurement oversight |
| Social | `/dashboard/social` | Social feature management |
| Reviews | `/dashboard/reviews` | Gym review management |
| Analytics | `/dashboard/analytics` | Platform-wide analytics |
| Reports | `/dashboard/reports` | Report generation |
| Audit Log | `/dashboard/audit-log` | Action audit trail |
| Config | `/dashboard/config` | Translations, feature flags, currencies |
| Countries | `/dashboard/countries` | Country management |
| Translations | `/dashboard/translations` | Translation key-value management |

#### F40: Audit Logging
- **Server Actions**: [`logAuditAction()`](athlete-pwa/app/actions/admin/audit-log.ts:1)
- **DB Table**: `audit_logs` — action_type, target_type, target_id, action_details (JSONB), performed_by, timestamp
- **Tracked Actions**: wallet_funds_added, wallet_funds_deducted, and all admin CRUD operations

---

## 3. User Flows

### 3.1 New User Registration Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Open App    │───▶│  Enter Phone │───▶│  Receive OTP │───▶│  Verify OTP  │
│  (PWA)       │    │  Number      │    │  (SMS/Dev)   │    │  → Session   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                  │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐             ▼
│  Home Page   │◀──│  Step 3:     │◀──│  Step 2:     │◀──┌─────────────┐
│  /home       │    │  Gym Select  │    │  Fitness     │    │  Step 1:     │
│              │    │  (optional)  │    │  Profile     │    │  Personal    │
│              │    │              │    │              │    │  Info        │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Decision Points**:
- Skip onboarding → Home page with default values ("کاربر", beginner, no gym)
- Complete onboarding → Home page with personalized data
- No gyms available → "No gyms available yet" message in Step 3

### 3.2 Workout Flow

```
┌─────────────┐    ┌─────────────────────────────────────────────┐
│  Workout     │───▶│  WorkoutStartHub                            │
│  Tab (Center)│    │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│              │    │  │Empty WO  │ │My Routines│ │Templates │   │
│              │    │  │(Primary) │ │(Horizontal│ │(PPL,UL,  │   │
│              │    │  │CTA)      │ │Scroll)    │ │FB,Bro)   │   │
└─────────────┘    │  └──────────┘ └──────────┘ └──────────┘   │
                    └─────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌──────────┐  ┌──────────┐  ┌──────────────┐
              │Start Empty│  │Start from │  │Smart Builder │
              │Workout    │  │Routine    │  │(3-phase algo)│
              └──────────┘  └──────────┘  └──────────────┘
                    │               │               │
                    ▼               ▼               ▼
              ┌──────────────────────────────────────────┐
              │  ActiveWorkout Tracker                    │
              │  ┌────────────────────────────────────┐  │
              │  │ Sticky Header: Name | Timer | Vol  │  │
              │  │ Exercise Cards:                     │  │
              │  │   ┌─ SetRow ─────────────────────┐ │  │
              │  │   │ # | Prev | Weight | Reps | ✓ │ │  │
              │  │   │ PR? → 🏆 Badge Animation     │ │  │
              │  │   └──────────────────────────────┘ │  │
              │  │ Rest Timer (Circular SVG)           │  │
              │  │ + Add Exercise (Picker Modal)       │  │
              │  └────────────────────────────────────┘  │
              │  [Complete] → Celebration Modal          │
              │  [Discard]  → Confirmation Dialog        │
              └──────────────────────────────────────────┘
```

### 3.3 Smart Workout Builder Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Routines    │───▶│  Step 1:    │───▶│  Step 2:    │───▶│  Step 3:    │
│  Page        │    │  Select      │    │  Select      │    │  Preview    │
│  (Smart Card)│    │  Muscles     │    │  Equipment   │    │  Generated  │
│              │    │  (≥1 required│    │  (optional)  │    │  Exercises  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                  │
                    ┌───────────────┼───────────────┐              ▼
                    ▼               ▼               ▼        ┌─────────────┐
              ┌──────────┐  ┌──────────┐  ┌──────────┐  │  Actions:    │
              │Save as    │  │Start     │  │Regenerate│  │  Save Routine│
              │Routine    │  │Direct WO │  │          │  │  Start WO    │
              │→/routines │  │→/workout │  │          │  │  Regenerate  │
              └──────────┘  └──────────┘  └──────────┘  └─────────────┘
```

### 3.4 Gym Booking Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Gyms List   │───▶│  Gym Detail │───▶│  Select Time│───▶│  Confirm &  │
│  (Search/    │    │  Page        │    │  Slot        │    │  Pay        │
│   Filter)    │    │              │    │              │    │  (Wallet)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                  │
                    ┌───────────────────────────────────────────────▼
                    │  6-Step Atomic Booking:
                    │  1. Validate slot availability
                    │  2. Get session price
                    │  3. Check wallet balance ≥ price
                    │  4. Generate check_in_code (6-char)
                    │  5. Insert booking record
                    │  6. Charge wallet (trigger updates balance)
                    └───────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌──────────┐  ┌──────────┐  ┌──────────────┐
              │Upcoming   │  │Show Ticket│  │Add to Google│
              │Booking    │  │(QR+Code) │  │Calendar     │
              └──────────┘  └──────────┘  └──────────────┘
                    │
                    ▼ (after session)
              ┌──────────────┐    ┌──────────────┐
              │Rate & Review  │───▶│Completed      │
              │(Stars+Comment)│    │Booking        │
              └──────────────┘    └──────────────┘
```

### 3.5 Wallet Top-Up Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Profile     │───▶│  Wallet Card│───▶│  Top-Up Modal│───▶│  Select      │
│  Page        │    │  (Balance)  │    │  (Bottom Sheet│    │  Amount      │
│              │    │             │    │   Animation) │    │  (500K-5M)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                  │
                                                                  ▼
                                                            ┌─────────────┐
                                                            │  Confirm &   │
                                                            │  Process     │
                                                            │  → Balance   │
                                                            │  Updated     │
                                                            └─────────────┘
```

### 3.6 Social / Community Flow

```
┌─────────────┐    ┌─────────────────────────────────────────────┐
│  Community   │───▶│  Feed (Infinite Scroll)                     │
│  Page        │    │  ┌──────────────────────────────────────┐  │
│              │    │  │ Workout Card:                         │  │
│              │    │  │  User Avatar → Profile/[id]           │  │
│              │    │  │  Workout Stats (duration, vol, sets)  │  │
│              │    │  │  Exercise Summary (top 5)             │  │
│              │    │  │  ❤️ Like Toggle + Count               │  │
│              │    │  │  💬 Comment Expand + Input            │  │
│              │    │  └──────────────────────────────────────┘  │
│              │    │  ┌─── Infinite Scroll Sentinel ───┐       │
│              │    │  │  Load More (15 per page)        │       │
│              │    │  └─────────────────────────────────┘       │
└─────────────┘    └─────────────────────────────────────────────┘
```

### 3.7 Gym Suggestion Flow (from Routine)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────────┐
│  Routine     │───▶│  "Find Gym" │───▶│  GymSuggestionSheet                 │
│  Expanded    │    │  Button      │    │  Algorithm:                         │
│              │    │              │    │  1. Extract equipment from exercises │
│              │    │  (Geolocation│    │  2. Match gym_equipment records      │
│              │    │   requested) │    │  3. Calculate match %               │
│              │    │              │    │  4. Haversine distance bonus         │
│              │    │              │    │  5. Sort by combined score           │
└─────────────┘    └─────────────┘    └─────────────────────────────────────┘
```

### 3.8 Admin Panel Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────────┐
│  Admin Login │───▶│  Role Check │───▶│  Role-Based Redirect:              │
│  (Phone OTP) │    │  (4 roles)  │    │  admin → /dashboard/users          │
│              │    │              │    │  gym_manager → /dashboard/gyms     │
│              │    │              │    │  coach → /dashboard/bookings       │
│              │    │              │    │  doctor → /dashboard/users         │
└─────────────┘    └─────────────┘    └─────────────────────────────────────┘
                                        │
                                        ▼
                                  ┌─────────────┐
                                  │  Dashboard   │
                                  │  (Sidebar +  │
                                  │   Header)    │
                                  │  RTL Layout  │
                                  │  mr-64 offset│
                                  └─────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              ┌──────────┐  ┌──────────────┐  ┌──────────────┐
              │Manage     │  │Wallet Ops    │  │Audit Trail   │
              │Users/Gyms │  │(Add/Deduct)  │  │(All Admin    │
              │/Bookings  │  │              │  │ Actions)     │
              └──────────┘  └──────────────┘  └──────────────┘
```

---

## 4. Data Model Summary

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `countries` | Country config | id, name, currency_code, phone_prefix |
| `profiles` | User profiles | id (auth.uid), role (athlete/gym_manager/admin), full_name, mobile_number, wallet_balance, onboarding_completed |
| `athlete_profiles` | Fitness details | profile_id, fitness_level, sport_preferences, home_gym_id, date_of_birth, gender |
| `gyms` | Gym listings | id, name, address, city, area, lat/lng, price_per_session, open/close times, avg_rating |
| `gym_equipment` | Equipment mapping | gym_id, equipment_type_id (for suggestion engine) |
| `bookings` | Session bookings | id, profile_id, gym_id, time_slot_id, booking_date, status, price, check_in_code, checked_in_at |
| `wallet_transactions` | Payment ledger | id, profile_id, amount, type (top_up/booking_charge/refund/bonus), description |
| `workout_sessions` | Workout records | id, profile_id, name, start_time, completed_at, duration, total_volume, is_shared |
| `workout_exercises` | Exercises in session | id, session_id, exercise_id, exercise_name, order_index |
| `workout_sets` | Sets in exercise | id, exercise_id, set_number, weight_kg, reps, is_completed, volume (auto-calc trigger) |
| `routines` | Saved programs | id, profile_id, name, use_count |
| `routine_days` | Days in routine | id, routine_id, name, day_index |
| `routine_exercises` | Exercises in day | id, day_id, exercise_id, exercise_name, order_index |
| `routine_sets` | Sets in routine exercise | id, exercise_id, set_number, weight_kg, reps |
| `muscle_groups` | 16 muscle groups | id, name_en, icon, sort_order |
| `equipment_types` | 10 equipment types | id, name_en, icon, sort_order |
| `exercises` | Exercise library | id, name_en, muscle_group_id, equipment_type_id, is_compound |
| `exercise_translations` | Bilingual names | exercise_id, locale, name |
| `body_measurements` | 15 body parts | id, profile_id, 15 measurement fields + date |
| `exercise_progress` | PR tracking | id, profile_id, exercise_id, max_weight, max_reps, date |
| `user_follows` | Social follows | follower_id, followed_id |
| `workout_likes` | Workout likes | profile_id, workout_session_id |
| `workout_comments` | Comments | profile_id, workout_session_id, comment |
| `audit_logs` | Admin audit trail | action_type, target_type, target_id, action_details (JSONB), performed_by |

### Key DB Triggers

| Trigger | Purpose |
|---------|---------|
| `update_wallet_balance()` | Auto-updates profiles.wallet_balance on wallet_transactions insert |
| `update_gym_rating()` | Auto-updates gyms.avg_rating on gym_reviews insert |
| `update_time_slot_availability()` | Adjusts available slots on booking insert/cancel |
| `calculate_set_volume()` | Auto-calcs workout_sets.volume = weight_kg × reps |
| `update_follow_counts()` | Updates follower/following count fields |
| `update_like_count()` | Updates workout like_count |
| `update_comment_count()` | Updates workout comment_count |
| `update_workout_count()` | Updates profile workout count on session complete |
| `deduct_wallet_funds()` | RPC for atomic check-balance-and-deduct |

---

## 5. Product Roadmap

### Phase 1: Foundation Hardening (Current → Q3 2026)

**Goal**: Stabilize core features, fix known issues, prepare for production launch.

| # | Initiative | Priority | Status | Details |
|---|-----------|----------|--------|---------|
| 1.1 | **Payment Gateway Integration** | P0 | Planned | Replace mock top-up with real Iranian payment gateway (Zarinpal, IDPay) |
| 1.2 | **SMS OTP Production** | P0 | Planned | Switch from dev bypass to Kavenegar production SMS delivery |
| 1.3 | **Hydration Mismatch Fix** | P0 | Known Issue | Fix SSR/CSR hydration mismatches in onboarding + config loading |
| 1.4 | **Auto-Expire Cron** | P1 | Planned | Deploy pg_cron for auto-expiring bookings past their time slot |
| 1.5 | **RLS Policy Audit** | P1 | Planned | Audit all Row Level Security policies, fix wallet RLS gaps |
| 1.6 | **Error Monitoring** | P1 | Planned | Add Sentry/error tracking for production debugging |
| 1.7 | **Performance Optimization** | P2 | In Progress | Continue batch query optimization (buildRoutineTree pattern), reduce N+1 queries |
| 1.8 | **PWA Offline Support** | P2 | Partial | Enhance service worker for offline workout tracking + sync |

### Phase 2: Growth Features (Q3–Q4 2026)

**Goal**: Add features that drive user acquisition, engagement, and retention.

| # | Initiative | Priority | Details |
|---|-----------|----------|---------|
| 2.1 | **Push Notifications** | P0 | Workout reminders, booking confirmations, social interactions (follows, likes, comments) |
| 2.2 | **Workout Templates Library** | P1 | Expand from 4 hardcoded templates to DB-driven template library with community-contributed programs |
| 2.3 | **Gym Manager Self-Service** | P1 | Full gym_manager portal: manage own gym profile, time slots, trainers, view bookings, respond to reviews |
| 2.4 | **Leaderboard / Challenges** | P1 | Weekly/monthly workout challenges, volume leaderboards, streak competitions |
| 2.5 | **Exercise Alternative Suggestions** | P1 | "Swap exercise" feature using [`getAlternativeExercises()`](athlete-pwa/app/actions/routines.ts:1) — same muscle group, different equipment |
| 2.6 | **Workout Notes** | P2 | Add free-text notes per workout session (how you felt, conditions, etc.) |
| 2.7 | **Superset Support** | P2 | Group exercises as supersets in workout tracker (existing [`superset-handler.tsx`](athlete-pwa/app/(athlete)/workout/superset-handler.tsx)) |
| 2.8 | **Photo Upload for Gyms** | P2 | Supabase Storage integration for gym photos (currently placeholder gradients) |
| 2.9 | **Share Workout to External** | P2 | Generate shareable workout image/card for Instagram/Telegram |

### Phase 3: Intelligence & Monetization (Q1–Q2 2027)

**Goal**: AI-powered features and sustainable revenue model.

| # | Initiative | Priority | Details |
|---|-----------|----------|---------|
| 3.1 | **AI Workout Adaptation** | P0 | Adjust smart workout based on fatigue, recovery, previous performance trends |
| 3.2 | **Progress Insights** | P0 | "You're 15% stronger than last month on bench press" — automated progress summaries |
| 3.3 | **Gym Subscription Plans** | P1 | Monthly/quarterly gym passes beyond single-session booking |
| 3.4 | **Premium Routines** | P1 | Coach-created premium workout programs (paid content) |
| 3.5 | **Coach Marketplace** | P1 | Online coaching: hire coaches for personalized programming + feedback |
| 3.6 | **Nutrition Tracking** | P2 | Basic calorie/macro logging integrated with workout calorie estimates |
| 3.7 | **Wearable Integration** | P2 | Apple Health / Google Fit sync for heart rate, steps, sleep data |
| 3.8 | **Video Exercise Guides** | P2 | Short video clips for exercise form demonstration |

### Phase 4: Platform Expansion (Q3–Q4 2027)

**Goal**: Multi-country expansion and platform ecosystem.

| # | Initiative | Priority | Details |
|---|-----------|----------|---------|
| 4.1 | **Multi-Country Launch** | P0 | Leverage existing countries + feature_flags + translations infrastructure for MENA expansion |
| 4.2 | **English UI Support** | P0 | Full English translation completion, LTR layout support (already have RTL map infrastructure) |
| 4.3 | **Gym Chain Management** | P1 | Multi-branch gym management for chain gyms (shared branding, centralized booking) |
| 4.4 | **Corporate Wellness** | P2 | B2B corporate gym packages, employee wellness dashboards |
| 4.5 | **API Platform** | P2 | Public API for gym integration partners (booking sync, member verification) |
| 4.6 | **Apple Watch / Wearable App** | P2 | Companion workout tracker with haptic rest timer notifications |

---

## 6. Technical Architecture Notes

### Design Patterns in Use

| Pattern | Implementation | Location |
|---------|---------------|----------|
| **Server Actions (no REST API)** | All data operations via Next.js Server Actions | `athlete-pwa/app/actions/*.ts`, `adminpanel/app/actions/*.ts` |
| **Cookie-based SSR Auth** | `@supabase/ssr` with cookie strategy | `athlete-pwa/lib/supabase/server.ts`, `adminpanel/lib/supabase/server.ts` |
| **Batch Query Assembly** | Flat queries + JS tree building (avoid N+1 nested selects) | [`getRoutines()`](athlete-pwa/app/actions/routines.ts:1) `buildRoutineTree` pattern |
| **Module-level TTL Cache** | In-memory cache with 5-min TTL for public data | [`getAllConfig()`](athlete-pwa/app/actions/config.ts:1) |
| **unstable_cache** | Next.js RSC cache for per-user data | [`getAllConfig()`](athlete-pwa/app/actions/config.ts:1) |
| **Atomic DB Operations** | Triggers + RPCs for wallet, rating, volume calculations | DB migrations |
| **Feature Flags** | Per-country boolean flags from DB | [`getFeatureFlags()`](athlete-pwa/app/actions/config.ts:1) |
| **Dynamic Imports** | Heavy client-only libs (QR code) loaded dynamically | [`QRCodeSVG`](athlete-pwa/app/(athlete)/bookings/page.tsx:26) |
| **Optimistic UI** | Like/comment counts updated before server confirmation | [`CommunityPage`](athlete-pwa/app/(athlete)/community/page.tsx:1) |
| **Haptic Feedback** | `navigator.vibrate(5)` on touch interactions | [`BottomTabNav`](athlete-pwa/components/layout/bottom-tab-nav.tsx:11) |

### Key Constraints

- **Dark mode only** (design system built on pure black, light mode toggle exists but secondary)
- **RTL-first** — all layouts default to `dir="rtl"`
- **No `any` types** — strict TypeScript enforcement
- **Server Components default** — client boundary only where needed (ClientLayout extraction pattern)
- **motion/react import path** — must use `motion/react` not `framer-motion`
- **No REST API routes** — all operations via Server Actions
- **Jalali dates** — `jalaali-js` + `react-multi-date-picker` for Persian calendar

---

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Payment gateway downtime** | High — users can't book sessions | Multi-provider fallback (Zarinpal + IDPay), offline booking queue |
| **SMS delivery failures** | High — users can't authenticate | Retry mechanism, backup SMS provider, email OTP fallback |
| **Wallet balance race conditions** | Medium — double-spending | Atomic RPC `deduct_wallet_funds` already implemented for admin; needs same for booking |
| **Data privacy compliance** | High — Iranian data regulations | Encrypt PII, minimal data collection, user data export feature |
| **PWA offline data loss** | Medium — workout data lost without sync | IndexedDB persistence + conflict resolution on reconnect |
| **Feature flag misconfiguration** | Low — features shown/hidden incorrectly | Admin config page with validation, fallback defaults in [`fallback-config.ts`](athlete-pwa/lib/fallback-config.ts) |

---

*This document was generated from a comprehensive analysis of all source code files including: 7 database migrations, 10 athlete-pwa server action files, adminpanel wallet actions, 8 key page components (workout, onboarding, gyms, bookings, routines, community, analytics, profile), layout components (ClientLayout, BottomTabNav), workout builder, admin dashboard layout, and configuration files.*