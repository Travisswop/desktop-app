# Log-Derived Bug Kanban

This repo uses local desktop logs as an early warning system for bugs that users
hit in production-like flows. When a real user action fails, the app writes a
sanitized JSONL event, and a Codex automation turns new actionable events into
GitHub issues/cards on Travisswop Project 1.

Board: https://github.com/users/Travisswop/projects/1

## Log Sources

### Swap failures

- Route: `app/api/wallet/swap-failure/route.ts`
- Log file: `logs/desktop-swap-failures.ndjson`
- Event type: `wallet_swap_failure`
- Automation: `swap-log-kanban-reporter`
- Project status: `10. Swapping Module`
- Fingerprint marker: `swap-failure-fingerprint: <hash>`

Swap events should include provider, stage, token pair, sanitized reason/log
excerpt, and route/program details when available.

### Feed card health

- Route: `app/api/feed/card-health/route.ts`
- Log file: `logs/desktop-feed-card-health.ndjson`
- Event type: `feed_card_health_issue`
- Automation: `feed-log-kanban-reporter`
- Current producer: perps feed lifecycle monitoring
- Fingerprint marker: `feed-health-fingerprint: <hash>`

Feed health events should include the surface, card type, issue type, source of
truth, observed card state, expected state, and acceptance criteria. The route
sanitizes nested payloads before writing the event.

Current perps checks:

- Wallet and Feed publish active Hyperliquid position keys plus recent terminal
  fills into a client source-of-truth snapshot.
- Perps feed cards compare rendered `OPEN` state against that snapshot.
- If a card remains `OPEN` after the source no longer has the position, the app
  logs a high-severity `perps_stale_open_*` event.
- Terminal fill evidence records likely close reason such as `take_profit`,
  `stop_loss`, `liquidation`, or `closed`.
- Reconcile API failures from Wallet or Feed log `perps_feed_reconcile_failed`.

## Kanban Card Content

The reporter automation should create or update a GitHub issue with:

- Summary of the user-visible failure.
- Affected surface and card type.
- Sanitized source-of-truth evidence.
- Sanitized observed card state.
- Expected state and acceptance criteria.
- Stable fingerprint marker for dedupe.

For feed events, route the Project status by surface:

- `perps` -> `9. Perps Module`
- `swap` -> `10. Swapping Module`
- `prediction` -> `11. Predictions Module`
- `metro` -> `8. Metro Module`
- fallback/feed-wide bugs -> `Frontend Queue` or the closest product-area
  section available on the board.

Priority defaults to P1 for user-visible stale/trading card state, P0 only when
there is broad outage, funds risk, or incorrect execution risk. Size defaults
to S unless the issue requires backend contract changes or cross-surface work.

## Fix And Review Loop

1. Reporter automation adds/updates the issue and Project card.
2. `github-bug-board-scanner` picks actionable bug cards, fixes one from a
   clean `origin/main` worktree, opens/pushes a branch or PR, and moves the card
   to `In review`.
3. `github-bug-expert-reviewer` reviews cards in `In review` with the matching
   product specialty and comments with `Review depth: expert-agent reviewed
   (<specialty>)`.
4. A human still approves production/main pushes for high-risk surfaces such as
   wallet, trading, checkout, auth, and payment.

## Safety

Never put secrets, auth headers, cookies, private keys, access tokens, refresh
tokens, id tokens, passwords, API keys, mnemonics, seed phrases, or unredacted
private user data into GitHub issues or comments. Log routes sanitize common
secret fields, and reporter automations must still sanitize excerpts before
posting to GitHub.
