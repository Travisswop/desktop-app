import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SwapProposalActionFooter } from '@/components/chat/tickets/SwapProposalActionFooter';
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

function renderFooter(
  overrideState: Partial<typeof baseState> = {},
  overrideProps: Partial<React.ComponentProps<typeof SwapProposalActionFooter>> = {}
) {
  const blocker = getSwapActionBlockerNotice({
    ...baseState,
    ...overrideState,
  });
  return renderToStaticMarkup(
    <SwapProposalActionFooter
      actionLabel="Sign & approve"
      canAct={overrideState.canAct ?? baseState.canAct}
      isConfirmingSwap={false}
      isOpen={overrideState.isOpen ?? baseState.isOpen}
      isPending={false}
      isPrimaryActionDisabled={true}
      isQuoteLoading={overrideState.isQuoteLoading ?? baseState.isQuoteLoading}
      onConfirm={() => {}}
      onReject={() => {}}
      quoteOnly={false}
      status="pending"
      swapActionBlocker={blocker}
      {...overrideProps}
    />
  );
}

describe('SwapProposalActionFooter', () => {
  test('renders the empty-wallet blocker on the visible action footer', () => {
    const markup = renderFooter({
      hasSpendableBalance: false,
      hasSelectedFromOption: false,
      hasUsableSwapSelection: false,
    });

    expect(markup).toContain(
      'No spendable sell token is ready yet. Fund or connect the wallet you want Astro to swap from.'
    );
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Sign &amp; approve');
  });

  test('renders the same-asset blocker on the visible action footer', () => {
    const markup = renderFooter({
      isSameAssetSwap: true,
      hasUsableSwapSelection: false,
    });

    expect(markup).toContain(
      'Pick a different output token. Astro cannot quote a swap into the same asset.'
    );
  });

  test('renders the route-error blocker on the visible action footer', () => {
    const markup = renderFooter({
      isQuoteError: true,
      hasUsableSwapSelection: false,
    });

    expect(markup).toContain(
      'No live route is ready yet. Refresh the quote or change the amount or token pair.'
    );
  });
});
