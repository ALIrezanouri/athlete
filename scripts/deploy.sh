#!/usr/bin/env bash
#
# Rokhdad FIT — Deployment & Sync Script
#
# WHAT IT DOES (each run):
#   1. Stages and commits all local changes
#   2. Creates a feature branch and opens a Pull Request on the BACKUP repo (rokhdadfitnextjs)
#   3. Creates a feature branch and opens a Pull Request on the DEPLOY repo (athlete)
#   4. When you merge the PR on the athlete repo → Vercel auto-deploys to production
#
# USAGE:
#   ./scripts/deploy.sh                    # Interactive mode — prompts for commit message
#   ./scripts/deploy.sh -m "msg"           # Non-interactive — use provided commit message
#   ./scripts/deploy.sh -m "msg" --push    # Direct push to main (skips PR, Vercel deploys immediately)
#   ./scripts/deploy.sh --dry-run          # Show what would happen without executing
#   ./scripts/deploy.sh --setup            # Run first-time setup (adds remotes, checks deps)
#   ./scripts/deploy.sh -m "msg" --staging # Deploy to staging branch first (test before production)
#   ./scripts/deploy.sh -m "msg" --tag     # Create semantic version tag (vMAJOR.MINOR.PATCH)
#   ./scripts/deploy.sh -m "msg" --lint    # Run lint+typecheck before pushing (fails fast)
#   ./scripts/deploy.sh -m "msg" --vercel-status  # Check Vercel deploy status after push
#
# ═══════════════════════════════════════════════════════════════════════════════════════

set -euo pipefail
IFS=$'\n\t'

# ─────────────────────────── CONFIGURATION ───────────────────────────
# Edit these values if your repo URLs ever change.

BACKUP_REMOTE_NAME="backup"                                                    # git remote name for backup repo
BACKUP_REPO_URL="https://github.com/ALIrezanouri/rokhdadfitnextjs.git"         # full mirror
BACKUP_REPO_SLUG="ALIrezanouri/rokhdadfitnextjs"                               # owner/name for gh CLI

DEPLOY_REMOTE_NAME="origin"                                                    # git remote name for deploy repo
DEPLOY_REPO_URL="https://github.com/ALIrezanouri/athlete.git"                  # PWA (Vercel-connected)
DEPLOY_REPO_SLUG="ALIrezanouri/athlete"                                        # owner/name for gh CLI

MAIN_BRANCH="main"
# ─────────────────────────────────────────────────────────────────────

