# Implementation Prompt: Rokhdad FIT Gamification System

**Role:** Senior Full-Stack Next.js Engineer & Supabase Expert.
**Context:** You are working on "Rokhdad FIT", a fitness PWA. Your task is to implement a comprehensive Gamification System.
**Reference Document:** Carefully read `plans/gamification-plan.md` before starting. It contains the exact SQL schema, utility logic, and implementation roadmap.

## 🛠 Tech Stack & Constraints
- **Framework:** Next.js 16.2.6 (App Router, Turbopack).
- **Database:** Supabase (PostgreSQL) with RLS.
- **UI:** Tailwind CSS, Shadcn/UI, Lucide-React.
- **Animations:** Framer Motion (for badge/reward overlays).
- **i18n:** The application is RTL and uses Persian (Farsi) for user-facing strings.
- **Safety:** Always verify your work with `list_files` and `read_file` before and after modifications. Do not modify build artifacts.

## 🎯 Goal
Execute the **Implementation Roadmap** defined in Section 3 of `plans/gamification-plan.md` in a modular, step-by-step fashion.

## 🚀 Step-by-Step Instructions

### Step 1: Database Setup
- Locate `supabase/migrations/`.
- Create a new migration file following the naming convention `[TIMESTAMP]_gamification_init.sql`.
- Copy the SQL from Section 2.1 of the plan into this file.
- Verify that all tables (`gamification_stats`, `badges`, `user_badges`, `relatable_objects`, `rewards`, `reward_claims`) and their RLS policies are correctly defined.

### Step 2: Core Logic & Actions
- Create `lib/gamification-utils.ts` and implement the `getRelatableComparison` utility. Use the logic provided in Section 2.2 of the plan.
- Create `app/actions/gamification.ts`. Implement the server actions:
    - `getGamificationStats()`: Fetch user XP, Coins, and Level.
    - `getRewards()`: Fetch available Saman Insurance discounts.
    - `claimReward(rewardId)`: Implement the redemption logic (deduct coins, check balance, record claim).

### Step 3: Integration
- Modify `app/actions/workouts.ts`.
- Inside the `completeWorkout` function, add a call to an internal helper that:
    1. Calculates session volume (sum of weight * reps).
    2. Updates `gamification_stats` (adding XP, checking for new badges, updating streaks).

### Step 4: UI Components (Persian/RTL)
- Create the following components in `components/gamification/`:
    - `RelatableVolumeCard.tsx`: Display the "Lifting a Truck" comparison after a workout.
    - `HeroicBadgeOverlay.tsx`: A celebratory Framer Motion overlay for when "Rostam" or "Hercules" badges are earned.
- Ensure all text is in Persian (e.g., "تبریک! تو بج رستم را دریافت کردی").

### Step 5: Routes
- Implement `app/(athlete)/rewards/page.tsx`: The Saman Insurance shop.
- Update `app/(athlete)/profile/page.tsx`: Add the achievement/badges section.

## ⚠️ Critical Rule for AI Agents
**Execute ONE task at a time.** After completing each task (A through H in the roadmap), stop and wait for verification or proceed to the next atomic step only after ensuring the previous one is stable and tested.
