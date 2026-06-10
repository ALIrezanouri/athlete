# Gamification Feature Plan: Rokhdad FIT (AI-Ready & Comprehensive)

## 1. Product Strategy
Transform Rokhdad FIT into an addictive fitness experience using XP, Levels, Heroic Badges, and "Athlete Coins" redeemable for **Saman Insurance** (بیمه سامان) discounts.

**UX Vision:** Leverage visual storytelling (weight comparisons) and "Heroic" aesthetics (Rostam/Hercules) to provide emotional rewards for physical effort. See `plans/ux-design-guide.md` for detailed UI/UX principles.

---

## 2. Technical Specifications (Atomic Tasks)

### 2.1 Database (Supabase SQL)
**Task 1: Execute Database Migration**
Add the following tables to track user stats and rewards.

```sql
-- 1. Gamification Stats Table
CREATE TABLE IF NOT EXISTS public.gamification_stats (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    coins INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_workout_date DATE,
    total_lifetime_volume DECIMAL(15, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Heroic Badges Library
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name_fa TEXT NOT NULL,
    description_fa TEXT NOT NULL,
    icon_url TEXT,
    criteria JSONB NOT NULL, -- e.g. {"type": "session_volume", "threshold": 10000}
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. User Badges (Earned)
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(profile_id, badge_id)
);

-- 4. Relatable Objects for Comparison
CREATE TABLE IF NOT EXISTS public.relatable_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_fa TEXT NOT NULL,
    weight_kg INTEGER NOT NULL,
    icon TEXT, -- Emoji or SVG
    sort_order INTEGER DEFAULT 0
);

-- 5. Saman Insurance Rewards Library
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_fa TEXT NOT NULL,
    description_fa TEXT,
    coin_cost INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    discount_type TEXT CHECK (discount_type IN ('health', 'life', 'general')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Reward Redemption History
CREATE TABLE IF NOT EXISTS public.reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE,
    discount_code TEXT NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatable_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own stats" ON public.gamification_stats FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Public read badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Users read own badges" ON public.user_badges FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Public read relatable objects" ON public.relatable_objects FOR SELECT USING (true);
CREATE POLICY "Public read rewards" ON public.rewards FOR SELECT USING (true);
CREATE POLICY "Users read own claims" ON public.reward_claims FOR SELECT USING (auth.uid() = profile_id);
```

### 2.2 Logic & Utilities
**Task 2: Implement `lib/gamification-utils.ts`**
A modular utility for calculating relatable weight comparisons.

```typescript
export interface RelatableObject {
  name_fa: string;
  weight_kg: number;
  icon: string;
}

export function getRelatableComparison(sessionVolume: number, library: RelatableObject[]) {
  // Sort library by weight descending
  const sorted = [...library].sort((a, b) => b.weight_kg - a.weight_kg);

  // Find the largest object where sessionVolume is at least 30% of its weight
  const target = sorted.find(obj => sessionVolume >= obj.weight_kg * 0.3) || sorted[sorted.length - 1];

  const count = (sessionVolume / target.weight_kg).toFixed(1);
  return {
    message: `امروز معادل ${count} ${target.name_fa} جابجا کردی!`,
    icon: target.icon
  };
}
```

---

## 3. Athlete PWA Roadmap (AI Tasks)

1.  **Task A (Migration):** Execute the SQL from Section 2.1.
2.  **Task B (Actions):** Create `app/actions/gamification.ts`. Implement `getGamificationStats()`, `getRewards()`, and `claimReward(rewardId)`.
3.  **Task C (Trigger):** In `app/actions/workouts.ts`, modify `completeWorkout` to:
    - Sum volume: `SELECT SUM(weight_kg * reps) FROM workout_sets WHERE workout_exercise_id IN (...) AND is_completed = true`.
    - Call `updateUserStats(profileId, sessionVolume)`.
4.  **Task D (UI):** Create `components/gamification/HeroicBadgeOverlay.tsx` and `components/gamification/RelatableVolumeCard.tsx`.
5.  **Task E (Routes):** Implement `app/(athlete)/rewards/page.tsx` (Shop) and update `app/(athlete)/profile/page.tsx` (Achievement list).

---

## 4. Admin Panel Roadmap (Separate Project)

**Task F: Badge Management UI**
- Page to create/edit `badges` with JSONB criteria (e.g., `{"session_volume": 10000}`).

**Task G: Reward Inventory UI**
- Interface to manage Saman Insurance `rewards` (cost, status, discount type).

**Task H: User Auditing**
- Dashboard to view `reward_claims` and `user_badges` for customer support and fraud prevention.

---

## 5. Seed Data for Initial Launch
- **Badges:**
  - `rostam`: "رستم" (Lifetime 100 tons)
  - `hercules`: "هرکول" (Session 10 tons)
- **Objects:**
  - `Truck`: "کامیون" (5000kg)
  - `Elephant`: "فیل" (6000kg)
  - `Pride`: "پراید" (900kg)
