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
