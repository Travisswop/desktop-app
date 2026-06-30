import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';

const DEFAULT_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const TOKEN_METADATA_TIMEOUT_MS = 2500;
const TOKEN_PRICE_TIMEOUT_MS = 2500;

interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

const FALLBACK_TOKEN_METADATA: Record<string, TokenMetadata> = {
  [SOL_MINT]: {
    address: SOL_MINT,
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
    logoURI: '/assets/crypto-icons/SOL.png',
    tags: ['native'],
  },
  [SOLANA_USDC_MINT]: {
    address: SOLANA_USDC_MINT,
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: '/assets/crypto-icons/USDC.png',
    tags: ['stablecoin'],
  },
  [SOLANA_USDT_MINT]: {
    address: SOLANA_USDT_MINT,
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    logoURI: '/assets/crypto-icons/USDT.png',
    tags: ['stablecoin'],
  },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: {
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    name: 'Jupiter',
    symbol: 'JUP',
    decimals: 6,
    logoURI: '/assets/crypto-icons/JUP.png',
    tags: [],
  },
  DezXAZ8z7PnrnRJjz3CVXBoPBs6JSu4Wf7P91mU9M: {
    address: 'DezXAZ8z7PnrnRJjz3CVXBoPBs6JSu4Wf7P91mU9M',
    name: 'Bonk',
    symbol: 'BONK',
    decimals: 5,
    logoURI: '/assets/crypto-icons/BONK.png',
    tags: [],
  },
};

type AggregatedTokenAccount = {
  mint: string;
  amount: number;
  decimals: number;
};

const loggedTokenWarnings = new Set<string>();

function warnTokenLookupOnce(key: string, message: string) {
  if (loggedTokenWarnings.has(key)) return;
  loggedTokenWarnings.add(key);
  console.warn(message);
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function fallbackPriceForMint(mintAddress: string) {
  if (mintAddress === SOLANA_USDC_MINT || mintAddress === SOLANA_USDT_MINT) {
    return '1';
  }

  return '0';
}

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
  const fallbackMetadata = FALLBACK_TOKEN_METADATA[mintAddress];
  if (fallbackMetadata) {
    return fallbackMetadata;
  }

  try {
    const response = await fetchWithTimeout(
      `https://tokens.jup.ag/token/${mintAddress}`,
      TOKEN_METADATA_TIMEOUT_MS
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
  } catch {
    warnTokenLookupOnce(
      'jupiter-token-metadata',
      '[tokens] Jupiter token metadata unavailable; using local token fallbacks where possible.'
    );
    return null;
  }
}

async function fetchPrice(tokenAddress: PublicKey): Promise<string> {
  const mintAddress = tokenAddress.toBase58();
  try {
    const response = await fetchWithTimeout(
      `https://api.jup.ag/price/v2?ids=${mintAddress}`,
      TOKEN_PRICE_TIMEOUT_MS
    );
    if (!response.ok) {
      return fallbackPriceForMint(mintAddress);
    }
    const data = await response.json();

    const price = data.data?.[mintAddress]?.price;
    if (!price) {
      return fallbackPriceForMint(mintAddress);
    }
    return price;
  } catch {
    warnTokenLookupOnce(
      'jupiter-token-price',
      '[tokens] Jupiter token prices unavailable; defaulting unknown token prices to $0.'
    );
    return fallbackPriceForMint(mintAddress);
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
      name: FALLBACK_TOKEN_METADATA[SOL_MINT].name,
      symbol: FALLBACK_TOKEN_METADATA[SOL_MINT].symbol,
      logoURI: FALLBACK_TOKEN_METADATA[SOL_MINT].logoURI,
      tags: FALLBACK_TOKEN_METADATA[SOL_MINT].tags,
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
