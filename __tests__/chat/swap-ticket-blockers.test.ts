import { getSwapActionBlocker } from '@/lib/chat/ticketFormat';

describe('getSwapActionBlocker', () => {
  const baseParams = {
    canAct: true,
    fromToken: 'MCDX',
    hasQuoteTokenOptions: true,
    hasSpendableBalance: true,
    hasValidSellAmount: true,
    amountExceedsBalance: false,
    payAmount: '10',
    quoteStateStatus: 'idle' as const,
    selectedFromKey: 'mcdx-sol',
    selectedToKey: 'usdc-sol',
  };

  it('explains when only the initiating user can approve the swap', () => {
    expect(
      getSwapActionBlocker({
        ...baseParams,
        canAct: false,
      })
    ).toEqual({
      tone: 'warning',
      message: 'Only the user who asked Astro to prepare this swap can approve it.',
    });
  });

  it('explains when no spendable balance is available', () => {
    expect(
      getSwapActionBlocker({
        ...baseParams,
        hasSpendableBalance: false,
      })
    ).toEqual({
      tone: 'warning',
      message:
        'No spendable MCDX balance is available. Fund the wallet or pick another token before swapping.',
    });
  });

  it('explains when the user has not entered an amount', () => {
    expect(
      getSwapActionBlocker({
        ...baseParams,
        payAmount: '   ',
      })
    ).toEqual({
      tone: 'warning',
      message: 'Enter how much MCDX you want to swap to get a live quote.',
    });
  });

  it('explains when the user picks the same token for both sides', () => {
    expect(
      getSwapActionBlocker({
        ...baseParams,
        selectedToKey: 'mcdx-sol',
      })
    ).toEqual({
      tone: 'warning',
      message: 'Pick a different output token before swapping.',
    });
  });

  it('explains when no quote route is available for the receive side', () => {
    expect(
      getSwapActionBlocker({
        ...baseParams,
        hasQuoteTokenOptions: false,
        selectedToKey: '',
      })
    ).toEqual({
      tone: 'warning',
      message:
        'No quote route is available right now. Refresh token options or pick a different pay token.',
    });
  });

  it('explains when the quote route fails after valid inputs', () => {
    expect(
      getSwapActionBlocker({
        ...baseParams,
        quoteStateStatus: 'error',
      })
    ).toEqual({
      tone: 'warning',
      message:
        'This route is unavailable right now. Refresh the quote or change the amount or token pair.',
    });
  });
});
