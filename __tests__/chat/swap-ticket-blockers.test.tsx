import { renderToStaticMarkup } from 'react-dom/server';

import { SwapProposalTicket } from '@/components/chat/ChatArea';
import { SwapActionBlockerNotice } from '@/components/chat/tickets/SwapActionBlockerNotice';
import {
  getSwapActionBlocker,
  getSwapPrimaryActionMode,
} from '@/lib/chat/ticketFormat';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ data: undefined, isLoading: false })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

jest.mock('@privy-io/react-auth', () => ({
  useConnectWallet: jest.fn(() => ({ connectWallet: jest.fn() })),
  usePrivy: jest.fn(() => ({ getAccessToken: jest.fn() })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn() })),
  useWallets: jest.fn(() => ({ wallets: [] })),
}));

jest.mock('@privy-io/react-auth/solana', () => ({
  useSignAndSendTransaction: jest.fn(() => ({
    signAndSendTransaction: jest.fn(),
  })),
  useSignTransaction: jest.fn(() => ({
    signTransaction: jest.fn(),
  })),
  useWallets: jest.fn(() => ({ wallets: [], ready: true })),
}));

jest.mock('@/lib/UserContext', () => ({
  useUser: jest.fn(() => ({
    accessToken: null,
    user: null,
  })),
}));

jest.mock('lightweight-charts', () => ({}), { virtual: true });

jest.mock('@/components/chat/cards/ChatChartCommandCard', () => ({
  ChatChartCommandCard: () => null,
}));

jest.mock('@/components/wallet/perps/hooks/useHyperliquidPortfolio', () => ({
  useHyperliquidPortfolio: jest.fn(() => ({})),
}));

jest.mock('@/components/wallet/perps/hooks/useHyperliquidAgent', () => ({
  useHyperliquidAgent: jest.fn(() => ({})),
}));

jest.mock('@/components/wallet/perps/hooks/useHyperliquidMarkets', () => ({
  useHyperliquidMarkets: jest.fn(() => ({})),
}));

jest.mock('@/components/wallet/perps/hooks/useHyperliquidTrading', () => ({
  useHyperliquidTrading: jest.fn(() => ({})),
}));

function createWalletToken(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: 'Solana',
    symbol: 'SOL',
    balance: '2',
    decimals: 9,
    chainId: 1151111081099710,
    walletAddress: '',
    address: 'So11111111111111111111111111111111111111112',
    logoURI: '',
    chain: 'SOLANA',
    marketData: {
      price: 150,
    },
    timeSeriesData: {
      '1H': [],
      '1D': [],
      '1W': [],
      '1M': [],
      '1Y': [],
    },
    ...overrides,
  };
}

function renderSwapProposalTicket({
  canAct = true,
  initialQuoteState,
  proposalParams,
  sourceText,
  walletPortfolioTokens,
  quoteTokenOptionsOverride,
}: {
  canAct?: boolean;
  initialQuoteState?: Record<string, unknown>;
  proposalParams: Record<string, unknown>;
  sourceText: string;
  walletPortfolioTokens: Array<Record<string, unknown>>;
  quoteTokenOptionsOverride?: Array<Record<string, unknown>>;
}) {
  return renderToStaticMarkup(
    <SwapProposalTicket
      proposal={{
        normalizedParams: proposalParams,
      } as any}
      proposalId="local-wallet-swap-1"
      status="pending"
      canAct={canAct}
      isOpen
      isPending={false}
      onInlineActionComplete={jest.fn()}
      onReject={jest.fn()}
      astroConsoleData={
        {
          walletPortfolioTokens,
          isWalletPortfolioBalanceLoading: false,
          evmWalletAddress: '',
          evmWalletAddresses: [],
          eoaAddress: '',
          solWalletAddress: 'So11111111111111111111111111111111111111112',
        } as any
      }
      sourceText={sourceText}
      autoFetchQuote={false}
      initialQuoteState={initialQuoteState as any}
      quoteTokenOptionsOverride={quoteTokenOptionsOverride as any}
    />
  );
}

function renderSwapProposalTicketDocument(
  args: Parameters<typeof renderSwapProposalTicket>[0]
) {
  const markup = renderSwapProposalTicket(args);
  const buttons = Array.from(markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g))
    .map((match) => ({
      hasAttribute(name: string) {
        return name === 'disabled'
          ? Boolean(match[1].match(/\sdisabled(?:=|>|\s|$)/))
          : false;
      },
      textContent: match[2]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim(),
    }));

  return {
    markup,
    buttons,
  };
}

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

  it('keeps the empty-wallet message when no pay token is selectable yet', () => {
    expect(
      getSwapActionBlocker({
        ...baseParams,
        hasSpendableBalance: false,
        selectedFromKey: '',
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
        quoteStateErrorKind: 'route',
      })
    ).toEqual({
      tone: 'warning',
      message:
        'This route is unavailable right now. Refresh the quote or change the amount or token pair.',
    });
  });

  it('does not show route-retry guidance for validation errors', () => {
    expect(
      getSwapActionBlocker({
        ...baseParams,
        quoteStateStatus: 'error',
        quoteStateErrorKind: 'validation',
      })
    ).toBeNull();
  });
});

