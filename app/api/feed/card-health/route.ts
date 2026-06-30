import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 4 * 1024;
const MAX_FINGERPRINT_LENGTH = 120;
const MAX_LIST_LENGTH = 10;
const MAX_LIST_ENTRY_LENGTH = 120;
const MAX_CONTEXT_KEYS = 12;
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 20;
const SECRET_FIELD_PATTERN =
  /^(accessToken|refreshToken|idToken|secret|password|authorization)$/i;

type FeedCardHealthPayload = {
  surface: 'perps' | 'prediction' | 'defi';
  fingerprint: string;
  positionKeys?: string[];
  coins?: string[];
  context?: Record<string, unknown>;
};

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
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
      .map((entry) => sanitize(entry, depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SECRET_FIELD_PATTERN.test(key) ? '[redacted]' : sanitize(entry, depth + 1),
      ]),
    );
  }
  return undefined;
}

function isTrustedSameOriginRequest(request: NextRequest) {
  const requestOrigin = request.nextUrl.origin;
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (origin && origin !== requestOrigin) {
    return false;
  }

  if (referer) {
    try {
      if (new URL(referer).origin !== requestOrigin) return false;
    } catch {
      return false;
    }
  }

  if (
    fetchSite &&
    fetchSite !== 'same-origin' &&
    fetchSite !== 'same-site' &&
    fetchSite !== 'none'
  ) {
    return false;
  }

  return true;
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization')?.trim();
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const normalized = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
    .slice(0, MAX_LIST_LENGTH)
    .map((entry) => entry.slice(0, MAX_LIST_ENTRY_LENGTH));

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeContext(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>).slice(
    0,
    MAX_CONTEXT_KEYS,
  );

  return Object.fromEntries(
    entries.map(([key, entry]) => {
      const normalizedKey = key.slice(0, 80);
      return [
        normalizedKey,
        SECRET_FIELD_PATTERN.test(normalizedKey)
          ? '[redacted]'
          : sanitize(entry),
      ];
    }),
  );
}

function normalizePayload(payload: unknown): FeedCardHealthPayload | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const raw = payload as Record<string, unknown>;
  const surface = raw.surface;
  const fingerprint =
    typeof raw.fingerprint === 'string' ? raw.fingerprint.trim() : '';

  if (
    (surface !== 'perps' && surface !== 'prediction' && surface !== 'defi') ||
    !fingerprint
  ) {
    return null;
  }

  return {
    surface,
    fingerprint: fingerprint.slice(0, MAX_FINGERPRINT_LENGTH),
    ...(normalizeStringList(raw.positionKeys)
      ? { positionKeys: normalizeStringList(raw.positionKeys) }
      : {}),
    ...(normalizeStringList(raw.coins)
      ? { coins: normalizeStringList(raw.coins) }
      : {}),
    ...(normalizeContext(raw.context)
      ? { context: normalizeContext(raw.context) }
      : {}),
  };
}

function getFeedCardHealthLogPath() {
  if (process.env.SWOP_FEED_CARD_HEALTH_LOG_PATH) {
    return process.env.SWOP_FEED_CARD_HEALTH_LOG_PATH;
  }

  return path.resolve(
    process.cwd(),
    '..',
    '..',
    'logs',
    'desktop-feed-card-health.ndjson',
  );
}

export async function POST(request: NextRequest) {
  if (!isTrustedSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, error: 'Untrusted feed-card-health origin' },
      { status: 403 },
    );
  }

  const bearerToken = readBearerToken(request);
  const cookieToken = request.cookies.get('access-token')?.value?.trim();
  const userId = request.cookies.get('user-id')?.value?.trim();

  if (!bearerToken || !cookieToken || !userId || bearerToken !== cookieToken) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 },
    );
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { success: false, error: 'Feed-card-health payload too large' },
      { status: 413 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const normalizedPayload = normalizePayload(payload);
  if (!normalizedPayload) {
    return NextResponse.json(
      { success: false, error: 'Invalid feed-card-health payload' },
      { status: 400 },
    );
  }

  const event = {
    type: 'feed_card_health',
    receivedAt: new Date().toISOString(),
    source: 'desktop',
    userId,
    payload: normalizedPayload,
  };
  const line = JSON.stringify(event);

  console.warn('[feed-card-health]', line);

  try {
    const logPath = getFeedCardHealthLogPath();
    await mkdir(path.dirname(logPath), { recursive: true });
    await appendFile(logPath, `${line}\n`, 'utf8');
  } catch (error) {
    console.warn('[feed-card-health] local append failed', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Feed-card-health log unavailable',
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ success: true });
}
