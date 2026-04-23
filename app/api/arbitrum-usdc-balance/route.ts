/**
 * Server-side Arbitrum USDC balance check.
 *
 * Runs on the Next.js server so there is no CORS restriction and the
 * Alchemy RPC is always available, regardless of whether the client has
 * the NEXT_PUBLIC_ variable in its bundle.
 *
 * GET /api/arbitrum-usdc-balance?address=0x...&testnet=true
 */
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, erc20Abi, formatUnits } from 'viem';
import { arbitrum, arbitrumSepolia } from 'viem/chains';

const MAINNET_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const;
const TESTNET_USDC  = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as const;
const USDC_DECIMALS = 6;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const address  = searchParams.get('address');
  const isTestnet = searchParams.get('testnet') === 'true';

  if (!address) {
    return NextResponse.json({ balance: '0' });
  }

  try {
    const chain      = isTestnet ? arbitrumSepolia : arbitrum;
    const rpcUrl     = isTestnet
      ? undefined  // use chain default for Sepolia
      : process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL;
    const usdcAddress = isTestnet ? TESTNET_USDC : MAINNET_USDC;

    const client = createPublicClient({ chain, transport: http(rpcUrl) });

    const raw = await client.readContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    const balance = formatUnits(raw as bigint, USDC_DECIMALS);
    return NextResponse.json({ balance });
  } catch (err) {
    console.error('[arbitrum-usdc-balance]', err);
    return NextResponse.json({ balance: '0' });
  }
}