# ─────────────────────────── COLOR CODES ─────────────────────────────
if [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; BOLD=''; NC=''
fi

# ─────────────────────────── LOGGING ─────────────────────────────────
log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[✓]${NC}     $1"; }
log_warn()    { echo -e "${YELLOW}[!]${NC}     $1"; }
log_error()   { echo -e "${RED}[✗]${NC}     $1" >&2; }
log_step()    { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }
log_repo()    { echo -e "\n${BOLD}┌─[ $1 ]${NC}"; }
log_repoend() { echo -e "${BOLD}└───────────────${NC}"; }

# ─────────────────────────── VARIABLES ───────────────────────────────
COMMIT_MESSAGE=""
DIRECT_PUSH=false
DRY_RUN=false
SETUP_MODE=false
STAGING=false
TAG_VERSION=false
LINT_CHECK=false
CHECK_VERCEL=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
BRANCH_NAME="deploy/auto-${TIMESTAMP}"
TARGET_BRANCH="main"

# ─────────────────────────── HELP ────────────────────────────────────
show_help() {
  cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║              🚀 Rokhdad FIT — Deploy Script Help                ║
╚══════════════════════════════════════════════════════════════════╝

WHAT IT DOES:
  1. Stages & commits all local changes
  2. Pushes to BACKUP repo (rokhdadfitnextjs)  → PR to main
  3. Pushes to DEPLOY repo (athlete)            → PR to main → Vercel auto-deploys

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USAGE:
  ./scripts/deploy.sh [OPTIONS]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTIONS:
  -m, --message <msg>     Commit message (skips interactive prompt)
      --push              Direct push to main (skip PR — Vercel deploys instantly)
      --dry-run           Preview all actions WITHOUT making any changes
      --setup             First-time setup: add git remotes, verify dependencies
      --staging           Push to 'staging' branch instead of 'main' (test before prod)
      --tag               Auto-create a semantic version tag (v0.0.X → GitHub Release)
      --lint              Run ESLint + TypeScript checks BEFORE pushing
      --vercel-status     Poll Vercel API for deploy status after push
  -h, --help              Show this help message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENVIRONMENT VARIABLES (for --vercel-status):
  VERCEL_TOKEN          Vercel API token   (https://vercel.com/account/tokens)
  VERCEL_PROJECT_ID     Project ID         (Vercel Dashboard → Settings → General)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMON SCENARIOS:

  📦 First-time setup:
    ./scripts/deploy.sh --setup

  🔄 Daily deploy (creates PRs → you merge → Vercel deploys):
    ./scripts/deploy.sh -m "feat: add new feature"

  ⚡ Fast deploy (direct push → Vercel deploys immediately):
    ./scripts/deploy.sh -m "fix: urgent bug" --push

  🧪 Test on staging before production:
    ./scripts/deploy.sh -m "feat: experimental" --staging

  🛡️  Full quality deploy (lint + tag + Vercel monitoring):
    ./scripts/deploy.sh -m "release: v1.0" --lint --tag --vercel-status

  👀 Preview before executing (always recommended first!):
    ./scripts/deploy.sh -m "msg" --dry-run

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WORKFLOW MODES:

  PR MODE (default):
    Creates a feature branch → pushes → opens Pull Requests on both repos.
    You review and merge the PR on GitHub.
    Merging the athlete PR triggers Vercel auto-deploy to production.
    ✅ Safer — code is reviewed before going live.

  DIRECT PUSH (--push):
    Pushes directly to main on both repos.
    Vercel deploys immediately from the athlete repo.
    ⚡ Faster — use for quick fixes where PR review isn't needed.
    ⚠️  Requires branch protection to be DISABLED on main.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TIPS:
  • Run with --dry-run FIRST to preview any command before going live
  • Combine multiple flags: --lint --tag --vercel-status all work together
  • Use --lint to catch errors BEFORE they reach GitHub (saves Vercel build time)
  • Use --tag for releases — auto-increments version and creates GitHub Release
  • If push fails, run: git pull origin main --rebase && ./scripts/deploy.sh -m "retry"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REPOSITORIES:
  BACKUP:  https://github.com/ALIrezanouri/rokhdadfitnextjs  (code mirror)
  DEPLOY:  https://github.com/ALIrezanouri/athlete            (Vercel-connected)

Full docs: docs/DEPLOYMENT_GUIDE.md

EOF
}

# ─────────────────────────── PARSE ARGS ──────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)
      COMMIT_MESSAGE="$2"; shift 2 ;;
    --push)
      DIRECT_PUSH=true; shift ;;
    --dry-run)
      DRY_RUN=true; shift ;;
    --setup)
      SETUP_MODE=true; shift ;;
    --staging)
      STAGING=true; TARGET_BRANCH="staging"; shift ;;
    --tag)
      TAG_VERSION=true; shift ;;
    --lint)
      LINT_CHECK=true; shift ;;
    --vercel-status)
      CHECK_VERCEL=true; shift ;;
    -h|--help)
      show_help; exit 0 ;;
    *)
      log_error "Unknown option: $1"; show_help; exit 1 ;;
  esac
done

# ─────────────────────────── BANNER ──────────────────────────────────
show_banner() {
  echo -e "${CYAN}"
  cat << 'BANNER'
  ╔═══════════════════════════════════════════════════╗
  ║         🚀 Rokhdad FIT — Deploy Script           ║
  ╚═══════════════════════════════════════════════════╝
BANNER
  echo -e "${NC}"
  if $DRY_RUN; then
    echo -e "${YELLOW}  ⚠ DRY RUN MODE — no changes will be made${NC}\n"
  fi
  if $DIRECT_PUSH; then
    echo -e "  Mode: ${BOLD}Direct Push${NC} (Vercel auto-deploys immediately)"
  else
    echo -e "  Mode: ${BOLD}Pull Request${NC} (merge PR → Vercel deploys)"
  fi
  if $STAGING; then
    echo -e "  Target: ${BOLD}staging${NC} (test branch)"
  fi
  if $LINT_CHECK; then
    echo -e "  Lint: ${BOLD}enabled${NC} (will run before push)"
  fi
  if $TAG_VERSION; then
    echo -e "  Tag: ${BOLD}enabled${NC} (semantic version auto-bump)"
  fi
  if $CHECK_VERCEL; then
    echo -e "  Vercel: ${BOLD}status polling${NC} (after push)"
  fi
  echo -e "  Time: ${TIMESTAMP}"
  echo ""
}

