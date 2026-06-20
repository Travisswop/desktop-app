# Log-Derived Bug Kanban Workflow

Use this workflow whenever a desktop/runtime log, screenshot, support report,
or local telemetry file reveals a product bug that should not disappear into a
terminal scrollback.

## Board

- GitHub Project: https://github.com/users/Travisswop/projects/1
- Owner/project number for `gh`: `Travisswop`, project `1`
- Fixer automation: `github-bug-board-scanner` (`GitHub bug board fixer`)
- Reviewer automation: `github-bug-expert-reviewer`
  (`GitHub bug expert reviewer`)

The board may intentionally start empty. Do not repopulate it from all open repo
issues unless the user asks. Add only confirmed/actionable bugs from logs or
current triage.

## Log Sources

Common local log sources in this workspace:

- Desktop swap failures:
  `/Users/travis/Documents/Swop Desktop Live.nosync/logs/desktop-swap-failures.ndjson`
- Desktop app runtime:
  `/Users/travis/Documents/Swop Desktop Live.nosync/logs/desktop-live.log`
- Main backend runtime:
  `/Users/travis/Documents/Swop Desktop Live.nosync/logs/swop-api-stack-live.log`
- Polymarket backend runtime:
  `/Users/travis/Documents/Swop Desktop Live.nosync/logs/polymarket-live.log`

Never paste secrets, access tokens, private keys, full auth headers, raw cookies,
or unredacted private user data into GitHub. Prefer short sanitized excerpts
that include provider, stage, reason, route/pair, status code, and enough context
to reproduce the bug.

## Add A Bug From Logs

1. Confirm it is a real product bug, not a smoke test, local-only setup issue, or
   duplicate of an existing board item.
2. Create or update a GitHub issue in the affected repo. For desktop issues, use
   `Travisswop/desktop-app`.
3. Apply labels:
   - `bug`
   - `codex` when it is suitable for automated or agent-assisted fixing
4. Include a compact issue body:
   - Summary
   - Affected surface/module
   - Log source and sanitized excerpt
   - Observed behavior
   - Expected behavior
   - Reproduction or verification notes
   - Acceptance criteria
5. Add the issue to Project `1`.
6. Set the Project `Status` field to the most specific product-area section.
   Move it later to `In progress`, `In review`, or `Done` as work proceeds.
7. Set `Priority` when severity is known:
   - `P0`: live breakage, funds/trading/auth/payment risk, or broad outage
   - `P1`: user-visible broken workflow with a workaround or limited scope
   - `P2`: correctness/polish/edge-case bug
8. Set `Size` when the fix scope is clear.

Useful `gh` commands:

```bash
gh issue create \
  --repo Travisswop/desktop-app \
  --title "Bug: short user-facing failure summary" \
  --label bug \
  --label codex \
  --body-file /tmp/bug.md

gh project item-add 1 \
  --owner Travisswop \
  --url https://github.com/Travisswop/desktop-app/issues/<number> \
  --format json

gh project field-list 1 --owner Travisswop --format json
```

Use `gh project field-list` to resolve current field and option ids before
calling `gh project item-edit`; do not hard-code ids in scripts unless the
script refreshes them first.

## Current Product-Area Sections

The board's `Status` field currently includes these product-area sections:

- `1. Login/Onboard Module`
- `2. Feed Module`
- `3. Dashboard Module`
- `4. Builder Module`
- `5. Wallet Module`
- `6. Smartsite Public View`
- `7. Sidebar/Menu Options`
- `8. Metro Module`
- `9. Perps Module`
- `10. Swapping Module`
- `11. Predictions Module`
- `12. Checkout/Payments Module`
- `13. Chat/Astro Module`
- `14. Rewards Module`
- `15. Notifications Module`

It also includes workflow/queue statuses such as `Backend Queue`,
`Frontend Queue`, `Next To Do`, `In progress`, `In review`, and `Done`.
For a newly logged bug, prefer the product-area section first so the board stays
easy to scan by surface.

## Swap Failure Example

For wallet swap failures reported through `/api/wallet/swap-failure`, create a
bug issue when the failure is actionable or repeated. Include:

- Provider: Jupiter or Li.Fi
- Stage: for example `jupiter_simulation`, `lifi_approval_error`,
  `solana_lifi_swap_error`
- Pair and mints, if safe
- Sanitized simulation logs or provider error
- Whether the UI showed stale balances, unsupported token programs, fee-route
  behavior, or account-setup failures

Then add the issue to Project `1` and set `Status` to `10. Swapping Module`.

## Agent Patch And Review Handoff

Board-driven bug fixes should use a two-stage agent flow:

1. A fixer agent scans Project `1`, selects an actionable bug, prepares the fix
   from current `origin/main` in a clean worktree, runs focused checks, and
   pushes a feature branch or opens a PR.
2. While working, the fixer may set the Project `Status` to `In progress`.
3. When a patch, branch, or PR is ready for review, the fixer must move the
   Project item to `In review`.
4. The fixer should add a PR body or issue comment with:
   - Branch and/or PR link
   - Checks run
   - Product-area review specialty, for example `Swapping`, `Perps`, `Metro`,
     `Predictions`, `Checkout/Payments`, or `Chat/Astro`
   - `Review depth: pending expert-agent review`
5. The reviewer automation scans `In review`, chooses the right specialty from
   the issue body, labels, prior product-area status, touched files, and PR
   diff, then runs a dedicated expert-agent review.
6. The expert reviewer comments on the PR or issue with pass/fail findings. If
   it passes, update the review metadata to:
   `Review depth: expert-agent reviewed (<specialty>)`.
7. If the expert reviewer finds issues, keep or return the item to
   `In progress` and leave exact findings. Do not move the card to `Done` unless
   the patch is merged or the user explicitly asks.

Suggested specialty mapping:

- `10. Swapping Module`: wallet swap, Jupiter, Li.Fi, Solana Token-2022, send
  and token-account specialist
- `9. Perps Module`: Hyperliquid, positions, leverage, liquidation, TPSL, feed
  lifecycle specialist
- `11. Predictions Module`: Polymarket, odds, markets, settlement, sports
  routing specialist
- `8. Metro Module`: maps, local discovery, location, marker, and feed-map
  specialist
- `12. Checkout/Payments Module`: checkout, cart, terminal, Stripe, settlement,
  wallet payment specialist
- `13. Chat/Astro Module`: chat, sockets, Astro action cards, agent proposal
  and approval specialist
- `14. Rewards Module`: copy-trade rewards, referrals, claims, payouts
  specialist
- `15. Notifications Module`: notifications, email alerts, activity feed, socket
  notification specialist

Agent review is useful review depth, but it is not a substitute for required
human/CODEOWNER review on high-risk changes involving funds, auth, production
database writes, private keys, or production deploys. In those cases, record the
expert-agent review and explicitly call out that human review is still missing.

## Cron Scanners

The Codex automation `github-bug-board-scanner` (`GitHub bug board fixer`) runs
every 6 hours against this project. It should scan Project `1` only. If the
board is empty, it should report that there are no board bugs to fix and should
not invent work from unrelated repo issues.

When the scanner finds an actionable bug, it must work from current
`origin/main` in a clean worktree and must not push to `main` without explicit
user approval. After it prepares a patch, it must move the Project item to
`In review` and request expert-agent review instead of marking its own work
reviewed.

The Codex automation `github-bug-expert-reviewer` scans Project `1` for items in
`In review`. It should review only the branch/PR tied to that Project item,
choose the specialty from the product area and touched files, and record the
result as `Review depth: expert-agent reviewed (<specialty>)` when the patch
passes review.
