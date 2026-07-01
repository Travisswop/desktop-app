jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useEffect: (effect: () => void) => effect(),
    useRef: <T,>(value: T) => ({ current: value }),
  };
});

import { LocalConsoleCardTelemetryBeacon } from '@/components/chat/LocalConsoleCardTelemetryBeacon';
import {
  buildLocalConsoleCardLifecycleId,
  emitLocalConsoleCardTelemetry,
  isLocalConsoleCardHistoryBackedAtMount,
  LOCAL_CONSOLE_CARD_TELEMETRY_PREFIX,
  normalizeLocalConsoleCardCommand,
  resetLocalConsoleCardTelemetryForTests,
  resolveLocalConsoleCardSourceMessageId,
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

  test('treats same-session live source ids as generated-only mounts', () => {
    expect(
      isLocalConsoleCardHistoryBackedAtMount({
        sourceMessageId: 'local-console-portfolio-live-1',
        liveSourceMessageIds: new Set(['local-console-portfolio-live-1']),
      })
    ).toBe(false);

    expect(
      isLocalConsoleCardHistoryBackedAtMount({
        sourceMessageId: 'local-console-portfolio-history-1',
        liveSourceMessageIds: new Set(['different-source-id']),
      })
    ).toBe(true);
  });

  test('reuses the stable local invocation id across optimistic and persisted card replacements', () => {
    const optimisticSourceMessageId = resolveLocalConsoleCardSourceMessageId({
      fallbackSourceMessageId:
        'temp-local-portfolio-local-console-portfolio-abc123-1',
      invocationId: 'local-portfolio-local-console-portfolio-abc123-1',
    });
    const persistedSourceMessageId = resolveLocalConsoleCardSourceMessageId({
      fallbackSourceMessageId: '686e9c2332a0b7d4f17cc999',
      invocationId: 'local-portfolio-local-console-portfolio-abc123-1',
    });

    expect(optimisticSourceMessageId).toBe(
      'local-console-portfolio-abc123-1'
    );
    expect(persistedSourceMessageId).toBe(optimisticSourceMessageId);
    expect(
      isLocalConsoleCardHistoryBackedAtMount({
        sourceMessageId: persistedSourceMessageId,
        liveSourceMessageIds: new Set([optimisticSourceMessageId]),
      })
    ).toBe(false);
  });

  test('emits rehydrated telemetry only from the rendered history-backed beacon path', () => {
    expect(
      LocalConsoleCardTelemetryBeacon({
        cardType: 'portfolio',
        sourceMessageId: 'local-card-1',
        isGroup: false,
        historyBackedAtMount: false,
      })
    ).toBeNull();
    expect(infoSpy).not.toHaveBeenCalled();

    expect(
      LocalConsoleCardTelemetryBeacon({
        cardType: 'portfolio',
        sourceMessageId: 'history-card-1',
        isGroup: true,
        historyBackedAtMount: true,
      })
    ).toBeNull();

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      LOCAL_CONSOLE_CARD_TELEMETRY_PREFIX,
      expect.any(String)
    );

    const payload = JSON.parse(infoSpy.mock.calls[0][1] as string);
    expect(payload).toMatchObject({
      surface: 'desktop.dashboard.chat',
      eventType: 'rehydrated',
      cardType: 'portfolio',
      sourceMessageId: 'history-card-1',
      threadType: 'group',
    });
  });

  test('keeps rendered persisted-card mounts generated-only when their source id was already seen live', () => {
    expect(
      LocalConsoleCardTelemetryBeacon({
        cardType: 'portfolio',
        sourceMessageId: 'live-card-1',
        isGroup: true,
        historyBackedAtMount: isLocalConsoleCardHistoryBackedAtMount({
          sourceMessageId: 'live-card-1',
          liveSourceMessageIds: new Set(['live-card-1']),
        }),
      })
    ).toBeNull();

    expect(infoSpy).not.toHaveBeenCalled();
  });

  test('does not emit rehydrated telemetry when a persisted ack reuses the same local invocation source id', () => {
    const liveSourceMessageId = resolveLocalConsoleCardSourceMessageId({
      fallbackSourceMessageId:
        'temp-local-portfolio-local-console-portfolio-xyz789-1',
      invocationId: 'local-portfolio-local-console-portfolio-xyz789-1',
    });
    const persistedSourceMessageId = resolveLocalConsoleCardSourceMessageId({
      fallbackSourceMessageId: '686e9c2332a0b7d4f17ccabc',
      invocationId: 'local-portfolio-local-console-portfolio-xyz789-1',
    });

    expect(
      LocalConsoleCardTelemetryBeacon({
        cardType: 'portfolio',
        sourceMessageId: persistedSourceMessageId,
        isGroup: true,
        historyBackedAtMount: isLocalConsoleCardHistoryBackedAtMount({
          sourceMessageId: persistedSourceMessageId,
          liveSourceMessageIds: new Set([liveSourceMessageId]),
        }),
      })
    ).toBeNull();

    expect(infoSpy).not.toHaveBeenCalled();
  });
});
