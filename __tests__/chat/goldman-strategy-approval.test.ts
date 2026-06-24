import {
  buildGoldmanApprovalBoundarySummary,
  formatGoldmanCooldownLabel,
  formatGoldmanFundingSummary,
  formatGoldmanOpenPositionsLabel,
} from '@/lib/chat/goldmanStrategyApproval';

describe('goldman strategy approval formatting', () => {
  test('formats the missing approval guardrails for chat cards', () => {
    expect(formatGoldmanOpenPositionsLabel(2)).toBe('Max 2 open positions');
    expect(formatGoldmanCooldownLabel(1800)).toBe('30 minutes cooldown');
    expect(
      formatGoldmanFundingSummary({
        fundingAsset: 'USDC',
        allocation: {
          amountUsd: 1500,
          percent: 25,
        },
      })
    ).toEqual({
      assetLabel: 'USDC',
      detailLabel: '$1,500 budget · 25% allocation',
    });
  });

  test('builds a concise approval boundary summary', () => {
    const summary = buildGoldmanApprovalBoundarySummary(
      {
        venues: ['polymarket', 'aave'],
        assets: ['USDC'],
        fundingAsset: 'USDC',
        maxOrderUsd: 250,
        maxOpenPositions: 2,
        maxDailySpendUsd: 1500,
        maxDailyLossUsd: 300,
        cooldownSeconds: 1800,
      },
      'the Jul 1 expiry'
    );

    expect(summary).toContain('Approval lets Goldman trade on polymarket and aave using USDC');
    expect(summary).toContain('$250.00 max per order');
    expect(summary).toContain('Max 2 open positions');
    expect(summary).toContain('$1,500 daily spend cap');
    expect(summary).toContain('$300.00 daily loss limit');
    expect(summary).toContain('30 minutes cooldown');
    expect(summary).toContain('until the Jul 1 expiry');
  });
});
