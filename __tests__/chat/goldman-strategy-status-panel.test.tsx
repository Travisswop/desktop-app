import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildGoldmanStrategyStatusViewModel,
  GoldmanStrategyStatusPanel,
  GOLDMAN_STRATEGY_STALE_HEARTBEAT_MS,
} from '@/components/chat/GoldmanStrategyStatusPanel';

describe('Goldman strategy status panel', () => {
  test('marks pending_authorization strategies as awaiting funding with a fund CTA', () => {
    const viewModel = buildGoldmanStrategyStatusViewModel(
      {
        status: 'pending_authorization',
        runtime: {
          executionMode: 'execute',
        },
        metadata: {
          approvalState: 'approved_waiting_for_funding',
        },
      },
      { now: Date.parse('2026-06-24T16:00:00Z') }
    );

    expect(viewModel.state.label).toBe('Awaiting funding');
    expect(viewModel.boundary.label).toBe('Live execution blocked');
    expect(viewModel.primaryAction).toMatchObject({
      intent: 'fund',
      label: 'Fund vault',
      disabled: false,
    });

    const markup = renderToStaticMarkup(
      <GoldmanStrategyStatusPanel viewModel={viewModel} />
    );

    expect(markup).toContain('Awaiting funding');
    expect(markup).toContain('Live execution blocked');
    expect(markup).toContain('Fund the Goldman vault first');
  });

  test('surfaces paused resume-blocked strategies as blocked with the runtime reason', () => {
    const viewModel = buildGoldmanStrategyStatusViewModel(
      {
        status: 'paused',
        runtime: {
          state: 'stopped',
          executionMode: 'execute',
          lastError: 'Could not safely resume strategy runtime.',
        },
        metadata: {
          approvalState: 'resume_blocked',
          runtimeResumeBlockedReason:
            'Could not safely resume strategy runtime.',
        },
      },
      { now: Date.parse('2026-06-24T16:00:00Z') }
    );

    expect(viewModel.state.label).toBe('Blocked');
    expect(viewModel.issue).toMatchObject({
      label: 'Blocked reason',
      detail: 'Could not safely resume strategy runtime.',
    });
    expect(viewModel.primaryAction).toMatchObject({
      intent: 'blocked',
      label: 'Resolve block',
      disabled: true,
    });
  });

  test('warns when a running strategy heartbeat is stale', () => {
    const now = Date.parse('2026-06-24T16:00:00Z');
    const staleHeartbeat = new Date(
      now - GOLDMAN_STRATEGY_STALE_HEARTBEAT_MS - 60_000
    ).toISOString();

    const viewModel = buildGoldmanStrategyStatusViewModel(
      {
        status: 'active',
        runtime: {
          state: 'running',
          executionMode: 'execute',
          lastHeartbeatAt: staleHeartbeat,
        },
      },
      { now }
    );

    expect(viewModel.heartbeat.label).toBe('Heartbeat stale');
    expect(viewModel.nextStep).toContain('stop Goldman');
    expect(viewModel.primaryAction).toMatchObject({
      intent: 'stop',
      label: 'Stop',
      disabled: false,
    });
  });
});
