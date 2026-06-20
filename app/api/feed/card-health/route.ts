import { mkdir, appendFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeFeedHealthPayload } from '@/lib/feed/feedHealth';

export const runtime = 'nodejs';

function getLocalFeedHealthLogPath() {
  if (process.env.SWOP_FEED_HEALTH_LOG_PATH) {
    return process.env.SWOP_FEED_HEALTH_LOG_PATH;
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
    type: 'feed_card_health_issue',
    receivedAt: new Date().toISOString(),
    source: 'desktop',
    payload: sanitizeFeedHealthPayload(payload),
  };
  const line = JSON.stringify(event);

  console.warn('[feed-card-health]', line);

  try {
    const logPath = getLocalFeedHealthLogPath();
    await mkdir(path.dirname(logPath), { recursive: true });
    await appendFile(logPath, `${line}\n`, 'utf8');
  } catch (error) {
    console.warn('[feed-card-health] local append failed', error);
  }

  return NextResponse.json({ success: true });
}
