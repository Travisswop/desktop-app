#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_SWOP_URL = 'https://www.swopme.app/dashboard/chat';
const DEFAULT_CHROME_PORT = 9223;
const DEFAULT_CHROME_PROFILE = path.join(os.homedir(), '.swop-card-qa-chrome');
const DEFAULT_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEFAULT_ALERT_SUBJECT_PREFIX = '[Swop QA]';

const FINAL_ACTION_PATTERNS = [
  /sign\s*&\s*approve/i,
  /confirm send/i,
  /close position/i,
  /deposit to hyperliquid/i,
  /buy usdc in swop/i,
  /place order/i,
  /approve strategy/i,
];

function parseArgs(argv) {
  const args = {
    launch: false,
    setupLogin: false,
    url: process.env.SWOP_QA_URL || DEFAULT_SWOP_URL,
    chromeUrl: process.env.SWOP_QA_CHROME_URL || '',
    chromePath: process.env.CHROME_PATH || DEFAULT_CHROME_PATH,
    chromePort: Number(process.env.SWOP_QA_CHROME_PORT || DEFAULT_CHROME_PORT),
    profileDir: process.env.SWOP_QA_CHROME_PROFILE || DEFAULT_CHROME_PROFILE,
    logDir:
      process.env.SWOP_QA_LOG_DIR ||
      path.resolve(process.cwd(), '..', '..', 'logs', 'astro-card-qa'),
    timeoutMs: Number(process.env.SWOP_QA_TIMEOUT_MS || 120000),
    threadText: process.env.SWOP_QA_THREAD || 'Trading Cabal',
    alertEmail: process.env.SWOP_QA_ALERT_EMAIL || '',
    alertSubjectPrefix:
      process.env.SWOP_QA_ALERT_SUBJECT_PREFIX || DEFAULT_ALERT_SUBJECT_PREFIX,
    json: false,
  };

  for (const arg of argv) {
    if (arg === '--launch') args.launch = true;
    else if (arg === '--setup-login') args.setupLogin = true;
    else if (arg === '--json') args.json = true;
    else if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length);
    else if (arg.startsWith('--chrome-url=')) args.chromeUrl = arg.slice('--chrome-url='.length);
    else if (arg.startsWith('--chrome-port=')) args.chromePort = Number(arg.slice('--chrome-port='.length));
    else if (arg.startsWith('--profile=')) args.profileDir = arg.slice('--profile='.length);
    else if (arg.startsWith('--thread=')) args.threadText = arg.slice('--thread='.length);
    else if (arg.startsWith('--log-dir=')) args.logDir = arg.slice('--log-dir='.length);
    else if (arg.startsWith('--alert-email=')) args.alertEmail = arg.slice('--alert-email='.length);
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!args.chromeUrl) args.chromeUrl = `http://127.0.0.1:${args.chromePort}`;
  return args;
}

function printHelp() {
  console.log(`Astro card smoke QA

Usage:
  node scripts/qa/astro-card-smoke.mjs --launch
  node scripts/qa/astro-card-smoke.mjs --setup-login --launch
  node scripts/qa/astro-card-smoke.mjs --chrome-url=http://127.0.0.1:9222
  node scripts/qa/astro-card-smoke.mjs --launch --alert-email=you@example.com

Modes:
  --setup-login  Opens the QA Chrome profile to Swop and exits so you can log in once.
  --launch       Starts a dedicated Chrome profile with remote debugging if needed.

Alerts:
  Set SWOP_QA_ALERT_EMAIL or pass --alert-email to email a failure report.

Safety:
  This script never clicks final financial/signing actions. It tests card render,
  non-final controls, draft tickets, and tab-opening buttons only.
`);
}

function timestamp() {
  return new Date().toISOString();
}

function createStep(name) {
  return {
    name,
    status: 'pending',
    startedAt: timestamp(),
    finishedAt: null,
    detail: '',
  };
}

