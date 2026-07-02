import { getSwapActionBlockerNotice } from '@/lib/chat/swapTicketBlockers';

const baseState = {
  canAct: true,
  isOpen: true,
  hasSpendableBalance: true,
  hasSelectedFromOption: true,
  hasSelectedToOption: true,
  hasEnteredAmount: true,
  hasValidSellAmount: true,
  amountExceedsBalance: false,
  isSameAssetSwap: false,
  isQuoteLoading: false,
  isQuoteError: false,
  isSwapBusy: false,
  hasUsableSwapSelection: true,
};

describe('swap ticket blocker copy', () => {
  test('explains when the wrong user tries to approve the swap', () => {
    expect(
      getSwapActionBlockerNotice({
        ...baseState,
        canAct: false,
      })
    ).toMatchObject({
      tone: 'warning',
      message: expect.stringContaining('Only the user who asked Astro'),
    });
  });

  test('explains when no spendable balance is available', () => {
    expect(
      getSwapActionBlockerNotice({
        ...baseState,
        hasSpendableBalance: false,
        hasSelectedFromOption: false,
        hasUsableSwapSelection: false,
      })
    ).toMatchObject({
      tone: 'warning',
      message: expect.stringContaining('Fund or connect the wallet'),
    });
  });

  test('explains when the amount is missing', () => {
    expect(
      getSwapActionBlockerNotice({
        ...baseState,
        hasEnteredAmount: false,
        hasUsableSwapSelection: false,
      })
    ).toMatchObject({
      tone: 'warning',
      message: expect.stringContaining('Enter how much you want to swap'),
    });
  });

  test('explains when the same asset is selected on both sides', () => {
    expect(
      getSwapActionBlockerNotice({
        ...baseState,
        isSameAssetSwap: true,
        hasUsableSwapSelection: false,
      })
    ).toMatchObject({
      tone: 'warning',
      message: expect.stringContaining('different output token'),
    });
  });

  test('explains when the amount is above balance', () => {
    expect(
      getSwapActionBlockerNotice({
        ...baseState,
        amountExceedsBalance: true,
        hasUsableSwapSelection: false,
      })
    ).toMatchObject({
      tone: 'warning',
      message: expect.stringContaining('Lower the sell amount'),
    });
  });

  test('explains when no live route is available', () => {
    expect(
      getSwapActionBlockerNotice({
        ...baseState,
        isQuoteError: true,
        hasUsableSwapSelection: false,
      })
    ).toMatchObject({
      tone: 'warning',
      message: expect.stringContaining('Refresh the quote'),
    });
  });
});
