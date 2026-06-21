import { NextRequest, NextResponse } from 'next/server';

const HELIUS_RPC_ENDPOINT = 'https://mainnet.helius-rpc.com';
const ALLOWED_PROXY_HOSTS = [
  'mainnet.helius-rpc.com',
  'aura-mainnet.metaplex.com',
];

const getServerHeliusApiKey = () =>
  process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY || '';

const buildAssetsByOwnerRequest = (
  ownerAddress: string,
  requestBody?: Record<string, any>,
) => ({
  jsonrpc: '2.0',
  id: requestBody?.id || 'swop-get-assets-by-owner',
  method: 'getAssetsByOwner',
  params: {
    ...(requestBody?.params || {}),
    ownerAddress,
    page: requestBody?.params?.page || 1,
    limit: requestBody?.params?.limit || 1000,
    displayOptions: {
      showFungible: false,
      showNativeBalance: false,
      showUnverifiedCollections: true,
      showCollectionMetadata: true,
      ...(requestBody?.params?.displayOptions || {}),
    },
  },
});

const isAllowedProxyEndpoint = (endpoint: string) => {
  try {
    const url = new URL(endpoint);
    return (
      url.protocol === 'https:' &&
      (ALLOWED_PROXY_HOSTS.includes(url.hostname) ||
        url.hostname.endsWith('.quiknode.pro'))
    );
  } catch {
    return false;
  }
};

export async function POST(req: NextRequest) {
  try {
    const { endpoint, ownerAddress, requestBody } = await req.json();

    if (typeof ownerAddress === 'string' && ownerAddress.trim()) {
      const apiKey = getServerHeliusApiKey();

      if (!apiKey) {
        return NextResponse.json(
          { error: 'Solana NFT provider is not configured' },
          { status: 503 }
        );
      }

      const response = await fetch(`${HELIUS_RPC_ENDPOINT}/?api-key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          buildAssetsByOwnerRequest(ownerAddress.trim(), requestBody)
        ),
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (
      typeof endpoint !== 'string' ||
      !isAllowedProxyEndpoint(endpoint) ||
      !requestBody
    ) {
      return NextResponse.json(
        { error: 'Invalid Solana NFT proxy request' },
        { status: 400 }
      );
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in solana-nft proxy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Metaplex API' },
      { status: 500 }
    );
  }
}
