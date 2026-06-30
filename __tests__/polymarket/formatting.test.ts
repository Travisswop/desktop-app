import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentActionReceiptCard } from '@/components/chat/tickets/AgentActionReceiptCard';
import {
  getOutcomeDisplayLabel,
  getPredictionReceiptSubject,
} from '@/lib/polymarket/formatting';
import { receiptTitle } from '@/lib/chat/receiptShare';
import type { AgentActionCompletion } from '@/lib/chat/agentActionHandoff';

describe('Polymarket formatting', () => {
  const firstHalfTotal =
    'Yankees vs. Red Sox: 1H Total Runs O/U 1.5';
  const oldBareReceipt = {
    provider: 'polymarket',
    status: 'executed',
    title: firstHalfTotal,
    subject: 'Over',
    executionResult: {
      marketTitle: firstHalfTotal,
      outcome: 'Over',
    },
  } satisfies AgentActionCompletion;

  it('expands total outcomes with line and period context', () => {
    expect(getOutcomeDisplayLabel('Over', firstHalfTotal, 0)).toBe(
      'Over 1.5 in 1H',
    );
    expect(getOutcomeDisplayLabel('Under', firstHalfTotal, 1)).toBe(
      'Under 1.5 in 1H',
    );
  });

  it('uses compact grouped labels when raw outcomes are generic', () => {
    expect(
      getPredictionReceiptSubject('Over', firstHalfTotal, {
        displayOutcome: 'O 1.5',
        outcomeIndex: 0,
      }),
    ).toBe('Over 1.5 in 1H');
  });

  it('recovers contextual titles for older bare Polymarket receipts', () => {
    expect(receiptTitle(oldBareReceipt)).toBe('Over 1.5 in 1H');
  });

  it('renders the receipt card with the contextual title', () => {
    const html = renderToStaticMarkup(
      React.createElement(AgentActionReceiptCard, {
        receipt: oldBareReceipt,
        onDone: () => {},
      }),
    );

    expect(html).toContain('Over 1.5 in 1H');
  });
});
