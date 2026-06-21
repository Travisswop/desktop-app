# Agent Review Guard

The GitHub Actions workflow at `.github/workflows/agent-review-guard.yml` runs
on pull requests, pushes to `main` / `Codex`, manual dispatch, and a daily cron.
It calls:

```bash
npm run review:guard
```

The guard checks for private-token patterns, unresolved merge markers,
Next generated-type drift, TypeScript errors, Jest failures, production build
failures, and a basic `/login` route smoke failure. It also runs
`npm audit --omit=dev` and fails if high-or-critical production dependency
findings exceed
`scripts/qa/npm-audit-baseline.json`; lower that baseline as dependency fixes
land. It writes logs and `agent-review-summary.md` under `review-artifacts/`;
GitHub Actions uploads those files even when the guard fails.

The logged-in Astro card smoke harness still lives in `scripts/qa/` and is best
run from the local QA machine because it depends on a persisted browser profile.
To include it in the guard on that machine:

```bash
RUN_ASTRO_CARD_SMOKE=1 npm run review:guard
```
