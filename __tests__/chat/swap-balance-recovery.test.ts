import {
  getSwapRecoveryAmountInput,
  buildSwapBalanceRecoveryTelemetryContext,
  parseSwapBalanceChangeError,
} from '@/lib/chat/ticketFormat';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SwapBalanceRecoveryPanel } from '@/components/chat/tickets/SwapBalanceRecoveryPanel';

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
});
