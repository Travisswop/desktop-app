import {
  getEvmSenderAddressForSend,
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
