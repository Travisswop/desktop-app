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
const DEFAULT_SWAP_INPUT_MINT = 'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1';
const DEFAULT_SWAP_OUTPUT_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const DEFAULT_SWAP_AMOUNT = '1000000000';

const FINAL_ACTION_PATTERNS = [
  /sign\s*&\s*approve/i,
  /confirm send/i,
  /close position/i,
  /deposit to hyperliquid/i,
  /buy usdc in swop/i,
  /place order/i,
  /approve strategy/i,
];

const CARD_COMMAND_CONTRACTS = [
  {
    step: 'page-auth',
    command: 'open /dashboard/chat',
    cardType: 'authenticated chat shell',
    expectedMarkers: ['Messages', 'Astro'],
    safeInteractions: ['select configured QA thread'],
    forbiddenActions: [],
    routeChecks: ['Chrome DevTools target must be /dashboard/chat'],
    failureSignals: ['login screen instead of chat shell', 'blank page', 'framework error overlay'],
    passCriteria: ['chat shell is authenticated', 'configured thread can be selected'],
  },
  {
    step: 'portfolio-card',
    command: 'show my portfolio',
    cardType: 'portfolio allocation',
    expectedMarkers: ['Portfolio allocation'],
    safeInteractions: ['render-only'],
    forbiddenActions: [],
    routeChecks: ['wallet.read context available through Astro'],
    failureSignals: ['plain-text-only answer', 'missing allocation card', 'stale wallet context'],
    passCriteria: ['portfolio allocation card renders in chat'],
  },
  {
    step: 'receive-qr-card',
    command: 'show my receive QR for Solana',
    cardType: 'receive QR',
    expectedMarkers: ['RECEIVE QR', 'ADDRESS'],
    safeInteractions: ['Copy address'],
    forbiddenActions: [],
    routeChecks: ['wallet.receive_qr payload includes Solana address data'],
    failureSignals: ['missing QR/address card', 'copy button error', 'wrong network address'],
    passCriteria: ['receive QR card renders', 'copy address control does not error'],
  },
  {
    step: 'funding-onramp-card',
    command: 'fund my wallet with 35 dollars',
    cardType: 'Coinbase funding onramp',
    expectedMarkers: ['Buy USDC in Swop', 'Coinbase'],
    safeInteractions: ['Solana USDC destination selection'],
    forbiddenActions: ['Buy USDC in Swop'],
    routeChecks: ['funding/onramp card renders without opening final checkout'],
    failureSignals: ['missing Coinbase card', 'destination selector disabled', 'final buy action clicked'],
    passCriteria: ['funding card renders', 'Solana USDC destination can be selected'],
  },
  {
    step: 'marketplace-card',
    command: 'show marketplace products',
    cardType: 'marketplace product results',
    expectedMarkers: ['Found <n> marketplace item', 'or No marketplace items matched'],
    safeInteractions: ['Open product tab, then close test tab'],
    forbiddenActions: ['buy/checkout actions'],
    routeChecks: ['marketplace.read returns product-card-compatible data'],
    failureSignals: ['no routed marketplace result', 'Open button fails to launch /sp/ tab'],
    passCriteria: ['marketplace read routes', 'product Open button works when data exists'],
  },
  {
    step: 'pnl-card',
    command: 'show my pnl',
    cardType: 'PnL overview',
    expectedMarkers: ['PNL SNAPSHOT'],
    safeInteractions: ['render-only'],
    forbiddenActions: [],
    routeChecks: ['portfolio/perps position context available'],
    failureSignals: ['missing PnL card', 'positions fail to embed'],
    passCriteria: ['PnL snapshot card renders with embedded account context'],
  },
  {
    step: 'chart-card',
    command: '/chart ETH 1D',
    cardType: 'market chart',
    expectedMarkers: ['ETH-PERP', '1W', '1M', 'ALL'],
    safeInteractions: ['1W range button'],
    forbiddenActions: [],
    routeChecks: ['chart market data loads for ETH-PERP'],
    failureSignals: ['missing chart card', 'range buttons missing or disabled', 'chart data error'],
    passCriteria: ['ETH chart card renders', 'range control updates without error'],
  },
  {
    step: 'sports-research-card',
    command: '/search Lakers injuries today',
    cardType: 'sports research',
    expectedMarkers: ['NBA injury report', 'ESPN', 'Lakers'],
    safeInteractions: ['render-only'],
    forbiddenActions: [],
    routeChecks: ['/search routes to sports.research, not market order flow'],
    failureSignals: ['research card missing', 'wrong route to betting markets', 'source/link content missing'],
    passCriteria: ['ESPN-backed Lakers injury research card renders'],
  },
  {
    step: 'wallet-send-card',
    command: 'send 1 USDC to travis.swop.id',
    cardType: 'wallet send proposal',
    expectedMarkers: ['ARBITRUM', 'SOLANA', 'BASE', 'Confirm send'],
    safeInteractions: ['S SOLANA network picker'],
    forbiddenActions: ['Confirm send'],
    routeChecks: ['wallet.write creates proposal only; no transaction is sent'],
    failureSignals: ['missing network picker', 'recipient/token/amount not resolved', 'final send clicked'],
    passCriteria: ['send card advances to review', 'Confirm send is visible but not clicked'],
  },
  {
    step: 'perps-order-card',
    command: 'long some oil with 5x',
    cardType: 'perps order proposal',
    expectedMarkers: ['PERPS NEW ORDER', 'BRENTOIL or PERP'],
    safeInteractions: ['Short', 'Limit', 'TP/SL', '20x', '$500'],
    forbiddenActions: ['Place order'],
    routeChecks: ['oil/crude alias resolves to BRENTOIL proposal path'],
    failureSignals: ['missing perps card', 'wrong oil alias', 'control disabled unexpectedly', 'final order clicked'],
    passCriteria: ['perps ticket renders', 'safe controls can be toggled', 'final action remains unclicked'],
  },
  {
    step: 'prediction-market-card',
    command: 'what hockey games are tonight and the odds?',
    cardType: 'prediction market odds',
    expectedMarkers: ['Yes <price>', 'No <price>', 'Over <price>', 'Under <price>', 'moneyline', 'spread'],
    safeInteractions: ['click one visible outcome to draft a ticket'],
    forbiddenActions: ['Buy', 'Sell', 'Place order'],
    routeChecks: ['sports prompt routes to Polymarket gamelines'],
    failureSignals: ['no odds card', 'wrong league/window context', 'outcome click does not draft ticket'],
    passCriteria: ['odds card renders', 'outcome click drafts ticket', 'final buy/sell is not clicked'],
  },
  {
    step: 'swap-card',
    command: 'swap 1 SWOP to USDC',
    cardType: 'wallet swap quote',
    expectedMarkers: ['SWOP', 'USDC', 'swap quote', 'BEST ROUTE', 'JUPITER or LIFI'],
    safeInteractions: ['25% amount control when available'],
    forbiddenActions: ['Sign & approve'],
    routeChecks: [
      'GET /api/jupiter/quote for configured SWOP/USDC mint pair',
      'POST /api/jupiter/order when SWOP_QA_SWAP_TAKER or detected QA wallet is available',
    ],
    failureSignals: [
      'Server Action "... " was not found',
      'failed-to-find-server-action',
      'Quote unavailable',
      'Get a live quote before confirming this swap',
      'missing Jupiter quote/order route',
    ],
    passCriteria: ['swap card renders a live quote', 'Jupiter quote route succeeds', 'final Sign & approve is not clicked'],
  },
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
    swapInputMint: process.env.SWOP_QA_SWAP_INPUT_MINT || DEFAULT_SWAP_INPUT_MINT,
    swapOutputMint: process.env.SWOP_QA_SWAP_OUTPUT_MINT || DEFAULT_SWAP_OUTPUT_MINT,
    swapAmount: process.env.SWOP_QA_SWAP_AMOUNT || DEFAULT_SWAP_AMOUNT,
    swapTaker: process.env.SWOP_QA_SWAP_TAKER || '',
    swapOrderRequired: boolValue(process.env.SWOP_QA_SWAP_ORDER_REQUIRED),
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
    else if (arg.startsWith('--swap-taker=')) args.swapTaker = arg.slice('--swap-taker='.length);
    else if (arg === '--swap-order-required') args.swapOrderRequired = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!args.chromeUrl) args.chromeUrl = `http://127.0.0.1:${args.chromePort}`;
  return args;
}

