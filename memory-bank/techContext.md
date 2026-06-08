# Tech Context: Gym Global Athlete PWA

## Technologies Used
- **Next.js 16.2.6** (App Router, Turbopack, Server Actions)
- **React 19** (useTransition, useCallback, createContext)
- **TypeScript 5** (strict mode)
- **Tailwind CSS v4** (PostCSS, @tailwindcss/postcss)
- **Supabase** (Auth, PostgreSQL, Storage) via Docker
- **@supabase/ssr** — Cookie-based session management for SSR
- **@supabase/supabase-js** — Core Supabase client
- **motion (framer-motion v12)** — Animations (`motion/react` import path)
- **Magic UI** — Pre-built animated components via MCP
- **lucide-react** — Icon library
- **clsx + tailwind-merge** — Via `cn()` utility in `lib/utils.ts`

## Development Setup
```bash
# Start Supabase locally
cd athlete-pwa && npx supabase start

# Run dev server
npm run dev  # → http://localhost:3000

# Supabase Studio: http://localhost:54323
# Supabase API: http://localhost:8000
# PostgreSQL: localhost:5432
```

## Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

## Dependencies (package.json)
- `next`, `react`, `react-dom` — Core framework
- `@supabase/supabase-js`, `@supabase/ssr` — Supabase integration
- `motion` — Animation library (NOT framer-motion)
- `lucide-react` — Icons
- `clsx`, `tailwind-merge` — Class utilities
- `@tailwindcss/postcss` — Tailwind CSS v4 PostCSS plugin

## Technical Constraints
- **Import path:** Use `motion/react` NOT `framer-motion` (Magic UI convention)
- **No `any`:** Strict TypeScript — all types must be explicit
- **Server Components by default:** Only add `"use client"` when needed (event handlers, hooks, browser APIs)
- **No API routes:** All server-side logic via Server Actions (`"use server"`)
- **Dark mode only:** Pure black (#000) background, no theme switching
- **RTL support:** Layout defaults to RTL (fa), must support LTR switching

## Tool Usage Patterns
- **Dev:** `npm run dev` — Turbopack dev server on port 3000
- **Build:** `npx next build` — Type check + production build (~90s)
- **Type check:** `npx tsc --noEmit` — Faster than full build
- **Supabase:** `npx supabase` CLI for local Docker management
- **Magic UI MCP:** Use `getRegistryItem` for component source code, `searchRegistryItems` for discovery