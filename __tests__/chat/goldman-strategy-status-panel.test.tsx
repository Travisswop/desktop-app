import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GoldmanStrategyStatusPanel,
  getGoldmanStrategyControlState,
  isGoldmanStrategyRunningState,
} from '@/components/chat/goldman/GoldmanStrategyStatusPanel';

describe('GoldmanStrategyStatusPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-24T16:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('treats missing wallet metadata as approval-pending instead of funding-blocked', () => {
    const markup = renderToStaticMarkup(
      <GoldmanStrategyStatusPanel
        strategy={{
          title: 'Live SOL carry',
          status: 'pending_authorization',
          runtime: {
            executionMode: 'execute',
          },
          metadata: {
            approvalState: 'pending_authorization',
          },
        }}
        now={Date.parse('2026-06-24T16:00:00Z')}
        fundingGuidance={{
          assetHint: 'USDC',
          networkLabel: 'Polygon / EVM',
        }}
      />
    );

    expect(markup).toContain('Waiting for approval');
    expect(markup).toContain('Approve first');
    expect(markup).toContain(
      'Approve this strategy before Goldman can run within the saved caps.'
    );
    expect(markup).toContain(
      'This strategy is configured for live execution, but Goldman cannot trade until approval and funding are both complete.'
    );
  });

  test('keeps explicit funding blockers distinct from plain approval-pending states', () => {
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
        fundingGuidance={{
          assetHint: 'USDC',
          networkLabel: 'Polygon / EVM',
        }}
      />
    );

    expect(markup).toContain('Funding blocked');
    expect(markup).toContain('Fund first');
    expect(markup).toContain(
      'Fund the strategy vault with USDC on Polygon / EVM, then press Run to start Goldman within the saved caps.'
    );
    expect(markup).toContain(
      'Required funding: USDC on Polygon / EVM.'
    );
    expect(markup).not.toContain('approve the strategy before pressing Run');
  });

  test('keeps pending monitor-only strategies read-only in the visible copy', () => {
    const markup = renderToStaticMarkup(
      <GoldmanStrategyStatusPanel
        strategy={{
          title: 'SOL social momentum watch',
          status: 'pending_authorization',
          runtime: {
            executionMode: 'monitor',
          },
          metadata: {
            approvalState: 'pending_authorization',
          },
        }}
        now={Date.parse('2026-06-24T16:00:00Z')}
        fundingGuidance={{
          assetHint: 'USDC',
          networkLabel: 'Polygon / EVM',
        }}
      />
    );

    expect(markup).toContain('Waiting for approval');
    expect(markup).toContain('Approve first');
    expect(markup).toContain(
      'Approval unlocks read-only monitoring, and Goldman will not place live trades in this mode.'
    );
    expect(markup).toContain(
      'Approve this strategy before Goldman starts monitoring from the saved rules.'
    );
    expect(markup).not.toContain(
      'This strategy is configured for live execution'
    );
  });

  test('keeps pending proposal-only strategies out of live-trading language', () => {
    const markup = renderToStaticMarkup(
      <GoldmanStrategyStatusPanel
        strategy={{
          title: 'NBA catalyst draft',
          status: 'pending_authorization',
          runtime: {
            executionMode: 'proposal',
          },
          metadata: {
            approvalState: 'pending_authorization',
          },
        }}
        now={Date.parse('2026-06-24T16:00:00Z')}
        fundingGuidance={{
          assetHint: 'USDC',
          networkLabel: 'Polygon / EVM',
        }}
      />
    );

    expect(markup).toContain('Waiting for approval');
    expect(markup).toContain('Proposal only');
    expect(markup).toContain(
      'Approval keeps the reviewed plan available, but Goldman will not monitor or place live trades until the mode changes.'
    );
    expect(markup).toContain(
      'Approve this proposal if you want to keep it, then switch to monitor or live execute before expecting Goldman to run.'
    );
    expect(markup).not.toContain(
      'This strategy is configured for live execution'
    );
  });

  test('keeps approved proposal-only strategies from looking runnable', () => {
    expect(
      getGoldmanStrategyControlState(
        {
          title: 'Saved NBA catalyst draft',
          status: 'active',
          runtime: {
            executionMode: 'proposal',
            lastHeartbeatAt: '2026-06-24T15:58:00Z',
          },
          metadata: {
            approvalState: 'approved',
          },
        },
        {
          now: Date.parse('2026-06-24T16:00:00Z'),
        }
      )
    ).toMatchObject({
      statusLabel: 'Proposal only',
      summaryLine: 'proposal only · switch mode to run',
      runLabel: 'Switch mode',
      runDisabled: true,
      primaryAction: 'none',
      nextAction:
        'Switch this strategy to monitor only or live execute, then press Run when the saved rules and funding look correct.',
      blockerReason:
        'Proposal mode keeps the reviewed plan available, but it does not authorize a Goldman runtime.',
    });
  });

  test('keeps funding-blocked monitor strategies mode-aware instead of implying live trades', () => {
    const markup = renderToStaticMarkup(
      <GoldmanStrategyStatusPanel
        strategy={{
          title: 'Funding-gated read-only monitor',
          status: 'pending_authorization',
          runtime: {
            executionMode: 'monitor',
          },
          metadata: {
            approvalState: 'approved_waiting_for_funding',
            walletStatus: 'draft',
          },
        }}
        now={Date.parse('2026-06-24T16:00:00Z')}
        fundingGuidance={{
          assetHint: 'USDC',
          networkLabel: 'Polygon / EVM',
        }}
      />
    );

    expect(markup).toContain('Funding blocked');
    expect(markup).toContain('Setup blocked');
    expect(markup).toContain(
      'Goldman stays read-only in this mode, but the remaining setup blocker still has to clear before monitoring can start.'
    );
    expect(markup).toContain(
      'Fund the strategy vault with USDC on Polygon / EVM, then press Run to start monitoring from the saved rules.'
    );
    expect(markup).toContain(
      'Required funding: USDC on Polygon / EVM.'
    );
    expect(markup).not.toContain('approve the strategy before pressing Run');
    expect(markup).not.toContain(
      'This strategy is configured for live execution'
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

  test('turns client-connection resume blockers into reconnect guidance', () => {
    const markup = renderToStaticMarkup(
      <GoldmanStrategyStatusPanel
        strategy={{
          title: 'ETH catalyst trader',
          status: 'paused',
          runtime: {
            state: 'stopped',
            executionMode: 'execute',
            lastHeartbeatAt: '2026-06-24T15:58:00Z',
            lastActivity: 'Runtime resume failed during reconnect',
          },
          metadata: {
            approvalState: 'resume_blocked',
            runtimeResumeBlockedReason:
              'Client must be connected before running operations',
          },
        }}
        now={Date.parse('2026-06-24T16:00:00Z')}
      />
    );

    expect(markup).toContain('Resume blocked');
    expect(markup).toContain(
      'Goldman keeps the saved approval boundary, but live automation is blocked until the connected client session is restored.'
    );
    expect(markup).toContain(
      'Reconnect the client session, confirm wallet and vault access are back, then press Run again from this panel.'
    );
    expect(markup).toContain(
      'Client must be connected before running operations'
    );
  });

  test('ages the same running strategy across live, delayed, and stale thresholds', () => {
    const strategy = {
      title: 'ETH carry monitor',
      status: 'running',
      runtime: {
        state: 'running',
        executionMode: 'execute',
        lastHeartbeatAt: '2026-06-24T15:59:00Z',
      },
    } as const;

    expect(
      getGoldmanStrategyControlState(strategy, {
        isStrategyRunning: true,
        now: Date.parse('2026-06-24T16:00:00Z'),
      })
    ).toMatchObject({
      heartbeatLabel: 'heartbeat live',
      summaryLine: 'running · live execute',
    });

    expect(
      getGoldmanStrategyControlState(strategy, {
        isStrategyRunning: true,
        now: Date.parse('2026-06-24T16:03:00Z'),
      })
    ).toMatchObject({
      heartbeatLabel: 'heartbeat delayed',
      statusLabel: 'Running',
    });

    expect(
      getGoldmanStrategyControlState(strategy, {
        isStrategyRunning: true,
        now: Date.parse('2026-06-24T16:06:00Z'),
      })
    ).toMatchObject({
      heartbeatLabel: 'stale heartbeat',
      statusLabel: 'Running with stale monitor',
      summaryLine: 'running stale · live execute',
    });
  });

  test('returns primary actions that match blocked, runnable, and running Goldman states', () => {
    expect(
      getGoldmanStrategyControlState(
        {
          title: 'Approval pending strategy',
          status: 'pending_authorization',
          runtime: {
            executionMode: 'execute',
          },
          metadata: {
            approvalState: 'pending_authorization',
          },
        },
        {
          now: Date.parse('2026-06-24T16:00:00Z'),
        }
      )
    ).toMatchObject({
      primaryAction: 'none',
      runLabel: 'Approve first',
    });

    expect(
      getGoldmanStrategyControlState(
        {
          title: 'Paused strategy',
          status: 'paused',
          runtime: {
            state: 'stopped',
            executionMode: 'execute',
          },
        },
        {
          now: Date.parse('2026-06-24T16:00:00Z'),
        }
      )
    ).toMatchObject({
      primaryAction: 'run',
      runLabel: 'Run',
    });

    expect(
      getGoldmanStrategyControlState(
        {
          title: 'Approved but idle strategy',
          status: 'active',
          runtime: {
            state: 'stopped',
            executionMode: 'execute',
          },
        },
        {
          isStrategyRunning: false,
          now: Date.parse('2026-06-24T16:00:00Z'),
        }
      )
    ).toMatchObject({
      statusLabel: 'Paused',
      primaryAction: 'run',
      runLabel: 'Run',
    });

    expect(
      getGoldmanStrategyControlState(
        {
          title: 'Running strategy',
          status: 'active',
          runtime: {
            state: 'running',
            executionMode: 'execute',
          },
        },
        {
          isStrategyRunning: true,
          now: Date.parse('2026-06-24T16:00:00Z'),
        }
      )
    ).toMatchObject({
      primaryAction: 'stop',
      runLabel: 'Stop',
    });
  });

  test('treats legacy active strategies without runtime state as still running', () => {
    const strategy = {
      title: 'Legacy active strategy',
      status: 'active',
      runtime: {
        executionMode: 'execute',
        lastHeartbeatAt: '2026-06-24T15:59:00Z',
      },
    } as const;

    expect(isGoldmanStrategyRunningState(strategy)).toBe(true);
    expect(
      getGoldmanStrategyControlState(strategy, {
        now: Date.parse('2026-06-24T16:00:00Z'),
      })
    ).toMatchObject({
      statusLabel: 'Running',
      primaryAction: 'stop',
      runLabel: 'Stop',
      summaryLine: 'running · live execute',
    });
  });
});
