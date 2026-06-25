import { createElement } from 'react';
import {
  buildGoldmanStrategyProposalSummary,
  formatGoldmanCooldownLabel,
} from '@/lib/chat/goldmanStrategyProposal';
import { renderToStaticMarkup } from 'react-dom/server';
import { GoldmanStrategyProposalTicket } from '@/components/chat/goldman/GoldmanStrategyProposalTicket';

describe('goldman strategy proposal summary', () => {
  test('formats cooldown labels into user-readable units', () => {
    expect(formatGoldmanCooldownLabel('45')).toBe('45s');
    expect(formatGoldmanCooldownLabel(1800)).toBe('30m');
    expect(formatGoldmanCooldownLabel(7200)).toBe('2h');
    expect(formatGoldmanCooldownLabel(0)).toBe('');
  });

  test('builds funding, position-cap, and cooldown metrics from proposal params', () => {
    const summary = buildGoldmanStrategyProposalSummary(
      {
        fundingAsset: 'USDC',
        maxDailySpendUsd: 1500,
        maxOpenPositions: 3,
        cooldownSeconds: 1800,
        allocation: { percent: 25 },
      },
      { venues: ['polymarket'] }
    );

    expect(summary.metrics).toEqual([
      {
        label: 'funding asset',
        value: 'USDC',
        detail: '25% allocation',
      },
      {
        label: 'open positions',
        value: '3',
        detail: 'concurrent markets max',
      },
      {
        label: 'cooldown',
        value: '30m',
        detail: 'minimum re-entry wait',
      },
    ]);
  });

  test('includes the full approval boundary in the summary copy', () => {
    const summary = buildGoldmanStrategyProposalSummary(
      {
        fundingAsset: 'USDC',
        maxOrderUsd: 250,
        maxDailySpendUsd: 1000,
        maxDailyLossUsd: 300,
        maxOpenPositions: 2,
        cooldownSeconds: 3600,
      },
      {
        venues: ['polymarket', 'aave'],
        expiryLabel: 'Expires Jun 30',
      }
    );

    expect(summary.approvalBoundary).toContain(
      'Approval lets Goldman trade on polymarket, aave using USDC only within the displayed caps.'
    );
    expect(summary.approvalBoundary).toContain(
      'It still cannot exceed $250.00 per order, $1,000 daily spend, $300.00 daily loss, 2 open positions max, 1h cooldown between entries.'
    );
    expect(summary.approvalBoundary).toContain(
      'Expires Jun 30 remains the outer stop unless you stop it sooner.'
    );
  });

  test('does not invent a funding asset when the proposal omits one', () => {
    const summary = buildGoldmanStrategyProposalSummary(
      {
        maxOrderUsd: 250,
        maxDailySpendUsd: 1000,
        maxDailyLossUsd: 300,
        maxOpenPositions: 2,
        cooldownSeconds: 3600,
        allocation: { percent: 25 },
      },
      {
        venues: ['polymarket'],
      }
    );

    expect(summary.approvalBoundary).toBe(
      'Approval lets Goldman trade on polymarket only within the displayed caps. It still cannot exceed $250.00 per order, $1,000 daily spend, $300.00 daily loss, 2 open positions max, 1h cooldown between entries.'
    );
    expect(summary.metrics).toEqual([
      {
        label: 'allocation',
        value: '25% allocation',
        detail: 'Daily cap $1,000',
      },
      {
        label: 'open positions',
        value: '2',
        detail: 'concurrent markets max',
      },
      {
        label: 'cooldown',
        value: '1h',
        detail: 'minimum re-entry wait',
      },
    ]);
  });

  test('renders the approval card with declared funding context and boundary copy', () => {
    const html = renderToStaticMarkup(
      createElement(GoldmanStrategyProposalTicket, {
        proposalId: 'proposal-1',
        status: 'pending',
        proposal: {
          proposalId: 'proposal-1',
          expiresAt: '2026-06-30T12:00:00.000Z',
          normalizedParams: {
            title: 'Live sports momentum',
            strategyBrief: 'Buy mispriced live opportunities with defined caps.',
            venues: ['polymarket', 'aave'],
            assets: ['USDC'],
            fundingAsset: 'USDC',
            maxOrderUsd: 250,
            estimatedOrderUsd: 150,
            maxDailySpendUsd: 1000,
            maxDailyLossUsd: 300,
            maxOpenPositions: 2,
            cooldownSeconds: 3600,
            entryCondition: 'Enter after a momentum break.',
            exitCondition: 'Exit at target or daily risk cap.',
          },
        },
        canAct: true,
        isOpen: true,
        isPending: false,
        onApprove: () => {},
        onReject: () => {},
      })
    );

    expect(html).toContain('approval boundary');
    expect(html).toContain(
      'Approval lets Goldman trade on polymarket, aave using USDC only within the displayed caps.'
    );
    expect(html).toContain('funding asset');
    expect(html).toContain('open positions');
    expect(html).toContain('cooldown');
    expect(html).toContain('Approve strategy');
  });

  test('renders allocation-only proposals without a synthetic funding asset', () => {
    const html = renderToStaticMarkup(
      createElement(GoldmanStrategyProposalTicket, {
        proposalId: 'proposal-2',
        status: 'pending',
        proposal: {
          proposalId: 'proposal-2',
          normalizedParams: {
            title: 'Allocation-only strategy',
            venues: ['polymarket'],
            assets: ['USDC'],
            allocation: { percent: 25 },
            maxDailySpendUsd: 1000,
            maxOpenPositions: 1,
            cooldownSeconds: 1800,
          },
        },
        canAct: true,
        isOpen: true,
        isPending: false,
        onApprove: () => {},
        onReject: () => {},
      })
    );

    expect(html).toContain(
      'Approval lets Goldman trade on polymarket only within the displayed caps.'
    );
    expect(html).toContain('allocation');
    expect(html).toContain('25% allocation');
    expect(html).not.toContain('funding asset');
    expect(html).not.toContain('using approved capital');
    expect(html).not.toContain('using USDC only within the displayed caps');
  });
});
