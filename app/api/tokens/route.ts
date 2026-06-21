import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';

const DEFAULT_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

type AggregatedTokenAccount = {
  mint: string;
  amount: number;
  decimals: number;
};

function getSolanaRpcUrl() {
  return (
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
    process.env.SOLANA_MAINNET_URL?.trim() ||
    DEFAULT_SOLANA_RPC_URL
  );
}

function aggregateTokenAccounts(
  tokenAccounts: Array<{
    account: {
      data: {
        parsed?: {
          info?: {
            mint?: string;
            tokenAmount?: {
              decimals?: number;
              uiAmount?: number | null;
              uiAmountString?: string;
            };
          };
        };
      };
    };
  }>
) {
  const tokensByMint = new Map<string, AggregatedTokenAccount>();

  tokenAccounts.forEach((tokenAccount) => {
    const accountData = tokenAccount.account.data.parsed?.info;
    const mintAddress = accountData?.mint;
    const tokenAmount = accountData?.tokenAmount;
    if (!mintAddress || !tokenAmount) return;

    const amount = Number(tokenAmount.uiAmountString ?? tokenAmount.uiAmount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const existing = tokensByMint.get(mintAddress);
    if (existing) {
      existing.amount += amount;
      return;
    }

    tokensByMint.set(mintAddress, {
      mint: mintAddress,
      amount,
      decimals: tokenAmount.decimals ?? 0,
    });
  });

  return Array.from(tokensByMint.values());
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
    const connection = new Connection(getSolanaRpcUrl());

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
      new PublicKey(SOL_MINT)
    );

    // Fetch all token accounts owned by this wallet
    const [classicTokenAccounts, token2022Accounts] = await Promise.all([
      connection.getParsedTokenAccountsByOwner(walletAddress, {
        programId: TOKEN_PROGRAM_ID,
      }),
      connection.getParsedTokenAccountsByOwner(walletAddress, {
        programId: TOKEN_2022_PROGRAM_ID,
      }),
    ]);

    // Add native SOL as the first token
    const nativeSol = {
      mint: SOL_MINT,
      amount: solBalance / 1e9, // Convert lamports to SOL
      decimals: 9,
      price: solPrice,
      name: 'Solana',
      symbol: 'SOL',
      logoURI:
        'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      tags: ['native'],
    };

    const tokenAccounts = aggregateTokenAccounts([
      ...classicTokenAccounts.value,
      ...token2022Accounts.value,
    ]);

    // Map token accounts to a more usable format and fetch prices and metadata
    const tokenList = await Promise.all(
      tokenAccounts.map(async (tokenAccount) => {
        const mintAddress = tokenAccount.mint;
        const [price, metadata] = await Promise.all([
          fetchPrice(new PublicKey(mintAddress)),
          fetchTokenMetadata(mintAddress),
        ]);

        return {
          mint: mintAddress,
          amount: tokenAccount.amount,
          decimals: metadata?.decimals ?? tokenAccount.decimals,
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
