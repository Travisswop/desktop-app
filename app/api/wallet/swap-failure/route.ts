import { mkdir, appendFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import {
  sanitizeForLog,
  sendSwapFailureAlertEmail,
  type SwapFailureEvent,
} from '@/lib/wallet/swapFailureAlert';

export const runtime = 'nodejs';

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

  const event: SwapFailureEvent = {
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

  try {
    const result = await sendSwapFailureAlertEmail(event);
    if (!result.sent) {
      console.warn(
        '[wallet-swap-failure] email alert skipped',
        result.skippedReason,
      );
    }
  } catch (error) {
    console.warn('[wallet-swap-failure] email alert failed', error);
  }

  return NextResponse.json({ success: true });
}
