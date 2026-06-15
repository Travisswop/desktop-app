#!/bin/zsh
set -euo pipefail

SOURCE_REPO="/Users/travis/Documents/Swop Desktop Live.nosync/git-checkouts/desktop-app"
QA_WORKTREE="${SWOP_QA_MAIN_WORKTREE:-/Users/travis/Documents/Swop Desktop Live.nosync/.qa-worktrees/desktop-main-card-qa}"
LOG_DIR="/Users/travis/Documents/Swop Desktop Live.nosync/logs/astro-card-qa"
REMOTE="${SWOP_QA_REMOTE:-origin}"
BRANCH="${SWOP_QA_BRANCH:-main}"

mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$QA_WORKTREE")"

git -C "$SOURCE_REPO" fetch "$REMOTE" "$BRANCH"

if [[ ! -d "$QA_WORKTREE/.git" ]]; then
  if [[ -e "$QA_WORKTREE" ]]; then
    echo "QA worktree path exists but is not a Git worktree: $QA_WORKTREE" >&2
    exit 1
  fi
  git -C "$SOURCE_REPO" worktree add --detach "$QA_WORKTREE" "$REMOTE/$BRANCH"
else
  git -C "$QA_WORKTREE" fetch "$REMOTE" "$BRANCH"
  git -C "$QA_WORKTREE" checkout --detach "$REMOTE/$BRANCH"
fi

QA_SHA="$(git -C "$QA_WORKTREE" rev-parse HEAD)"
echo "Testing $REMOTE/$BRANCH at $QA_SHA"

cd "$QA_WORKTREE"

export SWOP_QA_LOG_DIR="$LOG_DIR"
export SWOP_QA_GIT_REF="$REMOTE/$BRANCH"
export SWOP_QA_GIT_SHA="$QA_SHA"
exec npm run qa:astro-cards -- --launch --json
