import {
  buildSwapBalanceRecoveryClientEvent,
  buildSwapBalanceRecoveryTelemetryContext,
  getSwapRecoveryAmountInput,
  parseSwapBalanceChangeError,
} from '@/lib/chat/ticketFormat';
import { SwapProposalTicket } from '@/components/chat/ChatArea';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SwapBalanceRecoveryPanel } from '@/components/chat/tickets/SwapBalanceRecoveryPanel';

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
    name: 'MCDX',
    symbol: 'MCDX',
    balance: '40',
    decimals: 9,
    chainId: 1151111081099710,
    walletAddress: 'So11111111111111111111111111111111111111112',
    address: 'Mcdx111111111111111111111111111111111111111',
    logoURI: '',
    chain: 'SOLANA',
    marketData: {
      price: 1,
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

function renderSwapProposalTicketDocument() {
  const markup = renderToStaticMarkup(
    React.createElement(SwapProposalTicket, {
      proposal: {
        normalizedParams: {
          amount: '25',
          amountType: 'token',
          fromTokenSymbol: 'MCDX',
          fromChainId: 'solana',
          routeLabel: 'Jupiter',
          toTokenSymbol: 'USDC',
          toChainId: 'solana',
        },
      } as any,
      proposalId: 'local-swap-wallet-1',
      status: 'pending',
      canAct: true,
      isOpen: true,
      isPending: false,
      onInlineActionComplete: jest.fn(),
      onReject: jest.fn(),
      astroConsoleData: {
        walletPortfolioTokens: [
          createWalletToken(),
          createWalletToken({
            name: 'USD Coin',
            symbol: 'USDC',
            balance: '100',
            address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            marketData: {
              price: 1,
            },
          }),
        ],
        isWalletPortfolioBalanceLoading: false,
        evmWalletAddress: '',
        evmWalletAddresses: [],
        eoaAddress: '',
        solWalletAddress: 'So11111111111111111111111111111111111111112',
      } as any,
      sourceText: 'Swap 25 MCDX to USDC',
      autoFetchQuote: false,
      initialSwapRecovery: {
        kind: 'balance_changed',
        previousAmountLabel: '25 MCDX',
        availableAmount: '0.12635657',
        tokenSymbol: 'MCDX',
      },
    })
  );

  const buttons = Array.from(markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g))
    .map((match) => ({
      disabled: Boolean(match[1].match(/\sdisabled(?:=|>|\s|$)/)),
      textContent: match[2]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim(),
    }));

  return { markup, buttons };
}

describe('parseSwapBalanceChangeError', () => {
  it('extracts the updated available amount and token symbol', () => {
    expect(
      parseSwapBalanceChangeError(
        'Your MCDX balance changed. Available now: 0.12635657 MCDX. Try the swap again with the updated amount.'
      )
    ).toEqual({
      availableAmount: '0.12635657',
      tokenSymbol: 'MCDX',
    });
  });

  it('falls back to the provided token symbol when the message uses a generic token label', () => {
    expect(
      parseSwapBalanceChangeError(
        'Your token balance changed. Available now: 24.50. Try the swap again with the updated amount.',
        'USDC'
      )
    ).toEqual({
      availableAmount: '24.50',
      tokenSymbol: 'USDC',
    });
  });

  it('returns null for unrelated errors', () => {
    expect(parseSwapBalanceChangeError('Route expired. Refresh and try again.')).toBeNull();
  });

  it('keeps recovery amount input in token units by default', () => {
    expect(getSwapRecoveryAmountInput('0.12635657', 'token', 4.2)).toBe(
      '0.12635657'
    );
  });

  it('converts recovery amount input back into usd-sized input when needed', () => {
    expect(getSwapRecoveryAmountInput('0.5', 'usd', 125.4321)).toBe('62.72');
  });

  it('builds redacted telemetry context for balance recovery', () => {
    expect(
      buildSwapBalanceRecoveryTelemetryContext({
        fromToken: 'SOL',
        toToken: 'USDC',
        amountType: 'usd',
        availableToken: 'SOL',
        routeLabel: 'Jupiter',
      })
    ).toEqual({
      fromToken: 'SOL',
      toToken: 'USDC',
      amountType: 'usd',
      availableToken: 'SOL',
      routeLabel: 'Jupiter',
      reasonCode: 'balance_changed',
      recoveryState: 'quote_refresh_required',
    });
  });

  it('builds a sanitized queued client-event payload for balance recovery', () => {
    const event = buildSwapBalanceRecoveryClientEvent({
      proposalId: 'local-swap-wallet-1',
      provider: 'Jupiter',
      fromToken: 'MCDX',
      toToken: 'USDC',
      amountType: 'token',
      availableToken: 'MCDX',
      routeLabel: 'Jupiter',
    });

    expect(event).toMatchObject({
      proposalId: 'local-swap-wallet-1',
      stage: 'execution_failed',
      action: 'wallet.swap',
      toolType: 'wallet.write',
      provider: 'Jupiter',
      uiSurface: 'chat_swap_ticket',
      status: 'recoverable',
      reason: 'Balance changed before swap execution. Quote refresh required.',
      error: {
        name: 'SwapBalanceChanged',
        message: 'Balance changed before swap execution.',
        code: 'balance_changed',
      },
      context: {
        fromToken: 'MCDX',
        toToken: 'USDC',
        amountType: 'token',
        availableToken: 'MCDX',
        routeLabel: 'Jupiter',
        reasonCode: 'balance_changed',
        recoveryState: 'quote_refresh_required',
      },
    });
    expect(JSON.stringify(event)).not.toContain('Available now');
    expect(JSON.stringify(event)).not.toContain('0.12635657');
  });

  it('renders a structured swap recovery panel instead of plain text fallback', () => {
    const html = renderToStaticMarkup(
      React.createElement(SwapBalanceRecoveryPanel, {
        availableAmount: '0.12635657',
        canAct: true,
        isBusy: false,
        onKeepEditing: () => {},
        onRefreshQuote: () => {},
        previousAmountLabel: '25 MCDX',
        tokenSymbol: 'MCDX',
      })
    );

    expect(html).toContain('swap recovery');
    expect(html).toContain('Balance changed before signing');
    expect(html).toContain('requested');
    expect(html).toContain('available now');
    expect(html).toContain('Refresh quote');
    expect(html).toContain('Astro kept this ticket open');
  });

  it('renders the balance recovery state on the real swap ticket surface', () => {
    const { markup, buttons } = renderSwapProposalTicketDocument();
    const refreshQuoteButton = buttons.find((button) =>
      button.textContent.includes('Refresh quote')
    );

    expect(markup).toContain('swap quote');
    expect(markup).toContain('needs refresh');
    expect(markup).toContain('Refresh USDC quote');
    expect(markup).toContain('Balance changed before signing');
    expect(markup).toContain('25 MCDX');
    expect(markup).toContain('0.126357 MCDX');
    expect(markup).toContain('Astro kept this ticket open');
    expect(markup).not.toContain('Your MCDX balance changed');
    expect(refreshQuoteButton?.disabled).toBe(false);
  });
});
