import {
  LEGACY_SWOP_STOCK_MINT,
  SOLANA_CHAIN_ID,
  SWOP_TOKEN_MINT,
  reconcileSelectedSwapToken,
} from '@/lib/wallet/swapTokenSelection';

describe('swap token selection reconciliation', () => {
  it('replaces the stale SWOP placeholder with the canonical wallet token balance', () => {
    const selected = {
      symbol: 'SWOP',
      name: 'SWOP',
      address: LEGACY_SWOP_STOCK_MINT,
      chain: 'SOLANA',
      chainId: SOLANA_CHAIN_ID,
      decimals: 8,
      balance: '0',
    };

    const reconciled: any = reconcileSelectedSwapToken(selected, [
      {
        symbol: 'SWOP',
        name: 'Swop',
        address: SWOP_TOKEN_MINT,
        chain: 'SOLANA',
        decimals: 9,
        balance: '123.456789',
        walletAddress: 'sol-wallet-1',
      },
    ]);

    expect(reconciled.address).toBe(SWOP_TOKEN_MINT);
    expect(reconciled.id).toBe(SWOP_TOKEN_MINT);
    expect(reconciled.decimals).toBe(9);
    expect(reconciled.balance).toBe('123.456789');
    expect(reconciled.walletAddress).toBe('sol-wallet-1');
  });

  it('adds a live balance to a canonical SWOP token selected from search results', () => {
    const selected = {
      symbol: 'SWOP',
      name: 'Swop',
      address: SWOP_TOKEN_MINT,
      chain: 'SOLANA',
      chainId: SOLANA_CHAIN_ID,
      decimals: 9,
    };

    const reconciled: any = reconcileSelectedSwapToken(selected, [
      {
        symbol: 'SWOP',
        name: 'Swop',
        address: SWOP_TOKEN_MINT,
        chain: 'SOLANA',
        decimals: 9,
        balance: '42',
      },
    ]);

    expect(reconciled.balance).toBe('42');
  });

  it('does not borrow a same-symbol balance from a different chain', () => {
    const selected = {
      symbol: 'USDC',
      name: 'USD Coin',
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      chain: 'SOLANA',
      chainId: SOLANA_CHAIN_ID,
      decimals: 6,
      balance: '0',
    };

    const reconciled = reconcileSelectedSwapToken(selected, [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        chain: 'ARBITRUM',
        decimals: 6,
        balance: '999',
      },
    ]);

    expect(reconciled).toBe(selected);
  });
});
