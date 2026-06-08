# rokhdad FIT — Vercel Demo Deployment Guide

Complete step-by-step guide for deploying the athlete-pwa to Vercel with Supabase Cloud.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create Supabase Cloud Project](#2-create-supabase-cloud-project)
3. [Run Database Migrations](#3-run-database-migrations)
4. [Configure Supabase Auth](#4-configure-supabase-auth)
5. [Get Environment Variables](#5-get-environment-variables)
6. [Deploy to Vercel](#6-deploy-to-vercel)
7. [Configure Vercel Environment Variables](#7-configure-vercel-environment-variables)
8. [Verify Deployment](#8-verify-deployment)
9. [Post-Deployment: Create Admin User](#9-post-deployment-create-admin-user)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)
- A [GitHub](https://github.com) account
- The repo is already pushed: `https://github.com/ALIrezanouri/rokhdadfitnextjs` (branch `demo/athlete-pwa-vercel`)

---

## 2. Create Supabase Cloud Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `rokhdad-fit-demo` (or any name you prefer)
   - **Database Password**: Choose a strong password — **save this!**
   - **Region**: Choose closest to your users (e.g., `Middle East (Bahrain)` for Iran/UAE, or `Southeast Asia (Singapore)` for Turkey)
   - **Plan**: Free tier is fine for demo
4. Click **"Create new project"**
5. Wait ~2 minutes for the project to be provisioned

---

## 3. Run Database Migrations

This is the most critical step. You'll paste the combined migration SQL into the Supabase SQL Editor.

### Option A: All-in-One (Recommended)

A combined SQL file containing all 26 migrations is included in the repo at:
`supabase/migrations/00000_all_in_one_cloud_setup.sql`

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"** (or the `+` button)
3. Open the file `supabase/migrations/00000_all_in_one_cloud_setup.sql` from the repo
   - You can view it on GitHub: [https://github.com/ALIrezanouri/rokhdadfitnextjs/blob/demo/athlete-pwa-vercel/supabase/migrations/00000_all_in_one_cloud_setup.sql](https://github.com/ALIrezanouri/rokhdadfitnextjs/blob/demo/athlete-pwa-vercel/supabase/migrations/00000_all_in_one_cloud_setup.sql)
   - Click "Raw" or copy the entire content
4. Paste the **entire** SQL content into the editor
5. Click **"Run"** (or press `Ctrl+Enter`)
6. Wait for execution to complete (may take 30-60 seconds)
7. You should see a "Success" message with no errors

### Option B: Run Migrations Individually

If the all-in-one approach fails (e.g., timeout), run each migration file individually in order:

1. Go to SQL Editor
2. For each file in `supabase/migrations/` (in chronological order by filename):
   - Copy the content
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success before proceeding to the next file

The files must be run in this exact order:
```
20240515000000_create_base_tables.sql
20240516000000_create_gym_booking_schema.sql
20240517000000_seed_gym_data.sql
20240518000000_create_auth_trigger.sql
20240519000000_fix_auth_trigger_conflict.sql
20240520000000_add_country_fields.sql
20240521000000_create_translations_feature_flags.sql
20240522000000_add_admin_rbac_policies.sql
20240522000001_create_audit_logs_table.sql
20240523000000_create_admin_user.sql
20240524000000_create_workout_tracking_schema.sql
20240525000000_seed_exercises_with_translations.sql
20240526000000_create_routines_body_stats.sql
20240527000000_create_social_schema.sql
20240528000000_create_admin_auth.sql
20240529000000_extend_role_check_constraint.sql
20240530000000_create_admin_config_table.sql
20240531000000_create_wallet_deduct_rpc.sql
20240601000000_create_gym_equipment.sql
20240601000001_seed_gym_equipment.sql
20240602000000_add_p2_p3_admin_rls_policies.sql
20240603000000_add_check_in_code.sql
20240603000000_fix_wallet_topup_rls.sql
20240603000000_seed_social_data.sql
20240603000001_add_auto_expire_cron.sql
20240604000000_add_check_in_code_to_bookings.sql
```

### Verify Migrations

After running all migrations, verify in the Supabase dashboard:

1. Go to **"Table Editor"** — you should see these tables:
   - `countries`, `profiles`, `athlete_profiles`
   - `gyms`, `gym_photos`, `gym_amenities`, `gym_sport_types`, `gym_trainers`, `gym_time_slots`
   - `bookings`, `gym_reviews`, `wallet_transactions`, `favorite_gyms`
   - `translations`, `feature_flags`, `audit_logs`, `admin_config`
   - `muscle_groups`, `equipment_types`, `exercises`, `exercise_translations`
   - `user_custom_exercises`, `workout_sessions`, `workout_exercises`, `workout_sets`
   - `routines`, `routine_days`, `routine_exercises`, `routine_sets`
   - `body_measurements`, `exercise_progress`
   - `user_follows`, `workout_likes`, `workout_comments`
   - `gym_equipment`

2. Check `gyms` table — you should see 6 seed gyms in Tehran
3. Check `exercises` table — you should see ~50 exercises with translations

---

## 4. Configure Supabase Auth

The app uses **phone OTP** authentication. Configure it in Supabase:

1. In your Supabase dashboard, go to **"Authentication"** → **"Providers"**
2. Ensure **"Phone"** provider is **enabled**
3. Under Phone provider settings:
   - Choose an SMS provider (Twilio, MessageBird, Vonage, or TextLocal)
   - For **demo/testing**, you can use the **"Test"** mode which sends OTPs to the dashboard log
   - Enter your SMS provider credentials if using a real provider
4. Go to **"Authentication"** → **"URL Configuration"**
5. Set **Site URL** to your Vercel deployment URL (e.g., `https://rokhdad-fit-demo.vercel.app`)
6. Add redirect URLs:
   - `https://rokhdad-fit-demo.vercel.app/**` (replace with your actual Vercel URL)
7. Under **"Authentication"** → **"Email"**:
   - Disable email confirmation if you want admin login to work immediately
   - Or keep it enabled and manually confirm the admin email

### For Demo/Testing (No SMS Provider)

If you don't have an SMS provider and just want to test:

1. Enable Phone provider with **"Test Mode"** (no real SMS sent)
2. OTP codes will appear in the Supabase dashboard under **"Authentication"** → **"Logs"**
3. You can also use the **"Verify OTP"** endpoint directly with any code in test mode

---

## 5. Get Environment Variables

From your Supabase dashboard, collect these values:

1. Go to **"Project Settings"** → **"API"**
2. Copy these values:
   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
     (format: `https://xxxxx.supabase.co`)
   - **anon public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     (a long JWT token)
   - **service_role** key → This is your `SUPABASE_SERVICE_ROLE_KEY`
     (a long JWT token — **keep this secret!**)

3. Your Vercel deployment URL → This is your `NEXT_PUBLIC_SITE_URL`
   (e.g., `https://rokhdad-fit-demo.vercel.app`)

You'll need these 4 values for Vercel environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_SITE_URL=https://rokhdad-fit-demo.vercel.app
```

---

## 6. Deploy to Vercel

### Step 1: Import Project

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select `ALIrezanouri/rokhdadfitnextjs` from your GitHub repos
4. If you don't see it, click **"Adjust GitHub App Permissions"** to grant access

### Step 2: Configure Project

In the deployment configuration screen:

1. **Project Name**: `rokhdad-fit-demo` (or any name you prefer)
2. **Framework Preset**: Should auto-detect as **Next.js**
3. **Root Directory**: Click **"Edit"** and select the root (it should be `.` since the branch already has athlete-pwa at root)
4. **Branch**: Select `demo/athlete-pwa-vercel` ← **IMPORTANT!**
5. **Build Command**: Leave default (`next build`)
6. **Output Directory**: Leave default
7. **Install Command**: Leave default (`npm install`)

### Step 3: Add Environment Variables

Before clicking "Deploy", add all 4 environment variables:

Click **"Environment Variables"** → **"Add"** for each:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://rokhdad-fit-demo.vercel.app` | Production |

> **Note**: For `NEXT_PUBLIC_SITE_URL`, use the URL Vercel assigns (you can update it after first deploy)

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (~2-5 minutes)
3. Vercel will assign a URL like `https://rokhdad-fit-demo.vercel.app`

---

## 7. Configure Vercel Environment Variables

If you need to update environment variables after deployment:

1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add or update variables as needed
4. After changing variables, click **"Deployments"** → **"Redeploy"** to apply changes

### Important: Update NEXT_PUBLIC_SITE_URL

After your first deployment, update `NEXT_PUBLIC_SITE_URL` to match the actual Vercel URL:

1. Copy the deployment URL from Vercel (e.g., `https://rokhdad-fit-demo.vercel.app`)
2. Go to **Settings** → **Environment Variables**
3. Update `NEXT_PUBLIC_SITE_URL` to the actual URL
4. Redeploy

---

## 8. Verify Deployment

1. Open your Vercel deployment URL in a browser
2. You should see the login page with phone OTP authentication
3. Test the flow:
   - Select a country (Iran, UAE, US, Turkey)
   - Enter a phone number
   - Send OTP (in test mode, check Supabase Auth Logs for the code)
   - Verify OTP
   - Complete onboarding
4. After login, you should see:
   - Home page with wallet balance
   - Explore gyms page (6 seed gyms)
   - Gym detail pages with time slots
   - Booking flow
   - Workout tracking
   - Profile page

---

## 9. Post-Deployment: Create Admin User

The migration already creates an admin user with:
- **Email**: `admin@rokhdad.fit`
- **Password**: `Admin123!`

> ⚠️ **CHANGE THIS PASSWORD IMMEDIATELY after first login!**

### Access Admin Panel

1. Go to your deployment URL + `/admin` (e.g., `https://rokhdad-fit-demo.vercel.app/admin`)
2. Login with `admin@rokhdad.fit` / `Admin123!`
3. Change the password in profile settings

### Create Additional Admin Users (Recommended)

For better security, create a new admin user via the Supabase Dashboard:

1. Go to **"Authentication"** → **"Users"**
2. Click **"Add User"** → **"Create New User"**
3. Fill in:
   - **Email**: your real email
   - **Password**: a strong password
   - **Auto Confirm User**: ✅ Yes
4. After the user is created, go to **"Table Editor"** → **"profiles"**
5. Find the new user's row and change `role` from `athlete` to `admin`
6. Login to `/admin` with your new credentials

### Delete the Default Admin (Optional)

After creating your own admin user:

1. Go to **"Authentication"** → **"Users"**
2. Find `admin@rokhdad.fit` and delete it
3. Go to **"Table Editor"** → **"profiles"**
4. Delete the corresponding profile row

---

## 10. Troubleshooting

### Build Fails on Vercel

- Check that you selected the `demo/athlete-pwa-vercel` branch
- Ensure all environment variables are set correctly
- Check Vercel build logs for specific errors

### "Database error creating new user" on Login

- This means the auth trigger failed. Check:
  1. Go to Supabase SQL Editor
  2. Run: `SELECT * FROM profiles LIMIT 5;` — verify table exists
  3. Check if `handle_new_user()` function exists: `SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';`
  4. If missing, re-run the auth trigger migration

### Phone OTP Not Working

- Ensure Phone provider is enabled in Supabase Auth settings
- For testing without SMS, enable "Test Mode"
- Check Supabase Auth Logs for OTP codes

### RLS Policy Errors

- If you get "new row violates row-level security policy" errors:
  1. Check that all RLS policies were created (run the all-in-one migration again)
  2. Ensure the `is_admin()` and `get_user_role()` helper functions exist

### pg_cron Not Available

- Supabase Cloud supports `pg_cron` — it should work automatically
- If the auto-expire cron fails, you can manually expire bookings:
  ```sql
  UPDATE bookings SET status = 'expired'
  WHERE status = 'upcoming'
  AND time_slot_id IN (
    SELECT id FROM gym_time_slots
    WHERE (date + end_time) < now()
  );
  ```

### Middleware Auth Loop

- If you get stuck in an auth redirect loop:
  1. Check `NEXT_PUBLIC_SITE_URL` matches your actual Vercel URL
  2. Check Supabase Auth URL Configuration has the correct Site URL
  3. Ensure redirect URLs include your Vercel domain

### 404 on Routes

- Ensure you're on the `demo/athlete-pwa-vercel` branch (not `main`)
- The demo branch has athlete-pwa at root level, not in a subdirectory

---

## Quick Reference

### Environment Variables Checklist

| Variable | Source | Required |
|----------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | ✅ |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel deployment URL | ✅ |

### Key URLs

| Resource | URL |
|----------|-----|
| GitHub Repo | `https://github.com/ALIrezanouri/rokhdadfitnextjs` |
| Demo Branch | `demo/athlete-pwa-vercel` |
| Supabase Dashboard | `https://supabase.com/dashboard` |
| Vercel Dashboard | `https://vercel.com/dashboard` |
| Admin Panel | `https://your-app.vercel.app/admin` |

### Default Admin Credentials (CHANGE AFTER LOGIN!)

| Field | Value |
|-------|-------|
| Email | `admin@rokhdad.fit` |
| Password | `Admin123!` |