# 🚀 Production Deployment Guide — rokhdad FIT

> **TL;DR:** Deploy with `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Server Requirements](#server-requirements)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [DNS Configuration](#dns-configuration)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Backup & Recovery](#backup--recovery)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedure](#rollback-procedure)

---

## Architecture Overview

```
                    Internet
                       │
                   ┌───▼───┐
                   │ Caddy  │  ← Auto-HTTPS (Let's Encrypt)
                   │ :80/443│
                   └───┬───┘
              ┌────────┼────────┐
         ┌────▼───┐   ┌▼───────┐
         │Athlete │   │ Admin  │
         │  PWA   │   │ Panel  │
         │  :3000 │   │ :3001  │
         └────┬───┘   └──┬─────┘
              │          │
         ┌────▼──────────▼─────┐
         │  Kong API Gateway   │
         │      :8000          │
         └────┬────────────────┘
    ┌─────────┼────────────┐
    ▼         ▼            ▼
┌───────┐ ┌──────┐  ┌──────────┐
│GoTrue │ │REST  │  │ Realtime │
│ Auth  │ │  API │  │   WS     │
└───┬───┘ └──┬───┘  └────┬─────┘
    └─────────┼───────────┘
         ┌────▼────┐
         │PostgreSQL│  ← Daily backups
         │  :5432   │
         └─────────┘
```

**Key decisions:**
- **Caddy** for reverse proxy (zero-config HTTPS, HTTP/2)
- **Docker Compose** with overlay files (dev vs prod separation)
- **Next.js standalone** output for minimal Docker images (~150MB vs ~1GB)
- **Self-hosted Supabase** stack (PostgreSQL, GoTrue, PostgREST, Realtime, Storage)

---

## Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 40 GB SSD | 80+ GB SSD |
| OS | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 LTS |

**Software:**
- Docker Engine 24+
- Docker Compose v2+
- Git

---

## Pre-Deployment Checklist

### 1. Security — Generate Production Secrets

```bash
# Generate JWT secret (32+ chars)
openssl rand -base64 48

# Generate PostgreSQL password
openssl rand -base64 32
```

### 2. Regenerate Supabase JWT Keys

```bash
# Install jose CLI (or use node)
npm install -g jose

# Your JWT secret from step 1
JWT_SECRET="your-generated-secret"

# Generate ANON key (expires in 10 years)
node -e "
const jose = require('jose');
(async () => {
  const secret = new TextEncoder().encode(process.argv[1]);
  const token = await new jose.SignJWT({ role: 'anon', iss: 'supabase' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(Date.now()/1000) + 3600*24*365*10)
    .sign(secret);
  console.log('ANON_KEY=' + token);
})(process.argv[2]);
" "" "$JWT_SECRET"

# Generate SERVICE key
node -e "
const jose = require('jose');
(async () => {
  const secret = new TextEncoder().encode(process.argv[1]);
  const token = await new jose.SignJWT({ role: 'service_role', iss: 'supabase' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(Date.now()/1000) + 3600*24*365*10)
    .sign(secret);
  console.log('SERVICE_KEY=' + token);
})(process.argv[2]);
" "" "$JWT_SECRET"
```

### 3. Code Review Checklist

- [ ] No hardcoded credentials in source code
- [ ] All `.env.local` files are in `.gitignore`
- [ ] `MAILER_AUTOCONFIRM=false` (real email/SMS verification)
- [ ] Admin user created via `scripts/create-admin.js`
- [ ] RLS policies verified on all tables
- [ ] No `console.log` leaking sensitive data in server actions

---

## Step-by-Step Deployment

### Step 1: Clone & Configure

```bash
# On your server
git clone <your-repo-url> /opt/rokhdad-fit
cd /opt/rokhdad-fit

# Create production environment file
cp .env.example .env

# Edit .env with your production values
nano .env
```

**Critical values to set in `.env`:**
```env
SUPABASE_JWT_SECRET=<your-generated-secret>
POSTGRES_PASSWORD=<your-generated-password>
SUPABASE_ANON_KEY=<your-generated-anon-key>
SUPABASE_SERVICE_KEY=<your-generated-service-key>
SITE_URL=https://rokhdad.click
ADMIN_URL=https://admin.rokhdad.click
SITE_DOMAIN=rokhdad.click
ADMIN_DOMAIN=admin.rokhdad.click
MAILER_AUTOCONFIRM=false
```

### Step 2: Run Database Migrations

```bash
# Start only the database first
docker compose up -d db

# Wait for it to be healthy
docker compose logs -f db  # Wait for "database system is ready to accept connections"

# Run migrations
docker compose exec db psql -U postgres -c "SELECT 1"  # Verify connection

# Run migration scripts
DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@localhost:54322/postgres" \
  docker compose run --rm -T db psql -U postgres < athlete-pwa/supabase/migrations/20240515000000_create_base_tables.sql

# Or use the migration script (from athlete-pwa directory)
cd athlete-pwa
DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres" node scripts/execute-migrations.js
cd ..
```

### Step 3: Create Admin User

```bash
# Edit the admin creation script with your admin credentials
# Then run it inside a temporary container
docker compose run --rm adminpanel node scripts/create-admin.js
```

### Step 4: Build & Launch Everything

```bash
# Build and start all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Watch the build progress
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

### Step 5: Verify

```bash
# Check all containers are running
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Health checks
curl http://localhost:3000/api/health  # Athlete PWA
curl http://localhost:3001/api/health  # Admin Panel
```

---

## DNS Configuration

Point your domains to the server's public IP:

| Domain | Type | Value |
|--------|------|-------|
| `rokhdad.click` | A | `YOUR_SERVER_IP` |
| `admin.rokhdad.click` | A | `YOUR_SERVER_IP` |

**Wait for DNS propagation** (usually 1-5 minutes, up to 48 hours).

Caddy will automatically:
1. Provision Let's Encrypt certificates
2. Redirect HTTP → HTTPS
3. Enable HTTP/2

---

## Post-Deployment Verification

### 1. Application Health

```bash
# Athlete PWA
curl -s https://rokhdad.click/api/health | jq .

# Admin Panel
curl -s https://admin.rokhdad.click/api/health | jq .
```

### 2. Authentication Flow

1. Visit `https://rokhdad.click` → should redirect to login
2. Sign up with a test account → verify OTP works
3. Visit `https://admin.rokhdad.click` → should show admin login
4. Log in with admin credentials → verify dashboard loads

### 3. Database Connectivity

```bash
docker compose exec db psql -U postgres -c "SELECT count(*) FROM auth.users;"
```

### 4. SSL Verification

```bash
curl -vI https://rokhdad.click 2>&1 | grep -E "subject:|expire|issuer"
```

---

## Backup & Recovery

### Automated Backups

The `db-backup` sidecar container runs daily PostgreSQL dumps:

- **Location:** `./backups/` on the host
- **Retention:** 7 days
- **Format:** Custom PostgreSQL format (`.dump`)

### Manual Backup

```bash
docker compose exec db pg_dump -U postgres -Fc postgres > manual_backup_$(date +%Y%m%d).dump
```

### Restore from Backup

```bash
# Stop the apps to prevent writes
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop athlete-pwa adminpanel

# Restore
docker compose exec -T db pg_restore -U postgres -d postgres -c < backups/rokhdad_YYYYMMDD_HHMMSS.dump

# Restart apps
docker compose -f docker-compose.yml -f docker-compose.prod.yml start athlete-pwa adminpanel
```

### Offsite Backup (Recommended)

```bash
# Add to crontab on the server — copy backups to S3/etc daily
0 2 * * * aws s3 sync /opt/rokhdad-fit/backups s3://your-bucket/postgres-backups/
```

---

## Monitoring & Health Checks

### Built-in Health Checks

Each service has Docker health checks. Monitor with:

```bash
# Overall status
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Specific service health
docker inspect --format='{{.State.Health.Status}}' rokhdad-athlete-pwa
docker inspect --format='{{.State.Health.Status}}' rokhdad-adminpanel
docker inspect --format='{{.State.Health.Status}}' supabase-db
```

### HTTP Health Endpoints

| Service | URL | Expected |
|---------|-----|----------|
| Athlete PWA | `https://rokhdad.click/api/health` | `{"status":"ok"}` |
| Admin Panel | `https://admin.rokhdad.click/api/health` | `{"status":"ok"}` |

### Recommended: Uptime Monitoring

Use a service like **UptimeRobot** (free tier) or **Better Stack** to ping:
- `https://rokhdad.click/api/health` every 5 min
- `https://admin.rokhdad.click/api/health` every 5 min

### Log Viewing

```bash
# All services
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail=100

# Specific service
docker compose logs -f athlete-pwa --tail=50
docker compose logs -f adminpanel --tail=50
docker compose logs -f db --tail=50
docker compose logs -f caddy --tail=50
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs <service-name>

# Common issues:
# - Port already in use: lsof -i :PORT
# - Out of memory: free -h
# - Disk full: df -h
```

### Caddy certificate issues

```bash
# Check Caddy logs
docker compose logs caddy

# Force certificate renewal (rarely needed)
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### Database connection errors

```bash
# Verify DB is running
docker compose exec db pg_isready -U postgres

# Check connection from app container
docker compose exec athlete-pwa wget -qO- http://kong:8000/rest/v1/ -H "apikey: ${SUPABASE_ANON_KEY}"
```

### Build failures

```bash
# Rebuild with no cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache athlete-pwa

# Check if NEXT_PUBLIC_ vars are set during build
docker compose -f docker-compose.yml -f docker-compose.prod.yml config | grep NEXT_PUBLIC
```

---

## Rollback Procedure

### Quick Rollback (Git-based)

```bash
cd /opt/rokhdad-fit

# Find the last working commit
git log --oneline -10

# Rollback
git checkout <working-commit-hash>

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# If database was migrated, restore from backup:
docker compose -T exec db pg_restore -U postgres -d postgres -c < backups/rokhdad_YYYYMMDD.dump
```

### Emergency: Stop Everything

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
# Database data persists in Docker volumes
```

### Nuclear: Full Reset

```bash
# ⚠️ This deletes ALL data including the database
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
```

---

## Updating (Zero-Downtime)

```bash
cd /opt/rokhdad-fit

# Pull latest code
git pull origin main

# Rebuild and replace containers one by one
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --no-deps athlete-pwa
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --no-deps adminpanel

# If Supabase services changed
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --no-deps kong auth rest realtime
```

---

## Files Created for Production

| File | Purpose |
|------|---------|
| `athlete-pwa/Dockerfile` | Multi-stage build for Athlete PWA |
| `adminpanel/Dockerfile` | Multi-stage build for Admin Panel |
| `athlete-pwa/.dockerignore` | Exclude dev files from Docker context |
| `adminpanel/.dockerignore` | Exclude dev files from Docker context |
| `docker-compose.prod.yml` | Production overlay (Caddy, apps, backups) |
| `Caddyfile` | Reverse proxy + auto-HTTPS config |
| `athlete-pwa/app/api/health/route.ts` | Health check endpoint |
| `adminpanel/app/api/health/route.ts` | Health check endpoint |
| `.env.example` | Complete env var reference |

## Modified Files for Production

| File | Changes |
|------|---------|
| `athlete-pwa/next.config.ts` | Added `output: "standalone"`, security headers |
| `adminpanel/next.config.ts` | Added `output: "standalone"`, security headers |
| `athlete-pwa/scripts/execute-migrations.js` | Replaced hardcoded DB URL with `DATABASE_URL` env |