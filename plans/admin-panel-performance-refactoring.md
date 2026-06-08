# Admin Panel Performance Refactoring Plan

**Date:** 2026-06-05  
**Scope:** `adminpanel/` — Next.js 16 App Router + Supabase  
**Status:** Planning Phase  
**Related:** `plans/optimize-dev-loading.md`, `memory-bank/activeContext.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Performance Profiling & Root Cause Analysis](#2-performance-profiling--root-cause-analysis)
3. [Critical Findings Inventory](#3-critical-findings-inventory)
4. [Phase 0 — Measurement Infrastructure](#4-phase-0--measurement-infrastructure)
5. [Phase 1 — Emergency Backend Hotfixes](#5-phase-1--emergency-backend-hotfixes)
6. [Phase 2 — Frontend Architecture Restructuring](#6-phase-2--frontend-architecture-restructuring)
7. [Phase 3 — Database Optimization Layer](#7-phase-3--database-optimization-layer)
8. [Phase 4 — Advanced Caching & CDN Strategy](#8-phase-4--advanced-caching--cdn-strategy)
9. [Phase 5 — Dependency Hygiene & Bundle Optimization](#9-phase-5--dependency-hygiene--bundle-optimization)
10. [Risk Mitigation Protocols](#10-risk-mitigation-protocols)
11. [Benchmarks & Continuous Monitoring](#11-benchmarks--continuous-monitoring)
12. [Implementation Timeline](#12-implementation-timeline)

---

## 1. Executive Summary

The admin panel (`adminpanel/`) suffers from severe performance bottlenecks traceable to three root causes:

| Category | Root Cause | Impact |
|---|---|---|
| **Backend** | N+1 queries, full-table scans, zero caching | API responses 3-15s on moderate data |
| **Frontend** | 100% client components, no code splitting, duplicate motion libs | 2-5MB+ initial JS bundle, slow TTI |
| **Database** | Missing indexes, no aggregation optimization, client-side computation | Sequential scans on growing tables |

The plan is organized into 6 phases with clear rollback points, progressing from highest-impact/lowest-risk fixes to architectural improvements.

**Target Metrics:**
- Time to Interactive (TTI): < 2s (from ~8-12s estimated current)
- Largest Contentful Paint (LCP): < 1.5s (from ~4-6s estimated current)
- API response times: < 200ms p95 (from 3-15s current)
- Initial JS bundle: < 300KB gzipped (from estimated 1-2MB+)
- Total page weight: < 500KB (from estimated 3-5MB+)

---

## 2. Performance Profiling & Root Cause Analysis

### 2.1 Profiling Tools Setup

Before any optimization, establish baseline measurements:

```bash
# Install profiling tools
npm install --save-dev webpack-bundle-analyzer @next/bundle-analyzer lighthouse

# Bundle analysis (add to next.config.ts)
# Lighthouse CI for automated perf regression detection
# Chrome DevTools Performance tab for runtime profiling
```

### 2.2 Profiling Checklist

| Measurement | Tool | Frequency |
|---|---|---|
| Bundle size per route | `@next/bundle-analyzer` | Every build |
| Server action response times | Custom timing middleware | Continuous |
| Database query times | Supabase `pg_stat_statements` | Continuous |
| Core Web Vitals (LCP, FID, CLS) | Lighthouse / Chrome UX Report | Weekly |
| Memory usage patterns | Chrome DevTools Memory panel | Per-phase |
| Network waterfall analysis | Chrome DevTools Network tab | Per-page |

### 2.3 Root Cause Map

```
Slow Page Load
├── Heavy JS Bundle (2MB+)
│   ├── Both framer-motion AND motion installed (duplicate ~150KB)
│   ├── ws library in client bundle (~50KB, Node-only lib)
│   ├── All 18 pages statically imported in client bundle
│   ├── No route-based code splitting
│   └── lucide-react icons — likely importing entire icon set
│
├── Client-Side Data Fetching Waterfall
│   ├── ALL pages are 'use client' (zero RSC benefits)
│   ├── useEffect → server action → wait → render (serial)
│   ├── No streaming, no Suspense boundaries
│   ├── No loading.tsx files for dashboard routes
│   └── No prefetching or parallel data loading
│
├── Inefficient Server Actions
│   ├── N+1 query in routines.ts (36 serial round-trips for 1 routine)
│   ├── Full table fetch in analytics.ts (entire bookings table transferred)
│   ├── select('*') everywhere (over-fetching columns)
│   ├── No caching (cache: 'no-store' by default)
│   ├── Client-side aggregation instead of SQL
│   └── No pagination on list endpoints
│
└── Database Level
    ├── Missing indexes on status, date, role columns
    ├── No composite indexes for JOIN-heavy queries
    ├── No materialized views for analytics
    └── Sequential scans on growing tables