describe('getSwapPrimaryActionMode', () => {
  it('switches wallet-write tickets into a refresh path when the quote route fails', () => {
    expect(
      getSwapPrimaryActionMode({
        quoteOnly: false,
        quoteStateStatus: 'error',
        quoteStateErrorKind: 'route',
      })
    ).toBe('refresh_quote');
  });

  it('switches wallet-write tickets into a refresh path when no route is available yet', () => {
    expect(
      getSwapPrimaryActionMode({
        quoteOnly: false,
        hasRouteBlocker: true,
        quoteStateStatus: 'idle',
      })
    ).toBe('refresh_quote');
  });

  it('keeps quote-only tickets on the quote path', () => {
    expect(
      getSwapPrimaryActionMode({
        quoteOnly: true,
        quoteStateStatus: 'success',
      })
    ).toBe('quote');
  });

  it('keeps validation blockers off the refresh path', () => {
    expect(
      getSwapPrimaryActionMode({
        quoteOnly: false,
        quoteStateStatus: 'error',
        quoteStateErrorKind: 'validation',
      })
    ).toBe('confirm');
  });
});

describe('SwapProposalTicket blocker banner', () => {
  it('renders the empty-wallet blocker through the swap ticket', () => {
    const markup = renderSwapProposalTicket({
      proposalParams: {
        fromToken: 'MCDX',
        toToken: 'USDC',
        amount: '10',
        fromChain: 'solana',
        toChain: 'solana',
      },
      sourceText: 'swap 10 MCDX to USDC',
      walletPortfolioTokens: [],
    });

    expect(markup).toContain(
      'No spendable MCDX balance is available. Fund the wallet or pick another token before swapping.'
    );
  });

  it('renders the wrong-user blocker through the swap ticket', () => {
    const { markup, buttons } = renderSwapProposalTicketDocument({
      canAct: false,
      proposalParams: {
        fromToken: 'SOL',
        toToken: 'USDC',
        amount: '1',
        fromChain: 'solana',
        toChain: 'solana',
      },
      sourceText: 'swap 1 SOL to USDC',
      walletPortfolioTokens: [createWalletToken()],
    });

    expect(markup).toContain(
      'Only the user who asked Astro to prepare this swap can approve it.'
    );
    expect(markup).toContain('owner only');
    expect(
      buttons.find((button) => button.textContent.includes('Owner can approve'))
    ).toBeTruthy();
    expect(
      buttons.find((button) => button.textContent.includes('Sign & approve'))
    ).toBeFalsy();
  });

  it('renders the same-token blocker through the swap ticket', () => {
    const markup = renderSwapProposalTicket({
      proposalParams: {
        fromToken: 'SOL',
        toToken: 'SOL',
        amount: '1',
        fromChain: 'solana',
        toChain: 'solana',
      },
      sourceText: 'swap 1 SOL to SOL',
      walletPortfolioTokens: [createWalletToken()],
    });

    expect(markup).toContain(
      'Pick a different output token before swapping.'
    );
  });

  it('relabels the primary action to refresh quote when the route is unavailable', () => {
    const { markup, buttons } = renderSwapProposalTicketDocument({
      initialQuoteState: {
        status: 'error',
        errorKind: 'route',
        error:
          'This route is unavailable right now. Refresh the quote or change the amount or token pair.',
      },
      proposalParams: {
        fromToken: 'SOL',
        toToken: 'USDC',
        amount: '1',
        fromChain: 'solana',
        toChain: 'solana',
      },
      sourceText: 'swap 1 SOL to USDC',
      walletPortfolioTokens: [createWalletToken()],
    });

    expect(markup).toContain('needs route');
    expect(markup).toContain('Refresh quote');
    expect(markup).not.toContain('Sign &amp; approve');
    expect(
      buttons.find((button) => button.textContent.includes('Refresh quote'))
        ?.hasAttribute('disabled')
    ).toBe(false);
  });

  it('keeps the no-route prequote ticket blocked while matching the refresh-quote CTA label', () => {
    const { markup, buttons } = renderSwapProposalTicketDocument({
      proposalParams: {
        fromToken: 'SOL',
        toToken: 'USDC',
        amount: '1',
        fromChain: 'solana',
        toChain: 'solana',
      },
      sourceText: 'swap 1 SOL to USDC',
      walletPortfolioTokens: [createWalletToken()],
      quoteTokenOptionsOverride: [],
    });

    expect(markup).toContain('needs route');
    expect(markup).toContain(
      'No quote route is available right now. Refresh token options or pick a different pay token.'
    );
    expect(markup).toContain('Refresh quote');
    expect(markup).not.toContain('Sign &amp; approve');
    expect(
      buttons.find((button) => button.textContent.includes('Refresh quote'))
        ?.hasAttribute('disabled')
    ).toBe(true);
  });

  it('keeps the primary action off refresh for same-token validation errors', () => {
    const markup = renderSwapProposalTicket({
      initialQuoteState: {
        status: 'error',
        errorKind: 'validation',
        error: 'Pick a different quote token.',
      },
      proposalParams: {
        fromToken: 'SOL',
        toToken: 'SOL',
        amount: '1',
        fromChain: 'solana',
        toChain: 'solana',
      },
      sourceText: 'swap 1 SOL to SOL',
      walletPortfolioTokens: [createWalletToken()],
    });

    expect(markup).toContain('Pick a different output token before swapping.');
    expect(markup).toContain('Sign &amp; approve');
    expect(markup).not.toContain('Refresh quote');
  });

  it('keeps the primary action off refresh for empty-wallet validation errors', () => {
    const { markup, buttons } = renderSwapProposalTicketDocument({
      initialQuoteState: {
        status: 'error',
        errorKind: 'validation',
        error: 'Pick a SOL token with a wallet balance to quote this swap.',
      },
      proposalParams: {
        fromToken: 'SOL',
        toToken: 'USDC',
        amount: '1',
        fromChain: 'solana',
        toChain: 'solana',
      },
      sourceText: 'swap 1 SOL to USDC',
      walletPortfolioTokens: [],
    });

    expect(markup).toContain('needs input');
    expect(markup).toContain(
      'No spendable SOL balance is available. Fund the wallet or pick another token before swapping.'
    );
    expect(markup).not.toContain(
      'Pick a SOL token with a wallet balance to quote this swap.'
    );
    expect(markup).toContain('Sign &amp; approve');
    expect(markup).not.toContain('Refresh quote');
    expect(
      buttons.find((button) => button.textContent.includes('Sign & approve'))
        ?.hasAttribute('disabled')
    ).toBe(true);
  });

  it('treats the empty-amount state as input-blocked on the rendered ticket', () => {
    const { markup, buttons } = renderSwapProposalTicketDocument({
      proposalParams: {
        fromToken: 'SOL',
        toToken: 'USDC',
        amount: '',
        fromChain: 'solana',
        toChain: 'solana',
      },
      sourceText: 'swap SOL to USDC',
      walletPortfolioTokens: [createWalletToken()],
    });

    expect(markup).toContain('needs input');
    expect(markup).toContain(
      'Enter how much SOL you want to swap to get a live quote.'
    );
    expect(markup).toContain('Get quote');
    expect(markup).not.toContain('Sign &amp; approve');
    expect(
      buttons.find((button) => button.textContent.includes('Get quote'))
        ?.hasAttribute('disabled')
    ).toBe(true);
  });

  it('keeps the primary action off refresh for over-balance validation errors', () => {
    const markup = renderSwapProposalTicket({
      initialQuoteState: {
        status: 'error',
        errorKind: 'validation',
        error: 'Amount is above your 2 SOL balance.',
      },
      proposalParams: {
        fromToken: 'SOL',
        toToken: 'USDC',
        amount: '3',
        fromChain: 'solana',
        toChain: 'solana',
      },
      sourceText: 'swap 3 SOL to USDC',
      walletPortfolioTokens: [createWalletToken()],
    });

    expect(markup).toContain(
      'Lower the amount or fund the wallet before trying this swap again.'
    );
    expect(markup).toContain('Sign &amp; approve');
    expect(markup).not.toContain('Refresh quote');
  });

});

describe('SwapActionBlockerNotice visibility', () => {
  const baseProps = {
    isVisible: true,
    canAct: true,
    fromToken: 'MCDX',
    hasQuoteTokenOptions: true,
    hasSpendableBalance: true,
    hasValidSellAmount: true,
    amountExceedsBalance: false,
    payAmount: '10',
    quoteStateStatus: 'idle' as const,
    quoteStateErrorKind: undefined,
    selectedFromKey: 'mcdx-sol',
    selectedToKey: 'usdc-sol',
  };

  it('renders route-error guidance on the visible ticket surface', () => {
    const markup = renderToStaticMarkup(
      <SwapActionBlockerNotice
        {...baseProps}
        quoteStateStatus="error"
        quoteStateErrorKind="route"
      />
    );

    expect(markup).toContain(
      'This route is unavailable right now. Refresh the quote or change the amount or token pair.'
    );
  });

  it('does not render when the banner should stay hidden', () => {
    const markup = renderToStaticMarkup(
      <SwapActionBlockerNotice {...baseProps} isVisible={false} />
    );

    expect(markup).toBe('');
  });
});
