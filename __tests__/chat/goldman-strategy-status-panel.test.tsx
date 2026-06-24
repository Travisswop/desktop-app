import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GoldmanStrategyStatusPanel } from '@/components/chat/goldman/GoldmanStrategyStatusPanel';

describe('GoldmanStrategyStatusPanel', () => {
  test('renders pending authorization strategies as funding or approval blocked', () => {
    const markup = renderToStaticMarkup(
      <GoldmanStrategyStatusPanel
        strategy={{
          title: 'Live SOL carry',
          status: 'pending_authorization',
          runtime: {
            executionMode: 'execute',
          },
          metadata: {
            approvalState: 'approved_waiting_for_funding',
            walletStatus: 'draft',
          },
        }}
        now={Date.parse('2026-06-24T16:00:00Z')}
      />
    );

    expect(markup).toContain('Funding blocked');
    expect(markup).toContain('Fund first');
    expect(markup).toContain(
      'Fund the strategy vault, then approve the strategy before pressing Run.'
    );
    expect(markup).toContain(
      'This strategy is configured for live execution, but Goldman cannot trade until approval and funding are both complete.'
    );
  });

  test('renders paused resume-blocked strategies with the blocker reason and blocked run control', () => {
    const markup = renderToStaticMarkup(
      <GoldmanStrategyStatusPanel
        strategy={{
          title: 'BTC range monitor',
          status: 'paused',
          runtime: {
            state: 'stopped',
            executionMode: 'execute',
            lastHeartbeatAt: '2026-06-24T15:50:00Z',
            lastActivity: 'Strategy runtime paused during backend resume',
          },
          metadata: {
            approvalState: 'resume_blocked',
            runtimeResumeBlockedReason: 'Vault session token expired during resume.',
          },
        }}
        now={Date.parse('2026-06-24T16:00:00Z')}
      />
    );

    expect(markup).toContain('Resume blocked');
    expect(markup).toContain('Blocked');
    expect(markup).toContain('Vault session token expired during resume.');
    expect(markup).toContain(
      'Fix the runtime or vault blocker, then try Run again from this panel.'
    );
  });
});
