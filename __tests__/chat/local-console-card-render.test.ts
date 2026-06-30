import {
  hasFollowingRenderableLocalConsoleCardMessage,
  hasRenderableLocalConsoleReadPayload,
} from '@/lib/chat/localConsoleCardRender';

describe('local console card render gating', () => {
  test('does not suppress a local pnl card for a later plain-text persisted action without pnl payload', () => {
    const messages = [
      {
        _id: 'user-1',
        message: '/pnl',
        messageType: 'text',
        senderKind: 'human',
      },
      {
        _id: 'agent-1',
        message: 'PnL snapshot ready: +$12.00 across trading positions.',
        messageType: 'agent_response',
        senderKind: 'agent',
        agentData: {
          action: 'portfolio.pnl',
          metadata: {
            toolExecution: {
              action: 'portfolio.pnl',
            },
          },
        },
      },
    ];

    expect(
      hasFollowingRenderableLocalConsoleCardMessage(
        messages,
        0,
        'portfolio.pnl'
      )
    ).toBe(false);
  });

  test('suppresses a local pnl card when the later persisted action still carries pnlOverview', () => {
    const messages = [
      {
        _id: 'user-1',
        message: '/pnl',
        messageType: 'text',
        senderKind: 'human',
      },
      {
        _id: 'agent-1',
        message: 'PnL snapshot ready: +$12.00 across trading positions.',
        messageType: 'agent_response',
        senderKind: 'agent',
        agentData: {
          action: 'portfolio.pnl',
          metadata: {
            toolExecution: {
              action: 'portfolio.pnl',
              pnlOverview: {
                checkedAt: '2026-06-30T06:00:00.000Z',
              },
            },
          },
        },
      },
    ];

    expect(
      hasFollowingRenderableLocalConsoleCardMessage(
        messages,
        0,
        'portfolio.pnl'
      )
    ).toBe(true);
  });

  test('keeps wallet portfolio actions authoritative on action-only persisted history', () => {
    const message = {
      _id: 'agent-portfolio',
      message: 'Portfolio allocation ready.',
      messageType: 'agent_response',
      senderKind: 'agent',
      agentData: {
        action: 'wallet.portfolio',
      },
    };

    expect(
      hasRenderableLocalConsoleReadPayload(message, 'wallet.portfolio')
    ).toBe(true);
  });

  test('stops scanning once a later human message changes the thread after the original command', () => {
    const messages = [
      {
        _id: 'user-1',
        message: '/pnl',
        messageType: 'text',
        senderKind: 'human',
      },
      {
        _id: 'user-2',
        message: 'show me SOL instead',
        messageType: 'text',
        senderKind: 'human',
      },
      {
        _id: 'agent-1',
        message: 'PnL snapshot ready.',
        messageType: 'agent_response',
        senderKind: 'agent',
        agentData: {
          action: 'portfolio.pnl',
          metadata: {
            toolExecution: {
              action: 'portfolio.pnl',
              pnlOverview: {
                checkedAt: '2026-06-30T06:00:00.000Z',
              },
            },
          },
        },
      },
    ];

    expect(
      hasFollowingRenderableLocalConsoleCardMessage(
        messages,
        0,
        'portfolio.pnl'
      )
    ).toBe(false);
  });
});
