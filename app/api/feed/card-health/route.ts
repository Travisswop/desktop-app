import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 20;

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
        /^(accessToken|refreshToken|idToken|secret|password|authorization)$/i.test(
          key,
        )
          ? '[redacted]'
          : sanitize(entry, depth + 1),
      ]),
    );
  }
  return undefined;
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
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const event = {
    type: 'feed_card_health',
    receivedAt: new Date().toISOString(),
    source: 'desktop',
    payload: sanitize(payload),
  };
  const line = JSON.stringify(event);

  console.warn('[feed-card-health]', line);

  try {
    const logPath = getFeedCardHealthLogPath();
    await mkdir(path.dirname(logPath), { recursive: true });
    await appendFile(logPath, `${line}\n`, 'utf8');
  } catch (error) {
    console.warn('[feed-card-health] local append failed', error);
  }

  return NextResponse.json({ success: true });
}
