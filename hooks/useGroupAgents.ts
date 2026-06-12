'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AgentApprovalHandoff } from '@/lib/chat/agentActionHandoff';

export interface GroupAgentDescriptor {
  agentId: string;
  provider: string;
  displayName: string;
  avatarUrl?: string | null;
  description?: string;
  mentionAliases?: string[];
  responseMode?: 'mention_only';
  defaultEnabledTools?: string[];
  supportedTools?: string[];
  isAvailable?: boolean;
}

export interface GoldmanAccessControl {
  enabled: boolean;
  approvalRequired: boolean;
}

export interface GoldmanAccessStation {
  version?: string;
  access?: Partial<
    Record<
      | 'perps'
      | 'predictions'
      | 'swaps'
      | 'sends'
      | 'aave'
      | 'vault'
      | 'balances'
      | 'strategy',
      Partial<GoldmanAccessControl>
    >
  >;
  limits?: Partial<
    Record<
      | 'maxSendUsd'
      | 'dailyCapUsd'
      | 'maxLeverage'
      | 'predictionExposureUsd'
      | 'reserveUsd',
      string | number
    >
  >;
}

export interface GroupAgent {
  agentId: string;
  provider: string;
  displayName: string;
  avatarUrl?: string | null;
  mentionAliases?: string[];
  responseMode?: 'mention_only';
  enabledTools?: string[];
  isActive?: boolean;
  config?: {
    accessStation?: GoldmanAccessStation;
    [key: string]: unknown;
  };
}

export interface AgentRiskSummary {
  riskLevel?: string;
  toolType?: string;
  action?: string;
  mode?: string;
  requiresProposal?: boolean;
  paramKeys?: string[];
}

export interface AgentActionProposal {
  proposalId: string;
  invocationId?: string;
  agentId?: string;
  groupId?: string;
  initiatingUserId?: string | { _id?: string };
  toolType?: string;
  action?: string;
  normalizedParams?: Record<string, unknown>;
  status?: string;
  expiresAt?: string;
  riskSummary?: AgentRiskSummary;
  approvalResult?: AgentApprovalHandoff | null;
}

export interface AgentActionResultPayload {
  proposalId: string;
  invocationId?: string;
  agentId?: string;
  groupId?: string;
  status?: string;
  result?: AgentApprovalHandoff | null;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  } | null;
}

interface SocketAck<T = unknown> {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export const GROUP_AGENT_SOCKET_EVENTS = {
  GET_AVAILABLE_AGENTS: 'get_available_agents',
  ADD_GROUP_AGENT: 'add_group_agent',
  REMOVE_GROUP_AGENT: 'remove_group_agent',
  UPDATE_GROUP_AGENT_ACCESS_STATION: 'update_group_agent_access_station',
  INVOKE_GROUP_AGENT: 'invoke_group_agent',
  APPROVE_AGENT_ACTION: 'approve_agent_action',
  COMPLETE_AGENT_ACTION: 'complete_agent_action',
  REJECT_AGENT_ACTION: 'reject_agent_action',
  INVOCATION_STARTED: 'agent_invocation_started',
  GROUP_RESPONSE: 'agent_group_response',
  ACTION_PROPOSED: 'agent_action_proposed',
  ACTION_RESULT: 'agent_action_result',
  GROUP_AGENT_UPDATED: 'group_agent_updated',
} as const;

const SOCKET_ACK_TIMEOUT_MS = 20000;

function ackError(response: SocketAck | undefined, fallback: string) {
  const error = new Error(response?.error?.message || fallback) as Error & {
    code?: string;
    details?: Record<string, unknown>;
  };
  error.code = response?.error?.code;
  error.details = response?.error?.details;
  return error;
}

function emitAckWithTimeout<T = unknown>({
  socket,
  event,
  payload,
  timeoutMessage,
}: {
  socket: any;
  event: string;
  payload: Record<string, unknown>;
  timeoutMessage: string;
}) {
  if (!socket?.connected) {
    return Promise.reject(
      new Error('Chat socket is disconnected. Refresh and try again.')
    );
  }

  return new Promise<SocketAck<T>>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(timeoutMessage));
    }, SOCKET_ACK_TIMEOUT_MS);

    socket.emit(event, payload, (response: SocketAck<T>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(response || {});
    });
  });
}

