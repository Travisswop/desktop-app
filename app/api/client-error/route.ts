import { NextRequest, NextResponse } from 'next/server';

// Client-side crashes previously died in the user's browser: global-error.tsx
// discarded the error object, so a user reporting "application error" left no
// trace anywhere we could read. This endpoint receives the beacon that
// global-error sends, so the failure lands in the Vercel runtime logs without
// the user having to open a console or tell us anything.
export const runtime = 'nodejs';

const MAX_FIELD = 2000;

function clip(value: unknown, max = MAX_FIELD) {
  return typeof value === 'string' ? value.slice(0, max) : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    // Never trust or echo the payload — it comes from the browser. Clip every
    // field, keep only what identifies the crash, and don't reflect it back.
    console.error('[client-error]', {
      digest: clip(body?.digest, 200),
      message: clip(body?.message),
      name: clip(body?.name, 200),
      stack: clip(body?.stack, 4000),
      route: clip(body?.route, 500),
      userId: clip(body?.userId, 100),
      userAgent: clip(req.headers.get('user-agent'), 500),
    });
  } catch (error) {
    console.error('[client-error] failed to record beacon', error);
  }

  // Always 204 — this endpoint must never itself become a source of errors.
  return new NextResponse(null, { status: 204 });
}
