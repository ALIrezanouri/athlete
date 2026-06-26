# Raw Reflection Log

---
Date: 2026-06-27
TaskRef: "DevOps deployment automation script for rokhdad_FIT (dual-repo + Vercel)"

Learnings:
- **GitHub CLI (gh) PR creation from same branch to two different repos:** Use `gh pr create --repo <slug> --base <branch> --head <local-branch>`. When pushing the same local branch to two different remotes (origin, backup), you can open PRs on both independently.
- **Branch protection via REST API:** `gh api -X PUT repos/{owner}/{repo}/branches/{branch}/protection --input -` with a JSON body is the cleanest way. Requires `strict: true` for up-to-date checks, `contexts` array for required CI check names.
- **Vercel deploy monitoring:** REST API endpoint `https://api.vercel.com/v6/deployments?projectId=X&limit=1` with `Authorization: Bearer TOKEN` header returns deployment state (BUILDING, READY, ERROR). Need both `VERCEL_TOKEN` and `VERCEL_PROJECT_ID`.
- **Semantic versioning in bash:** `git describe --tags --abbrev=0` gets latest tag. Parse with `IFS='.' read -r major minor patch <<< "${version#v}"`. Increment patch, create annotated tag with `git tag -a`.
- **Script architecture pattern:** For a multi-function deploy script, define functions early, use a `run()` wrapper for dry-run support (`eval "$@"`), and a central `main()` at the bottom.

Difficulties:
- **Initial staging flag wasn't wired:** Added `--staging` flag but forgot to replace hardcoded `MAIN_BRANCH` references in PR creation and direct push functions. Had to do a follow-up replace to use `TARGET_BRANCH` variable everywhere.
- **Dry-run DRY helper:** Using `eval "$@"` inside the `run()` function works but requires careful quoting. For `git commit -m "msg"`, the quotes need to be preserved.

Successes:
- **Modular flag system:** All 5 advanced flags (--staging, --lint, --tag, --vercel-status, --dry-run) are independent and composable. User can combine any subset.
- **Dry-run validation:** Testing with `--dry-run` caught the staging wiring issue before any real deployment.

Improvements_Identified_For_Consolidation:
- **Pattern: Composable CLI flags in bash scripts** — use boolean variables (`FLAG=false`), set in case statement, check with `if $FLAG; then`. Each feature is a separate function that early-returns if its flag is false.
- **Pattern: Dual-remote git workflow** — one local repo, two remotes (deploy + backup), push to both in sequence. Use `git remote add` + `ensure_remote` helper for setup.
---