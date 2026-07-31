import { NextRequest, NextResponse } from 'next/server';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';

// Client-side crashes previously died in the user's browser: global-error.tsx
// discarded the error object, so a user reporting "application error" left no
// trace anywhere we could read.
//
// The browser beacons here rather than straight at the backend so the request
// stays same-origin — sendBeacon gives no way to observe or recover from a
// CORS preflight failure, and a dropped report is one we never learn about.
// This route logs it (Vercel runtime logs) and forwards it to the backend,
// which groups it for the admin console error log.
export const runtime = 'nodejs';

const MAX_FIELD = 2000;
const FORWARD_TIMEOUT_MS = 3000;

function clip(value: unknown, max = MAX_FIELD) {
  return typeof value === 'string' ? value.slice(0, max) : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    // Never trust or echo the payload — it comes from the browser. Clip every
    // field, keep only what identifies the crash, and don't reflect it back.
    const report = {
      digest: clip(body?.digest, 200),
      message: clip(body?.message),
      name: clip(body?.name, 200),
      stack: clip(body?.stack, 4000),
      route: clip(body?.route, 500),
      userId: clip(body?.userId, 100),
    };

    console.error('[client-error]', {
      ...report,
      userAgent: clip(req.headers.get('user-agent'), 500),
    });

    // Best effort: the log line above is already captured, so a backend blip
    // must not turn this into a failing request the browser might retry.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);
    try {
      await fetch(buildSwopApiUrl('/api/v1/client-errors'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': req.headers.get('user-agent') ?? 'swop-desktop',
        },
        body: JSON.stringify(report),
        signal: controller.signal,
      });
    } catch (forwardError) {
      console.error('[client-error] forward failed', forwardError);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('[client-error] failed to record beacon', error);
  }

  // Always 204 — this endpoint must never itself become a source of errors.
  return new NextResponse(null, { status: 204 });
}