function finishStep(step, status, detail = '') {
  step.status = status;
  step.detail = detail;
  step.finishedAt = timestamp();
  return step;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function waitForChrome(baseUrl, timeoutMs = 20000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      return await fetchJson(`${baseUrl}/json/version`);
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  throw new Error(`Chrome DevTools did not become available: ${lastError?.message || 'timeout'}`);
}

function launchChrome(args) {
  if (!existsSync(args.chromePath)) {
    throw new Error(`Chrome not found at ${args.chromePath}. Set CHROME_PATH if needed.`);
  }
  mkdirSync(args.profileDir, { recursive: true });

  const chromeArgs = [
    `--remote-debugging-port=${args.chromePort}`,
    `--user-data-dir=${args.profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--new-window',
    args.url,
  ];

  const child = spawn(args.chromePath, chromeArgs, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return child.pid;
}

async function listTargets(baseUrl) {
  return fetchJson(`${baseUrl}/json/list`);
}

async function openTarget(baseUrl, url) {
  const endpoint = `${baseUrl}/json/new?${encodeURIComponent(url)}`;
  try {
    return await fetchJson(endpoint, { method: 'PUT' });
  } catch {
    return fetchJson(endpoint);
  }
}

async function closeTarget(baseUrl, targetId) {
  try {
    await fetch(`${baseUrl}/json/close/${encodeURIComponent(targetId)}`);
  } catch {
    // Best-effort cleanup only.
  }
}

async function getOrOpenSwopTarget(baseUrl, swopUrl) {
  const targets = await listTargets(baseUrl);
  const existing = targets.find(
    (target) =>
      target.type === 'page' &&
      target.webSocketDebuggerUrl &&
      String(target.url || '').includes('/dashboard/chat')
  );
  if (existing) return existing;

  const opened = await openTarget(baseUrl, swopUrl);
  if (opened.webSocketDebuggerUrl) return opened;

  const updated = await listTargets(baseUrl);
  const target = updated.find(
    (candidate) =>
      candidate.type === 'page' &&
      candidate.webSocketDebuggerUrl &&
      String(candidate.url || '').includes('/dashboard/chat')
  );
  if (!target) throw new Error('Could not open a Swop chat tab through Chrome DevTools.');
  return target;
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.eventHandlers = new Map();
  }

  async connect() {
    if (typeof WebSocket !== 'function') {
      throw new Error('This Node runtime does not expose WebSocket. Use Node 20+.');
    }

    this.ws = new WebSocket(this.wsUrl);
    this.ws.onmessage = (event) => {
      const data = typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString('utf8');
      const message = JSON.parse(data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
        else resolve(message.result || {});
        return;
      }
      if (message.method) {
        const handlers = this.eventHandlers.get(message.method) || [];
        handlers.forEach((handler) => handler(message.params || {}));
      }
    };

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out connecting to Chrome target.')), 10000);
      this.ws.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      this.ws.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Chrome target WebSocket connection failed.'));
      };
    });
  }

  on(method, handler) {
    const handlers = this.eventHandlers.get(method) || [];
    handlers.push(handler);
    this.eventHandlers.set(method, handlers);
  }

  send(method, params = {}, timeoutMs = 30000) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`${method} timed out.`));
        }
      }, timeoutMs);
    });
  }

  async close() {
    if (this.ws) this.ws.close();
  }
}

async function evaluate(client, fn, arg = undefined) {
  const expression = `(${fn})(${JSON.stringify(arg)})`;
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Page evaluation failed.');
  }
  return result.result?.value;
}

async function pageText(client) {
  return evaluate(client, () => document.body?.innerText || '');
}

async function waitFor(client, description, predicate, timeoutMs = 30000, intervalMs = 750) {
  const started = Date.now();
  let lastValue = null;
  while (Date.now() - started < timeoutMs) {
    lastValue = await predicate();
    if (lastValue) return lastValue;
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${description}. Last value: ${JSON.stringify(lastValue)}`);
}

async function waitForText(client, description, patterns, timeoutMs = 30000) {
  const regexes = patterns.map((pattern) =>
    pattern instanceof RegExp ? pattern : new RegExp(escapeRegex(pattern), 'i')
  );
  return waitFor(
    client,
    description,
    async () => {
      const text = await pageText(client);
      return regexes.some((regex) => regex.test(text));
    },
    timeoutMs
  );
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function scrollAllToBottom(client) {
  await evaluate(client, () => {
    const scrollables = [document.scrollingElement, ...Array.from(document.querySelectorAll('*'))]
      .filter(Boolean)
      .filter((el) => el.scrollHeight > el.clientHeight + 20);
    scrollables.forEach((el) => {
      el.scrollTop = el.scrollHeight;
    });
  });
}

async function fillComposer(client, text) {
  await evaluate(
    client,
    (value) => {
      const textarea = document.querySelector('textarea[name="chatMessage"]');
      if (!textarea) throw new Error('Chat composer textarea not found.');
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) setter.call(textarea, value);
      else textarea.value = value;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.focus();
      return textarea.value;
    },
    text
  );
}

async function getButtonPoint(client, options) {
  return evaluate(
    client,
    ({ text, exact = false, index = -1, selector = 'button', avoidFinal = true }) => {
      const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const candidates = Array.from(document.querySelectorAll(selector))
        .filter(isVisible)
        .filter((el) => {
          const label = normalize(el.innerText || el.getAttribute('title') || el.getAttribute('aria-label'));
          if (avoidFinal && [
            /sign\s*&\s*approve/i,
            /confirm send/i,
            /close position/i,
            /deposit to hyperliquid/i,
            /buy usdc in swop/i,
            /place order/i,
            /approve strategy/i,
          ].some((pattern) => pattern.test(label))) {
            return false;
          }
          return exact ? label === text : label.toLowerCase().includes(String(text).toLowerCase());
        });
      const el = index < 0 ? candidates[candidates.length + index] : candidates[index];
      if (!el) {
        return {
          found: false,
          labels: Array.from(document.querySelectorAll(selector))
            .filter(isVisible)
            .map((candidate) => normalize(candidate.innerText || candidate.getAttribute('title') || candidate.getAttribute('aria-label')))
            .filter(Boolean)
            .slice(-40),
        };
      }
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = el.getBoundingClientRect();
      return {
        found: true,
        disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
        label: normalize(el.innerText || el.getAttribute('title') || el.getAttribute('aria-label')),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    },
    options
  );
}

async function clickButton(client, text, options = {}) {
  const point = await getButtonPoint(client, { text, ...options });
  if (!point.found) {
    throw new Error(`Button "${text}" not found. Visible labels: ${point.labels?.join(' | ')}`);
  }
  if (point.disabled) {
    throw new Error(`Button "${point.label}" is disabled.`);
  }
  if (!options.allowFinal && FINAL_ACTION_PATTERNS.some((pattern) => pattern.test(point.label))) {
    throw new Error(`Refusing to click final action button "${point.label}".`);
  }
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x,
    y: point.y,
    button: 'none',
  });
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: point.x,
    y: point.y,
    button: 'left',
    clickCount: 1,
  });
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
    button: 'left',
    clickCount: 1,
  });
  await sleep(500);
  return point.label;
}