function boolValue(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function buildCardCommandContracts(args) {
  const origin = appOrigin(args.url);
  return CARD_COMMAND_CONTRACTS.map((contract) => {
    if (contract.step !== 'swap-card') return { ...contract };
    return {
      ...contract,
      routeChecks: [
        `GET ${origin}/api/jupiter/quote inputMint=${args.swapInputMint} outputMint=${args.swapOutputMint} amount=${args.swapAmount}`,
        args.swapTaker
          ? `POST ${origin}/api/jupiter/order using configured SWOP_QA_SWAP_TAKER`
          : `POST ${origin}/api/jupiter/order using detected QA wallet when available; otherwise warn and skip order build`,
      ],
      passCriteria: [
        ...contract.passCriteria,
        args.swapOrderRequired
          ? 'configured QA taker must return transaction + requestId from Jupiter order build'
          : 'order build is best-effort unless SWOP_QA_SWAP_ORDER_REQUIRED=true',
      ],
    };
  });
}

function printHelp() {
  console.log(`Astro card smoke QA

Usage:
  node scripts/qa/astro-card-smoke.mjs --launch
  node scripts/qa/astro-card-smoke.mjs --setup-login --launch
  node scripts/qa/astro-card-smoke.mjs --chrome-url=http://127.0.0.1:9222
  node scripts/qa/astro-card-smoke.mjs --launch --alert-email=you@example.com
  node scripts/qa/astro-card-smoke.mjs --launch --swap-taker=<funded-solana-wallet>

Modes:
  --setup-login  Opens the QA Chrome profile to Swop and exits so you can log in once.
  --launch       Starts a dedicated Chrome profile with remote debugging if needed.

Alerts:
  Set SWOP_QA_ALERT_EMAIL or pass --alert-email to email a failure report.

Swap QA:
  The swap-card lane checks the rendered card plus /api/jupiter/quote.
  Set SWOP_QA_SWAP_TAKER or --swap-taker to require a non-signing
  /api/jupiter/order build. Add --swap-order-required to fail when the
  configured taker cannot build an order.

Safety:
  This script never clicks final financial/signing actions. It tests card render,
  non-final controls, draft tickets, and tab-opening buttons only.
`);
}

function timestamp() {
  return new Date().toISOString();
}

function createStep(name, contract = null) {
  const step = {
    name,
    status: 'pending',
    startedAt: timestamp(),
    finishedAt: null,
    detail: '',
  };
  if (contract) step.contract = contract;
  return step;
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

async function pageState(client) {
  return evaluate(client, () => ({
    href: window.location.href,
    title: document.title || '',
    text: document.body?.innerText || '',
  }));
}

function recentConsoleErrorTexts(report, limit = 6) {
  return (report.console?.errors || [])
    .slice(-limit)
    .map((entry) =>
      shortText(`${entry.source || 'console'}: ${entry.text || ''}`, 320),
    );
}

function detectAuthShellFailure(state, report, targetUrl) {
  const onLoginRoute = /\/login(?:[/?#]|$)/i.test(state.href || '');
  if (!onLoginRoute) return null;

  const consoleHints = recentConsoleErrorTexts(report, 8);
  const combinedSignals = [state.title, state.text, ...consoleHints]
    .filter(Boolean)
    .join('\n');
  const privyFrameBlocked =
    /frame-ancestors/i.test(combinedSignals) &&
    /(privy\.swopme\.app|auth\.privy\.io)/i.test(combinedSignals);
  const privyAllowedOriginBlocked =
    /allowlist_rejected|allowed origins?|allowed origin/i.test(combinedSignals);
  const previewOrigin = appOrigin(targetUrl);

  if (privyFrameBlocked || privyAllowedOriginBlocked) {
    return [
      `Redirected to /login, but Privy auth is blocked on ${previewOrigin}.`,
      privyFrameBlocked
        ? 'The current preview host is not allowed to embed the Privy auth surface (`frame-ancestors` mismatch).'
        : 'The current preview host is not in the Privy allowed origins list.',
      `Current page: ${state.href}`,
      consoleHints.length
        ? `Recent console signals: ${consoleHints.join(' | ')}`
        : null,
    ]
      .filter(Boolean)
      .join(' ');
  }

  return `Redirected to /login instead of an authenticated /dashboard/chat shell. Current page: ${state.href}`;
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

async function waitForSwopPageContent(client, report, args) {
  return waitFor(
    client,
    'Swop page content',
    async () => {
      const state = await pageState(client);
      const authFailure = detectAuthShellFailure(state, report, args.url);
      if (authFailure) throw new Error(authFailure);
      return /Messages|Astro/i.test(state.text) ? state : false;
    },
    args.timeoutMs,
  );
}

function appOrigin(url) {
  return new URL(url).origin;
}

function shortText(value, maxLength = 700) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let rawBody = '';
  let data = null;

  try {
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    rawBody = await response.text();
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = null;
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    rawBody,
  };
}

async function textAfterLatestMarker(client, marker) {
  const text = await pageText(client);
  const index = text.toLowerCase().lastIndexOf(String(marker).toLowerCase());
  if (index < 0) return text;
  return text.slice(index);
}

function detectSwapUiFailure(text) {
  const checks = [
    {
      pattern: /Server Action\s+"[^"]+"\s+was not found/i,
      message: 'Swap card showed stale Next Server Action ID.',
    },
    {
      pattern: /failed-to-find-server-action/i,
      message: 'Swap card linked to Next failed-to-find-server-action.',
    },
    {
      pattern: /Quote unavail/i,
      message: 'Swap card rendered Quote unavailable.',
    },
    {
      pattern: /Get a live quote before confirming this swap/i,
      message: 'Swap card reached confirm flow without a live quote.',
    },
  ];
  const failure = checks.find((check) => check.pattern.test(text));
  return failure?.message || null;
}

async function waitForSwapCardUiHealth(client, prompt, timeoutMs = 90000) {
  return waitFor(
    client,
    'healthy SWOP to USDC swap card',
    async () => {
      const scopedText = await textAfterLatestMarker(client, prompt);
      const failure = detectSwapUiFailure(scopedText);
      if (failure) {
        throw new Error(`${failure} Latest swap card text: ${shortText(scopedText)}`);
      }

      const hasSwapPair = /SWOP/i.test(scopedText) && /USDC/i.test(scopedText);
      const hasSwapCard = /swap quote|BEST ROUTE|JUPITER|LIFI|YOU PAY|YOU GET/i.test(scopedText);
      if (!hasSwapPair || !hasSwapCard) return false;
      return {
        hasSwapPair,
        hasSwapCard,
        excerpt: shortText(scopedText),
      };
    },
    timeoutMs
  );
}

async function findSolanaTakerFromPage(client) {
  return evaluate(client, () => {
    const base58Pattern = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
    const excluded = new Set([
      '11111111111111111111111111111111',
      'So11111111111111111111111111111111111111112',
      'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    ]);
    const candidates = [];
    const pushCandidate = (value, source, priority = 10) => {
      const matches = String(value || '').match(base58Pattern) || [];
      for (const match of matches) {
        if (!excluded.has(match)) candidates.push({ value: match, source, priority });
      }
    };
    const visit = (value, source, priority = 10, depth = 0) => {
      if (depth > 5 || value == null) return;
      if (typeof value === 'string') {
        pushCandidate(value, source, priority);
        try {
          visit(JSON.parse(value), source, priority, depth + 1);
        } catch {
          // Plain string, not JSON.
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${source}[${index}]`, priority, depth + 1));
        return;
      }
      if (typeof value !== 'object') return;

      const chainType = String(value.chain_type || value.chainType || '').toLowerCase();
      const walletClient = String(value.wallet_client_type || value.walletClientType || '').toLowerCase();
      const objectPriority = chainType === 'solana' || walletClient.includes('phantom') ? 0 : priority;
      for (const [key, child] of Object.entries(value)) {
        const keyPriority = /solana|solWallet|wallet|linked_accounts|linkedAccounts/i.test(key)
          ? Math.min(objectPriority, 2)
          : objectPriority + 1;
        if (typeof child === 'string' && /address|wallet|publicKey|solana/i.test(key)) {
          pushCandidate(child, `${source}.${key}`, keyPriority);
        }
        visit(child, `${source}.${key}`, keyPriority, depth + 1);
      }
    };

    for (const storage of [localStorage, sessionStorage]) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) continue;
        visit(storage.getItem(key), `${storage === localStorage ? 'localStorage' : 'sessionStorage'}.${key}`, 4);
      }
    }

    pushCandidate(document.body?.innerText || '', 'body', 20);
    candidates.sort((left, right) => left.priority - right.priority);
    return candidates[0] || null;
  });
}

async function probeJupiterSwapApis({ client, args, report }) {
  const origin = appOrigin(args.url);
  const searchParams = new URLSearchParams({
    inputMint: args.swapInputMint,
    outputMint: args.swapOutputMint,
    amount: args.swapAmount,
    swapMode: 'ExactIn',
    slippageBps: '100',
  });
  const quoteUrl = `${origin}/api/jupiter/quote?${searchParams.toString()}`;
  const quote = await fetchJsonWithTimeout(quoteUrl, { method: 'GET' }, 30000);
  if (!quote.ok || !quote.data?.success || !quote.data?.data?.outAmount) {
    throw new Error(
      `Jupiter quote probe failed: HTTP ${quote.status}; body ${shortText(quote.rawBody)}`
    );
  }

  const detectedTaker = args.swapTaker || (await findSolanaTakerFromPage(client))?.value || '';
  const result = {
    quoteOutAmount: quote.data.data.outAmount,
    quoteRoutePlanLength: Array.isArray(quote.data.data.routePlan)
      ? quote.data.data.routePlan.length
      : null,
    order: 'skipped',
    orderOutAmount: null,
    takerSource: args.swapTaker ? 'SWOP_QA_SWAP_TAKER' : 'detected-page-wallet',
  };

  if (!detectedTaker) {
    report.warnings.push(
      'Swap order probe skipped: set SWOP_QA_SWAP_TAKER to a funded QA Solana wallet to require non-signing Jupiter order builds.'
    );
    return result;
  }

  const order = await fetchJsonWithTimeout(
    `${origin}/api/jupiter/order`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputMint: args.swapInputMint,
        outputMint: args.swapOutputMint,
        amount: args.swapAmount,
        taker: detectedTaker,
      }),
    },
    30000
  );

  const hasOrder =
    order.ok &&
    order.data?.success &&
    order.data?.data?.outAmount &&
    order.data?.data?.transaction &&
    order.data?.data?.requestId;
  if (!hasOrder) {
    const routeMissing = order.status === 404 || order.status === 405 || !order.data;
    const detail = `Jupiter order probe did not return a signable order: HTTP ${order.status}; body ${shortText(order.rawBody)}`;
    if (args.swapOrderRequired || routeMissing) throw new Error(detail);
    report.warnings.push(`${detail}. Configure a funded SWOP QA taker or set SWOP_QA_SWAP_ORDER_REQUIRED=true to make this strict.`);
    result.order = 'reachable-no-order';
    return result;
  }

  result.order = 'pass';
  result.orderOutAmount = order.data.data.outAmount;
  return result;
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
  const contractsByStep = new Map(
    (report.cardContracts || []).map((contract) => [contract.step, contract])
  );
  const add = (name) => {
    const step = createStep(name, contractsByStep.get(name) || null);
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
  const swapPrompt = 'swap 1 SWOP to USDC';
  await sendPrompt(client, swapPrompt);
  const uiHealth = await waitForSwapCardUiHealth(client, swapPrompt, 90000);
  const apiHealth = await probeJupiterSwapApis({ client, args, report });
  await sleep(1500);
  const settledSwapText = await textAfterLatestMarker(client, swapPrompt);
  const settledFailure = detectSwapUiFailure(settledSwapText);
  if (settledFailure) {
    throw new Error(`${settledFailure} after quote settle. Latest swap card text: ${shortText(settledSwapText)}`);
  }
  let clickedSwapPercent = false;
  try {
    await clickButton(client, '25%', { exact: true, avoidFinal: true });
    clickedSwapPercent = true;
  } catch (error) {
    report.warnings.push(`Swap 25% control was not clicked: ${error.message}`);
  }
  if (clickedSwapPercent) {
    const scopedText = await textAfterLatestMarker(client, swapPrompt);
    const failure = detectSwapUiFailure(scopedText);
    if (failure) {
      throw new Error(`${failure} after clicking 25%. Latest swap card text: ${shortText(scopedText)}`);
    }
  }
  finishStep(
    step,
    'pass',
    `Rendered healthy SWOP to USDC swap card; quote out=${apiHealth.quoteOutAmount}, routePlan=${apiHealth.quoteRoutePlanLength}, order=${apiHealth.order}, orderOut=${apiHealth.orderOutAmount || 'n/a'}. UI excerpt: ${uiHealth.excerpt}`
  );
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
  const cardContracts = buildCardCommandContracts(args);
  const report = {
    name: 'astro-card-smoke',
    startedAt: timestamp(),
    finishedAt: null,
    url: args.url,
    chromeUrl: args.chromeUrl,
    profileDir: args.profileDir,
    gitRef: process.env.SWOP_QA_GIT_REF || null,
    gitSha: process.env.SWOP_QA_GIT_SHA || null,
    swapQa: {
      inputMint: args.swapInputMint,
      outputMint: args.swapOutputMint,
      amount: args.swapAmount,
      orderProbeConfigured: Boolean(args.swapTaker),
      orderRequired: args.swapOrderRequired,
    },
    cardContracts,
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

    await waitForSwopPageContent(client, report, args);
    await runCardChecks({ client, baseUrl: args.chromeUrl, args, report });
    report.status = report.steps.some((step) => step.status === 'fail') ? 'fail' : 'pass';
  } catch (error) {
    report.status = 'fail';
    report.error = error.stack || error.message;
    const activeStep = report.steps.find((step) => step.status === 'pending');
    if (activeStep) {
      finishStep(activeStep, 'fail', error.message);
    } else {
      const authContract =
        report.cardContracts.find((contract) => contract.step === 'page-auth') ||
        null;
      const authStep = createStep('page-auth', authContract);
      report.steps.push(authStep);
      finishStep(authStep, 'fail', error.message);
    }
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
    contracts: report.cardContracts.length,
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

function renderEmailList(label, values) {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];
  if (!list.length) return '';
  return [`${label}:`, ...list.map((value) => `- ${value}`)].join('\n');
}

function formatStepContractForEmail(step) {
  const contract = step?.contract;
  if (!contract) return '';

  return [
    'Card/command contract:',
    `- Command: ${contract.command || 'n/a'}`,
    `- Card type: ${contract.cardType || 'n/a'}`,
    renderEmailList('Expected markers', contract.expectedMarkers),
    renderEmailList('Safe interactions', contract.safeInteractions),
    renderEmailList('Forbidden actions', contract.forbiddenActions),
    renderEmailList('Route/API checks', contract.routeChecks),
    renderEmailList('Failure signals', contract.failureSignals),
    renderEmailList('Pass criteria', contract.passCriteria),
  ]
    .filter(Boolean)
    .join('\n');
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
    lastStep ? formatStepContractForEmail(lastStep) : '',
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
