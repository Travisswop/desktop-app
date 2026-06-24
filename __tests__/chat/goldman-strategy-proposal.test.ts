import {
  buildGoldmanStrategyProposalSummary,
  formatGoldmanCooldownLabel,
} from '@/lib/chat/goldmanStrategyProposal';

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
});
