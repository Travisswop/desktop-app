import { mkdir, appendFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_STRING_LENGTH = 1_200;
const MAX_ARRAY_LENGTH = 30;

function sanitizeForLog(value: unknown, depth = 0): unknown {
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
      .map((item) => sanitizeForLog(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, item]) => [
          key,
          /^(accessToken|refreshToken|idToken|secret|password|authorization)$/i.test(
            key,
          )
            ? '[redacted]'
            : sanitizeForLog(item, depth + 1),
        ],
      ),
    );
  }
  return undefined;
}

function getLocalFeedHealthLogPath() {
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
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const rawEvents = Array.isArray((payload as { events?: unknown[] })?.events)
    ? (payload as { events: unknown[] }).events
    : Array.isArray(payload)
    ? payload
    : [payload];

  const lines = rawEvents.map((rawEvent) => {
    const sanitized = sanitizeForLog(rawEvent);
    const event =
      sanitized && typeof sanitized === 'object'
        ? {
            receivedAt: new Date().toISOString(),
            source: 'desktop',
            ...(sanitized as Record<string, unknown>),
          }
        : {
            type: 'feed_card_health',
            receivedAt: new Date().toISOString(),
            source: 'desktop',
            payload: sanitized,
          };
    const line = JSON.stringify(event);
    console.warn('[feed-card-health]', line);
    return line;
  });

  try {
    const logPath = getLocalFeedHealthLogPath();
    await mkdir(path.dirname(logPath), { recursive: true });
    await appendFile(logPath, `${lines.join('\n')}\n`, 'utf8');
  } catch (error) {
    console.warn('[feed-card-health] local append failed', error);
  }

  return NextResponse.json({ success: true, logged: lines.length });
}
