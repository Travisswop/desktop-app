import {
  getEmbeddedEvmWalletAddressesForSend,
  getEvmSenderAddressForSend,
  getSolanaWalletAddressesForSend,
  resolveEvmEmbeddedSenderForSend,
  selectSolanaWalletForSend,
  walletAddressesMatch,
} from '@/lib/wallet/sendWalletOwner';
import type { SendFlowState } from '@/types/wallet-types';

const baseFlow: SendFlowState = {
  step: 'confirm',
  token: {
    name: 'Swop',
    symbol: 'SWOP',
    balance: '1',
    decimals: 9,
    walletAddress: 'owner-wallet',
    address: 'swop-mint',
    logoURI: '',
    chain: 'SOLANA',
    marketData: null,
    timeSeriesData: { '1H': [], '1D': [], '1W': [], '1M': [], '1Y': [] },
  },
  amount: '1',
  isUSD: false,
  recipient: { address: 'recipient-wallet' },
  nft: null,
  network: 'SOLANA',
  hash: '',
};

describe('send wallet owner selection', () => {
  it('selects the signable Solana wallet that owns the selected token balance', () => {
    const fallbackWallet = { address: 'default-wallet' };
    const ownerWallet = { address: 'owner-wallet' };

    expect(
      selectSolanaWalletForSend(
        [fallbackWallet, ownerWallet],
        baseFlow,
        fallbackWallet,
      ),
    ).toBe(ownerWallet);
  });

  it('falls back to the selected Solana wallet when the token has no owner address', () => {
    const fallbackWallet = { address: 'default-wallet' };

    expect(
      selectSolanaWalletForSend(
        [fallbackWallet],
        {
          ...baseFlow,
          token: { ...baseFlow.token!, walletAddress: undefined },
        },
        fallbackWallet,
      ),
    ).toBe(fallbackWallet);
  });

  it('uses the EVM token owner as the sender address', () => {
    const owner = '0x1111111111111111111111111111111111111111';
    const fallback = '0x2222222222222222222222222222222222222222';

    expect(
      getEvmSenderAddressForSend(
        {
          ...baseFlow,
          token: {
            ...baseFlow.token!,
            chain: 'POLYGON',
            walletAddress: owner,
          },
          network: 'POLYGON',
        },
        fallback,
      ),
    ).toBe(owner);
  });

  it('uses the canonical embedded EVM wallet address for token-owner sends', () => {
    const tokenOwner = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const embeddedWallet = {
      address: '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD',
      walletClientType: 'privy',
    };

    expect(
      resolveEvmEmbeddedSenderForSend(
        [embeddedWallet],
        {
          ...baseFlow,
          token: {
            ...baseFlow.token!,
            chain: 'POLYGON',
            walletAddress: tokenOwner,
          },
          network: 'POLYGON',
        },
      ),
    ).toEqual({
      address: embeddedWallet.address,
      tokenOwnerAddress: tokenOwner,
      tokenOwnerUnavailable: false,
    });
  });

  it('does not pass a token-owner address that is not an embedded wallet', () => {
    const tokenOwner = '0x1111111111111111111111111111111111111111';
    const embeddedWallet = {
      address: '0x2222222222222222222222222222222222222222',
      walletClientType: 'privy',
    };

    expect(
      resolveEvmEmbeddedSenderForSend(
        [embeddedWallet],
        {
          ...baseFlow,
          token: {
            ...baseFlow.token!,
            chain: 'POLYGON',
            walletAddress: tokenOwner,
          },
          network: 'POLYGON',
        },
      ),
    ).toEqual({
      address: '',
      tokenOwnerAddress: tokenOwner,
      tokenOwnerUnavailable: true,
    });
  });

  it('falls back to the embedded EVM wallet when there is no token owner', () => {
    const embeddedWallet = {
      address: '0x2222222222222222222222222222222222222222',
      connectorType: 'embedded',
    };

    expect(
      resolveEvmEmbeddedSenderForSend(
        [embeddedWallet],
        {
          ...baseFlow,
          token: {
            ...baseFlow.token!,
            chain: 'POLYGON',
            walletAddress: undefined,
          },
          network: 'POLYGON',
        },
        '0x3333333333333333333333333333333333333333',
      ),
    ).toEqual({
      address: embeddedWallet.address,
      tokenOwnerAddress: '',
      tokenOwnerUnavailable: false,
    });
  });

  it('builds Solana token queries from signable Solana wallets instead of stale stored addresses', () => {
    expect(
      getSolanaWalletAddressesForSend(
        [{ address: 'signable-sol-wallet' }],
        'stored-sol-wallet',
      ),
    ).toEqual(['signable-sol-wallet']);
  });

  it('builds EVM token queries from embedded wallets instead of stale stored addresses', () => {
    expect(
      getEmbeddedEvmWalletAddressesForSend(
        [
          {
            address: '0x1111111111111111111111111111111111111111',
            walletClientType: 'metamask',
            connectorType: 'injected',
          },
          {
            address: '0x2222222222222222222222222222222222222222',
            walletClientType: 'privy',
            connectorType: 'embedded',
          },
        ],
        '0x3333333333333333333333333333333333333333',
      ),
    ).toEqual(['0x2222222222222222222222222222222222222222']);
  });

  it('matches EVM addresses case-insensitively and Solana addresses exactly', () => {
    expect(
      walletAddressesMatch(
        '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ),
    ).toBe(true);
    expect(walletAddressesMatch('SolWalletABC', 'solwalletabc')).toBe(false);
  });
});
