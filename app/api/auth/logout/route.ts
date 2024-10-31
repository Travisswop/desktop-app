import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear all auth-related cookies
  response.cookies.delete('privy-token');
  response.cookies.delete('privy-id-token');
  response.cookies.delete('privy-refresh-token');

  return response;
}
