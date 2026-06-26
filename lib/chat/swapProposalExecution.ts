import {
  AgentApprovalHandoff,
  AgentActionCompletion,
  clearAgentActionHandoff,
  completeAgentActionFromHandoff,
  ensureApprovedAgentActionHandoff,
} from '@/lib/chat/agentActionHandoff';

const LOCAL_SWAP_PROPOSAL_PREFIX = 'local-wallet-swap-';

type ApprovalResultCarrier =
  | {
      approvalResult?: AgentApprovalHandoff | null;
    }
  | null
  | undefined;

export function isLocalSwapProposalId(proposalId?: string | null) {
  return Boolean(
    proposalId && proposalId.startsWith(LOCAL_SWAP_PROPOSAL_PREFIX)
  );
}

export async function resolveSwapExecutionContext({
  proposalId,
  proposal,
  approvalParams,
  onApproveInline,
}: {
  proposalId: string;
  proposal?: ApprovalResultCarrier;
  approvalParams: Record<string, unknown>;
  onApproveInline: (
    proposalId: string,
    approvalParams?: Record<string, unknown>,
  ) => Promise<AgentApprovalHandoff | null>;
}) {
  const shouldReportCompletion = !isLocalSwapProposalId(proposalId);

  if (!shouldReportCompletion) {
    return {
      executionProposalId: proposalId,
      shouldReportCompletion,
    };
  }

  const approval = await ensureApprovedAgentActionHandoff({
    proposalId,
    existingApprovalResult: proposal?.approvalResult,
    approvalParams,
    onApproveInline,
  });

  return {
    executionProposalId: approval.executionProposalId,
    shouldReportCompletion,
  };
}

export async function finalizeSwapExecutionSuccess({
  executionProposalId,
  shouldReportCompletion,
  completionDraft,
  accessToken,
}: {
  executionProposalId: string;
  shouldReportCompletion: boolean;
  completionDraft: Omit<
    AgentActionCompletion,
    | 'proposalId'
    | 'proposalNonce'
    | 'invocationId'
    | 'agentId'
    | 'groupId'
    | 'action'
    | 'toolType'
  > & {
    proposalId?: string;
  };
  accessToken?: string | null;
}) {
  const fallbackCompletion = {
    ...completionDraft,
    proposalId: executionProposalId,
  } as AgentActionCompletion;

  if (!shouldReportCompletion) {
    clearAgentActionHandoff();
    return fallbackCompletion;
  }

  return (
    (await completeAgentActionFromHandoff(completionDraft, accessToken)) ||
    fallbackCompletion
  );
}

export async function finalizeSwapExecutionFailure({
  executionProposalId,
  shouldReportCompletion,
  failureTitle,
  failureSubtitle,
  failureSubject,
  error,
  accessToken,
}: {
  executionProposalId: string;
  shouldReportCompletion: boolean;
  failureTitle: string;
  failureSubtitle?: string;
  failureSubject: string;
  error: string;
  accessToken?: string | null;
}) {
  if (!shouldReportCompletion) {
    clearAgentActionHandoff();
    return null;
  }

  try {
    const failedCompletion = await completeAgentActionFromHandoff(
      {
        proposalId: executionProposalId,
        status: 'failed',
        provider: 'swop',
        title: failureTitle,
        subtitle: failureSubtitle,
        subject: failureSubject,
        error,
      },
      accessToken,
    );

    if (!failedCompletion) {
      clearAgentActionHandoff();
    }

    return failedCompletion;
  } catch {
    clearAgentActionHandoff();
    return null;
  }
}
