# Gamification Feature Plan: Rokhdad FIT

## 1. Product Strategy & Vision
Transform Rokhdad FIT into an addictive fitness experience by rewarding consistency and effort. The core loop revolves around completing workouts to earn XP (Experience Points) for status and Coins for tangible value (insurance discounts).

### Key Mechanics:
- **Workout Streaks:** Focus on daily consistency.
- **XP & Levels:** Progression markers for long-term engagement.
- **Heroic Achievement Badges:** Collection-based motivation featuring iconic figures (Hercules, Rostam).
- **Relatable Volume Motivation:** Comparing total lifted weight to real-world objects (Trucks, Elephants) for fun post-workout feedback.
- **Coin Economy:** Bridging virtual effort with real-world health insurance benefits (Saman Insurance).

---

## 2. Technical Architecture

### 2.1 Database Schema (Supabase)
New tables to be added via migrations:

#### `gamification_stats`
| Column | Type | Description |
| :--- | :--- | :--- |
| `profile_id` | `UUID` | Primary Key, FK to `profiles.id` |
| `xp` | `INTEGER` | Total experience points |
| `level` | `INTEGER` | Current user level |
| `coins` | `INTEGER` | Current coin balance |
| `current_streak` | `INTEGER` | Current daily workout streak |
| `max_streak` | `INTEGER` | All-time highest streak |
| `last_workout_date` | `DATE` | Used to calculate streak breaks |

#### `badges`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key |
| `name_en` | `TEXT` | Badge name (e.g., "Hercules") |
| `name_fa` | `TEXT` | Badge name (e.g., "رستم" or "هرکول") |
| `description_fa` | `TEXT` | How to earn it |
| `icon_url` | `TEXT` | SVG/Image URL |
| `criteria` | `JSONB` | Logic rules (e.g., `{ "type": "total_volume", "value": 100000 }`) |

#### `relatable_objects` (New)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key |
| `name_fa` | `TEXT` | e.g., "کامیون" (Truck), "فیل" (Elephant) |
| `weight_kg` | `INTEGER` | e.g., 5000 for a truck |
| `icon` | `TEXT` | Emoji or SVG icon |

---

## 3. UI/UX Component Hierarchy

### 3.1 Athlete PWA (Next.js)

#### Post-Workout Summary (Enhanced)
- **"You Lifted a Truck!" Card:** Displays an animation comparing `total_volume` to a relatable object.
  - *Example Message:* "خدا قوت! امروز معادل جابجا کردن ۱.۵ **کامیون** تمرین کردی!"
- **Heroic Badge Earned:** Full-screen animation when unlocking "Rostam" or "Hercules" badges.

#### Dashboard (Home)
- **Streak Widget:** Animated flame icon with current streak count.
- **XP Mini-Bar:** Floating progress bar showing distance to next level.

#### Rewards Hub (New Route: `/rewards`)
- **Coin Balance Header:** Prominent display of current coins.
- **Saman Insurance Cards:** Lists available discounts with "Redeem" buttons.

---

## 4. API & Logic

### 4.1 Relatable Volume Calculator
- A utility function that takes `total_volume` and finds the closest `relatable_object`.
- Calculation: `Object_Count = Total_Volume / Object_Weight`.

### 4.2 Heroic Badge Logic
- **Hercules (هرکول):** Awarded for lifting a specific high volume in a single session.
- **Rostam (رستم):** Awarded for a long-term milestone (e.g., total weight lifted across all time exceeding 100 tons).

---

## 5. Admin Panel Integration
- **Relatable Object Manager:** CRUD for the objects (name, weight, icon) used in comparison messages.
- **Heroic Badge Builder:** Specialized UI for setting "Grand Milestone" criteria for legendary badges.
- **Audit Logs:** Track user achievements and coin history.

---

## 6. Implementation Roadmap
1.  **Phase 1:** DB Migrations and basic XP/Coin/Volume tracking.
2.  **Phase 2:** Relatable Object logic and Post-Workout Summary UI.
3.  **Phase 3:** Heroic Badges (Rostam/Hercules) and Leveling system.
4.  **Phase 4:** Saman Insurance Rewards Hub.
