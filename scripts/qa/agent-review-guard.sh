#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

OUT_DIR="${REVIEW_OUTPUT_DIR:-review-artifacts}"
DETAILS_FILE="$OUT_DIR/agent-review-details.md"
SUMMARY_FILE="$OUT_DIR/agent-review-summary.md"
mkdir -p "$OUT_DIR"
: > "$DETAILS_FILE"

declare -a RESULT_ROWS=()
FAILURES=0

timestamp_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

append_detail_tail() {
  local log_file="$1"

  if [[ ! -s "$log_file" ]]; then
    echo "No output."
    return
  fi

  tail -n "${REVIEW_LOG_TAIL_LINES:-120}" "$log_file"
}

add_result() {
  local label="$1"
  local status="$2"
  local slug="$3"

  RESULT_ROWS+=("| $label | $status | \`$slug.log\` |")
}

run_check() {
  local slug="$1"
  local label="$2"
  shift 2

  local log_file="$OUT_DIR/$slug.log"

  {
    echo "## $label"
    echo
    echo "\`\`\`text"
  } >> "$DETAILS_FILE"

  if "$@" > "$log_file" 2>&1; then
    add_result "$label" "PASS" "$slug"
    append_detail_tail "$log_file" >> "$DETAILS_FILE"
  else
    local exit_code=$?
    FAILURES=$((FAILURES + 1))
    add_result "$label" "FAIL ($exit_code)" "$slug"
    append_detail_tail "$log_file" >> "$DETAILS_FILE"
  fi

  {
    echo "\`\`\`"
    echo
  } >> "$DETAILS_FILE"
}

skip_check() {
  local slug="$1"
  local label="$2"
  local reason="$3"
  local log_file="$OUT_DIR/$slug.log"

  printf "%s\n" "$reason" > "$log_file"
  add_result "$label" "SKIP" "$slug"

  {
    echo "## $label"
    echo
    echo "\`\`\`text"
    cat "$log_file"
    echo "\`\`\`"
    echo
  } >> "$DETAILS_FILE"
}

conflict_marker_scan() {
  local pattern='^(<<<<<<<|>>>>>>>)( .*)?$|^=======$'

  if git grep -n -I -E "$pattern" -- . ':!package-lock.json' ':!review-artifacts/**'; then
    echo
    echo "Conflict markers were found. Resolve them before merging."
    return 1
  fi

  echo "No unresolved merge conflict markers found."
}

secret_pattern_scan() {
  local pattern='(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|sk_live_[0-9A-Za-z]{16,}|xox[baprs]-[0-9A-Za-z-]{10,48}|gh[pousr]_[A-Za-z0-9_]{36,}|-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----)'

  if git grep -n -I -E "$pattern" -- . ':!package-lock.json' ':!scripts/qa/agent-review-guard.sh' ':!review-artifacts/**'; then
    echo
    echo "High-signal secret patterns were found. Remove the secret or document a false positive."
    return 1
  fi

  echo "No high-signal secret patterns found."
}

next_route_smoke() {
  local port="${SWOP_REVIEW_SMOKE_PORT:-3310}"
  local host="${SWOP_REVIEW_SMOKE_HOST:-127.0.0.1}"
  local url="http://$host:$port/login"
  local server_log="$OUT_DIR/next-smoke-server.log"
  local server_pid=""

  PORT="$port" HOSTNAME="$host" npm run start > "$server_log" 2>&1 &
  server_pid=$!

  for _ in {1..45}; do
    if curl -fsS -I "$url" >/dev/null 2>&1; then
      echo "$url responded successfully."
      kill "$server_pid" >/dev/null 2>&1 || true
      wait "$server_pid" >/dev/null 2>&1 || true
      return 0
    fi

    if ! kill -0 "$server_pid" >/dev/null 2>&1; then
      echo "Next server exited before $url responded."
      echo
      cat "$server_log"
      return 1
    fi

    sleep 1
  done

  echo "Timed out waiting for $url."
  echo
  cat "$server_log"
  kill "$server_pid" >/dev/null 2>&1 || true
  wait "$server_pid" >/dev/null 2>&1 || true
  return 1
}

security_audit() {
  local audit_json="$OUT_DIR/npm-audit.json"
  local baseline_json="$ROOT_DIR/scripts/qa/npm-audit-baseline.json"
  local audit_status=0

  npm audit --omit=dev --audit-level=high --json > "$audit_json"
  audit_status=$?

  node - "$audit_json" "$baseline_json" "$audit_status" <<'NODE'
const fs = require('fs');

const [auditPath, baselinePath, auditStatusValue] = process.argv.slice(2);
const auditStatus = Number(auditStatusValue || 0);

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const counts = audit.metadata?.vulnerabilities || {};
const max = baseline.maxVulnerabilities || {};
const gatedSeverities = baseline.gatedSeverities || ['critical', 'high'];

console.log(`npm audit exit code: ${auditStatus}`);
console.log(`low=${counts.low || 0} moderate=${counts.moderate || 0} high=${counts.high || 0} critical=${counts.critical || 0} total=${counts.total || 0}`);

const failures = [];
for (const severity of gatedSeverities) {
  const current = Number(counts[severity] || 0);
  const allowed = Number(max[severity] || 0);

  if (current > allowed) {
    failures.push(`${severity}: ${current} > ${allowed}`);
  }
}

if (failures.length > 0) {
  console.error(`Security audit exceeds baseline: ${failures.join(', ')}`);
  process.exit(1);
}

if (gatedSeverities.some((severity) => Number(counts[severity] || 0) > 0)) {
  console.warn('Security audit is within the current baseline. Lower scripts/qa/npm-audit-baseline.json as dependency fixes land.');
}
NODE
}

run_check "conflict-marker-scan" "Conflict Marker Scan" conflict_marker_scan
run_check "secret-pattern-scan" "Secret Pattern Scan" secret_pattern_scan
run_check "next-typegen" "Next Typegen" npx next typegen
run_check "typescript" "TypeScript" npx tsc --noEmit --pretty false --skipLibCheck
run_check "unit-tests" "Unit Tests" npm test -- --runInBand
run_check "production-build" "Production Build" npm run build
run_check "next-route-smoke" "Next Route Smoke" next_route_smoke
run_check "npm-audit" "Security Audit" security_audit

if [[ "${RUN_ASTRO_CARD_SMOKE:-0}" == "1" ]]; then
  run_check "astro-card-smoke" "Astro Card Smoke" npm run qa:astro-cards -- --launch --json
else
  skip_check "astro-card-smoke" "Astro Card Smoke" "Skipped by default. Set RUN_ASTRO_CARD_SMOKE=1 on the logged-in QA machine to include the existing Astro card smoke harness."
fi

{
  echo "# Agent Review Guard"
  echo
  echo "- Time: $(timestamp_utc)"
  echo "- Commit: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "- Branch/ref: ${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}"
  echo "- Event: ${GITHUB_EVENT_NAME:-local}"
  echo
  echo "## Results"
  echo
  echo "| Check | Result | Log |"
  echo "| --- | --- | --- |"
  printf "%s\n" "${RESULT_ROWS[@]}"
  echo
  cat "$DETAILS_FILE"
} > "$SUMMARY_FILE"

if (( FAILURES > 0 )); then
  echo "Agent review guard failed with $FAILURES failing check(s)."
  echo "Summary: $SUMMARY_FILE"
  exit 1
fi

echo "Agent review guard passed."
echo "Summary: $SUMMARY_FILE"
