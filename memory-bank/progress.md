# Progress: Rokhdad FIT Platform

## What Works ✅
- **Design System** (`/design-system`) — Typography, colors, spacing, glass surfaces
- **Global Engine Demo** (`/global-demo`) — i18n, multi-currency, feature flags, dynamic layout
- **Login System** (`/login`) — Phone auth with mock OTP, country selector, glassmorphic UI
- **Supabase Integration** — Local Docker instance, auth.users + profiles tables, server actions
- **Auth Middleware** — Session refresh, route protection, login redirects
- **Magic UI Components** — Magic Card, Border Beam, Shiny Button, Marquee, Animated List, Bento Grid
- **Global Engine Context** — `useGlobalEngine()` hook, `t()`, `formatPrice()`, `isFeatureEnabled()`, RTL support
- **Localization** — English + Farsi dictionaries with 40+ keys
- **Admin Panel** — Standalone Next.js app at `adminpanel/`, Email+Password auth, 9 dashboard pages, 12 server action files
- **Exercise Library** — 413 exercises importable from CSV, 11 admin CRUD server actions, Persian auto-translations, exercise detail page with body map
- **Gym Suggestion Engine** — Equipment matching algorithm, proximity scoring, `GymSuggestionSheet` bottom sheet, routine detail + home page integration
- **Smart Workout Builder** — 3-step wizard (muscles → equipment → preview), `generateSmartWorkout()` algorithm, `saveGeneratedRoutine()`, `startDirectWorkout()`, entry points on home + routines pages
- **Gym Equipment Management** — `gym_equipment` table (TEXT FK), admin checkbox grid, manager view/edit, 25 seed rows

## Booking Ticket Feature (Completed 2026-06-03)
- DB migration: added `check_in_code` + `check_in_code_generated_at` to `bookings` table
- pg_cron job auto-expires `upcoming` bookings whose time slot end has passed
- Server action `createBooking` generates 6-char alphanumeric check_in_code
- `getBookings()` now fetches ALL statuses (no filter param) for client-side tab filtering
- Frontend: 4-tab UI (upcoming/active/completed/cancelled + expired), ticket overlay with QR code + check_in_code
- Feature flag `booking_ticket` in fallback-config.ts
- Translation keys for ticket UI added to GlobalEngineContext
- Admin panel: check_in_code column + detail section in bookings page
- Fixed profile/page.tsx `getBookings()` call (was passing arg to no-arg function)

## Admin Panel Performance Refactoring — Phase 0 COMPLETE (2026-06-05)
- **Plan**: `plans/admin-panel-performance-refactoring.md` — 6-phase optimization plan
- **Bundle Analyzer**: `@next/bundle-analyzer@16.2.6` installed, `npm run build:analyze` script added
- **Config**: `optimizePackageImports` for `lucide-react` + `framer-motion` in `next.config.ts`
- **Action Timer**: `lib/perf/action-timer.ts` — `withTiming()` wrapper with 2000ms slow threshold
- **Note**: Next.js 16 uses Turbopack by default; bundle analysis requires `--webpack` flag

### Baseline Bundle Metrics (webpack build)
| Chunk | Size |
|-------|------|
| `794-*.js` (largest shared) | 217 KB |
| `4bd1b696-*.js` (framer-motion) | 195 KB |
| `framework-*.js` | 185 KB |
| `main-*.js` | 134 KB |
| `126-*.js` (lucide-react) | 123 KB |
| `polyfills-*.js` | 110 KB |
| `160-*.js` | 78 KB |
| **Client total (top chunks)** | **~1.04 MB** |

### Analyzer Reports
- `adminpanel/.next/analyze/client.html` (493 KB)
- `adminpanel/.next/analyze/nodejs.html` (608 KB)
- `adminpanel/.next/analyze/edge.html` (273 KB)

### Build Stats
- Webpack compile: 27.3s (vs Turbopack 7.2s)
- TypeScript check: 8.8s
- Static pages: 478ms (25 pages)
- 22 dynamic routes, 3 static routes

## Admin Panel Performance Refactoring

### Phase 0 — Profiling & Tooling ✅
- Bundle analyzer configured (`build:analyze` npm script)
- `optimizePackageImports` for lucide-react, framer-motion
- `action-timer.ts` utility for server action timing
- Baseline bundle: ~1.04 MB client

### Phase 1 — Backend Query Optimization (In Progress)
- ✅ Fixed N+1 query in `routines.ts` — 36→1 queries via Supabase nested join
- ✅ Fixed full-table fetch in `analytics.ts` — `head: true` + parallel `Promise.all`
- ✅ Created shared `requireAdmin()` guard in `adminpanel/lib/auth/admin-guard.ts`
- ✅ Refactored `analytics.ts` + `routines.ts` to use shared guard
- ✅ TypeScript build passes with zero errors
- 🔲 Remaining: Apply admin-guard to other actions (reports, bookings, users, etc.)
- 🔲 Remaining: Replace `select('*')` with explicit columns in remaining actions
- 🔲 Remaining: Add database indexes migration

### Phases 2–5 (Planned)
- See `plans/admin-panel-performance-refactoring.md` for full roadmap

