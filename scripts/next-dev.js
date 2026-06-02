#!/usr/bin/env node

const { spawn } = require('child_process');

const nextBin = require.resolve('next/dist/bin/next');
const nextArgs = [nextBin, 'dev', '--turbopack', ...process.argv.slice(2)];
const env = { ...process.env };
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
