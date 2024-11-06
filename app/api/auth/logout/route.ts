import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Clear all auth-related cookies
    const response = NextResponse.json({ success: true });
    response.cookies.delete('privy-token');
    response.cookies.delete('privy-id-token');
    response.cookies.delete('privy-refresh-token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
