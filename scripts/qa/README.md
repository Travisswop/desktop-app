# Astro Card Smoke QA

Daily smoke coverage for the Swop Astro chat cards.

## Branch Guarantee

The scheduled runner always tests `origin/main`.

`run-astro-card-smoke.sh` fetches `origin main`, creates or updates a dedicated
detached worktree at:

```text
/Users/travis/Documents/Swop Desktop Live.nosync/.qa-worktrees/desktop-main-card-qa
```

Then it runs the QA harness from that worktree. Each JSON report records:

- `gitRef`
- `gitSha`

The default browser target is production:

```text
https://www.swopme.app/dashboard/chat
```

That means the daily task is aimed at the live `main` surface, not a dirty local
feature branch.

## Auth Host Rule

Do not use raw `*.vercel.app` preview URLs for authenticated Astro/Goldman QA by
default. Privy login on those hosts can be blocked by allowed-origin /
`frame-ancestors` policy before `/dashboard/chat` renders, which turns card QA
into a preview-auth failure instead of a real surface check.

Use one of these allowed auth surfaces for signed-in runtime proof instead:

- `https://www.swopme.app/dashboard/chat` for production/main QA
- `http://localhost:<clean-branch-port>/dashboard/chat` for branch-specific QA
  from a clean local task worktree

If you intentionally need to confirm the preview-host auth blocker itself, opt
in explicitly:

```bash
SWOP_QA_ALLOW_PREVIEW_HOST=true \
SWOP_QA_URL="https://your-preview.vercel.app/dashboard/chat" \
npm run qa:astro-cards -- --launch --json
```

Without that override, the smoke harness now fails fast with a `preview-auth-host`
error and points the run back to an allowed host.

## What It Tests

The harness opens Swop chat in a dedicated Chrome profile, then generates and
click-tests:

- portfolio allocation
- receive QR copy
- Coinbase funding card destination selection
- marketplace item cards and `Open` tab behavior
- PnL overview
- chart range controls
- sports research cards
- wallet-send network picker and review card
- perps order card controls
- prediction outcome draft ticket
- swap card controls, stale Server Action errors, quote health, and Jupiter
  quote/order API reachability

It deliberately does not click final financial/signing actions:

- `Sign & approve`
- `Confirm send`
- `Close position`
- `Deposit to Hyperliquid`
- `Buy USDC in Swop`
- `Place order`

Those actions require manual confirmation or a staging/testnet wallet.

## Card Command Contracts

Every run writes a `cardContracts` catalog into `latest.json`, and each step
copies its matching contract into `steps[].contract`. Failure emails include the
failing step's contract so a recommendation or Kanban card has acceptance
criteria without digging through logs.

| Step | Command | Card type | Must prove | Safe interaction | Never clicks |
| --- | --- | --- | --- | --- | --- |
| `page-auth` | open `/dashboard/chat` | authenticated chat shell | `Messages`, `Astro`, configured QA thread | select QA thread | n/a |
| `portfolio-card` | `show my portfolio` | portfolio allocation | `Portfolio allocation` card renders with wallet context | render only | n/a |
| `receive-qr-card` | `show my receive QR for Solana` | receive QR | `RECEIVE QR`, `ADDRESS` | `Copy address` | n/a |
| `funding-onramp-card` | `fund my wallet with 35 dollars` | Coinbase funding onramp | `Buy USDC in Swop`, `Coinbase` | select `Solana USDC` | `Buy USDC in Swop` |
| `marketplace-card` | `show marketplace products` | marketplace products | product result or empty-state text | open and close product tab | checkout/buy |
| `pnl-card` | `show my pnl` | PnL overview | `PNL SNAPSHOT` | render only | n/a |
| `chart-card` | `/chart ETH 1D` | market chart | `ETH-PERP`, ranges | click `1W` | n/a |
| `sports-research-card` | `/search Lakers injuries today` | sports research | `NBA injury report`, `ESPN`, `Lakers` | render only | n/a |
| `wallet-send-card` | `send 1 USDC to travis.swop.id` | wallet send proposal | network picker then `Confirm send` review | select `S SOLANA` | `Confirm send` |
| `perps-order-card` | `long some oil with 5x` | perps order proposal | oil routes to `BRENTOIL`/perps ticket | `Short`, `Limit`, `TP/SL`, `20x`, `$500` | `Place order` |
| `prediction-market-card` | `what hockey games are tonight and the odds?` | prediction odds | hockey odds and draft ticket | click one outcome | buy/sell/place order |
| `swap-card` | `swap 1 SWOP to USDC` | wallet swap quote | SWOP/USDC card, live quote, Jupiter route health | `25%` when available | `Sign & approve` |

