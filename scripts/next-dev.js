#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const cwd = process.cwd();
const fallbackEnvFiles = [
  '.env',
  '.env.development',
  '.env.local',
  '.env.development.local',
];

function hasLocalEnvConfig(dir) {
  return fallbackEnvFiles.some((file) => fs.existsSync(path.join(dir, file)));
}

function resolveFallbackEnvDir() {
  const explicit = process.env.SWOP_FALLBACK_ENV_DIR?.trim();
  if (explicit && hasLocalEnvConfig(explicit)) {
    return explicit;
  }

  const candidates = [
    '/Users/travis/Documents/Swop Desktop Live.nosync/git-checkouts/desktop-app',
    '/Users/travis/Documents/Swop Desktop Live.nosync/desktop-app-main',
  ];

  return candidates.find((dir) => hasLocalEnvConfig(dir)) || null;
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const unwrapped = value.slice(1, -1);
    return value.startsWith('"')
      ? unwrapped
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
      : unwrapped;
  }

  return value;
}

function loadFallbackEnv(dir, env) {
  const loadedKeys = new Set();

  for (const file of fallbackEnvFiles) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      if (Object.prototype.hasOwnProperty.call(process.env, key) && !loadedKeys.has(key)) {
        continue;
      }

      env[key] = parseEnvValue(rawValue);
      loadedKeys.add(key);
    }
  }
}

const env = { ...process.env };

if (!hasLocalEnvConfig(cwd)) {
  const fallbackEnvDir = resolveFallbackEnvDir();
  if (fallbackEnvDir) {
    loadFallbackEnv(fallbackEnvDir, env);
    console.log(`[next-dev] Loaded fallback env from ${fallbackEnvDir}`);
  } else {
    console.warn(
      '[next-dev] No local or fallback env file found; Next.js will use the current process environment only.',
    );
  }
}

const nextBin = require.resolve('next/dist/bin/next');
const rawArgs = process.argv.slice(2);
const useWebpack = rawArgs.includes('--webpack');
const nextArgs = [
  nextBin,
  'dev',
  ...(useWebpack ? [] : ['--turbopack']),
  ...rawArgs.filter((arg) => arg !== '--webpack'),
];
env.NEXT_DIST_DIR = env.NEXT_DIST_DIR || '.next-dev';

const webStorageFlag = '--no-experimental-webstorage';
if (
  process.allowedNodeEnvironmentFlags?.has(webStorageFlag) &&
  !String(env.NODE_OPTIONS || '').includes(webStorageFlag)
) {
  env.NODE_OPTIONS = [env.NODE_OPTIONS, webStorageFlag].filter(Boolean).join(' ');
}

const child = spawn(process.execPath, nextArgs, {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