# ─────────────────────────── DRY RUN HELPER ──────────────────────────
run() {
  if $DRY_RUN; then
    echo -e "${YELLOW}  [DRY]${NC} $*"
  else
    eval "$@"
  fi
}

# ─────────────────────────── DEPENDENCY CHECKS ───────────────────────
check_dependencies() {
  local missing=0

  log_step "Pre-flight Checks"

  # Check git
  if command -v git &>/dev/null; then
    log_success "git found: $(git --version)"
  else
    log_error "git is not installed"
    missing=1
  fi

  # Check gh CLI
  if command -v gh &>/dev/null; then
    log_success "gh CLI found: $(gh --version | head -1)"

    # Check auth status
    if gh auth status &>/dev/null 2>&1; then
      local gh_user
      gh_user="$(gh api user --jq .login 2>/dev/null || echo 'unknown')"
      log_success "gh CLI authenticated as: ${gh_user}"
    else
      log_error "gh CLI is NOT authenticated. Run: gh auth login"
      log_error "See: https://cli.github.com/manual/gh_auth_login"
      missing=1
    fi
  else
    if $DIRECT_PUSH; then
      log_warn "gh CLI not installed (only needed for PR creation)"
      log_warn "Direct push mode will still work without it"
    else
      log_error "gh CLI is required for PR creation. Install: brew install gh"
      missing=1
    fi
  fi

  if [[ $missing -eq 1 ]]; then
    if $DRY_RUN; then
      echo ""
      log_warn "Dependencies missing — continuing in DRY RUN mode for preview"
      log_warn "Fix the issues above before running for real"
    else
      echo ""
      log_error "Dependencies missing. Fix the issues above and re-run."
      exit 1
    fi
  fi
}

# ─────────────────────────── REMOTE SETUP ────────────────────────────
ensure_remote() {
  local name="$1"
  local url="$2"

  if git remote get-url "$name" &>/dev/null; then
    local existing
    existing="$(git remote get-url "$name")"
    if [[ "$existing" == "$url" ]]; then
      log_success "Remote '${name}' configured → ${url}"
    else
      log_warn "Remote '${name}' points to ${existing} (expected ${url})"
      log_info "Updating remote '${name}'..."
      run "git remote set-url $name $url"
    fi
  else
    log_info "Adding remote '${name}' → ${url}"
    run "git remote add $name $url"
    log_success "Remote '${name}' added"
  fi
}

setup_remotes() {
  log_step "Git Remote Configuration"
  ensure_remote "$BACKUP_REMOTE_NAME" "$BACKUP_REPO_URL"
  ensure_remote "$DEPLOY_REMOTE_NAME" "$DEPLOY_REPO_URL"
}

