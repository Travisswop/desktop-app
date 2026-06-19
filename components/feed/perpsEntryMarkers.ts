export interface PerpsEntryMarker {
  event?: 'open' | 'add';
  orderId?: string | number | null;
  price?: number | string | null;
  sizeCoins?: number | string | null;
  notionalUsd?: number | string | null;
  timestamp?: string | null;
}

interface PerpsEntryMarkerContent {
  entryPrice?: number | string | null;
  markPrice?: number | string | null;
  sizeCoins?: number | string | null;
  notionalUsd?: number | string | null;
  openedAt?: string | null;
  updatedAt?: string | null;
}

function maybeFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstFiniteNumber(values: unknown[], fallback = 0) {
  for (const value of values) {
    const number = maybeFiniteNumber(value);
    if (number !== null) return number;
  }
  return fallback;
}

function timestampMs(value?: string | null) {
  const milliseconds = Date.parse(value || '');
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function firstTimestamp(values: Array<string | null | undefined>) {
  return values.find((value) => timestampMs(value) !== null);
}

function earliestOpenEntryTimestamp(entries: PerpsEntryMarker[]) {
  return entries
    .filter((entry) => entry.event !== 'add')
    .map((entry) => entry.timestamp)
    .filter((value): value is string => timestampMs(value) !== null)
    .sort((a, b) => (timestampMs(a) || 0) - (timestampMs(b) || 0))[0];
}

function selectCanonicalOpenEntry(
  entries: PerpsEntryMarker[],
  openTimestamp: string,
) {
  const candidates = entries.filter((entry) => entry.event !== 'add');
  const sourceEntries = candidates.length > 0 ? candidates : entries;
  if (sourceEntries.length === 0) return null;

  const openTime = timestampMs(openTimestamp);
  const timestampedEntries = sourceEntries
    .map((entry, index) => ({
      entry,
      index,
      time: timestampMs(entry.timestamp),
    }))
    .filter((item) => item.time !== null);

  if (timestampedEntries.length === 0) return sourceEntries[0] || null;

  if (openTime === null) {
    return timestampedEntries.sort(
      (a, b) => (a.time || 0) - (b.time || 0) || a.index - b.index,
    )[0].entry;
  }

  return timestampedEntries.sort((a, b) => {
    const aDistance = Math.abs((a.time || 0) - openTime);
    const bDistance = Math.abs((b.time || 0) - openTime);
    return aDistance - bDistance || (a.time || 0) - (b.time || 0);
  })[0].entry;
}

function normalizedOrderId(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

export function normalizePerpsEntryMarkers(
  rawEntries: PerpsEntryMarker[] | undefined,
  content: PerpsEntryMarkerContent,
  fallbackCreatedAt?: string,
) {
  const entries = Array.isArray(rawEntries) ? rawEntries.filter(Boolean) : [];
  const openTimestamp =
    firstTimestamp([
      content.openedAt,
      earliestOpenEntryTimestamp(entries),
      fallbackCreatedAt,
      content.updatedAt,
    ]) || new Date().toISOString();
  const canonicalEntry = selectCanonicalOpenEntry(entries, openTimestamp);
  const orderId = normalizedOrderId(canonicalEntry?.orderId);

  return [
    {
      event: 'open' as const,
      ...(orderId ? { orderId } : {}),
      price: firstFiniteNumber([
        content.entryPrice,
        canonicalEntry?.price,
        content.markPrice,
      ]),
      sizeCoins: firstFiniteNumber([
        content.sizeCoins,
        canonicalEntry?.sizeCoins,
      ]),
      notionalUsd: firstFiniteNumber([
        content.notionalUsd,
        canonicalEntry?.notionalUsd,
      ]),
      timestamp: openTimestamp,
    },
  ];
}