---
**Marketing UX Phase 1 + 2 + 2.2 → COMPLETE**
- Phase 1: Home & Profile redesigned (Hevy-style hub)
- Phase 2: Gym Discovery `/gyms` (Airbnb-style listing)
- Phase 2.2: Gym Detail `/gyms/[id]` with full booking flow
- New server actions: `getGymDetail()`, `getGymTimeSlots()`
- Full booking flow: date select → time slot → confirmation modal → wallet payment → ticket with check-in code
- Cards in `/gyms` now correctly link to `/gyms/[id]`
- Runtime testing deferred (Supabase local Docker stopped)

## Completed (New): Marketing & UX Strategy (2026-06-03)
- **Document**: `plans/marketing-ux-strategy.md` — comprehensive 6-month plan
- **Business Model**: Dual-engine (Hevy acquisition + Airbnb monetization)
- **Marketing Plan**: 3 phases, 4 channels (Instagram, Telegram, Influencers, B2B2C via Gyms)
- **UX Strategy**: Conversion touchpoints, Home page redesign wireframes, Gym Discovery (Airbnb-style), Onboarding redesign
- **KPIs**: 15K users, 50 gyms, 500 bookings/month by month 6
- **Product Audit**: 23 athlete pages, 20 admin sections, 30 DB tables fully inventoried

## Production Deployment Infrastructure (2026-06-05) ✅
- **Dockerfiles**: Multi-stage builds for both `athlete-pwa` and `adminpanel` (standalone Next.js output)
- **docker-compose.prod.yml**: Production overlay — Caddy reverse proxy, Next.js apps, daily DB backup sidecar
- **Caddyfile**: Auto-HTTPS via Let's Encrypt for `rokhdad.click` + `admin.rokhdad.click`
- **Health checks**: `/api/health` routes for both apps + Docker `HEALTHCHECK` directives
- **Security**: Non-root Docker users, security headers in Next.js config, `.dockerignore` files
- **Deployment guide**: `plans/production-deployment-guide.md` — step-by-step from server setup to rollback
- **Fixed**: `execute-migrations.js` hardcoded DB URL → `DATABASE_URL` env var
- **Updated**: `.env.example` with all production variables documented

### Files Created
| File | Purpose |
|------|---------|
| `athlete-pwa/Dockerfile` | Multi-stage build (deps → builder → runner) |
| `adminpanel/Dockerfile` | Multi-stage build (deps → builder → runner) |
| `athlete-pwa/.dockerignore` | Exclude dev files from Docker context |
| `adminpanel/.dockerignore` | Exclude dev files from Docker context |
| `docker-compose.prod.yml` | Production overlay (Caddy, apps, backups) |
| `Caddyfile` | Reverse proxy + auto-HTTPS config |
| `athlete-pwa/app/api/health/route.ts` | Health check endpoint |
| `adminpanel/app/api/health/route.ts` | Health check endpoint |
| `plans/production-deployment-guide.md` | Full deployment documentation |

### Files Modified
| File | Changes |
|------|---------|
| `athlete-pwa/next.config.ts` | `output: "standalone"` + security headers |
| `adminpanel/next.config.ts` | `output: "standalone"` + security headers |
| `athlete-pwa/scripts/execute-migrations.js` | `DATABASE_URL` env var (was hardcoded) |
| `.env.example` | Complete production env var reference |

## What's Left to Build 📋
1. **Onboarding Flow** — 4-step flow per marketing plan (signup → level → goal → routine)
2. **Runtime Testing** — Exercise Library, Gym Suggestion, Smart Workout Builder, Gym Discovery (when Supabase restarts)
3. **Middleware → Proxy Migration** — Next.js 16 deprecation warning
4. **Global Engine → Supabase** — Live translations, feature flags, country configs from DB
5. **PWA Setup** — Manifest, service worker, offline support
6. **Referral System** — Credit-based referral program per marketing plan
7. **Social/Viral Features** — Share workout improvements, leaderboard, challenges
8. **Production Deployment** — Follow `plans/production-deployment-guide.md` on server

## Known Issues ⚠️
- Next.js 16 warns about "middleware" convention → should use "proxy"
- 4 pre-existing TypeScript errors in `history/page.tsx` and `workout/page.tsx` (NOT from our changes)
- Supabase local Docker stopped — ECR network timeouts preventing image pulls
- Global Engine is still mock/local state — needs Supabase backend integration

## Evolution of Project Decisions
- **Auth strategy:** Service-role magic link generation over `signInWithOtp` (requires real SMS)
- **Internal email pattern:** `{phone}@auth.rokhdad.internal` — valid email for magic links
- **`motion/react`** over `framer-motion`: Magic UI uses newer package name
- **TEXT PKs for equipment/muscle:** `equipment_types.id` and `muscle_groups.id` are TEXT (e.g., 'barbell', 'chest'), NOT UUIDs — caught early, prevented FK type mismatch
- **Default export for GymSuggestionSheet:** Must `import GymSuggestionSheet from ...` not `{ GymSuggestionSheet }`
- **Single-object param pattern:** `getGymSuggestionsForRoutine({ routineId, userLocation? })` — NOT two separate args
- **AnimatePresence nesting:** Sheet wraps itself internally — no outer wrapper needed
- **apply_diff reliability:** Multi-block edits can silently fail — prefer `edit_file` for surgical changes