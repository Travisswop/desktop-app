import {
  reportAgentActionClientEvent,
  serializeClientActionError,
} from '@/lib/chat/agentActionTelemetry';

describe('agent action client telemetry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: jest.fn(async () => ({
        ok: true,
        json: async () => ({ state: 'success' }),
      })),
    });
  });

  test('serializes errors without leaking full objects', () => {
    expect(serializeClientActionError(new Error('close failed'))).toEqual({
      name: 'Error',
      message: 'close failed',
    });

    expect(
      serializeClientActionError({
        name: 'RpcError',
        message: 'RPC unavailable',
        code: 'ECONNRESET',
        status: 503,
      })
    ).toEqual({
      name: 'RpcError',
      message: 'RPC unavailable',
      code: 'ECONNRESET',
      status: 503,
    });
  });

  test('posts client events to the backend proposal telemetry endpoint', async () => {
    await reportAgentActionClientEvent(
      {
        proposalId: 'local-hyperliquid-close-1',
        stage: 'execution_failed',
        action: 'perps.close_position',
        toolType: 'perps.write',
        provider: 'hyperliquid',
        error: new Error('button failed'),
      },
      'access-token',
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v5/messages/agent-actions/local-hyperliquid-close-1/client-event',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toMatchObject({
      proposalId: 'local-hyperliquid-close-1',
      stage: 'execution_failed',
      action: 'perps.close_position',
      toolType: 'perps.write',
      provider: 'hyperliquid',
      source: 'desktop',
      error: {
        name: 'Error',
        message: 'button failed',
      },
    });
  });
});
