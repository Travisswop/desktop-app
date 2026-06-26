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

function hashLocalConsoleCardKey(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function normalizeLocalConsoleCardCommand(value: string) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/^@?astro\b[\s,:-]*/i, '')
    .trim();
}

export function buildLocalConsoleCardLifecycleId({
  cardType,
  threadScope,
  commandText,
  ordinal,
}: {
  cardType: LocalConsoleCardType;
  threadScope: string;
  commandText: string;
  ordinal: number;
}) {
  const normalizedThreadScope =
    String(threadScope || '').trim().toLowerCase() || 'unknown-thread';
  const normalizedCommand =
    normalizeLocalConsoleCardCommand(commandText) || 'unknown-command';
  const normalizedOrdinal =
    Number.isFinite(ordinal) && ordinal > 0 ? Math.trunc(ordinal) : 1;

  return `local-console-${cardType}-${hashLocalConsoleCardKey(
    `${normalizedThreadScope}:${cardType}:${normalizedCommand}`
  )}-${normalizedOrdinal}`;
}

export function shouldEmitLocalConsoleCardRehydratedOnMount({
  historyBackedAtMount,
}: {
  historyBackedAtMount: boolean;
}) {
  return Boolean(historyBackedAtMount);
}

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