```

---

## 3. Critical Findings Inventory

### 3.1 Severity: CRITICAL 🔴

| ID | Issue | File(s) | Impact | Effort |
|---|---|---|---|---|
| C1 | **N+1 query pattern** — `getRoutineDetail()` fires 36 serial queries for a 5-day/6-exercise routine | `actions/routines.ts:109-127` | 3-15s API response | S |
| C2 | **Full table fetch** — `getAnalyticsMetrics()` transfers entire bookings table to count statuses and sum revenue | `actions/analytics.ts:58-100` | OOM risk, 5-30s | S |
| C3 | **Full table fetch** — `getRevenueChart()` fetches ALL bookings for client-side date grouping | `actions/analytics.ts:103-140` | Same as C2 | S |
| C4 | **All pages are client components** — zero Server Components, no SSR, no streaming | All 18 `dashboard/*/page.tsx` | 2-5s TTI penalty | M |
| C5 | **Duplicate animation libraries** — both `framer-motion` AND `motion` installed | `package.json` | ~150KB wasted | S |

### 3.2 Severity: HIGH 🟠

| ID | Issue | File(s) | Impact | Effort |
|---|---|---|---|---|
| H1 | **No caching** — every server action is `cache: 'no-store'` | All `actions/*.ts` | Redundant DB hits | S |
| H2 | **Over-fetching columns** — `select('*')` used universally | All `actions/*.ts` | 2-10x payload bloat | S |
| H3 | **Missing database indexes** — no indexes on status, date, role columns used in WHERE/JOIN | Migration files | Sequential scans | M |
| H4 | **No route code splitting** — all dashboard pages eagerly loaded | All `dashboard/*/page.tsx` | Large initial bundle | M |
| H5 | **No loading.tsx files** — no streaming/Suspense for dashboard routes | `app/(dashboard)/dashboard/` | Blank screen during load | S |
| H6 | **`ws` in client bundle** — Node-only WebSocket library | `package.json` | ~50KB waste | S |

### 3.3 Severity: MEDIUM 🟡

| ID | Issue | File(s) | Impact | Effort |
|---|---|---|---|---|
| M1 | **Client-side pagination** — full dataset fetched, sliced in JS | `actions/bookings.ts`, `actions/users.ts` | Growing payload | M |
| M2 | **No request deduplication** — multiple components call same action | Dashboard pages | Redundant fetches | S |
| M3 | **Sidebar eagerly renders** — no virtualization for long nav lists | `admin-sidebar.tsx` | Minor render cost | S |
| M4 | **No error boundaries** — unhandled errors crash entire dashboard | `app/(dashboard)/` | Poor UX on failure | S |
| M5 | **Middleware inefficiency** — runs Supabase session check on every request | `middleware.ts` | 50-100ms per navigation | S |

---

## 4. Phase 0 — Measurement Infrastructure

**Goal:** Establish baselines and automated perf regression detection.  
**Duration:** 1 day  
**Risk:** None — purely additive.

### 4.1 Bundle Analyzer Setup

**File:** `adminpanel/next.config.ts`

```typescript
import type { NextConfig } from 'next';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // ... existing config
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
```

### 4.2 Server Action Timing Wrapper

**New file:** `adminpanel/lib/perf/action-timer.ts`

```typescript
import { performance } from 'perf_hooks';

export function withTiming<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
): T {
  return (async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
      if (duration > 2000) {
        console.warn(`[PERF SLOW] ${name} took ${duration.toFixed(2)}ms`);
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[PERF ERROR] ${name} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }) as T;
}
```

### 4.3 Baseline Capture

```bash
# Build and analyze
cd adminpanel && ANALYZE=true npm run build

