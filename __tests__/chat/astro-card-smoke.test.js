describe('astro-card-smoke helpers', () => {
  let helpers;

  beforeAll(async () => {
    helpers = await import('../../scripts/qa/astro-card-smoke.mjs');
  });

  test('parseArgs rejects invalid SWOP_QA_LOCAL_PORT values', () => {
    expect(() =>
      helpers.parseArgs([], {
        SWOP_QA_LOCAL_PORT: '300O',
      })
    ).toThrow('SWOP_QA_LOCAL_PORT must be a positive integer port. Received: 300O');
  });

  test('parseArgs rejects invalid --local-port values', () => {
    expect(() => helpers.parseArgs(['--local-port=abc'], {})).toThrow(
      '--local-port must be a positive integer port. Received: abc'
    );
  });

  test('manual runs must choose a QA host explicitly', () => {
    const args = helpers.parseArgs([], {});
    expect(args.url).toBe('https://www.swopme.app/dashboard/chat');
    expect(args.explicitQaTarget).toBe(false);
    expect(args.allowDefaultHost).toBe(false);
  });

  test('explicit production host counts as an intentional target', () => {
    const args = helpers.parseArgs(
      ['--url=https://www.swopme.app/dashboard/chat'],
      {}
    );
    expect(args.url).toBe('https://www.swopme.app/dashboard/chat');
    expect(args.explicitQaTarget).toBe(true);
  });

  test('allow-default-host opt-in is parsed', () => {
    const args = helpers.parseArgs(['--allow-default-host'], {});
    expect(args.allowDefaultHost).toBe(true);
  });

  test('implicit production default is blocked outside scheduled origin/main runs', () => {
    const args = helpers.parseArgs([], {});
    expect(helpers.shouldBlockImplicitDefaultHost(args, {})).toBe(true);
    expect(helpers.shouldBlockImplicitDefaultHost(args, { SWOP_QA_GIT_REF: 'origin/main' })).toBe(
      false
    );
    expect(
      helpers.shouldBlockImplicitDefaultHost(
        helpers.parseArgs(['--allow-default-host'], {}),
        {}
      )
    ).toBe(false);
  });

  test('classifies stepless Runtime.evaluate timeouts as a DevTools blocker', () => {
    expect(
      helpers.classifyQaBlocker(
        'Error: Runtime.evaluate timed out.',
        []
      )
    ).toEqual({
      blockedBy: 'chrome-devtools-unresponsive',
      detail:
        'Chrome DevTools became unresponsive before page-auth. Reset the dedicated QA Chrome session and retry.',
    });
  });

  test('classifies DevTools availability failures before page-auth', () => {
    expect(
      helpers.classifyQaBlocker(
        'Chrome DevTools did not become available: http://127.0.0.1:9223/json/version timed out after 2000ms',
        []
      )
    ).toEqual({
      blockedBy: 'chrome-devtools-unavailable',
      detail:
        'Chrome DevTools was not reachable before page-auth. Relaunch the dedicated QA Chrome session and retry.',
    });
  });

  test('classifies Runtime.evaluate timeouts during an active step', () => {
    expect(
      helpers.classifyQaBlocker('Runtime.evaluate timed out.', [
        { name: 'page-auth', status: 'pending' },
      ])
    ).toEqual({
      blockedBy: 'chrome-devtools-unresponsive',
      detail:
        'Chrome DevTools became unresponsive during page-auth. Reset the dedicated QA Chrome session and retry.',
    });
  });

  test('matches only the intended localhost review origin', () => {
    expect(
      helpers.isMatchingSwopTargetUrl(
        'http://localhost:3001/dashboard/chat?thread=abc',
        'http://localhost:3001/dashboard/chat'
      )
    ).toBe(true);

    expect(
      helpers.isMatchingSwopTargetUrl(
        'https://www.swopme.app/dashboard/chat',
        'http://localhost:3001/dashboard/chat'
      )
    ).toBe(false);

    expect(
      helpers.isMatchingSwopTargetUrl(
        'http://localhost:3000/dashboard/chat',
        'http://localhost:3001/dashboard/chat'
      )
    ).toBe(false);
  });
});
