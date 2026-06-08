# 🚀 Free Deployment Guide — Rokhdad FIT (No Credit Card)

> **TL;DR:** Supabase Cloud (free) + Vercel (free) + GitHub (free) = **$0/month production deployment**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    INTERNET                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  rokhdad-app.vercel.app ──┐                         │
│  (Athlete PWA)            ├──▶ Supabase Cloud       │
│  rokhdad-admin.vercel.app ┘    (Free Tier)          │
│  (Admin Panel)                 ├─ PostgreSQL         │
│                                ├─ GoTrue Auth        │
│                                ├─ PostgREST API      │
│                                ├─ Storage            │
│                                └─ Realtime           │
└─────────────────────────────────────────────────────┘
```

### Why This Stack?

| Service | Free Tier | Why |
|---------|-----------|-----|
| **Supabase Cloud** | 500MB DB, 1GB storage, 50K MAU | Managed Postgres + Auth + Storage. No server to maintain. |
| **Vercel** | 100GB bandwidth, serverless functions | Optimized for Next.js. Auto-deploy from Git. Zero config. |
| **GitHub** | Unlimited repos | Triggers Vercel deploys on push. |

---

## Step-by-Step Deployment

### Phase 1: GitHub Repository (5 min)

#### 1.1 Initialize Git (if not already)

```bash
cd /Users/alireza/Desktop/rokhdad_FIT

# Check if git is already initialized
git status

# If not initialized:
git init
git add .
git commit -m "Initial commit"
```

#### 1.2 Create GitHub Repository

1. Go to [github.com/new](https://github.com/new) (free account, no credit card)
2. Repository name: `rokhdad-fit`
3. Set to **Private** (recommended)
4. **Do NOT** initialize with README/gitignore (we have them)
5. Click "Create repository"

#### 1.3 Push to GitHub

```bash
# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/rokhdad-fit.git

# Push
git branch -M main
git push -u origin main
```

---

### Phase 2: Supabase Cloud (10 min)

#### 2.1 Create Supabase Account & Project

1. Go to [supabase.com](https://supabase.com) → "Start your project"
2. Sign in with GitHub (no credit card needed)
3. Click "New Project"
4. Fill in:
   - **Name:** `rokhdad-fit`
   - **Database Password:** Generate a strong password and **save it!**
   - **Region:** Choose closest to your users (e.g., `Middle East (Bahrain)` or `Europe (Frankfurt)`)
   - **Plan:** Free ($0/month)
5. Click "Create new project" — wait ~2 minutes for provisioning

#### 2.2 Get Your Supabase Credentials

1. Go to **Settings → API**
2. Copy these values (you'll need them for Vercel):
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep secret!)

3. Go to **Settings → Database**
4. Copy the **Connection string** (URI format) — you'll need this for migrations:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

#### 2.3 Run Database Migrations

You have **two options**:

##### Option A: Using the SQL Editor (Easiest — Recommended)

1. In Supabase Dashboard, go to **SQL Editor**
2. Run each migration file in order. Click **"New query"** for each:

   **Migration order (run in this exact order):**

   | # | File | Purpose |
   |---|------|---------|
   | 1 | `20240515000000_create_base_tables.sql` | Core tables |
   | 2 | `20240516000000_create_gym_booking_schema.sql` | Gym booking system |
   | 3 | `20240517000000_seed_gym_data.sql` | Seed data |
   | 4 | `20240518000000_create_auth_trigger.sql` | Auth triggers |
   | 5 | `20240519000000_fix_auth_trigger_conflict.sql` | Fix trigger |
   | 6 | `20240520000000_add_country_fields.sql` | Country fields |
   | 7 | `20240521000000_create_translations_feature_flags.sql` | i18n + flags |
   | 8 | `20240522000000_add_admin_rbac_policies.sql` | Admin RBAC |
   | 9 | `20240523000000_create_admin_user.sql` | Admin user |
   | 10 | `20240528000000_create_admin_auth.sql` | Admin auth |
   | 11 | `20240529000000_extend_role_check_constraint.sql` | Role constraints |
   | 12 | `20240530000000_create_admin_config_table.sql` | Admin config |
   | 13 | `20240531000000_create_wallet_deduct_rpc.sql` | Wallet RPC |
   | 14 | `20240601000000_create_gym_equipment.sql` | Gym equipment |
   | 15 | `20240601000001_seed_gym_equipment.sql` | Equipment seed |
   | 16 | `20240602000000_add_p2_p3_admin_rls_policies.sql` | More RLS |

3. For each: Copy the SQL content → paste in SQL Editor → click **Run**
4. ✅ Verify: Go to **Table Editor** — you should see all tables

##### Option B: Using the CLI (for developers)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link to your cloud project (use your project ref from the dashboard URL)
cd athlete-pwa
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

#### 2.4 Create Admin User

After migrations, create your admin user:

1. Go to **Authentication → Users** in Supabase Dashboard
2. Click **"Add user" → "Create new user"**
3. Set email and password for the admin
4. Then run this SQL in **SQL Editor** to assign admin role:

```sql
-- Replace with the user ID from Authentication → Users
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'USER_UUID_FROM_AUTH';
```

---

### Phase 3: Vercel Deployment (15 min)

You'll deploy **two** Vercel projects from the same GitHub repo.

#### 3.1 Create Vercel Account

1. Go to [vercel.com/signup](https://vercel.com/signup)
2. Sign up with GitHub (no credit card)
3. Authorize Vercel to access your GitHub repos

#### 3.2 Deploy Athlete PWA (First App)

1. Click **"Add New..." → "Project"**
2. Select your `rokhdad-fit` repository
3. Configure:
   - **Project Name:** `rokhdad-athlete`
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** Click "Edit" → type `athlete-pwa` → Confirm
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** (leave default)
4. **Environment Variables** — Add these:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://XXXXX.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (from Supabase API settings) |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` (from Supabase API settings) |

