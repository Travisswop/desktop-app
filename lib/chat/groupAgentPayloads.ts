import type { AgentActionProposal } from '@/hooks/useGroupAgents';

export interface AgentMessagePayload {
  agentData?: {
    action?: string;
    proposalId?: string;
    proposalIds?: string[];
    toolType?: string;
    metadata?: {
      riskSummary?: AgentActionProposal['riskSummary'];
      normalizedParams?: AgentActionProposal['normalizedParams'];
    };
  };
}

export function getObjectId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '_id' in value) {
    const id = (value as { _id?: unknown })._id;
    return id ? String(id) : null;
  }
  return String(value);
}

export function getMessageProposalId(
  message: AgentMessagePayload
): string | null {
  return (
    message.agentData?.proposalId ||
    message.agentData?.proposalIds?.[0] ||
    null
  );
}

export function proposalFromMessage(
  message: AgentMessagePayload
): AgentActionProposal | null {
  const proposalId = getMessageProposalId(message);
  if (!proposalId) return null;

  const proposal: AgentActionProposal = {
    proposalId,
    action: message.agentData?.action,
    toolType: message.agentData?.toolType,
    status: 'pending',
    riskSummary: message.agentData?.metadata?.riskSummary,
  };

  if (message.agentData?.metadata?.normalizedParams) {
    proposal.normalizedParams = message.agentData.metadata.normalizedParams;
  }

  return proposal;
}