async function sendPrompt(client, prompt) {
  await scrollAllToBottom(client);
  await fillComposer(client, prompt);
  await clickButton(client, 'SEND', { exact: true, avoidFinal: false });
  await scrollAllToBottom(client);
}

async function assertLoggedIn(client) {
  await waitForText(client, 'authenticated chat shell', [/Messages/i, /Astro/i], 45000);
  const text = await pageText(client);
  if (/sign in|log in|login/i.test(text) && !/Messages/i.test(text)) {
    throw new Error('Swop appears to be on a login screen. Run --setup-login first and sign in.');
  }
}

async function selectThread(client, threadText) {
  if (!threadText) return;
  const clicked = await evaluate(
    client,
    (label) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
        normalize(candidate.innerText || '').includes(label)
      );
      if (!button) return false;
      button.click();
      return true;
    },
    threadText
  );
  if (clicked) await sleep(1000);
}

async function hasConfirmOnlyState(client) {
  return evaluate(client, () => {
    const text = document.body?.innerText || '';
    return {
      confirmSend: /Confirm send/i.test(text),
      signApprove: /Sign\s*&\s*approve/i.test(text),
      depositHyperliquid: /Deposit to Hyperliquid/i.test(text),
      closePosition: /Close position/i.test(text),
      buyUsdc: /Buy USDC in Swop/i.test(text),
    };
  });
}

