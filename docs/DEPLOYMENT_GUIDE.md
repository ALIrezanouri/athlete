# 🚀 Rokhdad FIT — Deployment Guide

Complete guide for the automated deployment workflow.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [One-Time Setup](#one-time-setup)
3. [Daily Usage](#daily-usage)
4. [Advanced Flags](#advanced-flags)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Branch Protection](#branch-protection)
7. [Vercel Status Monitoring](#vercel-status-monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Your Local Machine                  │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────┐ │
│  │  deploy.sh  │───▶│  Git Push   │───▶│  GitHub  │ │
│  └─────────────┘    └─────────────┘    └────┬─────┘ │
│                                              │       │
└──────────────────────────────────────────────┼───────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          ▼                                          ▼
                 ┌─────────────────┐                    ┌─────────────────┐
                 │  rokhdadfitnextjs │                    │     athlete      │
                 │  (Backup Mirror)  │                    │  (Vercel-linked) │
                 └─────────────────┘                    └────────┬────────┘
                                                                 │
                                                                 ▼
                                                        ┌─────────────────┐
                                                        │     Vercel      │
                                                        │   Auto-Deploy   │
                                                        └─────────────────┘
```

| Repository | Purpose | Vercel-Connected |
|---|---|---|
| `rokhdadfitnextjs` | Full code backup/mirror | ❌ |
| `athlete` | Production deploy (PWA) | ✅ → Vercel + Supabase |

---

## One-Time Setup

### Step 1: Install GitHub CLI

```bash
brew install gh
```

### Step 2: Authenticate

```bash
gh auth login
```

**Choose:**
1. `GitHub.com`
2. `HTTPS`
3. `Y` (authenticate Git with your GitHub credentials)
4. `Login with a web browser`
5. Copy the one-time code, open browser, paste

Verify:
```bash
gh auth status
```

### Step 3: Configure Git Remotes

```bash
./scripts/deploy.sh --setup
```

This adds:
- `origin` → `https://github.com/ALIrezanouri/athlete.git`
- `backup` → `https://github.com/ALIrezanouri/rokhdadfitnextjs.git`

### Step 4: Set Up Branch Protection (Recommended)

```bash
# Preview what it will do
./scripts/setup-protection.sh --dry-run

# Apply protection rules
./scripts/setup-protection.sh
```

This configures on both repos:
- ✅ Require pull request before merging
- ✅ Require 1 review approval
- ✅ Require CI checks to pass (`CI / Lint & Type Check`, `CI / Build`)
- ✅ Require branches to be up-to-date before merging
- ✅ No force pushes to protected branches
- ✅ No branch deletions

---

## Daily Usage

### Basic Deploy (creates PRs)

```bash
./scripts/deploy.sh -m "feat: add new feature"
```

This will:
1. Stage and commit all changes
2. Create a feature branch
3. Push to both repos
4. Open Pull Requests on both repos
5. **You merge the PRs manually** → Vercel auto-deploys

### Direct Push (fastest — no PR review)

```bash
./scripts/deploy.sh -m "fix: urgent bug" --push
```

Pushes directly to `main` → Vercel deploys immediately.

### Interactive Mode

```bash
./scripts/deploy.sh
```

Will prompt for a commit message interactively.

---

## Advanced Flags

### `--staging` — Test Before Production

Push to a `staging` branch instead of `main`. Useful for testing changes before they hit production.

```bash
./scripts/deploy.sh -m "feat: experimental feature" --staging
```

> **Note:** You'll need to create the `staging` branch on both repos first:
> ```bash
> git push origin staging && git push backup staging
> ```

### `--lint` — Pre-commit Quality Gate

Runs ESLint + TypeScript type checking before pushing. If anything fails, the deploy is aborted.

```bash
./scripts/deploy.sh -m "feat: new component" --lint
```

Runs:
- `npm run lint` (root)
- `npx tsc --noEmit` (root)
- `npm run lint` (athlete-pwa)
- `npx tsc --noEmit` (athlete-pwa)

### `--tag` — Semantic Versioning

Auto-creates a version tag (`v0.0.1`, `v0.0.2`, ...) and a GitHub Release on each deploy.

```bash
./scripts/deploy.sh -m "release: v1.0" --tag
```

- Auto-increments patch version (`v0.0.1` → `v0.0.2`)
- Creates annotated git tag
- Pushes tag to both remotes
- Creates GitHub Release (if `gh` CLI is authenticated)

### `--vercel-status` — Monitor Vercel Deploy

After pushing, polls the Vercel API every 10 seconds (up to 3 minutes) to report deploy status.

```bash
# Set these once (or add to .env)
export VERCEL_TOKEN="your-vercel-token"
export VERCEL_PROJECT_ID="prj_xxxxx"

# Then deploy
./scripts/deploy.sh -m "fix: deploy bug" --push --vercel-status
```

**How to get Vercel credentials:**
1. **Token:** https://vercel.com/account/tokens → Create Token
2. **Project ID:** Vercel Dashboard → Your Project → Settings → General → Copy "Project ID"

### `--dry-run` — Preview Without Changes

See exactly what the script would do without making any changes.

```bash
./scripts/deploy.sh -m "test" --dry-run
```

### Combining Flags

All flags can be combined:

```bash
# Full quality deploy with staging + lint + tag + vercel monitoring
./scripts/deploy.sh -m "release: v1.2.0" --staging --lint --tag --vercel-status
```

---

## CI/CD Pipeline

The `.github/workflows/ci.yml` file defines a GitHub Actions CI pipeline that runs automatically on all Pull Requests and pushes to `main` and `staging`.

### Jobs

| Job | What It Does |
|---|---|
| **Lint & Type Check** | Runs ESLint + `tsc --noEmit` on root and athlete-pwa |
| **Build** | Runs `npm run build` on athlete-pwa to verify it compiles |

### Adding Secrets for CI Build

If your build requires environment variables, add them as GitHub Secrets:

```bash
gh secret set NEXT_PUBLIC_SUPABASE_URL --repo ALIrezanouri/athlete
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --repo ALIrezanouri/athlete
```

The CI workflow uses fallback placeholders if secrets aren't set, so it won't fail on missing env vars.

---

## Branch Protection

Run the protection setup script once:

```bash
./scripts/setup-protection.sh
```

### What Gets Protected

| Rule | main | staging |
|---|---|---|
| Require PR | ✅ | ✅ |
| Require 1 approval | ✅ | ✅ |
| Require CI checks | ✅ | ✅ |
| Strict (up-to-date) | ✅ | ✅ |
| Force push blocked | ✅ | ✅ |
| Deletion blocked | ✅ | ✅ |
| Linear history | ✅ | ✅ |

### Applying to Only One Repo

```bash
./scripts/setup-protection.sh --repo athlete   # Only athlete repo
./scripts/setup-protection.sh --repo backup    # Only backup repo
```

---

## Vercel Status Monitoring

The `--vercel-status` flag uses the Vercel REST API to poll deployment status.

### Setup

1. **Create a Vercel token:**
   ```
   https://vercel.com/account/tokens
   ```

2. **Find your Project ID:**
   ```
   Vercel Dashboard → Project → Settings → General → Project ID
   ```

3. **Set environment variables:**
   ```bash
   export VERCEL_TOKEN="vercel_xxxxxxxxxxxx"
   export VERCEL_PROJECT_ID="prj_xxxxxxxxxxxx"
   ```

4. **Deploy with monitoring:**
   ```bash
   ./scripts/deploy.sh -m "feat: new feature" --push --vercel-status
   ```

### Status Output

```
━━━ Vercel Deploy Status ━━━
[INFO]  Polling Vercel for deploy status...
[INFO]  [1/18] Status: BUILDING...
[INFO]  [2/18] Status: BUILDING...
[✓]     Deploy READY! 🎉
    URL: https://athlete-abc123.vercel.app
```

---

## Troubleshooting

### `gh auth status` fails

```bash
gh auth login
# Follow the interactive prompts
```

### Push rejected (remote has newer commits)

```bash
git pull origin main --rebase
./scripts/deploy.sh -m "retry"
```

### PR creation fails

The branch may already have an open PR, or the branch doesn't exist on the remote yet. Check:

```bash
gh pr list --repo ALIrezanouri/athlete
gh pr list --repo ALIrezanouri/rokhdadfitnextjs
```

### Branch protection blocks direct push

If branch protection is enabled, `--push` won't work. Use PR mode (default) instead:

```bash
./scripts/deploy.sh -m "msg"
```

### Vercel deploy not triggering

Verify that:
1. The `athlete` repo is connected to Vercel (Settings → Git → GitHub)
2. The `main` branch is set as the "Production Branch" in Vercel
3. You pushed to `main` (not just a feature branch)

### Lint check fails during deploy

```bash
# Run lint manually to see errors
npm run lint
npx tsc --noEmit

# Fix errors, then re-deploy
./scripts/deploy.sh -m "fix: lint errors" --lint
```

### Vercel status check shows "VERCEL_TOKEN not set"

```bash
export VERCEL_TOKEN="your-token-here"
```

Or add to your shell profile (`~/.zshrc`):
```bash
echo 'export VERCEL_TOKEN="your-token-here"' >> ~/.zshrc
source ~/.zshrc
```

---

## Quick Reference

| Command | Description |
|---|---|
| `./scripts/deploy.sh --setup` | First-time setup |
| `./scripts/deploy.sh -m "msg"` | Create PRs (default) |
| `./scripts/deploy.sh -m "msg" --push` | Direct push to main |
| `./scripts/deploy.sh -m "msg" --staging` | Deploy to staging |
| `./scripts/deploy.sh -m "msg" --lint` | Lint before push |
| `./scripts/deploy.sh -m "msg" --tag` | Create version tag |
| `./scripts/deploy.sh -m "msg" --vercel-status` | Monitor Vercel |
| `./scripts/deploy.sh --dry-run` | Preview mode |
| `./scripts/setup-protection.sh` | Set up branch protection |