5. Click **"Deploy"** 🎉
6. Wait ~2 minutes for build
7. ✅ Your app is live at: `https://rokhdad-athlete.vercel.app`

#### 3.3 Deploy Admin Panel (Second App)

1. Go to Vercel Dashboard → **"Add New..." → "Project"**
2. Select the **same** `rokhdad-fit` repository
3. Configure:
   - **Project Name:** `rokhdad-admin`
   - **Root Directory:** Click "Edit" → type `adminpanel` → Confirm
   - **Framework Preset:** Next.js (auto-detected)
4. **Environment Variables** — Add these (same as above):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://XXXXX.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` |

5. Click **"Deploy"** 🎉
6. ✅ Admin panel live at: `https://rokhdad-admin.vercel.app`

---

### Phase 4: Configure Supabase Auth URLs (2 min)

1. Go to Supabase Dashboard → **Authentication → URL Configuration**
2. Set **Site URL:** `https://rokhdad-athlete.vercel.app`
3. Add **Redirect URLs:**
   - `https://rokhdad-athlete.vercel.app/**`
   - `https://rokhdad-admin.vercel.app/**`
4. Click **Save**

---

### Phase 5: Custom Domains (Optional)

If you own a domain (e.g., `rokhdad.click`):

#### 5.1 On Vercel

1. Go to Project Settings → **Domains**
2. Add your domain (e.g., `rokhdad.click`)
3. Follow DNS instructions (add CNAME/A record at your domain registrar)

#### 5.2 Free Domain Options

If you don't have a domain:
- **Vercel subdomains** work great: `rokhdad-athlete.vercel.app`
- **Freenom** (.tk, .ml, .ga free domains) — unreliable, not recommended
- **GitHub Pages** custom domain + Cloudflare — complex setup
- **Best option:** Just use the `.vercel.app` subdomains — they're professional and free

---

## Post-Deployment Checklist

- [ ] Athlete PWA loads at Vercel URL
- [ ] Admin Panel loads at Vercel URL
- [ ] Can sign up / login on Athlete PWA
- [ ] Can login to Admin Panel
- [ ] Data appears in Supabase Dashboard → Table Editor
- [ ] Images upload to Supabase Storage (if applicable)
- [ ] Auth redirects work correctly

---

## Automatic Deploys

Once connected, Vercel auto-deploys:

| Event | What Happens |
|-------|-------------|
| Push to `main` branch | Both apps auto-deploy (production) |
| Open a Pull Request | Vercel creates a preview deployment |
| Merge PR to `main` | Production deployment triggered |

> **Note:** Since both Vercel projects watch the same repo, both will redeploy on every push. To optimize, configure **Ignored Build Step** in each project's Git settings to only build when their directory changes.

---

## Monitoring & Management

### Supabase Dashboard
- **Database:** Table Editor, SQL Editor
- **Auth:** User management, logs
- **Storage:** File management
- **Logs:** API logs, auth logs
- **Settings:** API keys, database connections

### Vercel Dashboard
- **Deployments:** Build logs, rollback
- **Analytics:** Web vitals (enable in project settings)
- **Functions:** Serverless function logs
- **Settings:** Environment variables, domains

---

## Free Tier Limits & Warnings

### Supabase Free Tier
| Resource | Limit | What Happens When Exceeded |
|----------|-------|---------------------------|
| Database | 500 MB | Project paused (can upgrade) |
| Storage | 1 GB | Uploads fail |
| Bandwidth | 5 GB/month | Throttled |
| MAU (auth) | 50,000 | New signups blocked |
| API requests | Unlimited (fair use) | Rate limited |
| Edge Functions | 500K invocations/month | Functions fail |
| Projects | 2 active | Can't create more |

