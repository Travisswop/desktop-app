import { GROUP_AGENT_SOCKET_EVENTS } from '@/hooks/useGroupAgents';
import {
  AGENT_ACTION_HANDOFF_STORAGE_KEY,
  getHyperliquidOrderPrefill,
  getPolymarketOrderPrefill,
  persistAgentActionHandoff,
  readAgentActionHandoff,
} from '@/lib/chat/agentActionHandoff';
import {
  getMessageProposalId,
  getObjectId,
  proposalFromMessage,
} from '@/lib/chat/groupAgentPayloads';

describe('desktop group agent payloads', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: {
        sessionStorage: {
          clear: () => storage.clear(),
          getItem: (key: string) => storage.get(key) || null,
          removeItem: (key: string) => storage.delete(key),
          setItem: (key: string, value: string) => storage.set(key, value),
        },
        dispatchEvent: jest.fn(),
      },
    });
    Object.defineProperty(global, 'CustomEvent', {
      configurable: true,
      value: class CustomEvent {
        type: string;
        detail: unknown;

        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
    });
  });

  test('uses the backend contract socket event names', () => {
    expect(GROUP_AGENT_SOCKET_EVENTS).toMatchObject({
      GET_AVAILABLE_AGENTS: 'get_available_agents',
      ADD_GROUP_AGENT: 'add_group_agent',
      REMOVE_GROUP_AGENT: 'remove_group_agent',
      INVOKE_GROUP_AGENT: 'invoke_group_agent',
      APPROVE_AGENT_ACTION: 'approve_agent_action',
      REJECT_AGENT_ACTION: 'reject_agent_action',
      INVOCATION_STARTED: 'agent_invocation_started',
      GROUP_RESPONSE: 'agent_group_response',
      ACTION_PROPOSED: 'agent_action_proposed',
      ACTION_RESULT: 'agent_action_result',
    });
  });

  test('parses proposal ids from current and fallback agent message shapes', () => {
    expect(
      getMessageProposalId({
        agentData: {
          proposalId: 'prop_direct',
          proposalIds: ['prop_fallback'],
        },
      })
    ).toBe('prop_direct');

    expect(
      getMessageProposalId({
        agentData: {
          proposalIds: ['prop_fallback'],
        },
      })
    ).toBe('prop_fallback');

    expect(getMessageProposalId({ agentData: {} })).toBeNull();
  });

  test('builds a pending proposal card payload from an agent message', () => {
    const proposal = proposalFromMessage({
      agentData: {
        proposalId: 'prop_123',
        action: 'perps.place_order',
        toolType: 'perps.write',
        metadata: {
          riskSummary: {
            riskLevel: 'high',
            requiresProposal: true,
          },
        },
      },
    });

    expect(proposal).toEqual({
      proposalId: 'prop_123',
      action: 'perps.place_order',
      toolType: 'perps.write',
      status: 'pending',
      riskSummary: {
        riskLevel: 'high',
        requiresProposal: true,
      },
    });
  });

  test('keeps safe proposal defaults from persisted agent messages', () => {
    const proposal = proposalFromMessage({
      agentData: {
        proposalId: 'prop_poly',
        action: 'prediction.prepare_order',
        toolType: 'prediction.write',
        metadata: {
          normalizedParams: {
            marketId: 'market-1',
            tokenId: 'token-yes',
            outcome: 'yes',
            outcomeLabel: 'Team A',
            amount: '10',
          },
        },
      },
    });

    expect(proposal?.normalizedParams).toMatchObject({
      marketId: 'market-1',
      tokenId: 'token-yes',
      outcomeLabel: 'Team A',
      amount: '10',
    });
  });

  test('normalizes string and populated initiating user ids', () => {
    expect(getObjectId('user-1')).toBe('user-1');
    expect(getObjectId({ _id: 'user-2', name: 'Member' })).toBe('user-2');
    expect(getObjectId(null)).toBeNull();
  });

  test('persists nonce-bound approval handoff for wallet surfaces', () => {
    persistAgentActionHandoff({
      status: 'approved',
      nextStep: 'hyperliquid_order_form_required',
      proposalNonce: 'nonce-1',
      payload: {
        proposalId: 'prop_1',
        proposalNonce: 'nonce-1',
        action: 'perps.place_order',
        toolType: 'perps.write',
        provider: 'hyperliquid',
        route: '/wallet',
        panel: 'perps',
        requiredFields: ['side', 'size'],
        prefill: {
          coin: 'BTC',
        },
      },
    });

    expect(
      global.window.sessionStorage.getItem(AGENT_ACTION_HANDOFF_STORAGE_KEY)
    ).toContain('nonce-1');
    expect(readAgentActionHandoff()).toMatchObject({
      approvalResult: {
        nextStep: 'hyperliquid_order_form_required',
        proposalNonce: 'nonce-1',
      },
      payload: {
        proposalId: 'prop_1',
        proposalNonce: 'nonce-1',
        provider: 'hyperliquid',
        panel: 'perps',
      },
    });
  });

  test('extracts Hyperliquid perps ticket defaults from approval handoff', () => {
    const prefill = getHyperliquidOrderPrefill({
      status: 'approved',
      nextStep: 'hyperliquid_frontend_signing_required',
      payload: {
        proposalId: 'prop_hl',
        proposalNonce: 'nonce_hl',
        provider: 'hyperliquid',
        panel: 'perps',
        action: 'perps.place_order',
        normalizedParams: {
          coin: 'ETH',
          isBuy: false,
          sz: '0.25',
          assetIndex: 110000,
          dex: 'builder-dex',
          orderType: 'limit',
          price: '3200',
          leverage: '5',
          isCross: 'false',
        },
      },
    });

    expect(prefill).toMatchObject({
      proposalId: 'prop_hl',
      proposalNonce: 'nonce_hl',
      coin: 'ETH',
      assetIndex: 110000,
      dex: 'builder-dex',
      side: 'short',
      sizeCoins: '0.25',
      orderMode: 'limit',
      price: '3200',
      leverage: 5,
      isCross: false,
    });
  });

  test('keeps operating-mode disclosure when an approved handoff only supplies mode context', () => {
    const prefill = getHyperliquidOrderPrefill({
      status: 'approved',
      nextStep: 'hyperliquid_frontend_signing_required',
      payload: {
        proposalId: 'prop_hl_mode',
        proposalNonce: 'nonce_hl_mode',
        provider: 'hyperliquid',
        panel: 'perps',
        action: 'perps.place_order',
        normalizedParams: {
          coin: 'ETH',
          operatingMode: 'shadow',
        },
      },
    });

    expect(prefill).toMatchObject({
      proposalId: 'prop_hl_mode',
      operatingModeLabel: 'Shadow',
    });
  });

  test('uses requested Hyperliquid market aliases over stale coin defaults', () => {
    const prefill = getHyperliquidOrderPrefill({
      status: 'approved',
      nextStep: 'hyperliquid_frontend_signing_required',
      payload: {
        proposalId: 'prop_hl_gold',
        proposalNonce: 'nonce_hl_gold',
        provider: 'hyperliquid',
        panel: 'perps',
        action: 'perps.place_order',
        normalizedParams: {
          coin: 'ETH',
          requestedMarket: 'gold',
          side: 'long',
          sizeUsd: '1000',
        },
      },
    });

    expect(prefill).toMatchObject({
      proposalId: 'prop_hl_gold',
      coin: 'PAXG',
      side: 'long',
      sizeUsd: '1000',
    });
  });

  test('preserves resolved Hyperliquid builder gold symbols', () => {
    const prefill = getHyperliquidOrderPrefill({
      status: 'approved',
      nextStep: 'hyperliquid_frontend_signing_required',
      payload: {
        proposalId: 'prop_hl_builder_gold',
        proposalNonce: 'nonce_hl_builder_gold',
        provider: 'hyperliquid',
        panel: 'perps',
        action: 'perps.place_order',
        normalizedParams: {
          coin: 'xyz:GOLD',
          requestedMarket: 'gold',
          side: 'short',
          sizeUsd: '500',
        },
      },
    });

    expect(prefill).toMatchObject({
      proposalId: 'prop_hl_builder_gold',
      coin: 'xyz:GOLD',
      side: 'short',
      sizeUsd: '500',
    });
  });

  test('extracts Hyperliquid TP/SL defaults from approval handoff', () => {
    const prefill = getHyperliquidOrderPrefill({
      status: 'approved',
      nextStep: 'hyperliquid_frontend_signing_required',
      payload: {
        proposalId: 'prop_hl_tpsl',
        proposalNonce: 'nonce_hl_tpsl',
        provider: 'hyperliquid',
        panel: 'perps',
        action: 'perps.place_order',
        normalizedParams: {
          coin: 'ETH',
          side: 'long',
          sizeUsd: '1000',
          orderType: 'take_profit_stop_loss',
          limitPrice: '3200',
          takeProfitPrice: '3500',
          stopLoss: '3000',
          leverage: '5',
        },
      },
    });

    expect(prefill).toMatchObject({
      proposalId: 'prop_hl_tpsl',
      proposalNonce: 'nonce_hl_tpsl',
      coin: 'ETH',
      side: 'long',
      sizeUsd: '1000',
      orderMode: 'tpsl',
      price: '3200',
      takeProfitPrice: '3500',
      stopLossPrice: '3000',
      leverage: 5,
    });
  });

  test('extracts Polymarket ticket defaults from approval handoff', () => {
    const prefill = getPolymarketOrderPrefill({
      status: 'approved',
      nextStep: 'polymarket_frontend_signing_required',
      payload: {
        proposalId: 'prop_poly',
        proposalNonce: 'nonce_poly',
        provider: 'polymarket',
        action: 'prediction.prepare_order',
        normalizedParams: {
          conditionId: 'condition-1',
          tokenId: 'token-yes',
          outcomeIndex: 0,
          side: 'buy',
          amount: '25',
          orderType: 'limit',
          price: '0.42',
        },
      },
    });

    expect(prefill).toMatchObject({
      proposalId: 'prop_poly',
      proposalNonce: 'nonce_poly',
      conditionId: 'condition-1',
      marketRouteKey: 'condition-1',
      tokenId: 'token-yes',
      outcome: 'yes',
      side: 'BUY',
      amount: '25',
      amountUnit: 'usd',
      orderType: 'limit',
      limitPrice: '42',
    });
  });

  test('keeps share-denominated Polymarket approvals typed as shares', () => {
    const prefill = getPolymarketOrderPrefill({
      status: 'approved',
      payload: {
        proposalId: 'prop_poly',
        proposalNonce: 'nonce_poly',
        provider: 'polymarket',
        action: 'prediction.prepare_order',
        normalizedParams: {
          conditionId: 'condition-1',
          tokenId: 'token-yes',
          outcomeIndex: 0,
          side: 'buy',
          shares: '25',
          orderType: 'limit',
          price: '0.42',
        },
      },
    });

    expect(prefill).toMatchObject({
      proposalId: 'prop_poly',
      amount: '25',
      amountUnit: 'shares',
      orderType: 'limit',
      limitPrice: '42',
    });
  });
});
