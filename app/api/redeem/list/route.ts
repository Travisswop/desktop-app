import { NextResponse } from 'next/server';
import { listRedemptionPools } from '@/utils/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const privyUserId = searchParams.get('privyUserId');

    if (!privyUserId) {
      return NextResponse.json(
        { success: false, message: 'Missing privyUserId parameter' },
        { status: 400 }
      );
    }

    const pools = await listRedemptionPools(privyUserId);

    return NextResponse.json({
      success: true,
      pools,
    });
  } catch (error: any) {
    console.error('Error fetching redemption pools:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch redemption pools',
      },
      { status: 500 }
    );
  }
}