export function useGroupAgents(socket: any) {
  const [availableAgents, setAvailableAgents] = useState<GroupAgentDescriptor[]>(
    []
  );
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  const loadAvailableAgents = useCallback(() => {
    if (!socket) return Promise.resolve([] as GroupAgentDescriptor[]);

    setIsLoadingAgents(true);
    setAgentError(null);

    return emitAckWithTimeout<{ agents?: GroupAgentDescriptor[] }>({
      socket,
      event: GROUP_AGENT_SOCKET_EVENTS.GET_AVAILABLE_AGENTS,
      payload: { provider: 'elizaos' },
      timeoutMessage: 'Timed out loading group agents.',
    })
      .then((response) => {
        if (response?.success) {
          const agents = response.data?.agents || [];
          setAvailableAgents(agents);
          return agents;
        }

        setAvailableAgents([]);
        setAgentError(
          response?.error?.message || 'Group agents are unavailable.'
        );
        return [];
      })
      .catch((error) => {
        setAvailableAgents([]);
        setAgentError(
          error instanceof Error
            ? error.message
            : 'Group agents are unavailable.'
        );
        return [];
      })
      .finally(() => {
        setIsLoadingAgents(false);
      });
  }, [socket]);

  const addGroupAgent = useCallback(
    ({
      groupId,
      agent,
    }: {
      groupId: string;
      agent: GroupAgentDescriptor;
    }) => {
      if (!socket) {
        return Promise.reject(new Error('Socket is not connected.'));
      }

      return emitAckWithTimeout<{ agent?: GroupAgent }>({
        socket,
        event: GROUP_AGENT_SOCKET_EVENTS.ADD_GROUP_AGENT,
        payload: {
          groupId,
          agentId: agent.agentId,
          provider: agent.provider,
          enabledTools: agent.defaultEnabledTools || [
            'perps.read',
            'perps.write',
            'prediction.read',
            'prediction.write',
            'marketplace.read',
            'marketplace.write',
            'sports.read',
            'wallet.read',
            'wallet.write',
          ],
          responseMode: 'mention_only',
        },
        timeoutMessage: 'Timed out adding group agent.',
      }).then((response) => {
        if (response?.success && response.data?.agent) {
          return response.data.agent;
        }

        throw ackError(response, 'Failed to add group agent.');
      });
    },
    [socket]
  );

  const removeGroupAgent = useCallback(
    ({ groupId, agentId }: { groupId: string; agentId: string }) => {
      if (!socket) {
        return Promise.reject(new Error('Socket is not connected.'));
      }

      return emitAckWithTimeout({
        socket,
        event: GROUP_AGENT_SOCKET_EVENTS.REMOVE_GROUP_AGENT,
        payload: { groupId, agentId },
        timeoutMessage: 'Timed out removing group agent.',
      }).then((response) => {
        if (response?.success) return;

        throw ackError(response, 'Failed to remove group agent.');
      });
    },
    [socket]
  );

  const updateGroupAgentAccessStation = useCallback(
    ({
      groupId,
      agentId = 'goldman-sacks',
      accessStation,
    }: {
      groupId: string;
      agentId?: string;
      accessStation: GoldmanAccessStation;
    }) => {
      if (!socket) {
        return Promise.reject(new Error('Socket is not connected.'));
      }

      return emitAckWithTimeout<{ agent?: GroupAgent }>({
        socket,
        event: GROUP_AGENT_SOCKET_EVENTS.UPDATE_GROUP_AGENT_ACCESS_STATION,
        payload: { groupId, agentId, accessStation },
        timeoutMessage: 'Timed out updating Access Station.',
      }).then((response) => {
        if (response?.success && response.data?.agent) {
          return response.data.agent;
        }

        throw ackError(response, 'Failed to update Access Station.');
      });
    },
    [socket]
  );

  const approveAgentAction = useCallback(
    (proposalId: string, approvalParams?: Record<string, unknown>) => {
      if (!socket) {
        return Promise.reject(new Error('Socket is not connected.'));
      }

      return emitAckWithTimeout({
        socket,
        event: GROUP_AGENT_SOCKET_EVENTS.APPROVE_AGENT_ACTION,
        payload: { proposalId, approvalParams },
        timeoutMessage: 'Timed out approving proposal.',
      }).then((response) => {
        if (response?.success) return response;

        throw ackError(response, 'Failed to approve proposal.');
      });
    },
    [socket]
  );

  const invokeGroupAgent = useCallback(
    ({
      groupId,
      agentId = 'astro',
      message,
    }: {
      groupId: string;
      agentId?: string;
      message: string;
    }) => {
      if (!socket) {
        return Promise.reject(new Error('Socket is not connected.'));
      }

      return emitAckWithTimeout({
        socket,
        event: GROUP_AGENT_SOCKET_EVENTS.INVOKE_GROUP_AGENT,
        payload: { groupId, agentId, message },
        timeoutMessage: 'Timed out preparing the bet ticket.',
      }).then((response) => {
        if (response?.success) return response;

        throw ackError(response, 'Failed to prepare agent action.');
      });
    },
    [socket]
  );

  const rejectAgentAction = useCallback(
    (proposalId: string, reason = 'Rejected from desktop chat') => {
      if (!socket) {
        return Promise.reject(new Error('Socket is not connected.'));
      }

      return emitAckWithTimeout({
        socket,
        event: GROUP_AGENT_SOCKET_EVENTS.REJECT_AGENT_ACTION,
        payload: { proposalId, reason },
        timeoutMessage: 'Timed out rejecting proposal.',
      }).then((response) => {
        if (response?.success) return response;

        throw ackError(response, 'Failed to reject proposal.');
      });
    },
    [socket]
  );

  useEffect(() => {
    loadAvailableAgents();
  }, [loadAvailableAgents]);

  return {
    addGroupAgent,
    agentError,
    approveAgentAction,
    availableAgents,
    isLoadingAgents,
    invokeGroupAgent,
    loadAvailableAgents,
    rejectAgentAction,
    removeGroupAgent,
    updateGroupAgentAccessStation,
  };
}
