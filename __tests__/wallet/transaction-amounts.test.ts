import { calculateTransactionAmount } from '@/lib/utils/transactionUtils';
import type { SendFlowState } from '@/types/wallet-types';

const baseFlow: SendFlowState = {
  step: 'confirm',
  token: {
    name: 'Polygon Token',
    symbol: 'POLY',
    balance: '0.04',
    decimals: 18,
    walletAddress: '0xsender',
    address: '0xtoken',
    logoURI: '',
    chain: 'POLYGON',
    marketData: {
      price: '3',
    },
    timeSeriesData: { '1H': [], '1D': [], '1W': [], '1M': [], '1Y': [] },
  },
  amount: '0.12',
  isUSD: true,
  recipient: { address: '0xrecipient' },
  nft: null,
  network: 'POLYGON',
  hash: '',
};

describe('calculateTransactionAmount', () => {
  it('converts USD-denominated EVM token sends into token units', () => {
    expect(calculateTransactionAmount(baseFlow)).toBe('0.040000000000000000');
  });

  it('trims converted token amounts to the token decimals', () => {
    expect(
      calculateTransactionAmount({
        ...baseFlow,
        token: {
          ...baseFlow.token!,
          decimals: 6,
          marketData: { price: '7' },
        },
        amount: '1',
      }),
    ).toBe('0.142857');
  });
});
