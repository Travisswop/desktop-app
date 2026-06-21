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

function getLocalFailureLogPath() {
  if (process.env.SWOP_SWAP_FAILURE_LOG_PATH) {
    return process.env.SWOP_SWAP_FAILURE_LOG_PATH;
  }

  return path.resolve(
    process.cwd(),
    '..',
    '..',
    'logs',
    'desktop-swap-failures.ndjson',
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
    type: 'wallet_swap_failure',
    receivedAt: new Date().toISOString(),
    source: 'desktop',
    payload: sanitizeForLog(payload),
  };
  const line = JSON.stringify(event);

  console.warn('[wallet-swap-failure]', line);

  try {
    const logPath = getLocalFailureLogPath();
    await mkdir(path.dirname(logPath), { recursive: true });
    await appendFile(logPath, `${line}\n`, 'utf8');
  } catch (error) {
    console.warn('[wallet-swap-failure] local append failed', error);
  }

  return NextResponse.json({ success: true });
}
