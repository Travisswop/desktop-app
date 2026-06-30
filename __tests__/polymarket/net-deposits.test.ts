jest.mock('@/providers/polymarket', () => ({
  usePolymarketWallet: jest.fn(),
}));

import {
  CTF_EXCHANGE_ADDRESS,
  CTF_CONTRACT_ADDRESS,
} from '@/constants/polymarket';
import {
  type CashFlowCandidate,
  filterExternalCashFlowCandidates,
  isPolymarketProtocolTransactionReceipt,
} from '@/hooks/polymarket/useNetDeposits';

describe('Polymarket net deposits classifier', () => {
  const baseCandidate = {
    type: 'withdrawal',
    token: 'pUSD',
    safeAddress: '0xSafe',
    counterparty: '0xCounterparty',
    value: BigInt(1_000_000),
  } satisfies Omit<CashFlowCandidate, 'log'>;

  it('recognizes receipts with Polymarket protocol logs as internal activity', () => {
    expect(
      isPolymarketProtocolTransactionReceipt({
        to: '0xExternalWallet',
        logs: [{ address: CTF_EXCHANGE_ADDRESS.toUpperCase() }],
      }),
    ).toBe(true);

    expect(
      isPolymarketProtocolTransactionReceipt({
        to: CTF_CONTRACT_ADDRESS,
        logs: [{ address: '0xExternalWallet' }],
      }),
    ).toBe(true);

    expect(
      isPolymarketProtocolTransactionReceipt({
        to: '0xExternalWallet',
        logs: [{ address: '0xAnotherWallet' }],
      }),
    ).toBe(false);
  });

  it('drops wallet-to-wallet token transfers that are part of prediction trades', async () => {
    const candidates: CashFlowCandidate[] = [
      {
        ...baseCandidate,
        log: { transactionHash: '0xtrade' },
      },
      {
        ...baseCandidate,
        type: 'deposit',
        counterparty: '0xMainWallet',
        log: { transactionHash: '0xdeposit' },
      },
    ];

    const publicClient = {
      getTransactionReceipt: jest.fn(async ({ hash }: { hash: string }) =>
        hash === '0xtrade'
          ? { to: '0xRelayer', logs: [{ address: CTF_EXCHANGE_ADDRESS }] }
          : { to: '0xMainWallet', logs: [{ address: '0xToken' }] },
      ),
    };

    await expect(
      filterExternalCashFlowCandidates(publicClient, candidates),
    ).resolves.toEqual([candidates[1]]);
  });
});
