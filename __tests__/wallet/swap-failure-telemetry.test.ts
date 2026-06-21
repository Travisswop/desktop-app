import { queueAgentActionClientEvent } from '@/lib/chat/agentActionTelemetry';
import {
  WALLET_SWAP_FAILURE_PROPOSAL_PREFIX,
  markWalletSwapFailureReported,
  queueWalletSwapFailureClientEvent,
  wasWalletSwapFailureReported,
} from '@/lib/wallet/swapFailureTelemetry';

jest.mock('@/lib/chat/agentActionTelemetry', () => ({
  queueAgentActionClientEvent: jest.fn(),
}));

describe('wallet swap failure telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('queues swap failures as backend client action events', () => {
    const proposalId = queueWalletSwapFailureClientEvent(
      {
        provider: 'Jupiter',
        stage: 'jupiter_swap_error',
        reason: 'Simulation failed',
        inputToken: { symbol: 'SOL' },
        outputToken: { symbol: 'USDC' },
        route: { slippageBps: 300 },
        error: new Error('raw simulation error'),
      },
      'access-token',
    );

    expect(proposalId).toEqual(
      expect.stringContaining(WALLET_SWAP_FAILURE_PROPOSAL_PREFIX),
    );
    expect(queueAgentActionClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId,
        stage: 'execution_failed',
        action: 'wallet.swap',
        toolType: 'wallet.write',
        provider: 'Jupiter',
        uiSurface: 'wallet_swap_modal',
        status: 'failed',
        reason: 'Simulation failed',
        context: expect.objectContaining({
          stage: 'jupiter_swap_error',
          inputToken: { symbol: 'SOL' },
          outputToken: { symbol: 'USDC' },
          route: { slippageBps: 300 },
        }),
      }),
      'access-token',
    );
  });

  test('marks routed errors to avoid duplicate top-level reports', () => {
    const error = new Error('LiFi failed');

    expect(wasWalletSwapFailureReported(error)).toBe(false);
    markWalletSwapFailureReported(error);
    expect(wasWalletSwapFailureReported(error)).toBe(true);
  });
});
