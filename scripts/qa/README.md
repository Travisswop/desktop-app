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
- swap card controls

It deliberately does not click final financial/signing actions:

- `Sign & approve`
- `Confirm send`
- `Close position`
- `Deposit to Hyperliquid`
- `Buy USDC in Swop`
- `Place order`

Those actions require manual confirmation or a staging/testnet wallet.

## One-Time Login

Open the dedicated QA Chrome profile and log in to Swop once:

```bash
npm run qa:astro-cards:login
```

After login, close nothing if you want to verify immediately, or just run:

```bash
npm run qa:astro-cards -- --launch
```

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
target URL, `gitRef`, `gitSha`, report path, failing step, and error text.

This uses the local macOS `mail` command (`/usr/bin/mail` or `/bin/mail`), so
outbound mail must be configured on the machine. If `mail` is unavailable or
misconfigured, the JSON report records the alert failure.

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
