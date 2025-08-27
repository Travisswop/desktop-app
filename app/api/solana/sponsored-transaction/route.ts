import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { walletId, transaction, userAuthToken } = await request.json();

    if (!walletId || !transaction) {
      return NextResponse.json(
        { error: 'Missing walletId or transaction' },
        { status: 400 }
      );
    }

    // Get Privy credentials from environment variables
    const privyAppId = process.env.PRIVY_APP_ID;
    const privyAppSecret = process.env.PRIVY_APP_SECRET;

    if (!privyAppId || !privyAppSecret) {
      console.error('Missing Privy credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create basic auth header
    const basicAuth = Buffer.from(`${privyAppId}:${privyAppSecret}`).toString('base64');

    // Call Privy's API to sponsor the transaction
    const privyResponse = await fetch(`https://api.privy.io/v1/wallets/${walletId}/rpc`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'privy-app-id': privyAppId,
        'Content-Type': 'application/json',
        // Note: In production, you would need to generate proper authorization signatures
        // For now, we'll rely on the basic auth and app-id header
      },
      body: JSON.stringify({
        method: 'signAndSendTransaction',
        caip2: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', // Solana mainnet
        params: {
          transaction,
          encoding: 'base64',
        },
        sponsor: true, // This enables gas sponsoring
      }),
    });

    if (!privyResponse.ok) {
      const errorText = await privyResponse.text();
      console.error('Privy API error:', privyResponse.status, errorText);
      return NextResponse.json(
        { 
          error: 'Failed to submit sponsored transaction',
          details: errorText 
        },
        { status: privyResponse.status }
      );
    }

    const result = await privyResponse.json();
    
    return NextResponse.json({
      success: true,
      signature: result.result?.signature || result.signature,
      transactionId: result.result?.signature || result.signature,
    });

  } catch (error) {
    console.error('Sponsored transaction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}