# Run Lighthouse on each dashboard route (after starting server)
npx lighthouse http://localhost:3001/dashboard --output json --output-path ./baseline-dashboard.json
npx lighthouse http://localhost:3001/dashboard/analytics --output json --output-path ./baseline-analytics.json
# ... repeat for key routes
```

### 4.4 Database Query Baseline

```sql
-- Enable pg_stat_statements if not already
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find sequential scans
SELECT relname, seq_scan, idx_scan
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;
```

---

## 5. Phase 1 — Emergency Backend Hotfixes

**Goal:** Fix the most expensive backend anti-patterns with minimal code changes.  
**Duration:** 2-3 days  
**Risk:** LOW — targeted fixes, easily testable.

### 5.1 Fix N+1 Query in Routines (C1)

**File:** `adminpanel/app/actions/routines.ts`

**Current (BROKEN):**
```typescript
// Lines 109-127: Sequential N+1 pattern
const { data: routine } = await supabase.from('routines').select('*').eq('id', id).single();
const { data: days } = await supabase.from('routine_days').select('*').eq('routine_id', id);
for (const day of days) {
  const { data: exercises } = await supabase.from('routine_exercises').select('*').eq('routine_day_id', day.id);
  for (const exercise of exercises) {
    const { data: sets } = await supabase.from('routine_sets').select('*').eq('routine_exercise_id', exercise.id);
    // ... accumulate
  }
}
```

**Fix:** Single nested join query:
```typescript
export async function getRoutineDetail(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('routines')
    .select(`
      *,
      routine_days (
        *,
        routine_exercises (
          *,
          routine_sets (*)
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

**Expected improvement:** 36 HTTP round-trips → 1. ~3-15s → ~50-100ms.

### 5.2 Fix Full-Table Analytics Fetch (C2, C3)

**File:** `adminpanel/app/actions/analytics.ts`

**Current (BROKEN):**
```typescript
// Fetches ALL bookings to count in JS
const { data: allBookings } = await supabase.from('bookings').select('*', { count: 'exact' });
const active = allBookings.filter(b => b.status === 'active').length;
```

**Fix:** Use SQL aggregation with Supabase RPC or direct queries:
```typescript
export async function getAnalyticsMetrics() {
  const supabase = await createClient();

  // Single query with aggregation — no data transfer
  const { data: statusCounts, error: e1 } = await supabase
    .from('bookings')
    .select('status')
    .eq('gym_id', gymId); // Scope to relevant gym

  // Use SQL count via Supabase
  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true });

  // Revenue via dedicated query — only sum, not rows
  const { data: revenue } = await supabase.rpc('get_revenue_summary', {
    p_gym_id: gymId,
  });

  // ... build metrics from aggregates
}
```

**Alternative — Create SQL RPC:**
```sql
-- New migration: analytics_rpc_functions.sql
CREATE OR REPLACE FUNCTION get_analytics_dashboard(p_gym_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_bookings', (SELECT count(*) FROM bookings WHERE p_gym_id IS NULL OR gym_id = p_gym_id),
    'active_bookings', (SELECT count(*) FROM bookings WHERE status = 'active' AND (p_gym_id IS NULL OR gym_id = p_gym_id)),
    'total_revenue', (SELECT COALESCE(sum(amount), 0) FROM bookings WHERE payment_status = 'paid' AND (p_gym_id IS NULL OR gym_id = p_gym_id)),
    'total_users', (SELECT count(*) FROM profiles),
    'total_gyms', (SELECT count(*) FROM gyms)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Expected improvement:** Entire table transfer → single aggregate query. ~5-30s → ~20-50ms.

### 5.3 Add Column-Level Selects (H2)

**Strategy:** Replace all `select('*')` with explicit column lists across all server actions.

```typescript
// BEFORE
const { data } = await supabase.from('bookings').select('*');

// AFTER
const { data } = await supabase.from('bookings').select(`
  id,
  user_id,
  gym_id,
  time_slot_id,
  status,
  booking_date,
  amount,
  payment_status,
  check_in_code,
  created_at
`);
// Exclude: large text fields, internal notes, etc. when not displayed
```

**Priority order (highest impact first):**
1. `bookings` — largest table, most frequently queried
2. `workout_logs` — can be very large
3. `exercises` — 413+ rows
4. `users/profiles` — frequently joined
5. All remaining tables

### 5.4 Add Server-Side Pagination (M1)

**File pattern:** All list-fetching actions

```typescript
// BEFORE
export async function getBookings() {
  const { data } = await supabase.from('bookings').select('*');
  return data;
}

// AFTER
export async function getBookings(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  gymId?: string;
}) {
  const { page = 1, pageSize = 25, status, gymId } = params;
  const supabase = await createClient();

  let query = supabase
    .from('bookings')
    .select('id, user_id, gym_id, status, booking_date, amount, payment_status, created_at', { count: 'exact' })
    .range((page - 1) * pageSize, page * pageSize - 1)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (gymId) query = query.eq('gym_id', gymId);

  const { data, error, count } = await query;
  return { data, total: count, page, pageSize };
}
```

### 5.5 Phase 1 Validation Checklist

- [ ] `getRoutineDetail()` fires exactly 1 query (verify via Supabase logs)
- [ ] `getAnalyticsMetrics()` response time < 200ms (verify via timing wrapper)
- [ ] All `select('*')` replaced with explicit column lists
- [ ] List endpoints support pagination with default page size ≤ 25
- [ ] All existing dashboard pages still function correctly
- [ ] No TypeScript errors introduced

---

## 6. Phase 2 — Frontend Architecture Restructuring

**Goal:** Convert client components to Server Components, add streaming, implement lazy loading.  
**Duration:** 5-7 days  
**Risk:** MEDIUM — significant page rewrites, but isolated per route.

### 6.1 Architecture: Server Component Pattern

**Current flow (slow):**
```
Client requests page → Server sends empty shell + full JS → Client hydrates →
useEffect fires → Server action called → Server queries DB → Response returned →
Client renders data
```

**Target flow (fast):**
```
Client requests page → Server queries DB directly → Server renders HTML →
Client receives fully rendered page + minimal JS → Client hydrates interactive bits
```

### 6.2 Conversion Strategy: Hybrid Server/Client Pattern

For each dashboard page, split into:

1. **Server Component** (page.tsx) — handles data fetching, passes data as props
2. **Client Component** (components/page-client.tsx) — handles interactivity only

**Example: `dashboard/bookings/page.tsx`**

```typescript
// app/(dashboard)/dashboard/bookings/page.tsx — SERVER COMPONENT
import { getBookings } from '@/app/actions/bookings';
import { BookingsClient } from './bookings-client';

export const revalidate = 30; // ISR: revalidate every 30 seconds

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const { data: bookings, total, page, pageSize } = await getBookings({
    page: Number(searchParams.page) || 1,
    status: searchParams.status,
  });

  return (
    <BookingsClient
      initialBookings={bookings}
      total={total}
      page={page}
      pageSize={pageSize}
    />
  );
}
```

```typescript
// app/(dashboard)/dashboard/bookings/bookings-client.tsx — CLIENT COMPONENT
'use client';

import { useState, useTransition } from 'react';
import { updateBookingStatus } from '@/app/actions/bookings';

export function BookingsClient({ initialBookings, total, page, pageSize }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      await updateBookingStatus(id, status);
      // Optimistic update or revalidation
    });
  };

  return (
    // Render bookings with interactive elements
  );
}
```

### 6.3 Conversion Priority Order

Convert pages in order of impact (highest traffic × worst performance first):

| Priority | Page | Reason | Complexity |
|---|---|---|---|
| 1 | `/dashboard` (main) | Landing page, heavy analytics queries | High |
| 2 | `/dashboard/analytics` | Multiple full-table scans (C2, C3) | High |
| 3 | `/dashboard/bookings` | High traffic, large table | Medium |
| 4 | `/dashboard/users` | High traffic, growing table | Medium |
| 5 | `/dashboard/gyms` | Frequently accessed | Medium |
| 6 | `/dashboard/reports` | Heavy aggregation | High |
| 7 | `/dashboard/workouts` | Large data set | Medium |
| 8 | `/dashboard/routines` | N+1 query fix dependent | Medium |
| 9-18 | Remaining pages | Lower traffic | Low-Medium |

### 6.4 Add Suspense Boundaries & Loading States

**New file:** `adminpanel/app/(dashboard)/dashboard/loading.tsx`

```typescript
export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    </div>
  );
}
```

**New file per route:** `adminpanel/app/(dashboard)/dashboard/bookings/loading.tsx`

```typescript
export default function BookingsLoading() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse h-10 w-full bg-muted rounded-lg" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse h-16 w-full bg-muted rounded-lg" />
      ))}
    </div>
  );
}
```

**Add Suspense boundaries in dashboard layout:**

```typescript
// app/(dashboard)/layout.tsx
import { Suspense } from 'react';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <Suspense fallback={<DashboardLoading />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
```

### 6.5 Component Lazy Loading

For heavy client-side components that cannot become server components:

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy chart libraries
const RevenueChart = dynamic(() => import('./revenue-chart'), {
  loading: () => <div className="animate-pulse h-64 w-full bg-muted rounded" />,
  ssr: false, // Charts don't need SSR
});

// Lazy load date picker (heavy dependency)
const JalaliDatePicker = dynamic(() => import('@/components/ui/jalali-date-picker'), {
  loading: () => <div className="animate-pulse h-10 w-48 bg-muted rounded" />,
});
```

### 6.6 State Management Restructuring

**Current pattern (per-page):**
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
useEffect(() => { fetchData(); }, []);
```

**Target pattern — use Server Components for initial data, client state only for mutations:**

```typescript
// Server Component provides initial data
// Client Component uses React's built-in cache mechanism

import { useFormState, useFormStatus } from 'react-dom';

// For mutations, use action-based pattern:
async function handleSubmit(formData: FormData) {
  'use server';
  // Direct server-side mutation
}

// Client component only manages UI state (filters, modals, etc.)
```

### 6.7 Phase 2 Validation Checklist

- [ ] Top 8 pages converted to hybrid server/client pattern
- [ ] All 18 dashboard routes have `loading.tsx` files
- [ ] Dashboard layout has Suspense boundary
- [ ] Heavy components (charts, date pickers) use `dynamic()` imports
- [ ] No `useEffect` for initial data fetching in converted pages
- [ ] Core Web Vitals measured and improved from baseline

---

## 7. Phase 3 — Database Optimization Layer

**Goal:** Add missing indexes, create aggregation helpers, optimize at PostgreSQL level.  
**Duration:** 2-3 days  
**Risk:** LOW-MEDIUM — new indexes are non-breaking, RPC functions are additive.

### 7.1 New Migration: Performance Indexes

**File:** `athlete-pwa/supabase/migrations/20240603000000_add_performance_indexes.sql`

```sql
-- =====================================================
-- PERFORMANCE INDEXES FOR ADMIN PANEL QUERIES
-- =====================================================

-- Bookings: most queried table, filtered by status, date, gym, user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status
  ON bookings (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_gym_id
  ON bookings (gym_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_id
  ON bookings (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_booking_date
  ON bookings (booking_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_payment_status
  ON bookings (payment_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_gym_status_date
  ON bookings (gym_id, status, booking_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_created_at
  ON bookings (created_at DESC);

-- Profiles: filtered by role, searched by name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role
  ON profiles (role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_full_name
  ON profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_mobile_number
  ON profiles (mobile_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_country_id
  ON profiles (country_id);

-- Workout Logs: filtered by user, date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_logs_user_id
  ON workout_logs (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_logs_started_at
  ON workout_logs (started_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_logs_user_date
  ON workout_logs (user_id, started_at DESC);

-- Reviews: filtered by gym, rating
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_gym_id
  ON reviews (gym_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_rating
  ON reviews (rating);

-- Time Slots: filtered by gym, day
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_slots_gym_id
  ON time_slots (gym_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_slots_gym_day
  ON time_slots (gym_id, day_of_week);

-- Routine hierarchy: join optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routine_days_routine_id
  ON routine_days (routine_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routine_exercises_day_id
  ON routine_exercises (routine_day_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routine_sets_exercise_id
  ON routine_sets (routine_exercise_id);

-- Gym Equipment: filtered by gym
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gym_equipment_gym_id
  ON gym_equipment (gym_id);

-- Wallet Transactions: filtered by user, date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_user_id
  ON wallet_transactions (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_created_at
  ON wallet_transactions (created_at DESC);

-- Social: follows, posts, likes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_follows_follower
  ON social_follows (follower_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_follows_following
  ON social_follows (following_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_posts_user_id
  ON social_posts (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_posts_created_at
  ON social_posts (created_at DESC);

-- Audit Log: filtered by action, date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action
  ON audit_log (action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at
  ON audit_log (created_at DESC);

-- Enable pg_trgm for text search (profiles, exercises)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 7.2 Analytics RPC Functions

**File:** `athlete-pwa/supabase/migrations/20240604000000_create_analytics_rpc.sql`

```sql
-- =====================================================
-- ANALYTICS AGGREGATION FUNCTIONS
-- Eliminates full-table scans for dashboard metrics
-- =====================================================

-- Dashboard summary (single query, replaces 5+ queries)
CREATE OR REPLACE FUNCTION get_admin_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'total_gyms', (SELECT count(*) FROM gyms),
    'total_bookings', (SELECT count(*) FROM bookings),
    'active_bookings', (SELECT count(*) FROM bookings WHERE status = 'active'),
    'total_revenue', (
      SELECT COALESCE(sum(amount), 0)
      FROM bookings
      WHERE payment_status = 'paid'
    ),
    'total_reviews', (SELECT count(*) FROM reviews),
    'avg_rating', (
      SELECT COALESCE(avg(rating), 0)::numeric(3,2)
      FROM reviews
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Revenue chart data (server-side grouping)
CREATE OR REPLACE FUNCTION get_revenue_by_month(
  p_months_back INTEGER DEFAULT 12
)
RETURNS TABLE (
  month TEXT,
  revenue NUMERIC,
  booking_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_char(created_at, 'YYYY-MM') AS month,
    COALESCE(sum(amount), 0) AS revenue,
    count(*) AS booking_count
  FROM bookings
  WHERE payment_status = 'paid'
    AND created_at >= date_trunc('month', now() - (p_months_back || ' months')::interval)
  GROUP BY to_char(created_at, 'YYYY-MM')
  ORDER BY month;
END;
$$ LANGUAGE plpgsql STABLE;

-- Booking status distribution (replaces full table fetch)
CREATE OR REPLACE FUNCTION get_booking_status_distribution()
RETURNS TABLE (
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT bookings.status, count(*)
  FROM bookings
  GROUP BY bookings.status;
END;
$$ LANGUAGE plpgsql STABLE;

-- User growth by month
CREATE OR REPLACE FUNCTION get_user_growth(
  p_months_back INTEGER DEFAULT 12
)
RETURNS TABLE (
  month TEXT,
  new_users BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly AS (
    SELECT
      to_char(created_at, 'YYYY-MM') AS month,
      count(*) AS new_users
    FROM profiles
    WHERE created_at >= date_trunc('month', now() - (p_months_back || ' months')::interval)
    GROUP BY to_char(created_at, 'YYYY-MM')
  )
  SELECT
    month,
    new_users,
    sum(new_users) OVER (ORDER BY month) AS total_users
  FROM monthly
  ORDER BY month;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 7.3 Verify Index Usage

After applying indexes, verify with:

```sql
-- Check that queries use indexes
EXPLAIN ANALYZE SELECT * FROM bookings WHERE status = 'active';
EXPLAIN ANALYZE SELECT * FROM bookings WHERE gym_id = 'some-uuid' ORDER BY created_at DESC;

-- Monitor index usage over time
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;  -- Low scan count = potentially unused index
```

### 7.4 Phase 3 Validation Checklist

- [ ] All indexes created successfully (`CONCURRENTLY` — zero downtime)
- [ ] `EXPLAIN ANALYZE` confirms index usage on key queries
- [ ] Analytics RPC functions return identical results to previous client-side calculations
- [ ] Query times for top 10 queries < 50ms
- [ ] No sequential scans on tables > 1000 rows

---

## 8. Phase 4 — Advanced Caching & CDN Strategy

**Goal:** Implement multi-layer caching to eliminate redundant computation.  
**Duration:** 3-4 days  
**Risk:** MEDIUM — caching introduces stale data risk, needs careful invalidation.

### 8.1 Next.js Route-Level Caching (ISR)

```typescript
// For semi-static pages (config, translations, countries)
export const revalidate = 300; // 5 minutes

// For dynamic pages with frequent updates (bookings, users)
export const revalidate = 30; // 30 seconds

// For real-time pages (analytics dashboard)
export const dynamic = 'force-dynamic';
// But with response caching via next/cache
```

### 8.2 Server Action Response Caching

**New utility:** `adminpanel/lib/cache/action-cache.ts`

```typescript
import { unstable_cache } from 'next/cache';

// Cache wrapper for server actions
export function cachedAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options: {
    tags: string[];
    revalidate?: number;
  }
): T {
  return unstable_cache(action, options.tags, {
    revalidate: options.revalidate ?? 60,
    tags: options.tags,
  }) as T;
}

// Usage:
export const getBookings = cachedAction(
  async (params: BookingParams) => {
    // ... query logic
  },
  { tags: ['bookings'], revalidate: 30 }
);

// Invalidation after mutations:
export async function createBooking(data: BookingData) {
  // ... create logic
  revalidateTag('bookings'); // Invalidate all booking caches
}
```

### 8.3 Cache Tag Strategy

```typescript
// Cache tags for each data domain
const CACHE_TAGS = {
  bookings: 'bookings',
  users: 'users',
  gyms: 'gyms',
  analytics: 'analytics',
  exercises: 'exercises',
  config: 'config',
  translations: 'translations',
  reviews: 'reviews',
  social: 'social',
  workouts: 'workouts',
  routines: 'routines',
} as const;

// Revalidation after mutations
// In createBooking: revalidateTag('bookings'), revalidateTag('analytics')
// In updateUser: revalidateTag('users'), revalidateTag('analytics')
// In updateConfig: revalidateTag('config')
```

### 8.4 HTTP-Level Caching Headers

```typescript
// middleware.ts — add cache headers for static assets
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Cache static assets aggressively
  if (request.nextUrl.pathname.match(/\.(js|css|woff2?|png|jpg|svg|ico)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Cache API responses briefly
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'private, max-age=10');
  }

  return response;
}
```

### 8.5 Request Deduplication

Next.js automatically deduplicates `fetch` requests in Server Components. For server actions, use React's `cache`:

```typescript
import { cache } from 'react';

// Deduplicate within a single render pass
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
```

### 8.6 Phase 4 Validation Checklist

- [ ] All read-only server actions use `unstable_cache` with appropriate tags
- [ ] All mutation actions call `revalidateTag` for affected data
- [ ] Cache hit rate > 80% for repeated page loads (measured via timing)
- [ ] Stale data never visible for > configured `revalidate` window
- [ ] No memory leaks from cache accumulation

---

## 9. Phase 5 — Dependency Hygiene & Bundle Optimization

**Goal:** Eliminate unnecessary dependencies, optimize bundle size.  
**Duration:** 1-2 days  
**Risk:** LOW — mostly removal and configuration changes.

### 9.1 Remove Duplicate Motion Library

```bash
# Remove one of the duplicate animation libraries
cd adminpanel
npm uninstall motion  # Keep framer-motion (more established)
# OR keep motion and remove framer-motion (lighter)

# Audit all imports to ensure consistency
grep -r "from 'motion" adminpanel/
grep -r "from 'framer-motion" adminpanel/
```

**Expected savings:** ~75-150KB gzipped.

### 9.2 Remove `ws` from Client Bundle

```typescript
// next.config.ts — exclude Node-only modules from client bundle
const nextConfig: NextConfig = {
  serverExternalPackages: ['ws'],
  // ...
};
```

Or if `ws` is unused, remove entirely:
```bash
npm uninstall ws
```

**Expected savings:** ~50KB.

### 9.3 Optimize Icon Imports

```typescript
// next.config.ts — already partially configured
experimental: {
  optimizePackageImports: [
    'lucide-react',   // Tree-shake icons
    'framer-motion',  // Tree-shake animations
  ],
}
```

Verify with bundle analyzer that only used icons are included.

### 9.4 Tree-Shake Date Picker

`react-multi-date-picker` bundles multiple calendar systems. Ensure only Gregorian/Jalali is included:

```typescript
// Use dynamic import for date picker (rarely needed on initial load)
const JalaliDatePicker = dynamic(
  () => import('@/components/ui/jalali-date-picker'),
  { ssr: false }
);
```

### 9.5 Bundle Size Targets

| Resource | Current (est.) | Target | Max Allowed |
|---|---|---|---|
| Initial JS (gzipped) | ~800KB-1.5MB | < 300KB | 400KB |
| Individual route chunk | ~200-500KB | < 50KB | 80KB |
| CSS (gzipped) | ~100KB | < 50KB | 70KB |
| Total page weight | ~3-5MB | < 500KB | 750KB |

### 9.6 Phase 5 Validation Checklist

- [ ] `framer-motion` XOR `motion` removed (not both)
- [ ] `ws` excluded from client bundle or removed
- [ ] `optimizePackageImports` configured for `lucide-react`, `framer-motion`
- [ ] Bundle analysis shows no chunks > 100KB gzipped (except initial)
- [ ] Total initial JS < 300KB gzipped
- [ ] Date picker loaded dynamically

---

## 10. Risk Mitigation Protocols

### 10.1 General Risk Matrix

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Breaking existing functionality | Medium | High | Baby Steps™: one page at a time, test before proceeding |
| Stale data from caching | Medium | Medium | Short revalidation windows, explicit invalidation on mutations |
| Index creation locks table | Low | High | Use `CONCURRENTLY` for all index creation |
| Supabase join query compatibility | Low | Medium | Test nested joins in isolation before deploying |
| React 19 + Next.js 16 compatibility issues | Medium | High | Pin exact versions, test in dev first |
| Migration breaks existing RLS policies | Low | High | New indexes don't affect RLS; RPC functions inherit caller policies |

### 10.2 Rollback Strategy

Each phase is independently revertable:

- **Phase 1 (Backend):** Revert individual action files. Old functions can coexist with new ones.
- **Phase 2 (Frontend):** Keep old client components as `*.backup.tsx` during conversion. Flip imports to revert.
- **Phase 3 (Database):** Indexes can be dropped without data loss. RPC functions can be dropped.
- **Phase 4 (Caching):** Remove cache wrappers; falls back to uncached behavior.
- **Phase 5 (Dependencies):** Re-add removed packages; revert config changes.

### 10.3 Testing Protocol Per Step

```
1. Make single targeted change
2. Run TypeScript compilation: npx tsc --noEmit
3. Run build: npm run build
4. Test affected page manually in browser
5. Verify data accuracy (compare old vs new responses)
6. Check performance timing via action-timer wrapper
7. Only then proceed to next change
```

### 10.4 Feature Flags for Phased Rollout

```typescript
// lib/feature-flags.ts
const FLAGS = {
  USE_SERVER_COMPONENTS: process.env.NEXT_PUBLIC_FF_RSC === 'true',
  USE_CACHED_ACTIONS: process.env.NEXT_PUBLIC_FF_CACHE === 'true',
  USE_ANALYTICS_RPC: process.env.NEXT_PUBLIC_FF_RPC === 'true',
  USE_PAGINATION: process.env.NEXT_PUBLIC_FF_PAGINATION === 'true',
} as const;

// Usage in pages:
if (FLAGS.USE_SERVER_COMPONENTS) {
  // New server component path
} else {
  // Legacy client component path
}
```

---

## 11. Benchmarks & Continuous Monitoring

### 11.1 Performance Budget Configuration

**File:** `adminpanel/performance-budget.json`

```json
{
  "budgets": [
    {
      "resourceSizes": [
        { "resourceType": "script", "budget": 300 },
        { "resourceType": "stylesheet", "budget": 50 },
        { "resourceType": "total", "budget": 500 }
      ],
      "timings": [
        { "metric": "interactive", "budget": 2000 },
        { "metric": "largest-contentful-paint", "budget": 1500 },
        { "metric": "first-contentful-paint", "budget": 800 }
      ]
    }
  ]
}
```

### 11.2 Automated CI Checks

```yaml
# .github/workflows/perf-check.yml (future)
name: Performance Check
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3001/dashboard
            http://localhost:3001/dashboard/analytics
          budgetPath: ./performance-budget.json
          uploadArtifacts: true
```

### 11.3 Server Action Performance Log

**Continuous monitoring via the timing wrapper from Phase 0:**

```typescript
// Log structure:
// [PERF] getAnalyticsMetrics: 45.23ms
// [PERF SLOW] getRoutineDetail: 3245.67ms  ← triggers alert

// Aggregate in production via:
// - Vercel Analytics (if deployed on Vercel)
// - Custom logging to Supabase audit_log table
// - Console logs parsed by monitoring service
```

### 11.4 Key Performance Indicators (KPIs)

| KPI | Measurement Method | Current (est.) | Phase 1 Target | Phase 5 Target |
|---|---|---|---|---|
| **Dashboard page TTI** | Lighthouse | ~8-12s | ~4-6s | < 2s |
| **Analytics API response** | Action timer | ~5-30s | < 200ms | < 50ms |
| **Routine detail API** | Action timer | ~3-15s | < 100ms | < 50ms |
| **Initial JS bundle** | Bundle analyzer | ~800KB-1.5MB | Same | < 300KB |
| **Bookings page TTI** | Lighthouse | ~6-8s | ~3-4s | < 1.5s |
| **Database avg query time** | pg_stat_statements | ~500ms+ | < 50ms | < 20ms |
| **Cache hit rate** | Custom metric | 0% | 0% | > 80% |
| **Lighthouse score** | Lighthouse CI | ~30-50 | ~50-70 | > 90 |

### 11.5 Database Health Monitoring

```sql
-- Run weekly to monitor index effectiveness
SELECT
  schemaname,
  relname AS table,
  indexrelname AS index,
  idx_scan AS index_scans,
  seq_scan AS sequential_scans,
  ROUND(idx_scan::numeric / NULLIF(seq_scan + idx_scan, 0) * 100, 2) AS index_hit_pct
FROM pg_stat_user_tables
JOIN pg_stat_user_indexes USING (relname)
ORDER BY seq_scan DESC;

-- Monitor slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- > 100ms average
ORDER BY mean_exec_time DESC;
```

---

## 12. Implementation Timeline

### Phase Summary

| Phase | Name | Duration | Risk | Impact |
|---|---|---|---|---|
| **0** | Measurement Infrastructure | 1 day | None | Baseline |
| **1** | Emergency Backend Hotfixes | 2-3 days | Low | 🔴🔴🔴🔴🔴 |
| **2** | Frontend Architecture Restructuring | 5-7 days | Medium | 🔴🔴🔴🔴 |
| **3** | Database Optimization | 2-3 days | Low-Medium | 🔴🔴🔴 |
| **4** | Advanced Caching & CDN | 3-4 days | Medium | 🔴🔴 |
| **5** | Dependency & Bundle Optimization | 1-2 days | Low | 🔴🔴 |

### Baby Steps™ Execution Order

```
Week 1:
  Day 1: Phase 0 — Set up measurement tools, capture baselines
  Day 2-3: Phase 1 — Fix C1 (N+1 routines), C2/C3 (analytics full-table)
  Day 4: Phase 1 — Add column selects, server-side pagination
  Day 5: Phase 3 (partial) — Apply critical database indexes

Week 2:
  Day 1-2: Phase 2 — Convert dashboard/page.tsx + analytics to server components
  Day 3: Phase 2 — Convert bookings + users to server components
  Day 4: Phase 2 — Add loading.tsx + Suspense boundaries for all routes
  Day 5: Phase 5 — Remove duplicate dependencies, optimize imports

Week 3:
  Day 1-2: Phase 2 — Convert remaining pages (gyms, reports, workouts, etc.)
  Day 3: Phase 3 — Create analytics RPC functions
  Day 4: Phase 4 — Implement cached action wrapper, cache tags
  Day 5: Phase 4 — HTTP caching, request deduplication

Week 4:
  Day 1: Phase 5 — Bundle analysis, tree-shaking verification
  Day 2: Full regression testing across all dashboard pages
  Day 3: Performance benchmarking, capture final metrics
  Day 4: Documentation updates, memory bank refresh
  Day 5: Buffer / address any remaining issues
```

### Dependency Graph

```
Phase 0 (Measurement) ─────────────────────────────────────────────┐
    │                                                                │
    ├── Phase 1 (Backend Hotfixes) ─── no dependencies              │
    │       │                                                        │
    │       └── Phase 3 (Database Optimization) ─── needs Phase 1   │
    │               │                                                │
    │               └── Phase 4 (Caching) ─── needs Phase 1 + 3     │
    │                                                                │
    ├── Phase 5 (Bundle Optimization) ─── independent               │
    │                                                                │
    └── Phase 2 (Frontend RSC) ─── benefits from Phase 1,3 but     │
                                   can proceed in parallel          │
                                                                    │
    FINAL: Regression Testing & Benchmarking ←─────────────────────┘
```

---

## Appendix A: File Change Manifest

### New Files to Create

| File | Phase | Purpose |
|---|---|---|
| `adminpanel/lib/perf/action-timer.ts` | 0 | Performance timing wrapper |
| `adminpanel/lib/cache/action-cache.ts` | 4 | Cache utility for server actions |
| `adminpanel/lib/cache/tags.ts` | 4 | Cache tag constants |
| `adminpanel/app/(dashboard)/dashboard/loading.tsx` | 2 | Dashboard-wide loading state |
| `adminpanel/app/(dashboard)/dashboard/*/loading.tsx` × 18 | 2 | Per-route loading states |
| `adminpanel/app/(dashboard)/dashboard/*/*-client.tsx` × 18 | 2 | Client component extracts |
| `athlete-pwa/supabase/migrations/20240603000000_add_performance_indexes.sql` | 3 | Database indexes |
| `athlete-pwa/supabase/migrations/20240604000000_create_analytics_rpc.sql` | 3 | Analytics SQL functions |

### Files to Modify

| File | Phase | Change |
|---|---|---|
| `adminpanel/next.config.ts` | 0, 5 | Bundle analyzer, optimize imports |
| `adminpanel/package.json` | 5 | Remove duplicate deps |
| `adminpanel/app/(dashboard)/layout.tsx` | 2 | Add Suspense boundary |
| `adminpanel/middleware.ts` | 4 | Cache headers |
| `adminpanel/app/actions/routines.ts` | 1 | Fix N+1 query |
| `adminpanel/app/actions/analytics.ts` | 1 | Fix full-table fetch |
| `adminpanel/app/actions/reports.ts` | 1 | Fix full-table fetch |
| `adminpanel/app/actions/bookings.ts` | 1, 4 | Pagination, caching |
| `adminpanel/app/actions/users.ts` | 1, 4 | Pagination, caching |
| `adminpanel/app/actions/*.ts` (all) | 1 | Column-level selects |
| `adminpanel/app/(dashboard)/dashboard/*/page.tsx` × 18 | 2 | Convert to server components |

---

## Appendix B: Quick Reference — Baby Steps™ Checklist

For each individual change, follow this exact sequence:

```
□ 1. Identify ONE specific change (e.g., "fix N+1 in getRoutineDetail")
□ 2. Write the fix
□ 3. Run tsc --noEmit (type check)
□ 4. Run npm run build (build check)
□ 5. Test the affected page manually
□ 6. Verify data accuracy (old vs new)
□ 7. Check timing improvement
□ 8. Commit with descriptive message
□ 9. Only then proceed to next change
```

**Remember: The process is the product. Every step must be validated before moving forward.**