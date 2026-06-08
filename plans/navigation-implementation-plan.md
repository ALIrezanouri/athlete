# 🗺️ Navigation Implementation Plan: Feature Accessibility

**Created**: 2026-06-04  
**Goal**: Every feature accessible within 2 clicks max

---

## ✅ Phase 1.1 DONE — Home Quick Actions Expanded (8 items)
**File**: `athlete-pwa/app/(athlete)/home/page.tsx`
- Changed from 4 → 8 Quick Action buttons (2 rows × 4 columns)
- Added: رکوردها (PR), نقشه بدن (Body Map), فید (Community), حرکات (Exercises)
- All 8 features now 1-click from Home

---

## 📋 Remaining Steps

### Phase 1.2 — Profile Page Feature Hub
**File**: `athlete-pwa/app/(athlete)/profile/page.tsx`
- Add "Features" section with cards for: Analytics, PR Records, Body Stats, Calendar, Exercises, Tools
- Each card → direct link to its page
- Add PR (`/pr`) and Body Stats (`/body-stats`) links

### Phase 1.3 — Home "Popular Gyms" → link to /gyms
**File**: `athlete-pwa/app/(athlete)/home/page.tsx`
- Change "View All" link from `/explore` to `/gyms` (when page exists)

### Phase 2.1 — Gym Discovery Page (Airbnb-style)
**New file**: `athlete-pwa/app/(athlete)/gyms/page.tsx`
- Map + list view toggle
- Filters: distance, rating, price, amenities
- Sort: nearest, cheapest, top-rated
- Search by name/area

### Phase 2.2 — Gym Detail Page
**New file**: `athlete-pwa/app/(athlete)/gyms/[id]/page.tsx`
- Photo gallery
- Equipment tags
- Available time slots
- Trainer profiles
- User reviews
- Book Now CTA

### Phase 2.3 — Add Gyms Section to Home
**File**: `athlete-pwa/app/(athlete)/home/page.tsx`
- Horizontal scroll of nearby gym cards
- "View All →" link to `/gyms`

### Phase 3 — Connect Hidden Features
- PR page: Add link from Profile + Analytics
- Exercises page: Add prominent link from Workout page
- Tools page: Add Quick Access section on Profile
- Community: Add tab in bottom nav or prominent Home link

### Phase 4 — Marketing Features
- `/referral` — Referral system with credits
- `/challenges` — Challenge + leaderboard page
- Push notification infrastructure