### Vercel Hobby (Free) Tier
| Resource | Limit | What Happens When Exceeded |
|----------|-------|---------------------------|
| Deployments | 100/day | Build fails |
| Bandwidth | 100 GB/month | Shows warning |
| Serverless Function Duration | 10 seconds | Timeout error |
| Serverless Function Size | 50 MB | Build fails |
| Concurrent Builds | 1 | Queued |
| Team members | 1 (you) | N/A |

### When to Upgrade
- **Supabase Pro ($25/mo):** When you hit 500MB DB or need daily backups
- **Vercel Pro ($20/mo):** When you need >10s function timeout or team members

---

## Troubleshooting

### Build fails on Vercel
```bash
# Test build locally first
cd athlete-pwa && npm run build
cd ../adminpanel && npm run build
```

### "standalone" output warning
Vercel ignores the `output: "standalone"` setting. It works fine. No change needed.

### Environment variable not found
- Ensure all `NEXT_PUBLIC_*` vars are set in Vercel Project Settings → Environment Variables
- Redeploy after adding new env vars

### Supabase connection refused
- Verify `NEXT_PUBLIC_SUPABASE_URL` is `https://XXXXX.supabase.co` (not `http://kong:8000`)
- Check that anon key matches the project

### Auth not working / cookies not set
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are both set
- Check Supabase Auth → URL Configuration has your Vercel domain

### Database migration errors
- Run migrations one at a time in SQL Editor
- Check the error message — often it's a dependency order issue
- Use the Supabase Dashboard → Database → Migrations to see applied migrations

---

## Quick Reference — All URLs

After deployment:

| Service | URL |
|---------|-----|
| Athlete PWA | `https://rokhdad-athlete.vercel.app` |
| Admin Panel | `https://rokhdad-admin.vercel.app` |
| Supabase Dashboard | `https://supabase.com/dashboard/project/YOUR_REF` |
| Supabase API | `https://YOUR_REF.supabase.co` |
| Vercel Dashboard | `https://vercel.com/dashboard` |

---

## Security Notes

1. **Never commit `.env.local` files** — they're in `.gitignore`
2. **Never expose `service_role` key** in client-side code
3. **Enable RLS** (Row Level Security) on all tables — your migrations should handle this
4. **Restrict admin panel** — your middleware already handles role-based access
5. **Supabase API keys** are designed to be public (anon key) — RLS protects your data

---

## One-Command Migration Script

Save this as `scripts/migrate-cloud.sh` for future schema updates:

```bash
#!/bin/bash
# Usage: ./scripts/migrate-cloud.sh
# Runs all migrations against Supabase Cloud using the SQL Editor API

SUPABASE_URL="${1:-}"
SERVICE_ROLE_KEY="${2:-}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "Usage: ./scripts/migrate-cloud.sh <SUPABASE_URL> <SERVICE_ROLE_KEY>"
    echo "Example: ./scripts/migrate-cloud.sh https://xxx.supabase.co eyJhbG..."
    exit 1
fi

MIGRATION_DIR="athlete-pwa/supabase/migrations"

# Sort and run migrations in order
for file in $(ls "$MIGRATION_DIR"/*.sql | sort); do
    filename=$(basename "$file")
    echo "▶ Running: $filename"
    
    # Read SQL content
    sql=$(cat "$file")
    
    # Execute via Supabase REST API (sql endpoint)
    response=$(curl -s -w "\n%{http_code}" \
        -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$sql" | jq -Rs .)}")
    
    http_code=$(echo "$response" | tail -1")
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        echo "  ✅ Success"
    else
        echo "  ❌ Failed (HTTP $http_code): $body"
        echo "  Stopping. Fix the error and re-run."
        exit 1
    fi
done

echo ""
echo "🎉 All migrations completed!"
```

> **Alternative:** Simply use the Supabase Dashboard SQL Editor — it's the most reliable free option.

---

## 🆓 10 More Free Deployment Platforms

Already covered above: **Vercel** (Next.js hosting) + **Supabase Cloud** (database/auth). Here are **10 more platforms** — all free, no credit card — ranked by compatibility with your Next.js + Supabase stack.

---

### 1. 🌐 Netlify — Best Vercel Alternative