# ─────────────────────────── COMMIT CHANGES ──────────────────────────
commit_changes() {
  log_step "Stage & Commit"

  cd "$PROJECT_ROOT"

  # Check if there are any changes
  if git diff --staged --quiet 2>/dev/null && \
     git diff --quiet 2>/dev/null && \
     [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    log_info "No changes to commit. Working tree is clean."
    COMMIT_HASH="$(git rev-parse --short HEAD)"
    log_info "Using latest commit: ${COMMIT_HASH}"
    return 0
  fi

  # Stage everything
  log_info "Staging all changes..."
  run "git add -A"

  if $DRY_RUN; then
    echo -e "${YELLOW}  [DRY]${NC} Files that would be staged:"
    git diff --staged --name-status 2>/dev/null || git diff --name-status
    git ls-files --others --exclude-standard | sed 's/^/  A   /'
  fi

  # Get commit message
  if [[ -z "$COMMIT_MESSAGE" ]]; then
    echo ""
    echo -e "${BOLD}Enter commit message (or press Enter for auto):${NC}"
    read -r -p "  > " COMMIT_MESSAGE
    if [[ -z "$COMMIT_MESSAGE" ]]; then
      COMMIT_MESSAGE="deploy: sync changes ${TIMESTAMP}"
    fi
  fi

  log_info "Commit message: \"${COMMIT_MESSAGE}\""
  run "git commit -m \"${COMMIT_MESSAGE}\""

  COMMIT_HASH="$(git rev-parse --short HEAD)"
  log_success "Committed: ${COMMIT_HASH}"
}

# ─────────────────────────── PR WORKFLOW ─────────────────────────────
create_pr_for_repo() {
  local remote_name="$1"
  local repo_slug="$2"
  local label="$3"

  log_repo "$label (${repo_slug})"

  # Create feature branch
  local branch="${BRANCH_NAME}"

  # Safety: delete existing local branch with same name if it exists
  # (handles re-runs where a previous attempt left a branch behind)
  if ! $DRY_RUN; then
    git branch -D "$branch" 2>/dev/null || true
  fi

  log_info "Creating branch: ${branch}"
  run "git checkout -b ${branch}"

  # Push to remote
  log_info "Pushing to ${remote_name}/${branch}..."
  if ! $DRY_RUN; then
    if git push -u "$remote_name" "$branch" 2>&1; then
      log_success "Pushed to ${remote_name}"
    else
      log_error "Push to ${remote_name} failed"
      git checkout "$MAIN_BRANCH" 2>/dev/null || true
      log_repoend
      return 1
    fi
  else
    echo -e "${YELLOW}  [DRY]${NC} git push -u ${remote_name} ${branch}"
  fi

  # Create PR via gh CLI
  if ! $DRY_RUN; then
    local pr_url
    pr_url="$(gh pr create \
      --repo "$repo_slug" \
      --base "$TARGET_BRANCH" \
      --head "$branch" \
      --title "${COMMIT_MESSAGE}" \
      --body "$(cat <<EOF
## 🚀 Automated Deployment

**Commit:** \`${COMMIT_HASH}\`
**Timestamp:** ${TIMESTAMP}
**Triggered by:** deploy.sh

### Changes
${COMMIT_MESSAGE}

---
_Auto-generated by \`scripts/deploy.sh\`_
EOF
)" 2>&1)" || {
      log_warn "PR creation failed (may already exist or branch needs manual PR)"
      log_info "Create manually: https://github.com/${repo_slug}/compare/${branch}"
    }

    if [[ "$pr_url" == *"github.com/pull/"* ]] || [[ "$pr_url" == *"github.com/"*"/pull/"* ]]; then
      log_success "Pull Request created: ${pr_url}"
    fi
  else
    echo -e "${YELLOW}  [DRY]${NC} gh pr create --repo ${repo_slug} --base ${TARGET_BRANCH} --head ${branch}"
  fi

  # Switch back to main
  if ! $DRY_RUN; then
    git checkout "$MAIN_BRANCH" 2>/dev/null || true
  fi

  log_repoend
}

# ─────────────────────────── DIRECT PUSH ─────────────────────────────
direct_push_to_repo() {
  local remote_name="$1"
  local repo_slug="$2"
  local label="$3"

  log_repo "$label (${repo_slug})"

  log_info "Pushing directly to ${remote_name}/${TARGET_BRANCH}..."
  if ! $DRY_RUN; then
    if git push "$remote_name" "$TARGET_BRANCH" 2>&1; then
      log_success "Pushed to ${remote_name}/${TARGET_BRANCH}"
    else
      log_error "Push to ${remote_name} failed"
      log_repoend
      return 1
    fi
  else
    echo -e "${YELLOW}  [DRY]${NC} git push ${remote_name} ${TARGET_BRANCH}"
  fi

  # Special note for deploy repo
  if [[ "$remote_name" == "$DEPLOY_REMOTE_NAME" ]]; then
    if ! $DRY_RUN; then
      log_info "Vercel auto-deploy triggered from push to main"
      log_info "Monitor: https://vercel.com/dashboard"
    fi
  fi

  log_repoend
}

# ─────────────────────────── PRE-COMMIT LINT ─────────────────────────
run_lint_check() {
  if ! $LINT_CHECK; then
    return 0
  fi

  log_step "Pre-commit Lint & Type Check"

  if $DRY_RUN; then
    echo -e "${YELLOW}  [DRY]${NC} Would run: npm run lint + npx tsc --noEmit"
    return 0
  fi

  log_info "Running ESLint (root)..."
  if npm run lint 2>&1; then
    log_success "Root lint passed"
  else
    log_error "Root lint failed. Fix errors before deploying."
    exit 1
  fi

  log_info "Running TypeScript check (root)..."
  if npx tsc --noEmit 2>&1; then
    log_success "Root typecheck passed"
  else
    log_error "Root typecheck failed. Fix errors before deploying."
    exit 1
  fi

  log_info "Running ESLint (athlete-pwa)..."
  if (cd athlete-pwa && npm run lint) 2>&1; then
    log_success "athlete-pwa lint passed"
  else
    log_error "athlete-pwa lint failed. Fix errors before deploying."
    exit 1
  fi

  log_info "Running TypeScript check (athlete-pwa)..."
  if (cd athlete-pwa && npx tsc --noEmit) 2>&1; then
    log_success "athlete-pwa typecheck passed"
  else
    log_error "athlete-pwa typecheck failed. Fix errors before deploying."
    exit 1
  fi
}

# ─────────────────────────── SEMANTIC VERSIONING ─────────────────────
create_version_tag() {
  if ! $TAG_VERSION; then
    return 0
  fi

  log_step "Semantic Version Tag"

  # Get the latest version tag
  local latest_tag
  latest_tag="$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")"
  log_info "Latest tag: ${latest_tag}"

  # Parse version (remove 'v' prefix, split by '.')
  local version="${latest_tag#v}"
  local major minor patch
  IFS='.' read -r major minor patch <<< "$version"
  major="${major:-0}"; minor="${minor:-0}"; patch="${patch:-0}"

  # Auto-increment patch version
  patch=$((patch + 1))
  local new_tag="v${major}.${minor}.${patch}"
  local tag_msg="Release ${new_tag} — ${COMMIT_MESSAGE}"

  log_info "New version: ${new_tag}"

  if $DRY_RUN; then
    echo -e "${YELLOW}  [DRY]${NC} git tag -a ${new_tag} -m \"${tag_msg}\""
    echo -e "${YELLOW}  [DRY]${NC} git push ${DEPLOY_REMOTE_NAME} ${new_tag}"
    echo -e "${YELLOW}  [DRY]${NC} git push ${BACKUP_REMOTE_NAME} ${new_tag}"
    return 0
  fi

  # Create annotated tag
  git tag -a "$new_tag" -m "$tag_msg"
  log_success "Tag ${new_tag} created"

  # Push tag to both remotes
  git push "$DEPLOY_REMOTE_NAME" "$new_tag" 2>/dev/null && log_success "Tag pushed to origin" || log_warn "Tag push to origin failed"
  git push "$BACKUP_REMOTE_NAME" "$new_tag" 2>/dev/null && log_success "Tag pushed to backup" || log_warn "Tag push to backup failed"

  # GitHub Release
  if command -v gh &>/dev/null && gh auth status &>/dev/null; then
    gh release create "$new_tag" \
      --repo "$DEPLOY_REPO_SLUG" \
      --title "$new_tag" \
      --notes "$(cat <<EOF
## Release ${new_tag}

${COMMIT_MESSAGE}

**Commit:** \`${COMMIT_HASH}\`
**Timestamp:** ${TIMESTAMP}
EOF
)" 2>/dev/null && log_success "GitHub Release created: ${new_tag}" || log_warn "Release creation skipped"
  fi
}

# ─────────────────────────── VERCEL STATUS ───────────────────────────
check_vercel_status() {
  if ! $CHECK_VERCEL; then
    return 0
  fi

  log_step "Vercel Deploy Status"

  if $DRY_RUN; then
    echo -e "${YELLOW}  [DRY]${NC} Would poll Vercel API for deploy status"
    return 0
  fi

  if [[ -z "${VERCEL_TOKEN:-}" ]]; then
    log_warn "VERCEL_TOKEN not set — skipping status check"
    log_info "To enable: export VERCEL_TOKEN=your_token"
    log_info "Create token: https://vercel.com/account/tokens"
    return 0
  fi

  if [[ -z "${VERCEL_PROJECT_ID:-}" ]]; then
    log_warn "VERCEL_PROJECT_ID not set — skipping status check"
    log_info "Find it in: Vercel Dashboard → Project → Settings → General"
    return 0
  fi

  log_info "Polling Vercel for deploy status..."
  log_info "(This checks every 10s for up to 3 minutes)"

  local max_attempts=18  # 18 × 10s = 3 minutes
  local attempt=0

  while [[ $attempt -lt $max_attempts ]]; do
    attempt=$((attempt + 1))
    sleep 10

    local status
    status="$(curl -s -H "Authorization: Bearer ${VERCEL_TOKEN}" \
      "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=1" \
      | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['deployments'][0]['state'] if d.get('deployments') else 'none')" 2>/dev/null || echo "error")"

    case "$status" in
      READY)
        local url
        url="$(curl -s -H "Authorization: Bearer ${VERCEL_TOKEN}" \
          "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=1" \
          | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['deployments'][0].get('url',''))" 2>/dev/null || echo "")"
        log_success "Deploy READY! 🎉"
        if [[ -n "$url" ]]; then
          echo -e "    URL: ${BOLD}https://${url}${NC}"
        fi
        return 0
        ;;
      ERROR)
        log_error "Deploy FAILED on Vercel"
        log_info "Check: https://vercel.com/dashboard"
        return 1
        ;;
      BUILDING|QUEUED|INITIALIZING)
        log_info "[${attempt}/${max_attempts}] Status: ${status}..."
        ;;
      *)
        log_warn "[${attempt}/${max_attempts}] Status: ${status} (waiting...)"
        ;;
    esac
  done

  log_warn "Timeout — deploy still in progress after 3 minutes"
  log_info "Check manually: https://vercel.com/dashboard"
}

# ─────────────────────────── SETUP MODE ──────────────────────────────
run_setup() {
  log_step "First-Time Setup"

  check_dependencies
  setup_remotes

  # Fetch latest from both remotes
  log_info "Fetching from remotes..."
  run "git fetch ${BACKUP_REMOTE_NAME}" || log_warn "Backup remote fetch failed (may be empty/new repo)"
  run "git fetch ${DEPLOY_REMOTE_NAME}" || log_warn "Deploy remote fetch failed"

  log_success "Setup complete!"
  echo ""
  log_info "Remotes configured:"
  git remote -v | sed 's/^/  /'
  echo ""
}

# ─────────────────────────── SUMMARY ─────────────────────────────────
show_summary() {
  log_step "Deployment Summary"

  echo -e "  ${BOLD}Backup Repo${NC} (rokhdadfitnextjs):"
  echo -e "    URL: https://github.com/${BACKUP_REPO_SLUG}"

  echo -e "  ${BOLD}Deploy Repo${NC} (athlete + Vercel):"
  echo -e "    URL: https://github.com/${DEPLOY_REPO_SLUG}"

  if ! $DIRECT_PUSH; then
    echo ""
    log_info "Next steps:"
    echo -e "  1. Review & merge the PRs on GitHub"
    echo -e "  2. After merging the athlete PR → Vercel auto-deploys"
    echo -e "  3. Monitor deployment: https://vercel.com/dashboard"
  else
    echo ""
    log_info "Vercel deployment triggered automatically."
    echo -e "  Monitor: https://vercel.com/dashboard"
  fi

  echo ""
  log_success "Done! 🎉"
}

# ─────────────────────────── MAIN ────────────────────────────────────
main() {
  show_banner

  # Setup mode
  if $SETUP_MODE; then
    run_setup
    exit 0
  fi

  # Normal deploy flow
  check_dependencies
  setup_remotes

  # Pre-commit lint check (--lint flag)
  run_lint_check

  commit_changes

  if $DIRECT_PUSH; then
    # ─── DIRECT PUSH MODE ───
    log_step "Direct Push to ${TARGET_BRANCH}"

    # STEP 1: Push to BACKUP first (fail-stop if it fails)
    direct_push_to_repo "$BACKUP_REMOTE_NAME" "$BACKUP_REPO_SLUG" "BACKUP" || {
      log_error "BACKUP push failed — ABORTING deploy to Vercel."
      log_error "Code will NOT be pushed to athlete/Vercel until backup succeeds."
      exit 1
    }

    # STEP 2: Only push to DEPLOY after backup is confirmed safe
    direct_push_to_repo "$DEPLOY_REMOTE_NAME" "$DEPLOY_REPO_SLUG" "DEPLOY + VERCEL"
  else
    # ─── PR MODE ───
    log_step "Create Pull Requests → ${TARGET_BRANCH}"

    # STEP 1: Create PR on BACKUP first (fail-stop if it fails)
    create_pr_for_repo "$BACKUP_REMOTE_NAME" "$BACKUP_REPO_SLUG" "BACKUP" || {
      log_error "BACKUP PR creation failed — ABORTING deploy PR to Vercel."
      log_error "Code will NOT be pushed to athlete/Vercel until backup PR succeeds."
      exit 1
    }

    # STEP 2: Only create DEPLOY PR after backup is confirmed safe
    create_pr_for_repo "$DEPLOY_REMOTE_NAME" "$DEPLOY_REPO_SLUG" "DEPLOY + VERCEL"

    # Cleanup: delete the local deploy branch
    if ! $DRY_RUN; then
      git branch -D "$BRANCH_NAME" 2>/dev/null || true
    fi
  fi

  # Semantic versioning (--tag flag)
  create_version_tag

  # Vercel deploy status (--vercel-status flag)
  check_vercel_status

  show_summary
}

main "$@"