async function runCardChecks({ client, baseUrl, args, report }) {
  const add = (name) => {
    const step = createStep(name);
    report.steps.push(step);
    return step;
  };

  let step = add('page-auth');
  await assertLoggedIn(client);
  await selectThread(client, args.threadText);
  finishStep(step, 'pass', `Authenticated chat loaded; selected thread containing "${args.threadText}".`);

  step = add('portfolio-card');
  await sendPrompt(client, 'show my portfolio');
  await waitForText(client, 'portfolio allocation card', ['Portfolio allocation'], 30000);
  finishStep(step, 'pass', 'Rendered wallet portfolio allocation card.');

  step = add('receive-qr-card');
  await sendPrompt(client, 'show my receive QR for Solana');
  await waitForText(client, 'receive QR card', ['RECEIVE QR', 'ADDRESS'], 30000);
  await clickButton(client, 'Copy address', { selector: 'button', exact: false, avoidFinal: true });
  const copyText = await pageText(client);
  if (/Could not copy address/i.test(copyText)) throw new Error('Receive QR copy button showed an error.');
  finishStep(step, 'pass', 'Rendered receive QR card and clicked copy address.');

  step = add('funding-onramp-card');
  await sendPrompt(client, 'fund my wallet with 35 dollars');
  await waitForText(client, 'Coinbase funding card', ['Buy USDC in Swop', 'Coinbase'], 45000);
  await clickButton(client, 'Solana USDC', { exact: false, avoidFinal: true });
  finishStep(step, 'pass', 'Rendered funding card and selected Solana USDC destination.');

  step = add('marketplace-card');
  await sendPrompt(client, 'show marketplace products');
  await waitFor(
    client,
    'marketplace result',
    async () => {
      const text = await pageText(client);
      return /Found \d+ marketplace item/i.test(text) || /No marketplace items matched/i.test(text);
    },
    60000
  );
  const marketplaceText = await pageText(client);
  if (/No marketplace items matched/i.test(marketplaceText)) {
    finishStep(step, 'skip', 'Marketplace read routed, but live data returned no item cards.');
  } else {
    const beforeTargets = await listTargets(baseUrl);
    await clickButton(client, 'Open', { exact: true, avoidFinal: true });
    const opened = await waitFor(
      client,
      'marketplace seller tab',
      async () => {
        const afterTargets = await listTargets(baseUrl);
        return afterTargets.find(
          (target) =>
            !beforeTargets.some((before) => before.id === target.id) &&
            /\/sp\//.test(String(target.url || ''))
        );
      },
      10000
    );
    await closeTarget(baseUrl, opened.id);
    finishStep(step, 'pass', `Marketplace Open button launched ${opened.url} and the test tab was closed.`);
  }

  step = add('pnl-card');
  await sendPrompt(client, 'show my pnl');
  await waitForText(client, 'PnL overview card', ['PNL SNAPSHOT'], 30000);
  finishStep(step, 'pass', 'Rendered PnL snapshot and embedded positions.');

  step = add('chart-card');
  await sendPrompt(client, '/chart ETH 1D');
  await waitForText(client, 'ETH chart card', ['ETH-PERP', '1W', '1M', 'ALL'], 30000);
  await clickButton(client, '1W', { exact: true, avoidFinal: true });
  finishStep(step, 'pass', 'Rendered chart card and changed range to 1W.');

  step = add('sports-research-card');
  await sendPrompt(client, '/search Lakers injuries today');
  await waitForText(client, 'sports research card', [/NBA injury report/i, /ESPN/i, /Lakers/i], 90000);
  finishStep(step, 'pass', 'Rendered ESPN-backed Lakers injury research card.');

  step = add('wallet-send-card');
  await sendPrompt(client, 'send 1 USDC to travis.swop.id');
  await waitForText(client, 'wallet send network picker', [/ARBITRUM/i, /SOLANA/i, /BASE/i], 45000);
  await clickButton(client, 'S SOLANA', { exact: false, avoidFinal: true });
  await waitForText(client, 'wallet send review card', ['Confirm send'], 30000);
  finishStep(step, 'pass', 'Wallet send advanced to review card; final Confirm send was not clicked.');

  step = add('perps-order-card');
  await sendPrompt(client, 'long some oil with 5x');
  await waitForText(client, 'perps order card', [/PERPS .*NEW ORDER/i, /BRENTOIL|ETH-PERP|PERP/i], 60000);
  for (const label of ['Short', 'Limit', 'TP/SL', '20x', '$500']) {
    try {
      await clickButton(client, label, { exact: false, avoidFinal: true });
    } catch (error) {
      report.warnings.push(`Perps control "${label}" was not clicked: ${error.message}`);
    }
  }
  const perpsFinalState = await hasConfirmOnlyState(client);
  finishStep(
    step,
    'pass',
    `Perps ticket controls exercised; final action state: ${JSON.stringify(perpsFinalState)}.`
  );

  step = add('prediction-market-card');
  await sendPrompt(client, 'what hockey games are tonight and the odds?');
  await waitForText(client, 'prediction odds card', [/Yes \d|No \d|Over \d|Under \d|moneyline|spread/i], 90000);
  const clickedPrediction = await tryPredictionOutcomeClick(client);
  await waitForText(client, 'prediction draft/ticket after outcome click', [/FRESH PRICE|prediction ticket|POLYMARKET/i], 45000);
  finishStep(step, 'pass', `Clicked a prediction outcome (${clickedPrediction}); final buy/sell action was not clicked.`);

  step = add('swap-card');
  await sendPrompt(client, 'swap 1 SWOP to USDC');
  await waitForText(client, 'swap card', [/swap quote|Sign\s*&\s*approve|SWOP|USDC/i], 60000);
  try {
    await clickButton(client, '25%', { exact: true, avoidFinal: true });
  } catch (error) {
    report.warnings.push(`Swap 25% control was not clicked: ${error.message}`);
  }
  finishStep(step, 'pass', 'Rendered swap card and exercised a safe control when available.');
}

