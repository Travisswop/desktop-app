const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildRuntimeEnv } = require('../../scripts/next-dev');

describe('next-dev fallback env loader', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'next-dev-env-'));
  });

  afterEach(() => {
    if (tmpRoot) {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('lets later fallback env files override earlier fallback files', () => {
    fs.writeFileSync(path.join(tmpRoot, '.env'), 'NEXT_PUBLIC_PRIVY_APP_ID=base\nSHARED_ONLY=base\n');
    fs.writeFileSync(path.join(tmpRoot, '.env.development'), 'NEXT_PUBLIC_PRIVY_APP_ID=dev\n');
    fs.writeFileSync(path.join(tmpRoot, '.env.local'), 'NEXT_PUBLIC_PRIVY_APP_ID=local\n');
    fs.writeFileSync(
      path.join(tmpRoot, '.env.development.local'),
      'NEXT_PUBLIC_PRIVY_APP_ID=devlocal\n',
    );

    const { env, fallbackEnvDir } = buildRuntimeEnv(
      path.join(tmpRoot, 'clean-worktree'),
      { SWOP_FALLBACK_ENV_DIR: tmpRoot },
    );

    expect(fallbackEnvDir).toBe(tmpRoot);
    expect(env.NEXT_PUBLIC_PRIVY_APP_ID).toBe('devlocal');
    expect(env.SHARED_ONLY).toBe('base');
  });

  it('keeps caller-provided process env authoritative over fallback values', () => {
    fs.writeFileSync(path.join(tmpRoot, '.env'), 'NEXT_PUBLIC_PRIVY_APP_ID=base\nNEXT_PUBLIC_API_URL=https://fallback.example\n');
    fs.writeFileSync(path.join(tmpRoot, '.env.local'), 'NEXT_PUBLIC_PRIVY_APP_ID=local\nNEXT_PUBLIC_API_URL=https://override.example\n');

    const { env } = buildRuntimeEnv(path.join(tmpRoot, 'clean-worktree'), {
      SWOP_FALLBACK_ENV_DIR: tmpRoot,
      NEXT_PUBLIC_PRIVY_APP_ID: 'caller',
    });

    expect(env.NEXT_PUBLIC_PRIVY_APP_ID).toBe('caller');
    expect(env.NEXT_PUBLIC_API_URL).toBe('https://override.example');
  });

  it('fails fast when an explicit fallback env override has no env files', () => {
    expect(() =>
      buildRuntimeEnv(path.join(tmpRoot, 'clean-worktree'), {
        SWOP_FALLBACK_ENV_DIR: path.join(tmpRoot, 'missing-env-dir'),
      }),
    ).toThrow(
      `SWOP_FALLBACK_ENV_DIR=${path.join(tmpRoot, 'missing-env-dir')} does not contain any of .env, .env.development, .env.local, .env.development.local`,
    );
  });

  it('discovers fallback env files from a sibling git worktree', () => {
    const sharedCheckout = path.join(tmpRoot, 'somewhere-else', 'desktop-app');
    const cleanWorktree = path.join(tmpRoot, 'review-worktrees', 'desktop-app-pr522');
    fs.mkdirSync(sharedCheckout, { recursive: true });
    fs.mkdirSync(cleanWorktree, { recursive: true });
    fs.writeFileSync(
      path.join(sharedCheckout, '.env.local'),
      'NEXT_PUBLIC_PRIVY_APP_ID=shared\nNEXT_PUBLIC_API_URL=https://shared.example\n',
    );

    const worktreeList = [
      `worktree ${sharedCheckout}`,
      'HEAD 1234567890abcdef',
      'branch refs/heads/Codex',
      '',
      `worktree ${cleanWorktree}`,
      'HEAD abcdef1234567890',
      'detached',
      '',
    ].join('\n');

    const { env, fallbackEnvDir } = buildRuntimeEnv(
      cleanWorktree,
      {},
      { execFileSync: () => worktreeList },
    );

    expect(fallbackEnvDir).toBe(sharedCheckout);
    expect(env.NEXT_PUBLIC_PRIVY_APP_ID).toBe('shared');
    expect(env.NEXT_PUBLIC_API_URL).toBe('https://shared.example');
  });
});
