import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

async function fetchTokenMetadata(
  mintAddress: string
): Promise<TokenMetadata | null> {
  try {
    const response = await fetch(
      `https://tokens.jup.ag/token/${mintAddress}`
    );
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return {
      address: data.address,
      name: data.name,
      symbol: data.symbol,
      decimals: data.decimals,
      logoURI: data.logoURI,
      tags: data.tags,
    };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

async function fetchPrice(tokenAddress: PublicKey): Promise<string> {
  try {
    const response = await fetch(
      `https://api.jup.ag/price/v2?ids=${tokenAddress}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch price');
    }
    const data = await response.json();

    const price = data.data[tokenAddress.toBase58()].price;
    if (!price) {
      return '0';
    }
    return price;
  } catch (error: any) {
    console.error('Error fetching price:', error);
    return '0';
  }
}

export async function GET(request: NextRequest) {
  try {
    // Connect to Solana network
    const connection = new Connection(process.env.RPC_URL!);

    // Get wallet address from URL params
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Create PublicKey from address param
    const walletAddress = new PublicKey(address);

    // Fetch native SOL balance
    const solBalance = await connection.getBalance(walletAddress);
    const solPrice = await fetchPrice(
      new PublicKey('So11111111111111111111111111111111111111112')
    );

    // Fetch all token accounts owned by this wallet
    const tokenAccounts =
      await connection.getParsedTokenAccountsByOwner(walletAddress, {
        programId: TOKEN_PROGRAM_ID,
      });

    // Add native SOL as the first token
    const nativeSol = {
      mint: 'So11111111111111111111111111111111111111112',
      amount: solBalance / 1e9, // Convert lamports to SOL
      decimals: 9,
      price: solPrice,
      name: 'Solana',
      symbol: 'SOL',
      logoURI:
        'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      tags: ['native'],
    };

    // Map token accounts to a more usable format and fetch prices and metadata
    const tokenList = await Promise.all(
      tokenAccounts.value.map(async (tokenAccount) => {
        const accountData = tokenAccount.account.data.parsed.info;
        const mintAddress = accountData.mint;
        const [price, metadata] = await Promise.all([
          fetchPrice(new PublicKey(mintAddress)),
          fetchTokenMetadata(mintAddress),
        ]);

        return {
          mint: mintAddress,
          amount: accountData.tokenAmount.uiAmount,
          decimals: accountData.tokenAmount.decimals,
          price,
          name: metadata?.name || mintAddress.slice(0, 8),
          symbol: metadata?.symbol || 'Unknown',
          logoURI: metadata?.logoURI || '',
          tags: metadata?.tags || [],
        };
      })
    );

    // Combine native SOL with other tokens
    const tokens = [nativeSol, ...tokenList];

    return NextResponse.json({
      tokens,
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