async function tryPredictionOutcomeClick(client) {
  const labels = ['Yes', 'No', 'Over', 'Under'];
  for (const label of labels) {
    try {
      return await clickButton(client, label, { exact: false, avoidFinal: true });
    } catch {
      // Try next outcome label.
    }
  }
  throw new Error('No clickable prediction outcome button was found.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = {
    name: 'astro-card-smoke',
    startedAt: timestamp(),
    finishedAt: null,
    url: args.url,
    chromeUrl: args.chromeUrl,
    profileDir: args.profileDir,
    gitRef: process.env.SWOP_QA_GIT_REF || null,
    gitSha: process.env.SWOP_QA_GIT_SHA || null,
    steps: [],
    warnings: [],
    alert: {
      configured: Boolean(args.alertEmail),
      sent: false,
      error: null,
    },
    console: {
      errors: [],
      exceptions: [],
    },
    status: 'running',
  };

  mkdirSync(args.logDir, { recursive: true });

  if (args.launch || args.setupLogin) {
    try {
      await waitForChrome(args.chromeUrl, 1200);
    } catch {
      const pid = launchChrome(args);
      report.warnings.push(`Launched Chrome QA profile with pid ${pid}.`);
    }
  }

  await waitForChrome(args.chromeUrl, 30000);

  if (args.setupLogin) {
    report.status = 'setup-login';
    report.finishedAt = timestamp();
    writeReport(args, report);
    console.log(`Chrome QA profile is open at ${args.url}. Log in once, then run npm run qa:astro-cards -- --launch.`);
    return;
  }

  const target = await getOrOpenSwopTarget(args.chromeUrl, args.url);
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();

  client.on('Log.entryAdded', (params) => {
    if (params.entry?.level === 'error') report.console.errors.push(params.entry);
  });
  client.on('Runtime.exceptionThrown', (params) => {
    report.console.exceptions.push(params.exceptionDetails);
  });

  try {
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('DOM.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send('Page.bringToFront');

    const currentUrl = target.url || '';
    if (!currentUrl.includes('/dashboard/chat')) {
      await client.send('Page.navigate', { url: args.url });
      await sleep(3000);
    }

    await waitForText(client, 'Swop page content', ['Swop', 'Messages'], args.timeoutMs);
    await runCardChecks({ client, baseUrl: args.chromeUrl, args, report });
    report.status = report.steps.some((step) => step.status === 'fail') ? 'fail' : 'pass';
  } catch (error) {
    report.status = 'fail';
    report.error = error.stack || error.message;
    const activeStep = report.steps.find((step) => step.status === 'pending');
    if (activeStep) finishStep(activeStep, 'fail', error.message);
    process.exitCode = 1;
  } finally {
    report.finishedAt = timestamp();
    const written = writeReport(args, report);
    if (report.status === 'fail' && args.alertEmail) {
      try {
        report.alert = await sendFailureEmail(args, report, written.reportPath);
        writeReport(args, report);
      } catch (alertError) {
        report.alert = {
          configured: true,
          sent: false,
          error: alertError instanceof Error ? alertError.message : String(alertError),
        };
        report.warnings.push(`Failure email was not sent: ${report.alert.error}`);
        writeReport(args, report);
      }
    }
    await client.close();
  }

  const summary = {
    status: report.status,
    passed: report.steps.filter((step) => step.status === 'pass').length,
    skipped: report.steps.filter((step) => step.status === 'skip').length,
    failed: report.steps.filter((step) => step.status === 'fail').length,
    warnings: report.warnings.length,
    logDir: args.logDir,
  };
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(
      `Astro card smoke ${summary.status}: ${summary.passed} passed, ${summary.skipped} skipped, ${summary.failed} failed. Log dir: ${args.logDir}`
    );
  }
}

