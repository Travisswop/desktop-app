export const LOCAL_CONSOLE_CARD_TELEMETRY_PREFIX =
  '[astro-console-card-telemetry]';

export type LocalConsoleCardType = 'pnl' | 'portfolio';
export type LocalConsoleCardEventType = 'generated' | 'rehydrated';

export interface LocalConsoleCardTelemetryEvent {
  eventType: LocalConsoleCardEventType;
  cardType: LocalConsoleCardType;
  sourceMessageId: string;
  threadType: 'group' | 'direct';
  surface?: string;
}

const emittedEventKeys = new Set<string>();

function buildEventKey(event: LocalConsoleCardTelemetryEvent) {
  return [
    event.eventType,
    event.cardType,
    event.sourceMessageId,
    event.threadType,
  ].join(':');
}

export function resetLocalConsoleCardTelemetryForTests() {
  emittedEventKeys.clear();
}

export function emitLocalConsoleCardTelemetry(
  event: LocalConsoleCardTelemetryEvent
) {
  if (typeof window === 'undefined' || typeof console === 'undefined') {
    return false;
  }

  const dedupeKey = buildEventKey(event);
  if (emittedEventKeys.has(dedupeKey)) {
    return false;
  }
  emittedEventKeys.add(dedupeKey);

  const payload = {
    surface: event.surface || 'desktop.dashboard.chat',
    eventType: event.eventType,
    cardType: event.cardType,
    sourceMessageId: event.sourceMessageId,
    threadType: event.threadType,
    emittedAt: new Date().toISOString(),
  };

  console.info(
    LOCAL_CONSOLE_CARD_TELEMETRY_PREFIX,
    JSON.stringify(payload)
  );

  if (
    typeof window.dispatchEvent === 'function' &&
    typeof CustomEvent === 'function'
  ) {
    window.dispatchEvent(
      new CustomEvent('swop:astro-console-card-telemetry', {
        detail: payload,
      })
    );
  }

  return true;
}
