#!/usr/bin/env bash
#
# Rokhdad FIT — Branch Protection Setup
#
# Sets up GitHub Branch Protection Rules for main and staging branches.
# Requires: gh CLI authenticated (gh auth login)
#
# WHAT IT DOES:
#   1. Requires pull request before merging to main/staging
#   2. Requires CI checks to pass before merging
#   3. Requires 1 review approval
#   4. Disables force push to protected branches
#   5. Requires branches to be up-to-date before merging
#
# USAGE:
#   ./scripts/setup-protection.sh                    # Protect both repos
#   ./scripts/setup-protection.sh --repo athlete     # Only athlete repo
#   ./scripts/setup-protection.sh --repo backup      # Only backup repo
#   ./scripts/setup-protection.sh --dry-run          # Preview changes
#

set -euo pipefail

# ─────────────────────────── CONFIG ───────────────────────────
BACKUP_REPO="ALIrezanouri/rokhdadfitnextjs"
DEPLOY_REPO="ALIrezanouri/athlete"
BRANCHES=("main" "staging")
CI_CHECKS=("CI / Lint & Type Check" "CI / Build")
# ──────────────────────────────────────────────────────────────

# Colors
if [[ -t 1 ]]; then
  G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; C='\033[0;36m'; B='\033[1m'; N='\033[0m'
else
  G=''; Y=''; R=''; C=''; B=''; N=''
fi

log()     { echo -e "${C}[INFO]${N}  $1"; }
ok()      { echo -e "${G}[✓]${N}     $1"; }
warn()    { echo -e "${Y}[!]${N}     $1"; }
err()     { echo -e "${R}[✗]${N}     $1" >&2; }

show_help() {
  cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║          🛡️  Rokhdad FIT — Branch Protection Setup              ║
╚══════════════════════════════════════════════════════════════════╝

WHAT IT DOES:
  Configures GitHub Branch Protection Rules on 'main' and 'staging'
  branches for both repositories (rokhdadfitnextjs + athlete).

PROTECTION RULES APPLIED:
  ✅ Require pull request before merging
  ✅ Require 1 review approval
  ✅ Require CI checks to pass:
       • CI / Lint & Type Check
       • CI / Build
  ✅ Require branches to be up-to-date before merging
  ✅ Block force pushes to protected branches
  ✅ Block branch deletions
  ✅ Require linear history (no merge commits)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PREREQUISITES:
  • GitHub CLI installed:  brew install gh
  • Authenticated:         gh auth login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USAGE:
  ./scripts/setup-protection.sh [OPTIONS]

OPTIONS:
  -h, --help              Show this help message
      --dry-run           Preview changes without applying
      --repo <name>       Apply to only one repo (athlete | backup)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLES:

  Protect both repos (default):
    ./scripts/setup-protection.sh

  Preview first (recommended):
    ./scripts/setup-protection.sh --dry-run

  Protect only the athlete (deploy) repo:
    ./scripts/setup-protection.sh --repo athlete

  Protect only the backup repo:
    ./scripts/setup-protection.sh --repo backup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REPOSITORIES:
  BACKUP:  https://github.com/ALIrezanouri/rokhdadfitnextjs
  DEPLOY:  https://github.com/ALIrezanouri/athlete

NOTE:
  Branches must exist on the remote before protection can be applied.
  If a branch doesn't exist yet, push it first:
    git push origin staging && git push backup staging

Full docs: docs/DEPLOYMENT_GUIDE.md

EOF
}

DRY_RUN=false
TARGET_REPO=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) show_help; exit 0 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --repo)    TARGET_REPO="$2"; shift 2 ;;
    *) err "Unknown option: $1"; echo "Run: ./scripts/setup-protection.sh --help"; exit 1 ;;
  esac
done

echo -e "\n${B}${C}━━━ Branch Protection Setup ━━━${N}\n"

# Check gh auth
if ! gh auth status &>/dev/null; then
  err "gh CLI not authenticated. Run: gh auth login"
  exit 1
fi
ok "gh CLI authenticated"

# Determine which repos to process
if [[ -n "$TARGET_REPO" ]]; then
  case "$TARGET_REPO" in
    athlete) REPOS=("$DEPLOY_REPO") ;;
    backup)  REPOS=("$BACKUP_REPO") ;;
    *)       err "Invalid --repo. Use 'athlete' or 'backup'"; exit 1 ;;
  esac
else
  REPOS=("$BACKUP_REPO" "$DEPLOY_REPO")
fi

for repo in "${REPOS[@]}"; do
  echo -e "\n${B}┌─[ $repo ]${N}"

  for branch in "${BRANCHES[@]}"; do
    log "Setting protection for '${branch}'..."

    if $DRY_RUN; then
      echo -e "${Y}  [DRY]${N} gh api -X PUT repos/${repo}/branches/${branch}/protection"
      echo -e "${Y}  [DRY]${N}   → Require PR reviews: 1 approval"
      echo -e "${Y}  [DRY]${N}   → Require status checks: ${CI_CHECKS[*]}"
      echo -e "${Y}  [DRY]${N}   → Strict (up-to-date before merge)"
      echo -e "${Y}  [DRY]${N}   → No force pushes"
      echo -e "${Y}  [DRY]${N}   → No deletions"
      continue
    fi

    # Build the protection config
    # Using GitHub REST API v1
    gh api -X PUT "repos/${repo}/branches/${branch}/protection" \
      --input - <<'EOF' 2>/dev/null && ok "Protected '${branch}' on ${repo}" || warn "Failed to protect '${branch}' (branch may not exist yet — push first)"
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["CI / Lint & Type Check", "CI / Build"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
  done

  echo -e "${B}└───────────────${N}"
done

echo -e "\n${G}✓ Branch protection setup complete!${N}\n"