function writeReport(args, report) {
  const fileName = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const reportPath = report.reportPath || path.join(args.logDir, fileName);
  report.reportPath = reportPath;
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const latestPath = path.join(args.logDir, 'latest.json');
  writeFileSync(latestPath, JSON.stringify(report, null, 2));
  return { reportPath, latestPath };
}

async function sendFailureEmail(args, report, reportPath) {
  const mailPath = ['/usr/bin/mail', '/bin/mail'].find((candidate) =>
    existsSync(candidate)
  );
  if (!mailPath) {
    return {
      configured: true,
      sent: false,
      error: 'mail command not found; configure local mail or another alert transport.',
    };
  }

  const failedSteps = report.steps.filter((step) => step.status === 'fail');
  const lastStep = failedSteps[0] || report.steps.find((step) => step.status === 'pending');
  const shortSha = report.gitSha ? report.gitSha.slice(0, 12) : 'unknown-sha';
  const subject = `${args.alertSubjectPrefix} Astro card smoke failed ${shortSha}`;
  const body = [
    'Astro card smoke QA failed.',
    '',
    `Status: ${report.status}`,
    `Target: ${report.url}`,
    `Git ref: ${report.gitRef || 'unknown'}`,
    `Git sha: ${report.gitSha || 'unknown'}`,
    `Started: ${report.startedAt}`,
    `Finished: ${report.finishedAt}`,
    `Report: ${reportPath}`,
    '',
    lastStep
      ? `Failing step: ${lastStep.name} (${lastStep.status})\n${lastStep.detail || ''}`
      : 'Failing step: unknown',
    '',
    report.error ? `Error:\n${report.error}` : '',
    '',
    report.warnings.length ? `Warnings:\n- ${report.warnings.join('\n- ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  await new Promise((resolve, reject) => {
    const child = spawn(mailPath, ['-s', subject, args.alertEmail], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mail exited ${code}: ${stderr.trim()}`));
    });
    child.stdin.end(body);
  });

  return {
    configured: true,
    sent: true,
    error: null,
  };
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
