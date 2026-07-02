import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveGitMetadata } from '../astro-card-smoke.mjs';

test('resolveGitMetadata prefers explicit QA env vars', () => {
  const calls = [];
  const metadata = resolveGitMetadata({
    env: {
      SWOP_QA_GIT_REF: 'origin/main',
      SWOP_QA_GIT_SHA: 'abc123',
    },
    execFileSyncImpl: (...args) => {
      calls.push(args);
      throw new Error('git should not run when env vars are present');
    },
  });

  assert.deepEqual(metadata, {
    gitRef: 'origin/main',
    gitSha: 'abc123',
  });
  assert.equal(calls.length, 0);
});

test('resolveGitMetadata falls back to local git metadata when env vars are missing', () => {
  const metadata = resolveGitMetadata({
    env: {},
    cwd: '/tmp/swop',
    execFileSyncImpl: (_command, args) => {
      const key = args.join(' ');
      if (key === 'rev-parse HEAD') return 'deadbeefcafebabe\n';
      if (key === 'branch --show-current') return '\n';
      if (key === 'name-rev --name-only --no-undefined HEAD') return 'remotes/origin/main\n';
      throw new Error(`unexpected git call: ${key}`);
    },
  });

  assert.deepEqual(metadata, {
    gitRef: 'origin/main',
    gitSha: 'deadbeefcafebabe',
  });
});

test('resolveGitMetadata returns nulls when git metadata is unavailable', () => {
  const metadata = resolveGitMetadata({
    env: {},
    execFileSyncImpl: () => {
      throw new Error('git unavailable');
    },
  });

  assert.deepEqual(metadata, {
    gitRef: null,
    gitSha: null,
  });
});
