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
});