## One-Time Login

Open the dedicated QA Chrome profile and log in to Swop once:

```bash
npm run qa:astro-cards:login
```

After login, close nothing if you want to verify immediately, or just run:

```bash
npm run qa:astro-cards -- --launch
```

For a branch-specific local task worktree, point the harness at the clean
localhost port for that worktree instead of a shared dirty server:

```bash
SWOP_QA_LOCAL_PORT=3001 \
npm run qa:astro-cards -- --launch
```

Or pass the port directly:

```bash
npm run qa:astro-cards -- --launch --local-port=3001
```

Invalid `SWOP_QA_LOCAL_PORT` / `--local-port` values now fail fast instead of
silently falling back to the default host. Local-port runs also reuse only a
matching `localhost:<port>/dashboard/chat` tab, so an authenticated
`www.swopme.app` tab or another localhost port does not masquerade as branch
coverage.

The profile is stored at:

```text
~/.swop-card-qa-chrome
```

## Daily Launchd Task

Install the LaunchAgent:

```bash
mkdir -p ~/Library/LaunchAgents
cp scripts/qa/launchd/com.swop.astro-card-smoke.plist ~/Library/LaunchAgents/
launchctl load -w ~/Library/LaunchAgents/com.swop.astro-card-smoke.plist
```

Run it immediately:

```bash
launchctl start com.swop.astro-card-smoke
```

Logs and JSON reports are written to:

```text
/Users/travis/Documents/Swop Desktop Live.nosync/logs/astro-card-qa
```

## Failure Email Alerts

Set `SWOP_QA_ALERT_EMAIL` for failure-only email alerts:

```bash
SWOP_QA_ALERT_EMAIL="you@example.com" npm run qa:astro-cards -- --launch
```

For launchd, add an `EnvironmentVariables` block to the installed plist:

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>SWOP_QA_ALERT_EMAIL</key>
  <string>you@example.com</string>
</dict>
```

The harness sends email only when the QA run fails. The email includes the
target URL, `gitRef`, `gitSha`, report path, failing step, error text, and the
failing card/command contract: command, card type, expected markers, safe
interactions, forbidden actions, route/API checks, failure signals, and pass
criteria.

This uses the local macOS `mail` command (`/usr/bin/mail` or `/bin/mail`), so
outbound mail must be configured on the machine. If `mail` is unavailable or
misconfigured, the JSON report records the alert failure.

## Swap Card Regression Lane

The `swap-card` step is specifically meant to catch bugs where Astro creates a
card but the rendered swap flow is not usable. It fails the run if the latest
SWOP -> USDC card shows:

- `Server Action "... " was not found`
- `failed-to-find-server-action`
- `Quote unavailable`
- `Get a live quote before confirming this swap`

It also probes the live app origin directly:

- `GET /api/jupiter/quote`
- `POST /api/jupiter/order` when a QA taker wallet is available

The order probe only builds a Jupiter order. It never signs, submits, or
executes a swap.

For strict order-build coverage, configure the dedicated QA account with a tiny
SWOP balance and set:

```bash
SWOP_QA_SWAP_TAKER="<qa-solana-wallet>" \
SWOP_QA_SWAP_ORDER_REQUIRED=true \
npm run qa:astro-cards -- --launch
```

Without `SWOP_QA_SWAP_TAKER`, the lane still catches rendered card failures and
quote-route failures, and it will attempt to detect a Solana wallet from the
logged-in QA profile for a best-effort order probe.

## Existing Browser Option

If you already have Chrome running with remote debugging enabled, point the
harness at it:

```bash
npm run qa:astro-cards -- --chrome-url=http://127.0.0.1:9222
```

Normal Chrome windows do not expose automation by default. For unattended daily
QA, the dedicated `--launch` profile is more reliable.

## Real Trade Testing

Use staging/testnet or a manually supervised run for actual open/close
prediction or perps trades. An unattended cron job should not spend funds,
open positions, close positions, or sign wallet transactions.
