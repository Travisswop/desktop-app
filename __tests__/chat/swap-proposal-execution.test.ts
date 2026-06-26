import {
  clearAgentActionHandoff,
  completeAgentActionFromHandoff,
  ensureApprovedAgentActionHandoff,
} from '@/lib/chat/agentActionHandoff';
import {
  finalizeSwapExecutionFailure,
  finalizeSwapExecutionSuccess,
  isLocalSwapProposalId,
  resolveSwapExecutionContext,
} from '@/lib/chat/swapProposalExecution';

jest.mock('@/lib/chat/agentActionHandoff', () => ({
  clearAgentActionHandoff: jest.fn(),
  completeAgentActionFromHandoff: jest.fn(),
  ensureApprovedAgentActionHandoff: jest.fn(),
}));

describe('swap proposal execution orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rebinds non-local swaps to the approved proposal before execution', async () => {
    const onApproveInline = jest.fn();
    (ensureApprovedAgentActionHandoff as jest.Mock).mockResolvedValue({
      executionProposalId: 'prop_swap_approved',
    });

    await expect(
      resolveSwapExecutionContext({
        proposalId: 'prop_swap_pending',
        proposal: {
          approvalResult: {
            payload: {
              proposalId: 'prop_swap_pending',
            },
          },
        },
        approvalParams: {
          amount: '10',
          fromToken: 'SWOP',
          toToken: 'USDC',
        },
        onApproveInline,
      }),
    ).resolves.toEqual({
      executionProposalId: 'prop_swap_approved',
      shouldReportCompletion: true,
    });

    expect(ensureApprovedAgentActionHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: 'prop_swap_pending',
        existingApprovalResult: expect.objectContaining({
          payload: expect.objectContaining({
            proposalId: 'prop_swap_pending',
          }),
        }),
        approvalParams: expect.objectContaining({
          amount: '10',
          fromToken: 'SWOP',
          toToken: 'USDC',
        }),
        onApproveInline,
      }),
    );
  });

  test('keeps local swap proposals on the local proposal id', async () => {
    await expect(
      resolveSwapExecutionContext({
        proposalId: 'local-wallet-swap-123',
        proposal: null,
        approvalParams: {
          amount: '5',
        },
        onApproveInline: jest.fn(),
      }),
    ).resolves.toEqual({
      executionProposalId: 'local-wallet-swap-123',
      shouldReportCompletion: false,
    });

    expect(isLocalSwapProposalId('local-wallet-swap-123')).toBe(true);
    expect(ensureApprovedAgentActionHandoff).not.toHaveBeenCalled();
  });

  test('reports successful completion against the approved proposal id', async () => {
    const reportedCompletion = {
      proposalId: 'prop_swap_approved',
      status: 'executed' as const,
      provider: 'swop',
      title: 'Swapped SWOP to USDC',
    };
    (completeAgentActionFromHandoff as jest.Mock).mockResolvedValue(
      reportedCompletion,
    );

    await expect(
      finalizeSwapExecutionSuccess({
        executionProposalId: 'prop_swap_approved',
        shouldReportCompletion: true,
        completionDraft: {
          proposalId: 'prop_swap_pending',
          status: 'executed',
          provider: 'swop',
          title: 'Swapped SWOP to USDC',
          subtitle: 'Jupiter',
          subject: 'SWOP -> USDC',
        },
        accessToken: 'access-token',
      }),
    ).resolves.toEqual(reportedCompletion);

    expect(completeAgentActionFromHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: 'prop_swap_pending',
        status: 'executed',
        provider: 'swop',
        title: 'Swapped SWOP to USDC',
      }),
      'access-token',
    );
    expect(clearAgentActionHandoff).not.toHaveBeenCalled();
  });

  test('returns a local fallback completion and clears handoff for local swaps', async () => {
    await expect(
      finalizeSwapExecutionSuccess({
        executionProposalId: 'local-wallet-swap-123',
        shouldReportCompletion: false,
        completionDraft: {
          status: 'executed',
          provider: 'swop',
          title: 'Local swap',
          subject: 'SWOP -> USDC',
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        proposalId: 'local-wallet-swap-123',
        status: 'executed',
        provider: 'swop',
        title: 'Local swap',
      }),
    );

    expect(completeAgentActionFromHandoff).not.toHaveBeenCalled();
    expect(clearAgentActionHandoff).toHaveBeenCalledTimes(1);
  });

  test('reports failed completion against the approved proposal id and clears on null result', async () => {
    (completeAgentActionFromHandoff as jest.Mock).mockResolvedValue(null);

    await expect(
      finalizeSwapExecutionFailure({
        executionProposalId: 'prop_swap_approved',
        shouldReportCompletion: true,
        failureTitle: 'Swap SWOP to USDC',
        failureSubtitle: 'Jupiter',
        failureSubject: 'SWOP -> USDC',
        error: 'Wallet rejected signature.',
        accessToken: 'access-token',
      }),
    ).resolves.toBeNull();

    expect(completeAgentActionFromHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: 'prop_swap_approved',
        status: 'failed',
        provider: 'swop',
        title: 'Swap SWOP to USDC',
        error: 'Wallet rejected signature.',
      }),
      'access-token',
    );
    expect(clearAgentActionHandoff).toHaveBeenCalledTimes(1);
  });
});