| Detail | Info |
|--------|------|
| **URL** | [netlify.com](https://netlify.com) |
| **Credit Card** | ❌ Not required |
| **Free Tier** | 100GB bandwidth/month, 300 build minutes/month, 1 concurrent build |
| **Next.js Support** | ✅ Full support (uses `@netlify/plugin-nextjs`) |
| **Deploy Method** | Git push or CLI (`netlify deploy`) |

**Why consider it:** Netlify is the closest Vercel competitor. Same git-based workflow, instant rollbacks, preview deploys, serverless functions. Their Edge Functions run on Deno.

**How to deploy:**
```bash
# Install CLI
npm i -g netlify-cli

# Login (opens browser)
netlify login

# Deploy athlete PWA
cd athlete-pwa
netlify init  # Follow prompts, set root directory
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://XXXXX.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGci..."
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGci..."
netlify deploy --prod
```

**Limitations:** 300 build minutes/month (Vercel gives 6000). SSR edge functions have cold starts.

---

### 2. ☁️ Cloudflare Pages — Best Performance (Unlimited Bandwidth!)

| Detail | Info |
|--------|------|
| **URL** | [pages.cloudflare.com](https://pages.cloudflare.com) |
| **Credit Card** | ❌ Not required |
| **Free Tier** | **Unlimited** bandwidth, 500 builds/month, 100% uptime |
| **Next.js Support** | ✅ Via `@cloudflare/next-on-pages` adapter |
| **Deploy Method** | Git push or Wrangler CLI |

**Why consider it:** **Unlimited bandwidth for free** — this is unmatched. Cloudflare's global edge network (300+ cities) gives sub-50ms TTFB worldwide. Best free tier in the industry.

**How to deploy:**
```bash
# Install adapter
cd athlete-pwa
npm install -D @cloudflare/next-on-pages

# Add to package.json scripts:
# "build:cf": "npx @cloudflare/next-on-pages"

# Login
npx wrangler login

# Deploy
npx wrangler pages deploy .vercel/output/static --project-name=rokhdad-athlete
```

**⚠️ Caveat:** Next.js SSR on Cloudflare Pages requires the `@cloudflare/next-on-pages` adapter. Some Next.js features may not work (ISR, rewrites with regex). Test thoroughly.

**Limitations:** Worker size limit 10MB, 10ms CPU time per invocation (free). No ISR support.

---

### 3. 🚂 Railway — Best for Full-Stack (Database + App)

| Detail | Info |
|--------|------|
| **URL** | [railway.app](https://railway.app) |
| **Credit Card** | ❌ Not required (GitHub login) |
| **Free Tier** | $5 credit/month, 512MB RAM, 1GB disk per service |
| **Next.js Support** | ✅ Native Dockerfile/Nixpacks detection |
| **Deploy Method** | Git push or CLI |

**Why consider it:** Railway can host **both** your Next.js apps **AND** a PostgreSQL database in one platform. It's like having your own mini cloud. You could potentially skip Supabase Cloud and use Railway's Postgres directly.

**How to deploy:**
1. Go to [railway.app](https://railway.app) → "Start a New Project"
2. "Deploy from GitHub repo" → select `rokhdad-fit`
3. Set root directory to `athlete-pwa`
4. Add environment variables (same as Vercel)
5. Railway auto-detects Next.js and builds

**Add a Postgres database:**
1. "New Service" → "Database" → "PostgreSQL"
2. Railway gives you a connection string automatically
3. Run your migrations against it

**Limitations:** $5/month credit runs out fast with always-on services. Apps sleep after inactivity on free plan.

---

### 4. 🔵 Render — Solid All-Rounder

| Detail | Info |
|--------|------|
| **URL** | [render.com](https://render.com) |
| **Credit Card** | ⚠️ Required for **paid** plans only. Free static sites need no card. Free **web services** (Node.js) DO need a card on file but won't charge. |
| **Free Tier** | 750 hours/month per free web service (enough for 1 always-on) |
| **Next.js Support** | ✅ Native support |
| **Deploy Method** | Git push |

**Why consider it:** Render is a Heroku replacement. Free web services (with card on file), free Postgres (90-day expiry), free static sites (no card). Auto-deploy from GitHub.

**How to deploy:**
1. Go to [render.com](https://render.com) → "New" → "Web Service"
2. Connect GitHub repo
3. Set root directory: `athlete-pwa`
4. Build command: `npm run build`
5. Start command: `npm start`
6. Add environment variables

**Limitations:** Free web services spin down after 15 min inactivity (30s cold start). Free Postgres expires after 90 days. ⚠️ Requires credit card for free web services.

---

### 5. 🏗️ Coolify on Oracle Cloud Free Tier — Self-Hosted with Free VPS

| Detail | Info |
|--------|------|
| **URL** | [coolify.io](https://coolify.io) + [oracle.com/cloud/free](https://oracle.com/cloud/free) |
| **Credit Card** | ⚠️ Oracle requires card for identity verification (won't charge) |
| **Free Tier** | Oracle gives **always-free** VMs: 4 ARM64 cores, 24GB RAM, 200GB storage |
| **Next.js Support** | ✅ Via Docker (your existing Dockerfiles work!) |
| **Deploy Method** | Push to Coolify's Git server or connect GitHub |

**Why consider it:** This is the **most powerful free option**. Oracle's Always Free ARM VM has 24GB RAM — enough to run your entire self-hosted Supabase stack + both Next.js apps. Coolify provides a beautiful Heroku-like dashboard.

**How to set up:**
1. Sign up for Oracle Cloud Free Tier (4 ARM cores, 24GB RAM — forever free)
2. Install Coolify on the VM:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
3. Open Coolify dashboard (http://YOUR_VM_IP:8000)
4. Add your GitHub repo
5. Deploy both apps using your existing Dockerfiles
6. Optionally self-host Supabase on the same VM (24GB RAM is plenty)

**Limitations:** ⚠️ Oracle requires credit card for verification. You need basic Linux sysadmin skills. VM is in Oracle's cloud — you manage security/updates.

---

### 6. ⚡ Deno Deploy — Edge-First, Ultra-Fast

| Detail | Info |
|--------|------|
| **URL** | [deno.com/deploy](https://deno.com/deploy) |
| **Credit Card** | ❌ Not required |
| **Free Tier** | 1M requests/month, 100GB bandwidth, 100K KV reads |
| **Next.js Support** | ⚠️ Experimental via `@deno/next-adapter` |
| **Deploy Method** | GitHub integration or `deployctl` |

**Why consider it:** Deno Deploy runs on 35+ global edge locations. Zero cold starts. Sub-10ms response times. If you're willing to adapt your Next.js app slightly, this is the fastest free hosting available.

**Limitations:** Not all npm packages work. Next.js support is experimental. Requires adapting your code to Deno's runtime. Best for new projects — migration effort may not be worth it for existing Next.js apps.

---

### 7. 🔥 Firebase Hosting + Cloud Functions — Google's Ecosystem

| Detail | Info |
|--------|------|
| **URL** | [firebase.google.com](https://firebase.google.com) |
| **Credit Card** | ❌ Not required for Spark plan (free) |
| **Free Tier** | 10GB hosting storage, 360MB/day data transfer, 125K Cloud Function invocations/day |
| **Next.js Support** | ✅ Via `firebase-frameworks` or `@ngokevin/next-firebase` |
| **Deploy Method** | `firebase deploy` CLI |

**Why consider it:** If you're already in the Google ecosystem, Firebase provides hosting, auth, Firestore (NoSQL DB), Cloud Functions, and Cloud Storage — all in one free tier. You could potentially replace Supabase with Firebase entirely.

**How to deploy (simplified):**
```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Initialize (in project root)
firebase init hosting
# Choose: athlete-pwa/public as public directory

# For SSR support, use Firebase Cloud Functions
firebase init functions

# Deploy
firebase deploy
```

**Limitations:** Firestore is NoSQL (not Postgres) — would require data model changes. Cloud Functions free tier: 125K invocations/day, 2M/month. 10GB hosting storage, 360MB/day transfer. **Best if you're starting fresh with Firebase as your backend.**

---

### 8. 🐘 Supabase + Fleek (IPFS Hosting) — Decentralized

| Detail | Info |
|--------|------|
| **URL** | [fleek.co](https://fleek.co) |
| **Credit Card** | ❌ Not required |
| **Free Tier** | 3GB bandwidth/month, 50GB build minutes, IPFS + custom domains |
| **Next.js Support** | ✅ Via Next.js adapter for static export |
| **Deploy Method** | Git push |

**Why consider it:** Fleek hosts your site on IPFS (InterPlanetary File System) — meaning your site is censorship-resistant and globally distributed. Content-addressed storage ensures integrity. Automatic SSL.

**Limitations:** Only supports `output: 'export'` (static Next.js). Your app uses SSR features (`@supabase/ssr`, middleware, server actions) — these won't work with static export. **Not recommended for your current app** since it relies heavily on SSR. Mentioned for completeness.

---

### 9. 🎯 Koyeb — Simple & Fast

| Detail | Info |
|--------|------|
| **URL** | [koyeb.com](https://koyeb.com) |
| **Credit Card** | ⚠️ Required for free tier verification (won't charge) |
| **Free Tier** | 1 nano service (512MB RAM, 0.1 vCPU), 50GB bandwidth/month |
| **Next.js Support** | ✅ Via Docker or buildpack |
| **Deploy Method** | Git push or Docker |

**Why consider it:** Koyeb provides a clean, simple deployment experience. One free "nano" instance is enough for a Next.js app. Global edge routing. Your existing Dockerfiles work directly.

**How to deploy:**
1. Sign up at [koyeb.com](https://koyeb.com)
2. "Create Service" → "GitHub" → select repo
3. Set build context: `athlete-pwa`
4. Add environment variables
5. Deploy

**Limitations:** Only 1 free service (you'd need to choose between athlete PWA and admin panel — or use Koyeb for one and Vercel for the other). 0.1 vCPU is slow. ⚠️ Credit card needed for verification.

---

### 10. 📦 Zeabur — Emerging Platform, Generous Free Tier

| Detail | Info |
|--------|------|
| **URL** | [zeabur.com](https://zeabur.com) |
| **Credit Card** | ❌ Not required for free tier |
| **Free Tier** | $5 free credit/month, unlimited projects |
| **Next.js Support** | ✅ Auto-detected |
| **Deploy Method** | Git push or CLI |

**Why consider it:** Zeabur is a newer platform with a very generous free tier. It auto-detects your framework, provides managed Postgres, Redis, and object storage. Clean dashboard. Can host both apps + database in one project.

**How to deploy:**
1. Sign up at [zeabur.com](https://zeabur.com) with GitHub
2. "New Project" → "Deploy from GitHub"
3. Select your repo
4. Zeabur auto-detects Next.js in `athlete-pwa/` and `adminpanel/`
5. Add environment variables in the dashboard
6. Both apps auto-deploy on push

**Limitations:** Newer platform — less battle-tested. $5 credit/month may not cover 2 always-on services. Limited documentation.

---

## 🏆 Quick Comparison Matrix

| # | Platform | Next.js SSR | No Credit Card | Unlimited Bandwidth | Free DB Included | Best For |
|---|----------|:-----------:|:--------------:|:-------------------:|:----------------:|----------|
| 0 | **Vercel** (recommended) | ✅ | ✅ | ❌ (100GB) | ❌ | Best DX for Next.js |
| 1 | **Netlify** | ✅ | ✅ | ❌ (100GB) | ❌ | Vercel alternative |
| 2 | **Cloudflare Pages** | ⚠️ | ✅ | ✅ **Unlimited** | ❌ | Best performance |
| 3 | **Railway** | ✅ | ✅ | ❌ | ✅ Postgres | Full-stack in one place |
| 4 | **Render** | ✅ | ⚠️ | ❌ | ⚠️ 90-day | Heroku replacement |
| 5 | **Coolify + Oracle** | ✅ | ⚠️ | ✅ | ✅ Self-host Supabase | Maximum control & power |
| 6 | **Deno Deploy** | ⚠️ | ✅ | ❌ | ❌ | Edge performance |
| 7 | **Firebase** | ✅ | ✅ | ❌ | ✅ Firestore | Google ecosystem |
| 8 | **Fleek** | ❌ static only | ✅ | ❌ | ❌ | Decentralized hosting |
| 9 | **Koyeb** | ✅ | ⚠️ | ❌ | ❌ | Simple Docker deploy |
| 10 | **Zeabur** | ✅ | ✅ | ❌ | ✅ Postgres | Generous newcomer |

Legend: ✅ = full support, ⚠️ = partial/limited, ❌ = not supported

---

## 💡 Recommended Combinations

### Combo 1: Best Free Setup (Already Recommended)
```
Supabase Cloud (free) + Vercel (free) = $0/month
```
- Easiest setup, best Next.js DX, managed database
- Limit: 500MB DB, 100GB bandwidth

### Combo 2: Maximum Performance
```
Supabase Cloud (free) + Cloudflare Pages (free) = $0/month
```
- Unlimited bandwidth, fastest global edge network
- Trade-off: Some Next.js features need adapter

### Combo 3: Full-Stack in One Platform
```
Railway (free $5 credit) = $0/month
```
- Host both Next.js apps + Postgres database on Railway
- Trade-off: $5 credit may not last the month with 3 services

### Combo 4: Maximum Power (Self-Hosted)
```
Oracle Cloud Free VM + Coolify = $0/month
```
- 4 ARM cores, 24GB RAM — run everything including self-hosted Supabase
- Trade-off: Requires Linux skills, Oracle wants card for verification

### Combo 5: Hybrid Approach
```
Supabase Cloud (free) + Vercel (athlete PWA) + Netlify (admin) = $0/month
```
- Spread apps across platforms to maximize free tier resources
- Same Supabase backend for both

---

## 🖥️ 10 Free VPS Providers (Ranked by Resources)

> **Honest reality check:** Truly free VPS with no credit card AND generous resources is rare. Below are the **10 best options** ranked by resources. I've noted which ones require card verification (for identity, not billing) so you can decide.

### 1. 🏆 Oracle Cloud Always Free — THE MOST RESOURCES (⚠️ Card for verification, NOT charged)

| Resource | Spec |
|----------|------|
| **CPU** | Up to **4 ARM64 cores** (Ampere A1) |
| **RAM** | **24 GB** |
| **Storage** | **200 GB** block storage |
| **Bandwidth** | 10 TB/month |
| **Forever?** | ✅ Always Free (never expires) |
| **Credit Card** | ⚠️ Required for identity verification — **won't be charged** |
| **OS** | Oracle Linux, Ubuntu, CentOS (full root SSH) |

**Why it's #1:** 24GB RAM + 4 ARM cores is enough to run your **entire self-hosted Supabase + both Next.js apps + Caddy** on one VM. This is more powerful than most $20/month VPS plans.

**How to get it:**
1. Go to [cloud.oracle.com/free](https://cloud.oracle.com/free)
2. Sign up (card required for verification — **never charged**)
3. Create an Ampere A1 instance: 4 OCPU, 24GB RAM, 100GB boot volume
4. SSH in, install Docker + Docker Compose, run your `docker-compose.prod.yml`
5. Done — your entire app stack on one free VM

**⚠️ Why I mention it despite the card requirement:** It's literally 24GB RAM for free forever. The card is for identity verification only. If you have ANY card (even prepaid), it works. This is by far the most powerful free option that exists.

---

### 2. 🔵 Google Cloud Shell — Free Dev VM (No Card!)

| Resource | Spec |
|----------|------|
| **CPU** | 1 vCPU (ephemeral) |
| **RAM** | **4 GB** (e2-medium) |
| **Storage** | **5 GB** persistent (/home) |
| **Hours** | 50 hours/week (resets weekly) |
| **Forever?** | ✅ Free (Google account only) |
| **Credit Card** | ✅ **NOT required** |
| **Access** | Full root shell via browser terminal |

**How to use it:**
1. Go to [shell.cloud.google.com](https://shell.cloud.google.com) — sign in with Google
2. You get a full Linux shell in the browser
3. Install Node.js, Docker, git — whatever you need
4. You can even run a web server with port forwarding (preview URL)

**Limitations:** VM resets if idle for long. Not a true always-on production server. 50hrs/week limit. Best for development, testing, or running migrations — not for hosting a production app 24/7.

---

### 3. 🐬 Fly.io — True Free VPS (No Card for Hobby!)

| Resource | Spec |
|----------|------|
| **VMs** | Up to **3 shared-cpu-1x** VMs |
| **RAM** | 256 MB per VM |
| **Disk** | 3 GB persistent volume |
| **Bandwidth** | 160 GB/month |
| **Forever?** | ✅ Free Hobby plan |
| **Credit Card** | ✅ **NOT required** for Hobby plan |

**How to deploy your app:**
```bash
# Install CLI
curl -L https://fly.io/install.sh | sh

# Login (browser auth, no card)
fly auth login

# Deploy from your Dockerfile
cd athlete-pwa
fly launch --dockerfile Dockerfile
fly secrets set NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
fly secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Limitations:** 256MB RAM per VM is tight for Next.js (needs ~512MB). Your app may OOM. Works better for static/API-only services. 3 VMs max on free plan.

---

### 4. 🚂 Railway — $5 Free Credit/Month (No Card!)

| Resource | Spec |
|----------|------|
| **CPU** | Shared (variable) |
| **RAM** | **512 MB** per service |
| **Disk** | 1 GB per service |
| **Credit** | $5/month free (resets monthly) |
| **Services** | Unlimited (within credit) |
| **Credit Card** | ✅ **NOT required** (GitHub login) |

**Why it's great:** Can run Docker containers, Node.js, AND provision a **free PostgreSQL database** — all in one platform. Your entire stack in one place.

**How to deploy:**
1. Go to [railway.app](https://railway.app) → "Start a New Project"
2. "Deploy from GitHub repo" → select `rokhdad-fit`
3. Set root directory, add env vars
4. Optionally add PostgreSQL service
5. Railway auto-builds and deploys

**Limitations:** $5 credit runs out fast with always-on services (~$5/month for 1 service). Services sleep after inactivity.

---

### 5. 🐙 GitHub Codespaces — 120 Hours Free (No Card!)

| Resource | Spec |
|----------|------|
| **CPU** | 2 cores |
| **RAM** | **4 GB** |
| **Storage** | 15 GB |
| **Hours** | **120 hours/month** (free) |
| **Credit Card** | ✅ **NOT required** (GitHub account) |

**How to use it:**
1. Go to your GitHub repo → "Code" → "Codespaces" → "Create codespace"
2. Full VS Code in browser with terminal
3. Run `npm run dev`, `docker compose up`, anything
4. Port forwarding gives you a public URL

**Limitations:** 120 hours/month ≈ 4 hours/day. Not 24/7. Best for development, not production hosting. Resets monthly.

---

### 6. 🟠 Gitpod — 50 Hours Free (No Card!)

| Resource | Spec |
|----------|------|
| **CPU** | **4 cores** |
| **RAM** | **8 GB** |
| **Storage** | 30 GB |
| **Hours** | 50 hours/month |
| **Credit Card** | ✅ **NOT required** (GitHub/Google login) |

**How to use it:**
1. Go to [gitpod.io](https://gitpod.io) → sign in with GitHub
2. Prefix any GitHub repo URL with `gitpod.io/#` to open a workspace
3. Full VS Code + terminal in browser
4. 8GB RAM is enough to run your Docker Compose stack

**Limitations:** 50 hours/month. Not 24/7. Workspace stops after 30min idle. Best for development sprints.

---

### 7. 🟣 Replit — Browser IDE + Hosting (No Card!)

| Resource | Spec |
|----------|------|
| **CPU** | Shared (limited) |
| **RAM** | **0.5 GB** |
| **Storage** | 500 MB |
| **Always-on** | ❌ Sleeps after inactivity |
| **Credit Card** | ✅ **NOT required** |

**How to use it:**
1. Go to [replit.com](https://replit.com) → sign up with GitHub
2. Create a Node.js repl
3. Upload your code or connect GitHub
4. Run `npm start` — Replit gives you a public URL

**Limitations:** 512MB RAM, sleeps after inactivity, slow cold starts. Not suitable for Next.js SSR production. OK for simple static sites or API testing.

---

### 8. 🟡 Glitch — Free Web Hosting (No Card!)

| Resource | Spec |
|----------|------|
| **CPU** | Shared (limited) |
| **RAM** | **512 MB** |
| **Storage** | **200 MB** (project files) |
| **Hours** | 1000 hours/month (free) |
| **Credit Card** | ✅ **NOT required** |

**How to use it:**
1. Go to [glitch.com](https://glitch.com) → sign up with GitHub
2. "New Project" → "Import from GitHub"
3. Add environment variables in `.env` file
4. Your app gets a `your-project.glitch.me` URL

**Limitations:** 200MB storage is very tight. App sleeps after 5min idle (12s cold start). Limited to simple Node.js apps. Not great for Next.js SSR.

---

### 9. 🔴 IBM Cloud Code Engine (No Card for Lite!)

| Resource | Spec |
|----------|------|
| **CPU** | Shared |
| **RAM** | Per-request scaling |
| **Free Tier** | Lite account — no expiry |
| **Credit Card** | ✅ **NOT required** for Lite account |
| **Access** | Container-based serverless |

**How to use it:**
1. Go to [ibm.com/cloud](https://ibm.com/cloud) → Create Lite account (no card)
2. Go to Code Engine → Create a project
3. Deploy your Docker image
4. IBM gives you a public URL

**Limitations:** Lite account has no SLA. Resources are limited. Not a true VPS — it's serverless containers. Good for API backends, not ideal for full Next.js.

---

### 10. 🟢 Adaptable.io — Free Node.js Hosting (No Card!)

| Resource | Spec |
|----------|------|
| **CPU** | Shared |
| **RAM** | **512 MB** |
| **Storage** | 1 GB |
| **Credit Card** | ✅ **NOT required** (GitHub login) |

**How to use it:**
1. Go to [adaptable.io](https://adaptable.io) → sign in with GitHub
2. "Create App" → select your repo
3. Set root directory → deploy
4. Adaptable auto-detects Node.js/Next.js

**Limitations:** Small resource pool. App may sleep after inactivity. Newer platform — less battle-tested.

---

## 🏆 Free VPS Comparison (Sorted by Resources)

| Rank | Provider | RAM | CPU | Storage | Always-On | No Card | Best For |
|:----:|----------|:---:|:---:|:-------:|:---------:|:-------:|----------|
| 1 | **Oracle Cloud** | **24 GB** | 4 ARM cores | 200 GB | ✅ | ⚠️ Card verify | Full production stack |
| 2 | **Gitpod** | 8 GB | 4 cores | 30 GB | ❌ 50hr/mo | ✅ | Dev/testing sprints |
| 3 | **GitHub Codespaces** | 4 GB | 2 cores | 15 GB | ❌ 120hr/mo | ✅ | Dev/testing daily |
| 4 | **Google Cloud Shell** | 4 GB | 1 vCPU | 5 GB | ❌ 50hr/wk | ✅ | Quick tasks/migrations |
| 5 | **Railway** | 512 MB | Shared | 1 GB | ⚠️ sleeps | ✅ | Small production apps |
| 6 | **Fly.io** | 256 MB | Shared | 3 GB | ✅ | ✅ | API/microservices |
| 7 | **Replit** | 512 MB | Shared | 500 MB | ❌ sleeps | ✅ | Quick prototypes |
| 8 | **Glitch** | 512 MB | Shared | 200 MB | ❌ sleeps | ✅ | Simple Node.js apps |
| 9 | **IBM Code Engine** | Variable | Shared | Variable | ✅ serverless | ✅ | API backends |
| 10 | **Adaptable.io** | 512 MB | Shared | 1 GB | ⚠️ sleeps | ✅ | Node.js hosting |

---

## 💡 Honest Recommendation

**If you can use a card for verification (not charged):**
→ **Oracle Cloud Free Tier** — 24GB RAM, 4 cores, 200GB storage. Self-host everything. No contest.

**If you absolutely cannot use any card:**
→ **Railway** (GitHub login, no card) for small production hosting
→ **Gitpod** (8GB RAM, no card) for development and testing
→ **Fly.io** (no card for hobby) for always-on microservices

**Best strategy for your Rokhdad FIT project:**
→ **Supabase Cloud** (free, no card) for database + auth
→ **Vercel** (free, no card) for Next.js hosting
→ Use **Gitpod** or **GitHub Codespaces** (free, no card) when you need a VPS for one-off tasks like running migrations or testing Docker builds
</task_progress>
</task_progress>
</write_to_file>