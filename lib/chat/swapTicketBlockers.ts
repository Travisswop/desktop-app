export type SwapActionBlockerNotice = {
  tone: 'info' | 'warning';
  message: string;
};

type SwapActionBlockerState = {
  canAct: boolean;
  isOpen: boolean;
  hasSpendableBalance: boolean;
  hasSelectedFromOption: boolean;
  hasSelectedToOption: boolean;
  hasEnteredAmount: boolean;
  hasValidSellAmount: boolean;
  amountExceedsBalance: boolean;
  isSameAssetSwap: boolean;
  isQuoteLoading: boolean;
  isQuoteError: boolean;
  isSwapBusy: boolean;
  hasUsableSwapSelection: boolean;
};

export function getSwapActionBlockerNotice(
  state: SwapActionBlockerState
): SwapActionBlockerNotice | null {
  if (!state.isOpen) return null;

  if (!state.canAct) {
    return {
      tone: 'warning',
      message:
        'Only the user who asked Astro to prepare this swap can approve it.',
    };
  }

  if (state.isSwapBusy) {
    return {
      tone: 'info',
      message:
        'This swap is already in progress. Keep the card open while Astro waits for your wallet.',
    };
  }

  if (state.isQuoteLoading) {
    return {
      tone: 'info',
      message:
        'Astro is refreshing the route now. Wait for the live quote before approving this swap.',
    };
  }

  if (!state.hasSpendableBalance || !state.hasSelectedFromOption) {
    return {
      tone: 'warning',
      message:
        'No spendable sell token is ready yet. Fund or connect the wallet you want Astro to swap from.',
    };
  }

  if (!state.hasEnteredAmount) {
    return {
      tone: 'warning',
      message:
        'Enter how much you want to swap so Astro can build a safe route.',
    };
  }

  if (!state.hasValidSellAmount) {
    return {
      tone: 'warning',
      message:
        'Enter a valid amount greater than zero before approving this swap.',
    };
  }

  if (state.amountExceedsBalance) {
    return {
      tone: 'warning',
      message:
        'Lower the sell amount so it fits within your current spendable balance.',
    };
  }

  if (state.isSameAssetSwap) {
    return {
      tone: 'warning',
      message:
        'Pick a different output token. Astro cannot quote a swap into the same asset.',
    };
  }

  if (!state.hasSelectedToOption) {
    return {
      tone: 'warning',
      message:
        'Choose the token you want to receive before Astro can fetch a route.',
    };
  }

  if (state.isQuoteError) {
    return {
      tone: 'warning',
      message:
        'No live route is ready yet. Refresh the quote or change the amount or token pair.',
    };
  }

  if (!state.hasUsableSwapSelection) {
    return {
      tone: 'info',
      message:
        'Get a live route before signing. Adjust the amount or token pair if the quote stays unavailable.',
    };
  }

  return null;
}
