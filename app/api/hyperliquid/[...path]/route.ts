/**
 * Hyperliquid API Proxy
 *
 * Proxies browser requests to the Hyperliquid API server-side, bypassing
 * the CORS restriction that blocks direct browser → api.hyperliquid.xyz calls.
 *
 * URL pattern:
 *   POST /api/hyperliquid/mainnet/<endpoint>  → https://api.hyperliquid.xyz/<endpoint>
 *   POST /api/hyperliquid/testnet/<endpoint>  → https://api.hyperliquid-testnet.xyz/<endpoint>
 */
import { NextRequest, NextResponse } from 'next/server';

const MAINNET_API_URL = 'https://api.hyperliquid.xyz';
const TESTNET_API_URL = 'https://api.hyperliquid-testnet.xyz';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  // path[0] = "mainnet" | "testnet", path[1..] = endpoint (e.g. "exchange", "info")
  const [network, ...rest] = path;
  const endpoint = rest.join('/');

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const baseUrl = network === 'testnet' ? TESTNET_API_URL : MAINNET_API_URL;
  const targetUrl = `${baseUrl}/${endpoint}`;

  const body = await request.text();

  const upstream = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
  });

  const responseBody = await upstream.text();

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
