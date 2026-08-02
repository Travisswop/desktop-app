import type { AgentActionProposal } from '@/hooks/useGroupAgents';

export interface AgentMessagePayload {
  agentData?: {
    action?: string;
    proposalId?: string;
    proposalIds?: string[];
    toolType?: string;
    // Persisted by the backend when the proposal transitions
    // (approved/rejected/expired/superseded) so reloaded history renders the
    // true state instead of a live Approve button on a dead proposal.
    status?: string;
    supersededBy?: string;
    expiresAt?: string;
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

  // Prefer the status the backend persisted onto the message; a card with a
  // past expiry can no longer be approved either way, so render it expired
  // rather than letting the Approve call fail with a 410.
  const persistedStatus = message.agentData?.status;
  const expiresAt = message.agentData?.expiresAt;
  const isPastExpiry =
    !persistedStatus &&
    expiresAt &&
    Number.isFinite(Date.parse(expiresAt)) &&
    Date.parse(expiresAt) <= Date.now();

  const proposal: AgentActionProposal = {
    proposalId,
    action: message.agentData?.action,
    toolType: message.agentData?.toolType,
    status: persistedStatus || (isPastExpiry ? 'expired' : 'pending'),
    riskSummary: message.agentData?.metadata?.riskSummary,
  };

  if (message.agentData?.metadata?.normalizedParams) {
    proposal.normalizedParams = message.agentData.metadata.normalizedParams;
  }

  return proposal;
}
