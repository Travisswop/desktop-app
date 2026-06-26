import {
  buildLocalConsoleCardLifecycleId,
  emitLocalConsoleCardTelemetry,
  LOCAL_CONSOLE_CARD_TELEMETRY_PREFIX,
  normalizeLocalConsoleCardCommand,
  resetLocalConsoleCardTelemetryForTests,
  shouldEmitLocalConsoleCardRehydratedOnMount,
} from '@/lib/chat/localConsoleCardTelemetry';

describe('local console card telemetry', () => {
  const originalWindow = global.window;
  const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

  beforeEach(() => {
    resetLocalConsoleCardTelemetryForTests();
    infoSpy.mockClear();
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: {
        dispatchEvent: jest.fn(),
      },
    });
  });

  afterAll(() => {
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: originalWindow,
    });
    infoSpy.mockRestore();
  });

  test('logs a sanitized generated event once per source message and card type', () => {
    expect(
      emitLocalConsoleCardTelemetry({
        eventType: 'generated',
        cardType: 'portfolio',
        sourceMessageId: 'temp-portfolio-1',
        threadType: 'group',
      })
    ).toBe(true);

    expect(
      emitLocalConsoleCardTelemetry({
        eventType: 'generated',
        cardType: 'portfolio',
        sourceMessageId: 'temp-portfolio-1',
        threadType: 'group',
      })
    ).toBe(false);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      LOCAL_CONSOLE_CARD_TELEMETRY_PREFIX,
      expect.any(String)
    );

    const payload = JSON.parse(infoSpy.mock.calls[0][1] as string);
    expect(payload).toMatchObject({
      surface: 'desktop.dashboard.chat',
      eventType: 'generated',
      cardType: 'portfolio',
      sourceMessageId: 'temp-portfolio-1',
      threadType: 'group',
    });
    expect(payload).not.toHaveProperty('walletAddress');
  });

  test('skips emission outside the browser runtime', () => {
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: undefined,
    });

    expect(
      emitLocalConsoleCardTelemetry({
        eventType: 'rehydrated',
        cardType: 'pnl',
        sourceMessageId: 'history-message-1',
        threadType: 'direct',
      })
    ).toBe(false);

    expect(infoSpy).not.toHaveBeenCalled();
  });

  test('builds a stable lifecycle id from thread scope, normalized command, and ordinal', () => {
    expect(
      buildLocalConsoleCardLifecycleId({
        cardType: 'portfolio',
        threadScope: 'group:trading-cabal',
        commandText: '@Astro   show   my   portfolio',
        ordinal: 2,
      })
    ).toBe(
      buildLocalConsoleCardLifecycleId({
        cardType: 'portfolio',
        threadScope: 'group:trading-cabal',
        commandText: 'show my portfolio',
        ordinal: 2,
      })
    );

    expect(
      buildLocalConsoleCardLifecycleId({
        cardType: 'portfolio',
        threadScope: 'group:trading-cabal',
        commandText: 'show my portfolio',
        ordinal: 3,
      })
    ).not.toBe(
      buildLocalConsoleCardLifecycleId({
        cardType: 'portfolio',
        threadScope: 'group:trading-cabal',
        commandText: 'show my portfolio',
        ordinal: 2,
      })
    );

    expect(normalizeLocalConsoleCardCommand('@astro /portfolio  ')).toBe(
      '/portfolio'
    );
  });

  test('keeps first local mounts generated-only and reserves rehydrated for history-backed mounts', () => {
    expect(
      shouldEmitLocalConsoleCardRehydratedOnMount({
        historyBackedAtMount: false,
      })
    ).toBe(false);

    expect(
      shouldEmitLocalConsoleCardRehydratedOnMount({
        historyBackedAtMount: true,
      })
    ).toBe(true);
  });
});
