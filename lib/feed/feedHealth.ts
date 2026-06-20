export type FeedHealthSurface =
  | 'feed'
  | 'perps'
  | 'prediction'
  | 'swap'
  | 'wallet_send'
  | 'metro';

export type FeedHealthSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface FeedHealthIssue {
  type?: 'feed_card_health_issue';
  surface: FeedHealthSurface;
  cardType: string;
  issueType: string;
  severity: FeedHealthSeverity;
  title: string;
  description: string;
  feedId?: string | null;
  userId?: string | null;
  smartsiteId?: string | null;
  sourceOfTruth?: Record<string, unknown>;
  cardState?: Record<string, unknown>;
  expectedState?: Record<string, unknown>;
  observedState?: Record<string, unknown>;
  acceptanceCriteria?: string[];
  fingerprintComponents?: Record<string, unknown>;
  createdAt?: string;
}

const MAX_STRING_LENGTH = 1_200;
const MAX_ARRAY_LENGTH = 30;

const SECRET_KEY_PATTERN =
  /(accessToken|refreshToken|idToken|secret|password|authorization|cookie|apiKey|privateKey|mnemonic|seed)/i;

export function sanitizeFeedHealthPayload(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 5) return '[truncated]';

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...`
      : value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeFeedHealthPayload(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key)
          ? '[redacted]'
          : sanitizeFeedHealthPayload(item, depth + 1),
      ]),
    );
  }

  return undefined;
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

function shortHash(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function createFeedHealthFingerprint(issue: FeedHealthIssue) {
  const stableParts = {
    surface: issue.surface,
    cardType: issue.cardType,
    issueType: issue.issueType,
    feedId: issue.feedId || undefined,
    fingerprintComponents: issue.fingerprintComponents || {},
  };

  return shortHash(stableSerialize(stableParts));
}

export async function reportFeedHealthIssue(issue: FeedHealthIssue) {
  if (typeof window === 'undefined') return;

  const fingerprint = createFeedHealthFingerprint(issue);

  try {
    await fetch('/api/feed/card-health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...issue,
        type: 'feed_card_health_issue',
        fingerprint,
        createdAt: issue.createdAt || new Date().toISOString(),
      }),
      cache: 'no-store',
    });
  } catch (error) {
    console.warn('[feed-card-health] report failed', error);
  }
}
