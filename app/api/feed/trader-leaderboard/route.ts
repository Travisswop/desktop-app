import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      enabled: false,
      message:
        'Leaderboard feed modules are disabled in this release.',
    },
    { status: 410 },
  );
}
