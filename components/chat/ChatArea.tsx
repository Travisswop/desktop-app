// app/components/ChatArea.tsx
'use client';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import {
  Fragment,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useConnectWallet,
  usePrivy,
  useWallets as useEvmWallets,
} from '@privy-io/react-auth';
import {
  useSignAndSendTransaction,
  useSignTransaction,
  useWallets as useSolanaWallets,
} from '@privy-io/react-auth/solana';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { ethers } from 'ethers';
import bs58 from 'bs58';
import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  http,
} from 'viem';
import { arbitrum, base, bsc, mainnet, polygon } from 'viem/chains';
import GroupMenu from './GroupMenu';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import isUrl from '@/lib/isUrl';
import CoinbaseOnrampFunding from '@/components/wallet/CoinbaseOnrampFunding';
import {
  findFundingOnrampIntent,
  normalizeFundingOnrampSourceText,
  type FundingOnrampPrefill,
} from '@/lib/chat/fundingOnrampIntent';
import toast from 'react-hot-toast';
import {
  Activity,
  ArrowRight,
  ArrowRightLeft,
  Ban,
  BarChart3,
  Bot,
  ChevronDown,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Grid2X2,
  Loader2,
  Menu,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  AgentActionProposal,
  AgentActionResultPayload,
  GROUP_AGENT_SOCKET_EVENTS,
  GroupAgent,
  GroupAgentDescriptor,
  useGroupAgents,
} from '@/hooks/useGroupAgents';
import {
  getMessageProposalId,
  getObjectId,
  proposalFromMessage,
} from '@/lib/chat/groupAgentPayloads';
import {
  AgentApprovalHandoff,
  clearAgentActionHandoff,
  completeAgentActionFromHandoff,
  persistAgentActionHandoff,
  type AgentActionCompletion,
} from '@/lib/chat/agentActionHandoff';
import { postFeed } from '@/actions/postFeed';
import { isVisiblePortfolioPosition } from '@/lib/polymarket/position-payout';
import {
  usePolymarketWallet,
  useTrading,
} from '@/providers/polymarket';
import {
  useWalletAddresses,
  useWalletData,
} from '@/components/wallet/hooks/useWalletData';
import { SUPPORTED_CHAINS } from '@/components/wallet/constants';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { useUser } from '@/lib/UserContext';
import { getWalletInfo } from '@/lib/polymarket/backend-session';
import { DUST_THRESHOLD } from '@/constants/polymarket';
import { usePolygonBalances } from '@/hooks/polymarket/usePolygonBalances';
import {
  useUserPositions,
  type PolymarketPosition,
} from '@/hooks/polymarket/useUserPositions';
import {
  useActiveOrders,
  type PolymarketOrder,
} from '@/hooks/polymarket/useActiveOrders';

const LOCAL_HYPERLIQUID_PROPOSAL_PREFIX = 'local-perps-order-';
import {
  useClobOrder,
  type OrderSubmissionStage,
} from '@/hooks/polymarket/useClobOrder';
import {
  useHyperliquidPositions,
  type PerpsAccountSummary,
} from '@/components/wallet/perps/hooks/useHyperliquidPositions';
import { useHyperliquidAgent } from '@/components/wallet/perps/hooks/useHyperliquidAgent';
import { useHyperliquidMarkets } from '@/components/wallet/perps/hooks/useHyperliquidMarkets';
import { useHyperliquidTrading } from '@/components/wallet/perps/hooks/useHyperliquidTrading';
import type { HLMarket, HLPosition } from '@/services/hyperliquid/types';
import {
  buildPerpsPositionKey,
  upsertPerpsPositionFeed,
  type PerpsPositionFeedEvent,
  type PerpsPositionFeedStatus,
} from '@/lib/perps/perpsFeed';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  executeJupiterOrder as postJupiterExecute,
  getJupiterOrder,
  getJupiterQuote as fetchJupiterQuote,
} from '@/actions/jupiterSwap';
import { getLifiQuote as fetchLifiQuote } from '@/actions/lifiForTokenSwap';
import type { TokenData } from '@/types/token';
import type { Network, SendFlowState } from '@/types/wallet-types';
import type { ReceiverData } from '@/types/wallet';
import { CHAIN_ID } from '@/types/wallet-types';
import { TransactionService } from '@/services/transaction-service';
import { calculateTransactionAmount } from '@/lib/utils/transactionUtils';
import { getConnectionsUserData } from '@/actions/getEnsData';
import { useModalStore } from '@/zustandStore/modalstore';
// ==================== FEATURE FLAGS ====================

// Socket event names (V1 or V2 based on feature flag)
const EVENTS = {
      SEND_MESSAGE: 'send_message',
      NEW_MESSAGE: 'new_message',
      GET_CONVERSATION_HISTORY: 'get_conversation_history',
      MARK_MESSAGES_READ: 'mark_messages_read',
      JOIN_CONVERSATION: 'join_conversation',
    };

// ==================== TYPE DEFINITIONS ====================

interface User {
  _id: string;
  name: string;
  profilePic?: string;
  ensName?: string;
  swopensId?: string;
  primaryMicrosite?: string;
  microsites?: Array<{
    ens?: string;
    name?: string;
    primary?: boolean;
  }>;
}

interface Microsite {
  _id: string;
  name: string;
  ens: string;
  profilePic?: string;
  profileUrl?: string;
  parentId?: string;
}

interface Participant {
  userId: User;
  role?: string;
  joinedAt?: string;
}

interface GroupSettings {
  groupInfo?: {
    groupPicture?: string;
    description?: string;
  };
}

interface Message {
  _id: string;
  message: string;
  sender?: User;
  receiver?: User | null;
  groupId?: string | null;
  messageType:
    | 'text'
    | 'image'
    | 'file'
    | 'bot_command'
    | 'bot_response'
    | 'system'
    | 'agent_response'
    | 'agent_action_proposal';
  createdAt: string;
  status?: 'sending' | 'sent' | 'failed';
  readBy?: string[];
  senderKind?: 'human' | 'agent';
  agentSender?: {
    agentId?: string;
    provider?: string;
    displayName?: string;
    avatarUrl?: string | null;
  };
  agentData?: {
    invocationId?: string;
    action?: string;
    proposalIds?: string[];
    proposalId?: string;
    toolType?: string;
    metadata?: {
      riskSummary?: AgentActionProposal['riskSummary'];
      normalizedParams?: AgentActionProposal['normalizedParams'];
        toolExecution?: {
          provider?: string | null;
          action?: string | null;
          markets?: PolymarketMarketPreview[];
          positions?: PolymarketPosition[];
          perpsPositions?: HyperliquidPositionsPreview | null;
          items?: MarketplaceItemPreview[];
          walletReceive?: WalletReceiveQrDetails | null;
          sources?: ResearchSourcePreview[];
          sportsResearch?: SportsResearchBrief | null;
          query?: string | null;
          checkedAt?: string | null;
        } | null;
      polymarketOrderPrefill?: PolymarketOrderPrefill | null;
      walletSendNetworkPrompt?: WalletSendNetworkPrompt | null;
      perpsPositionPrompt?: PerpsPositionPrompt | null;
      receipt?: AgentActionCompletion | null;
      fundingOnramp?: FundingOnrampPrefill | null;
    };
  };
}

const MESSAGE_DEDUPE_WINDOW_MS = 15_000;

function normalizeMessageForDedupe(value?: string | null) {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isTempMessage(message: Message) {
  return Boolean(
    message._id && message._id.toString().startsWith('temp-')
  );
}

function isAgentLikeMessage(message: Message) {
  if (message.senderKind === 'agent') return true;
  return Boolean(
    message.agentSender && !message.sender && message.messageType !== 'text'
  );
}

function messageAgentRichKey(message: Message) {
  if (!isAgentLikeMessage(message)) return '';

  const toolExecution = message.agentData?.metadata?.toolExecution;
  if (!toolExecution) return '';

  const researchOddsQuery = extractPolymarketOddsQueryFromResearch(
    message.message,
    toolExecution.query
  );
  if (researchOddsQuery) {
    return `polymarket-research:${researchOddsQuery}`;
  }

  const marketKeys = (toolExecution.markets || [])
    .map(getPolymarketMarketIdentity)
    .filter(Boolean)
    .sort()
    .join(',');
  const positionKeys = (toolExecution.positions || [])
    .map(
      (position) =>
        `${position.conditionId || ''}:${position.asset || ''}:${
          position.outcome || ''
        }:${position.size || ''}:${position.cashPnl || ''}:${
          position.curPrice || ''
        }`
    )
    .filter((position) => position.replace(/:/g, ''))
    .sort()
    .join(',');
  const sourceKeys = (toolExecution.sources || [])
    .map((source) => `${source.title || ''}:${source.url || ''}`)
    .filter((source) => source !== ':')
    .sort()
    .join(',');
  const sportsResearchKey = (toolExecution.sportsResearch?.groups || [])
    .map(
      (group) =>
        `${group.title || ''}:${(group.items || [])
          .map((item) => `${item.label || ''}:${item.value || ''}:${item.note || ''}`)
          .join(',')}`
    )
    .filter((group) => group !== ':')
    .sort()
    .join('|');
  const perpsPositionsKey = (toolExecution.perpsPositions?.positions || [])
    .map(
      (position) =>
        `${position.coin || ''}:${position.szi || ''}:${
          position.entryPx || ''
        }:${position.unrealizedPnl || ''}:${position.returnOnEquity || ''}`
    )
    .filter((position) => position.replace(/:/g, ''))
    .sort()
    .join(',');
  const perpsAccountKey = toolExecution.perpsPositions
    ? `${toolExecution.perpsPositions.accountValue || ''}:${
        toolExecution.perpsPositions.withdrawable || ''
      }`
    : '';

  if (
    !toolExecution.action &&
    !marketKeys &&
    !positionKeys &&
    !sourceKeys &&
    !sportsResearchKey &&
    !perpsPositionsKey &&
    !perpsAccountKey
  ) {
    return '';
  }

  return [
    toolExecution.provider || '',
    toolExecution.action || '',
    toolExecution.query || '',
    marketKeys,
    positionKeys,
    sourceKeys,
    sportsResearchKey,
    perpsPositionsKey,
    perpsAccountKey,
  ].join('|');
}

function isNamedAgentMessage(message: Message) {
  const displayName = message.agentSender?.displayName?.trim();
  return Boolean(
    message.agentSender?.agentId ||
      (displayName && displayName.toLowerCase() !== 'agent')
  );
}

function getMessageResearchPolymarketQuery(message: Message) {
  const toolExecution = message.agentData?.metadata?.toolExecution;
  return extractPolymarketOddsQueryFromResearch(
    message.message,
    toolExecution?.query
  );
}

function shouldResolveMessageResearchToPolymarket(message: Message) {
  const toolExecution = message.agentData?.metadata?.toolExecution;
  const researchPolymarketQuery = getMessageResearchPolymarketQuery(message);

  return (
    isAgentLikeMessage(message) &&
    (toolExecution?.sources || []).length > 0 &&
    Boolean(researchPolymarketQuery) &&
    /\b(odds|predictions?|bets?|betting|champion|championship|finals|futures?|game\s*\d+|moneyline|spread|total)\b/i.test(
      `${message.message || ''} ${toolExecution?.query || ''}`
    )
  );
}

function hasPolymarketAgentRichContent(message: Message) {
  const toolExecution = message.agentData?.metadata?.toolExecution;
  return Boolean(
    isAgentLikeMessage(message) &&
      ((toolExecution?.markets || []).length > 0 ||
        (toolExecution?.positions || []).length > 0 ||
        shouldResolveMessageResearchToPolymarket(message))
  );
}

function shouldPreferNamedPolymarketAgentMessage(
  message: Message,
  candidate: Message
) {
  if (!hasPolymarketAgentRichContent(message)) return false;
  if (!hasPolymarketAgentRichContent(candidate)) return false;
  if (isNamedAgentMessage(message)) return false;
  if (!isNamedAgentMessage(candidate)) return false;

  const currentTime = messageTime(message);
  const candidateTime = messageTime(candidate);
  if (
    currentTime &&
    candidateTime &&
    Math.abs(currentTime - candidateTime) > 10 * 60 * 1000
  ) {
    return false;
  }

  const currentResearchQuery = getMessageResearchPolymarketQuery(message);
  const candidateResearchQuery =
    getMessageResearchPolymarketQuery(candidate);
  if (currentResearchQuery && candidateResearchQuery) {
    return currentResearchQuery === candidateResearchQuery;
  }

  return true;
}

function messageSenderKey(message: Message) {
  if (isAgentLikeMessage(message)) {
    return `agent:${message.agentSender?.agentId || message.agentData?.action || 'unknown'}`;
  }
  return `human:${message.sender?._id || ''}`;
}

function messageThreadKey(message: Message) {
  return [
    message.groupId || '',
    message.receiver?._id || '',
    isAgentLikeMessage(message) ? 'agent' : message.messageType || '',
  ].join(':');
}

function messageTime(message: Message) {
  const time = new Date(message.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getReceiptIdentityKeys(receipt?: AgentActionCompletion | null) {
  if (!receipt) return [];

  const keys = [
    receipt.proposalId ? `proposal:${receipt.proposalId}` : '',
    receipt.orderId !== undefined && receipt.orderId !== null
      ? `order:${String(receipt.orderId)}`
      : '',
    receipt.txHash ? `tx:${receipt.txHash}` : '',
  ].filter(Boolean);

  if (keys.length === 0 && receipt.provider && receipt.placedAt) {
    keys.push(
      `fallback:${receipt.provider}:${receipt.status || ''}:${receipt.placedAt}`
    );
  }

  return Array.from(new Set(keys));
}

function messageReceiptIdentityKeys(message: Message) {
  return getReceiptIdentityKeys(message.agentData?.metadata?.receipt);
}

function hasMatchingReceiptIdentity(a: Message, b: Message) {
  const aKeys = messageReceiptIdentityKeys(a);
  const bKeys = messageReceiptIdentityKeys(b);
  if (aKeys.length === 0 || bKeys.length === 0) return false;

  const bKeySet = new Set(bKeys);
  return aKeys.some((key) => bKeySet.has(key));
}

function hasRenderedReceiptIdentity(
  receipt: AgentActionCompletion | null | undefined,
  renderedReceiptIdentityKeys: Set<string>
) {
  return getReceiptIdentityKeys(receipt).some((key) =>
    renderedReceiptIdentityKeys.has(key)
  );
}

function findPreviousHumanMessageText(
  messages: Message[],
  currentIndex: number,
  maxAgeMs = 10 * 60 * 1000
) {
  const currentTime = messageTime(messages[currentIndex]);
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    if (isAgentLikeMessage(candidate)) continue;
    if (candidate.messageType !== 'text' || !candidate.message?.trim()) {
      continue;
    }
    const candidateTime = messageTime(candidate);
    if (
      currentTime &&
      candidateTime &&
      currentTime - candidateTime > maxAgeMs
    ) {
      break;
    }
    return candidate.message;
  }
  return '';
}

function isLogicalDuplicateMessage(a: Message, b: Message) {
  if (a._id && b._id && a._id === b._id) return true;
  if (messageThreadKey(a) !== messageThreadKey(b)) return false;
  if (hasMatchingReceiptIdentity(a, b)) return true;

  const normalizedA = normalizeMessageForDedupe(a.message);
  const normalizedB = normalizeMessageForDedupe(b.message);
  const richKeyA = messageAgentRichKey(a);
  const richKeyB = messageAgentRichKey(b);
  const hasMatchingRichAgentPayload =
    Boolean(richKeyA) && richKeyA === richKeyB;

  if (normalizedA !== normalizedB && !hasMatchingRichAgentPayload) {
    return false;
  }
  if (
    messageSenderKey(a) !== messageSenderKey(b) &&
    !(isAgentLikeMessage(a) && isAgentLikeMessage(b)) &&
    !isTempMessage(a) &&
    !isTempMessage(b)
  ) {
    return false;
  }

  const aTime = messageTime(a);
  const bTime = messageTime(b);
  if (!aTime || !bTime) return true;
  if (hasMatchingRichAgentPayload) {
    return Math.abs(aTime - bTime) <= 10 * 60 * 1000;
  }
  return Math.abs(aTime - bTime) <= MESSAGE_DEDUPE_WINDOW_MS;
}

function shouldReplaceDuplicateMessage(existing: Message, incoming: Message) {
  if (
    (isTempMessage(existing) && !isTempMessage(incoming)) ||
    (existing.status === 'sending' && incoming.status !== 'sending')
  ) {
    return true;
  }

  if (isAgentLikeMessage(existing) && isAgentLikeMessage(incoming)) {
    if (!existing.agentSender?.agentId && incoming.agentSender?.agentId) {
      return true;
    }
    if (
      existing.agentSender?.displayName === 'Agent' &&
      incoming.agentSender?.displayName &&
      incoming.agentSender.displayName !== 'Agent'
    ) {
      return true;
    }
  }

  return false;
}

function dedupeMessages(messages: Message[]) {
  return messages.reduce<Message[]>((next, message) => {
    const existingIndex = next.findIndex((item) =>
      isLogicalDuplicateMessage(item, message)
    );
    if (existingIndex === -1) {
      next.push(message);
    } else {
      const existing = next[existingIndex];
      if (shouldReplaceDuplicateMessage(existing, message)) {
        next[existingIndex] = message;
      }
    }
    return next;
  }, []);
}

function findMatchingTempMessageIndex(messages: Message[], message: Message) {
  const normalizedMessage = normalizeMessageForDedupe(message.message);
  const threadKey = messageThreadKey(message);
  const incomingTime = messageTime(message);

  return messages.findIndex((item) => {
    if (!isTempMessage(item)) return false;
    if (messageThreadKey(item) !== threadKey) return false;
    if (normalizeMessageForDedupe(item.message) !== normalizedMessage) {
      return false;
    }

    const itemTime = messageTime(item);
    if (!incomingTime || !itemTime) return true;
    return Math.abs(incomingTime - itemTime) <= MESSAGE_DEDUPE_WINDOW_MS;
  });
}

function reconcileIncomingMessage(messages: Message[], message: Message) {
  if (!message?._id) return messages;

  const matchingTempIndex = findMatchingTempMessageIndex(messages, message);
  if (matchingTempIndex !== -1 && !isTempMessage(message)) {
    const next = [...messages];
    next[matchingTempIndex] = message;
    return dedupeMessages(next);
  }

  return dedupeMessages([...messages, message]);
}

interface WalletReceiveQrDetails {
  address: string;
  network?: string | null;
  networkLabel?: string | null;
  chainType?: string | null;
  chainId?: number | null;
  assetHint?: string | null;
  warning?: string | null;
  source?: string | null;
}

interface WalletSendNetworkOption {
  chain: string;
  balance: string;
  usdValue: number;
  feeLabel: string;
  timeLabel: string;
  hasEnoughBalance: boolean;
  isBest: boolean;
}

interface WalletSendNetworkPrompt {
  token: string;
  amount: string;
  amountType: string;
  recipient: string;
  options: WalletSendNetworkOption[];
}

interface PerpsPositionPromptOption {
  coin: string;
  side: 'long' | 'short';
  sizeCoins: string;
  entryPrice: string;
  markPrice: string;
  leverage: number;
  isCross: boolean;
  marginUsed: string;
  positionValue: string;
  liquidationPrice?: string | null;
}

interface PerpsPositionPrompt {
  takeProfitPrice?: string;
  stopLossPrice?: string;
  requestedSide?: 'long' | 'short' | '';
  options: PerpsPositionPromptOption[];
}

interface HyperliquidPositionPreview {
  coin: string;
  displayCoin?: string | null;
  side?: 'long' | 'short' | string | null;
  szi?: string | null;
  entryPx?: string | null;
  markPx?: string | null;
  unrealizedPnl?: string | null;
  returnOnEquity?: string | null;
  liquidationPx?: string | null;
  marginUsed?: string | null;
  positionValue?: string | null;
  leverage?: {
    type?: string | null;
    value?: number | null;
  } | null;
}

interface HyperliquidPositionsPreview {
  accountValue?: string | null;
  withdrawable?: string | null;
  positions?: HyperliquidPositionPreview[];
}

interface ResearchSourcePreview {
  title?: string | null;
  snippet?: string | null;
  sourceName?: string | null;
  url?: string | null;
}

interface SportsResearchItem {
  label?: string | null;
  value?: string | null;
  status?: string | null;
  note?: string | null;
}

interface SportsResearchGroup {
  title?: string | null;
  items?: SportsResearchItem[];
}

interface SportsResearchBrief {
  title?: string | null;
  subtitle?: string | null;
  sourceName?: string | null;
  checkedAt?: string | null;
  groups?: SportsResearchGroup[];
  notes?: string[];
}

interface MarketplaceItemPreview {
  id?: string | null;
  templateId?: string | null;
  micrositeId?: string | null;
  sellerUsername?: string | null;
  sellerName?: string | null;
  profileUrl?: string | null;
  name: string;
  description?: string | null;
  image?: string | null;
  price?: number | string | null;
  currency?: string | null;
  category?: string | null;
  nftType?: string | null;
  mintLimit?: number | string | null;
  available?: number | string | null;
}

interface PolymarketMarketPreview {
  id?: string | null;
  conditionId?: string | null;
  slug?: string | null;
  eventTitle?: string | null;
  eventSlug?: string | null;
  eventLive?: boolean;
  gameStartTime?: string | null;
  question?: string | null;
  clobTokenIds?: string[];
  outcomes?: string[];
  yesPrice?: string | number | null;
  noPrice?: string | number | null;
  volume?: string | number | null;
}

interface PolymarketMarketGroup {
  key: string;
  isEventGroup: boolean;
  markets: PolymarketMarketPreview[];
}

interface PolymarketOrderPrefill {
  marketKey?: string;
  outcome: 'yes' | 'no';
  side?: 'BUY' | 'SELL';
  orderType?: 'market' | 'limit';
  amount?: string;
  limitPriceCents?: string;
  sourceText?: string;
}

interface PolymarketOrderIntent {
  market: PolymarketMarketPreview;
  prefill: PolymarketOrderPrefill;
}

type HistoryPoint = { t: number; p: number };

interface AstroConsoleData {
  eoaAddress?: string;
  solWalletAddress?: string;
  evmWalletAddress?: string;
  evmWalletAddresses?: string[];
  walletIdentityLabel: string;
  walletPortfolioBalance: number;
  walletPortfolioTokens: TokenData[];
  predictionWalletAddress?: string;
  predictionWalletAddresses?: string[];
  predictionUsdcBalance: number;
  predictionPortfolioUsdcBalance: number;
  predictionLegacyUsdcBalance: number;
  predictionPositions: PolymarketPosition[];
  predictionOpenOrders: PolymarketOrder[];
  isWalletPortfolioBalanceLoading: boolean;
  isPredictionBalanceLoading: boolean;
  perpsAccount?: PerpsAccountSummary;
  perpsMasterAddress?: string | null;
  isPerpsLoading: boolean;
  perpsMarkets: HLMarket[];
  isPerpsAgentInitialized: boolean;
  isPerpsAgentInitializing: boolean;
  isPerpsAgentReconnecting: boolean;
  perpsAgentError: string | null;
  initializePerpsAgent: () => Promise<unknown>;
  isPerpsSubmitting: boolean;
  perpsTradingError: string | null;
  clearPerpsTradingError: () => void;
  updatePerpsLeverage: (
    assetIndex: number,
    leverage: number,
    isCross?: boolean
  ) => Promise<unknown>;
  placePerpsMarketOrder: (
    assetIndex: number,
    isBuy: boolean,
    size: string,
    markPrice: string
  ) => Promise<unknown>;
  placePerpsLimitOrder: (params: {
    assetIndex: number;
    isBuy: boolean;
    size: string;
    price: string;
    reduceOnly?: boolean;
  }) => Promise<unknown>;
  placePerpsTpSlOrder: (params: {
    assetIndex: number;
    isBuy: boolean;
    size: string;
    entryPrice: string;
    stopLossPrice: string;
    takeProfitPrice: string;
  }) => Promise<unknown>;
  placePerpsPositionTpSlOrder: (params: {
    assetIndex: number;
    isLong: boolean;
    size: string;
    stopLossPrice?: string;
    takeProfitPrice?: string;
  }) => Promise<unknown>;
  closePerpsPosition: (
    assetIndex: number,
    size: string,
    isLong: boolean,
    markPrice: string
  ) => Promise<unknown>;
}

const AGENT_TERMINAL_BUBBLE_CLASS =
  'dm-mono rounded-[14px] border border-white/[0.07] bg-[#15171d] px-4 py-2.5 text-[13.5px] font-semibold leading-[1.7] text-[#a9adb8] shadow-[0_18px_50px_rgba(0,0,0,0.35)]';
const AGENT_PANEL_CLASS =
  'rounded-[16px] border border-white/[0.07] bg-gradient-to-b from-[#15171d] to-[#111318] text-[#eceef2] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)]';
const TICKET_LABEL_CLASS =
  'dm-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]';
const TICKET_FIELD_CLASS =
  'h-9 rounded-[9px] border border-white/[0.07] bg-black px-3 text-[12.5px] font-semibold text-[#eceef2] outline-none focus:border-[#3fe08f]/60 focus:ring-2 focus:ring-[#3fe08f]/15 disabled:opacity-60';
const TICKET_MONO_FIELD_CLASS =
  'dm-mono h-9 rounded-[9px] border border-white/[0.07] bg-black px-3 text-[13px] font-semibold text-[#eceef2] outline-none focus:border-[#3fe08f]/60 focus:ring-2 focus:ring-[#3fe08f]/15 disabled:opacity-60';
const TICKET_IDLE_BUTTON_CLASS =
  'border border-white/[0.07] bg-[#101217] text-[#eceef2] hover:bg-white/[0.05]';
const TICKET_PRIMARY_BUTTON_CLASS =
  'dm-btn inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[11px] bg-[#3fe08f] px-3 text-[13px] font-bold text-[#031008] hover:bg-[#64f2aa] disabled:cursor-not-allowed disabled:opacity-50';
const TICKET_REJECT_BUTTON_CLASS =
  'dm-btn inline-flex h-10 items-center justify-center gap-2 rounded-[11px] border border-white/[0.07] bg-black/20 px-3 text-[13px] font-semibold text-[#eceef2] hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50';
const CHAT_COMMAND_SUGGESTIONS = [
  {
    command: '/search',
    label: 'Internet search',
    hint: 'Research live web results with Astro',
    seed: '/search ',
  },
  {
    command: '/send',
    label: 'Send funds',
    hint: 'Start a wallet send proposal',
    seed: '/send ',
  },
  {
    command: '/swap',
    label: 'Swap tokens',
    hint: 'Prepare a routed token swap',
    seed: '/swap ',
  },
  {
    command: '/pnl',
    label: 'PnL check',
    hint: 'Review portfolio and trading performance',
    seed: '/pnl ',
  },
] as const;

interface SelectedChat {
  _id: string;
  name?: string;
  description?: string;
  microsite?: Microsite;
  participant?: User;
  participants?: Participant[];
  botUsers?: GroupAgent[];
  settings?: GroupSettings;
  isGroup?: boolean;
}

interface ChatAreaProps {
  selectedChat: SelectedChat | null;
  chatType: 'private' | 'group';
  currentUser: string;
  socket: any; // You can use Socket from socket.io-client if you have it
  onChatUpdate?: () => void; // ADD THIS
  onLeaveGroup?: () => void;
}

interface SocketResponse {
  success: boolean;
  messages?: Message[];
  message?: Message;
  error?: string;
}

function getDirectReceiverId(chat: SelectedChat | null) {
  if (!chat) return '';
  return (
    chat.participant?._id ||
    chat.microsite?.parentId ||
    (chat as any).userId ||
    chat._id ||
    ''
  );
}

function getDirectReceiverName(chat: SelectedChat | null) {
  if (!chat) return '';
  return (
    chat.microsite?.name ||
    chat.participant?.name ||
    chat.name ||
    'Contact'
  );
}

function getDirectReceiverAvatar(chat: SelectedChat | null) {
  if (!chat) return undefined;
  return chat.microsite?.profilePic || chat.participant?.profilePic;
}

function hasActiveAstroAgent(chat: SelectedChat | null) {
  return (
    chat?.botUsers?.some(
      (agent) => agent.agentId === 'astro' && agent.isActive !== false
    ) || false
  );
}

function isAstroTradingDeskChat(
  chat: SelectedChat | null,
  isGroup: boolean
) {
  const name = String(chat?.name || '').trim().toLowerCase();

  return (
    isGroup &&
    (hasActiveAstroAgent(chat) ||
      name === 'astro trading desk' ||
      name === 'astro')
  );
}

function getSmartsiteHref(chat: SelectedChat | null) {
  if (!chat?.microsite) return null;

  const profileUrl = chat.microsite.profileUrl?.trim();
  if (profileUrl) {
    if (/^https?:\/\//i.test(profileUrl)) {
      try {
        const parsedUrl = new URL(profileUrl);
        const isSwopProfile =
          parsedUrl.hostname === 'swopme.app' ||
          parsedUrl.hostname === 'www.swopme.app' ||
          parsedUrl.hostname.endsWith('.swopme.app');

        if (isSwopProfile && parsedUrl.pathname.startsWith('/sp/')) {
          return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }
      } catch {
        return profileUrl;
      }

      return profileUrl;
    }
    if (profileUrl.startsWith('/')) return profileUrl;
    return `/sp/${profileUrl.replace(/^\/+/, '').replace(/^sp\//, '')}`;
  }

  const ens = chat.microsite.ens?.trim().replace(/^@/, '');
  if (!ens) return null;
  return `/sp/${ens}`;
}

function getSmartsiteAnchorAttrs(href: string) {
  const isExternal = isExternalSmartsiteHref(href);
  return {
    href,
    target: isExternal ? '_blank' : undefined,
    rel: isExternal ? 'noopener noreferrer' : undefined,
  };
}

function isExternalSmartsiteHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function normalizeIntentText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[@$"']/g, ' ')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePolymarketOrderSourceText(value: unknown) {
  return normalizeIntentText(value).replace(/^astro\s+/, '');
}

function hasPolymarketWriteIntent(text?: string | null) {
  return /\b(limit|order|bet|buy|sell)\b/i.test(text || '');
}

function normalizedTextHasTerm(text: string, term: string) {
  const normalizedTerm = normalizeIntentText(term);
  if (!normalizedTerm) return false;
  return ` ${text} `.includes(` ${normalizedTerm} `);
}

function hasHyperliquidOrderIntent(text: string) {
  const normalizedText = normalizeIntentText(text);
  if (
    /\b(perps?|hyperliquid|leverage|margin|cross|isolated|reduce only|reduceonly|take profit|stop loss|tp|sl)\b/.test(
      normalizedText
    )
  ) {
    return true;
  }

  return (
    /\b(btc|eth|sol|hype|xrp|doge)\b/.test(normalizedText) &&
    /\b(long|short|perp|perps|leverage|market|limit|order|tp|sl)\b/.test(
      normalizedText
    )
  );
}

function extractVisiblePolymarketMarkets(
  messages: Message[]
): PolymarketMarketPreview[] {
  const byKey = new Map<string, PolymarketMarketPreview>();

  messages.forEach((message) => {
    const markets =
      message.agentData?.metadata?.toolExecution?.markets || [];
    markets.forEach((market) => {
      const key = getPolymarketMarketIdentity(market);
      if (key) {
        byKey.set(key, market);
      }
    });
  });

  return Array.from(byKey.values());
}

function getPolymarketMarketIdentity(market: PolymarketMarketPreview) {
  return (
    market.conditionId ||
    market.id ||
    market.slug ||
    market.question ||
    ''
  );
}

function mergePolymarketMarkets(
  ...marketSets: PolymarketMarketPreview[][]
) {
  const byKey = new Map<string, PolymarketMarketPreview>();

  marketSets.flat().forEach((market) => {
    const key = getPolymarketMarketIdentity(market);
    if (key) byKey.set(key, market);
  });

  return Array.from(byKey.values());
}

function cleanPolymarketOddsQuery(value?: string | null) {
  const stopWords = new Set([
    'any',
    'all',
    'odds',
    'market',
    'markets',
    'prediction',
    'predictions',
    'polymarket',
    'bets',
    'bet',
    'for',
    'on',
    'about',
    'around',
    'the',
    'a',
    'an',
    'me',
    'show',
    'find',
    'fetch',
    'get',
    'what',
    'whats',
    'is',
    'are',
    'current',
    'latest',
    'please',
    'checked',
    'web',
    'sources',
    'source',
    'sports',
    'research',
    'news',
    'injuries',
    'stats',
  ]);
  const query = String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      const cleaned = word.replace(/[^a-z0-9-]/g, '');
      return cleaned === 'championship' || cleaned === 'championships'
        ? 'finals'
        : cleaned;
    })
    .filter((word) => word && !stopWords.has(word))
    .join(' ')
    .trim();
  return query.length >= 2 ? query.slice(0, 80) : '';
}

function extractPolymarketOddsQueryFromResearch(
  messageText?: string | null,
  researchQuery?: string | null
) {
  const combined = `${researchQuery || ''} ${messageText || ''}`.replace(
    /\s+/g,
    ' '
  );
  const patterns = [
    /\b(?:odds|markets?|predictions?|bets?)\s+(?:on|for|about|around)\s+(.+?)(?:\b(?:nba|nfl|mlb|nhl|wnba|epl)?\s*sports\s+research\b|\bsports\s+news\b|\blatest\b|$)/i,
    /\bwhat\s+are\s+(?:the\s+)?odds\s+(?:on|for|about|around)\s+(.+?)(?:\b(?:nba|nfl|mlb|nhl|wnba|epl)?\s*sports\s+research\b|\bsports\s+news\b|\blatest\b|$)/i,
    /\bwhat\s+are\s+(?:the\s+)?(.+?)\s+odds\b/i,
    /\bwhat(?:'s|\s+is)\s+(?:the\s+)?(.+?)\s+odds\b/i,
    /\b(.+?)\s+(?:championship|champion|finals|futures?)\s+odds\b/i,
    /\b(.+?)\s+odds\b/i,
  ];

  for (const pattern of patterns) {
    const match = combined.match(pattern);
    const cleaned = cleanPolymarketOddsQuery(match?.[1]);
    if (cleaned) return cleaned;
  }

  return '';
}

function buildPolymarketResearchMarketParams(
  query: string,
  sourceText?: string | null
) {
  const combined = `${query || ''} ${sourceText || ''}`.toLowerCase();
  const isGameLineRequest =
    /\b(games?|game\s*\d+|matchups?|spreads?|moneyline|total|o\/u|over\s*under|today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(
      combined
    );
  const params = new URLSearchParams({
    limit: '10',
    offset: '0',
    quality: 'relaxed',
  });

  if (isGameLineRequest) {
    params.set('tag_id', '100639');
    params.set('kind', 'gamelines');
  }

  const dateWindow = resolvePolymarketResearchDateWindow(combined);
  if (dateWindow.dateFrom) params.set('date_from', dateWindow.dateFrom);
  if (dateWindow.dateTo) params.set('date_to', dateWindow.dateTo);
  if (
    query &&
    !isGenericSportsPolymarketQuery(query, isGameLineRequest)
  ) {
    params.set('q', query);
  }

  return params;
}

function resolvePolymarketResearchDateWindow(text: string) {
  if (/\btonight\b/.test(text)) {
    const start = new Date();
    if (start.getHours() < 16) start.setHours(16, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(6, 0, 0, 0);
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
  }
  if (/\btoday\b/.test(text)) return buildLocalDateWindow(new Date());
  if (/\btomorrow\b/.test(text)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return buildLocalDateWindow(tomorrow);
  }

  const weekdayMatch = text.match(
    /\b(?:this\s+|next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/
  );
  if (!weekdayMatch) return {};

  const weekdays = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const targetIndex = weekdays.indexOf(weekdayMatch[1]);
  const target = new Date();
  let daysUntil = (targetIndex - target.getDay() + 7) % 7;
  if (daysUntil === 0 && !/\bthis\s+/.test(weekdayMatch[0])) {
    daysUntil = 7;
  }
  target.setDate(target.getDate() + daysUntil);
  return buildLocalDateWindow(target);
}

function buildLocalDateWindow(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

function isGenericSportsPolymarketQuery(
  query: string,
  isGameLineRequest: boolean
) {
  if (!isGameLineRequest) return false;
  const generic = new Set([
    'game',
    'games',
    'final',
    'finals',
    'nba',
    'nfl',
    'mlb',
    'nhl',
    'wnba',
    'epl',
    'soccer',
    'football',
    'basketball',
    'baseball',
    'hockey',
    'of',
    'on',
    'for',
    'the',
    'this',
    'next',
    'today',
    'tonight',
    'tomorrow',
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]);
  const specificWords = query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9-]/g, ''))
    .filter(Boolean)
    .filter((word) => !generic.has(word) && !/^\d+$/.test(word));

  return specificWords.length === 0;
}

function getPolymarketMarketSearchText(market: PolymarketMarketPreview) {
  return [
    market.question,
    market.eventTitle,
    market.slug,
    market.eventSlug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function extractExplicitMarketYear(value?: string | null) {
  const match = String(value || '').match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function isNbaChampionMarketQuery(value?: string | null) {
  const text = normalizeIntentText(value || '');
  return (
    /\bnba\b/.test(text) &&
    /\b(finals|champion|championship|futures?)\b/.test(text)
  );
}

function marketMentionsYear(
  market: PolymarketMarketPreview,
  year: number
) {
  return getPolymarketMarketSearchText(market).includes(String(year));
}

function filterPolymarketMarketsForQuery(
  markets: PolymarketMarketPreview[],
  queryContext?: string | null,
  detectionContext?: string | null
) {
  if (!markets.length) return markets;

  const explicitYear = extractExplicitMarketYear(queryContext);
  if (explicitYear) {
    const explicitMatches = markets.filter((market) =>
      marketMentionsYear(market, explicitYear)
    );
    if (explicitMatches.length) return explicitMatches;
  }

  if (isNbaChampionMarketQuery(detectionContext || queryContext)) {
    const currentYear = new Date().getFullYear();
    const currentFinalsMarkets = markets.filter((market) =>
      marketMentionsYear(market, currentYear)
    );
    if (currentFinalsMarkets.length) return currentFinalsMarkets;
  }

  return markets;
}

function parseLimitPriceCents(text: string) {
  const patterns = [
    /\b(?:at|@)\s*\$?(\d?\.\d{1,3}|\d{1,2})(?:\s*(?:c|¢|cents?))?\b/i,
    /\b(?:limit\s+price|price)\s*(?:of|at|=|:)?\s*\$?(\d?\.\d{1,3}|\d{1,2})(?:\s*(?:c|¢|cents?))?\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;

    const cents = parsed <= 1 ? parsed * 100 : parsed;
    return String(Math.min(99, Math.max(1, Math.round(cents))));
  }

  return '';
}

function parsePolymarketOrderAmount(text: string, limitPriceCents?: string) {
  const formatAmount = (value: number) =>
    value.toLocaleString('en-US', {
      maximumFractionDigits: 6,
      useGrouping: false,
    });
  const limitPrice = Number(limitPriceCents || 0) / 100;
  const dollarAmountMatch = text.match(
    /\$([0-9]+(?:\.[0-9]+)?)|\b([0-9]+(?:\.[0-9]+)?)\s*(?:dollars?|usd|usdc|pusd)\b/i
  );
  const dollarAmount = Number(
    dollarAmountMatch?.[1] || dollarAmountMatch?.[2] || 0
  );

  if (Number.isFinite(dollarAmount) && dollarAmount > 0) {
    return formatAmount(dollarAmount);
  }

  const shareAmountMatch = text.match(
    /\b([0-9]+(?:\.[0-9]+)?)\s*(?:shares?|contracts?)\b/i
  );
  const shareAmount = Number(shareAmountMatch?.[1] || 0);
  if (Number.isFinite(shareAmount) && shareAmount > 0) {
    return limitPrice > 0
      ? formatAmount(shareAmount * limitPrice)
      : formatAmount(shareAmount);
  }

  if (limitPrice > 0) {
    return '1';
  }

  return '1';
}

function buildSyntheticFundingOnrampMessage(
  prefill: FundingOnrampPrefill,
  sourceMessageId?: string
): Message {
  return {
    _id: sourceMessageId
      ? `local-funding-onramp-${sourceMessageId}`
      : `local-funding-onramp-${Date.now()}`,
    message:
      'I can help fund your Swop wallet with USDC. Pick the destination below and continue with Coinbase.',
    senderKind: 'agent',
    agentSender: {
      agentId: 'astro',
      provider: 'elizaos',
      displayName: 'Astro',
      avatarUrl: null,
    },
    messageType: 'agent_response',
    createdAt: new Date().toISOString(),
    agentData: {
      metadata: {
        fundingOnramp: prefill,
      },
    },
  };
}

function parseHyperliquidOrderAmount(text: string) {
  const match = text.match(
    /\$([0-9]+(?:\.[0-9]+)?)|\b([0-9]+(?:\.[0-9]+)?)\s*(?:usd|usdc|dollars?)\b|\b(?:size|notional|order)\s+(?:of\s+)?([0-9]+(?:\.[0-9]+)?)\b/i
  );
  return match?.[1] || match?.[2] || match?.[3] || '1';
}

function parseHyperliquidLeverage(text: string) {
  const match = text.match(
    /\b([0-9]+(?:\.[0-9]+)?)\s*x\b|\b([0-9]+(?:\.[0-9]+)?)\s*(?:times\s+)?leverage\b/i
  );
  return match?.[1] || match?.[2] || '5';
}

function parseHyperliquidLimitPrice(text: string) {
  if (/\b(?:take\s*profit|take-profit|tp|stop\s*loss|stop-loss|sl)\b/i.test(text)) {
    const explicitEntry = text.match(
      /\b(?:limit|entry(?:\s+price)?)\b.*?(?:at|@|=|:)?\s*\$?([0-9]+(?:\.[0-9]+)?)/i
    );
    return explicitEntry?.[1] || '';
  }

  const match = text.match(
    /\blimit\b.*?(?:at|@)\s*\$?([0-9]+(?:\.[0-9]+)?)|(?:at|@)\s*\$?([0-9]+(?:\.[0-9]+)?)/i
  );
  return match?.[1] || match?.[2] || '';
}

function parseHyperliquidTakeProfitPrice(text: string) {
  const match = text.match(
    /\b(?:take\s*profit|take-profit|tp)\b\s*(?:at|@|to|for|=|:)?\s*\$?([0-9]+(?:\.[0-9]+)?)/i
  );
  return match?.[1] || '';
}

function parseHyperliquidStopLossPrice(text: string) {
  const match = text.match(
    /\b(?:stop\s*loss|stop-loss|sl)\b\s*(?:at|@|to|for|=|:)?\s*\$?([0-9]+(?:\.[0-9]+)?)/i
  );
  return match?.[1] || '';
}

function parseHyperliquidCoin(text: string) {
  const normalized = normalizeIntentText(text);
  const aliases: Array<[string, string]> = [
    ['SPACEX', 'xyz:SPCX'],
    ['SPACE X', 'xyz:SPCX'],
    ['SPCX', 'xyz:SPCX'],
    ['BRENT OIL', 'xyz:BRENTOIL'],
    ['BRENTOIL', 'xyz:BRENTOIL'],
    ['BRENT', 'xyz:BRENTOIL'],
    ['CRUDE OIL', 'xyz:BRENTOIL'],
    ['OIL', 'xyz:BRENTOIL'],
    ['NATURAL GAS', 'xyz:NATGAS'],
    ['NAT GAS', 'xyz:NATGAS'],
    ['NATGAS', 'xyz:NATGAS'],
    ['BITCOIN', 'BTC'],
    ['BTC', 'BTC'],
    ['ETHEREUM', 'ETH'],
    ['ETHER', 'ETH'],
    ['ETH', 'ETH'],
    ['SOLANA', 'SOL'],
    ['SOL', 'SOL'],
    ['HYPERLIQUID', 'HYPE'],
    ['HYPE', 'HYPE'],
    ['XRP', 'XRP'],
    ['DOGECOIN', 'DOGE'],
    ['DOGE', 'DOGE'],
    ['ATOM', 'ATOM'],
    ['COSMOS', 'ATOM'],
    ['MATIC', 'MATIC'],
    ['POLYGON', 'MATIC'],
    ['DYDX', 'DYDX'],
    ['AVAX', 'AVAX'],
    ['SUI', 'SUI'],
    ['LINK', 'LINK'],
    ['AAVE', 'AAVE'],
    ['BNB', 'BNB'],
    ['ADA', 'ADA'],
  ];

  for (const [alias, coin] of aliases) {
    if (normalizedTextHasTerm(normalized, alias)) return coin;
  }

  return '';
}

function hasWalletSendIntent(text?: string | null) {
  const normalizedText = normalizeIntentText(text);
  return (
    /\b(send|transfer|pay)\b/.test(normalizedText) &&
    /\bto\b/.test(normalizedText) &&
    Boolean(parseWalletSendAmount(text || '')) &&
    Boolean(parseWalletSendRecipient(text || '')) &&
    Boolean(parseWalletSendToken(text || ''))
  );
}

function parseWalletSendAmount(text: string) {
  const match = text.match(
    /\$\s*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*(?:usd|usdc|dollars?|\$)\b|(?:send|transfer|pay)\s+([0-9]+(?:\.[0-9]+)?)/i
  );
  return match?.[1] || match?.[2] || match?.[3] || '';
}

function parseWalletSendAmountType(text: string) {
  return /\$\s*[0-9]|\b(?:usd|dollars?)\b|[0-9]\s*\$/i.test(text)
    ? 'usd'
    : 'token';
}

function parseWalletSendToken(text: string) {
  const tokenMatch =
    text.match(/\b(?:in|of|as)\s+([a-zA-Z][a-zA-Z0-9]{1,10})\b/i) ||
    text.match(
      /\b(?:send|transfer|pay)\s+(?:\$?\s*[0-9]+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?\s*\$?)\s+([a-zA-Z][a-zA-Z0-9]{1,10})\b/i
    );
  const raw = tokenMatch?.[1]?.toUpperCase();
  if (!raw) return '';

  const aliases: Record<string, string> = {
    ETHEREUM: 'ETH',
    ETHER: 'ETH',
    ETH: 'ETH',
    SOLANA: 'SOL',
    SOL: 'SOL',
    USDC: 'USDC',
    USDT: 'USDT',
    MATIC: 'MATIC',
    POLYGON: 'MATIC',
    POL: 'POL',
    BASE: 'ETH',
    ARBITRUM: 'ETH',
  };
  return aliases[raw] || raw;
}

function parseWalletSendRecipient(text: string) {
  const match = text.match(
    /\bto\s+(@?(?:0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+|[a-zA-Z0-9_-]+))\b/i
  );
  return match?.[1]?.trim().replace(/^@/, '').replace(/[,.!?;:]+$/, '') || '';
}

function inferWalletSendChain(text: string) {
  const normalizedText = normalizeIntentText(text);
  const networkMatch = normalizedText.match(
    /\b(?:on|via|over|using|network|chain)\s+(sol|solana|base|arbitrum|arb|polygon|matic|pol|ethereum|mainnet)\b/i
  );
  const network = networkMatch?.[1]?.toLowerCase();
  if (network === 'sol' || network === 'solana') return 'SOLANA';
  if (network === 'base') return 'BASE';
  if (network === 'arbitrum' || network === 'arb') return 'ARBITRUM';
  if (network === 'polygon' || network === 'matic' || network === 'pol') {
    return 'POLYGON';
  }
  if (network === 'ethereum' || network === 'mainnet') return 'ETHEREUM';
  return '';
}

function findWalletSendIntent(text: string) {
  if (!hasWalletSendIntent(text)) return null;

  const amount = parseWalletSendAmount(text);
  const amountType = parseWalletSendAmountType(text);
  const token = parseWalletSendToken(text);
  const recipient = parseWalletSendRecipient(text);
  const chain = inferWalletSendChain(text);
  const isRecipientAddress =
    /^0x[a-fA-F0-9]{40}$/.test(recipient) ||
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipient);

  const params = {
    token,
    tokenSymbol: token,
    asset: token,
    amount,
    amountType,
    isUSD: amountType === 'usd',
    recipient,
    recipientAddress: isRecipientAddress ? recipient : undefined,
    recipientEns: isRecipientAddress ? undefined : recipient,
    ...(chain ? { chain, network: chain } : {}),
  };

  return { params };
}

function walletSendIntentHasNetwork(intent: {
  params: Record<string, unknown>;
} | null) {
  return Boolean(intent?.params.chain || intent?.params.network);
}

function getWalletSendNetworkMeta(chainValue?: string | number | null) {
  const chain = normalizeWalletSendChainValue(chainValue);
  if (chain === 'SOLANA') {
    return { feeLabel: '<$0.01', timeLabel: '~0.4s', initial: 'S' };
  }
  if (chain === 'BASE') {
    return { feeLabel: '$0.01', timeLabel: '~2s', initial: 'B' };
  }
  if (chain === 'ARBITRUM') {
    return { feeLabel: '$0.02', timeLabel: '~1s', initial: 'A' };
  }
  if (chain === 'POLYGON') {
    return { feeLabel: '<$0.01', timeLabel: '~2s', initial: 'P' };
  }
  return { feeLabel: '$1.42', timeLabel: '~12s', initial: 'E' };
}

function getWalletSendRequiredTokenAmount(
  intent: { params: Record<string, unknown> } | null,
  token: TokenData
) {
  if (!intent) return null;
  const amount = Number(intent.params.amount || intent.params.amountUsd || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const amountType = String(intent.params.amountType || '').toLowerCase();
  const isUsd =
    amountType === 'usd' || intent.params.isUSD === true || intent.params.isUSD === 'true';
  if (!isUsd) return amount;
  const symbol = String(token.symbol || '').toUpperCase();
  const tokenPrice =
    Number(token.marketData?.price || 0) ||
    (['USDC', 'USDT', 'DAI'].includes(symbol) ? 1 : 0);
  if (!Number.isFinite(tokenPrice) || tokenPrice <= 0) return null;
  return amount / tokenPrice;
}

function getWalletSendNetworkOptions(
  intent: { params: Record<string, unknown> } | null,
  tokens: TokenData[],
  evmSignerAddresses?: Set<string>,
  solanaSignerAddresses?: Set<string>
): WalletSendNetworkOption[] {
  if (!intent) return [];
  const symbol = String(
    intent.params.tokenSymbol || intent.params.token || ''
  ).toUpperCase();
  if (!symbol) return [];

  const byChain = new Map<string, WalletSendNetworkOption>();
  tokens.forEach((token) => {
    if (String(token.symbol || '').toUpperCase() !== symbol) return;
    if (
      !isChatWalletSendTokenOwnedBySigner({
        token,
        evmSignerAddresses,
        solanaSignerAddresses,
      })
    ) {
      return;
    }
    const balanceNumber = Number(token.balance || 0);
    if (!Number.isFinite(balanceNumber) || balanceNumber <= 0) return;
    const price = Number(token.marketData?.price || 0);
    const chain = String(token.chain || '').toUpperCase();
    if (!chain) return;
    const existing = byChain.get(chain);
    const usdValue = Number.isFinite(price) ? balanceNumber * price : 0;
    const requiredAmount = getWalletSendRequiredTokenAmount(intent, token);
    const hasEnoughBalance =
      requiredAmount === null || balanceNumber + 0.00000001 >= requiredAmount;
    const networkMeta = getWalletSendNetworkMeta(chain);
    if (!existing || usdValue > existing.usdValue) {
      byChain.set(chain, {
        chain,
        balance: String(token.balance || ''),
        usdValue,
        feeLabel: networkMeta.feeLabel,
        timeLabel: networkMeta.timeLabel,
        hasEnoughBalance,
        isBest: false,
      });
    }
  });

  return Array.from(byChain.values())
    .sort((a, b) => {
      if (a.hasEnoughBalance !== b.hasEnoughBalance) {
        return a.hasEnoughBalance ? -1 : 1;
      }
      return b.usdValue - a.usdValue;
    })
    .map((option, index) => ({ ...option, isBest: index === 0 }));
}

function buildSyntheticWalletSendNetworkPromptMessage(
  intent: { params: Record<string, unknown> },
  options: WalletSendNetworkOption[],
  sourceMessageId?: string
): Message {
  const token = String(intent.params.tokenSymbol || intent.params.token || 'TOKEN');
  const recipient = String(
    intent.params.recipientEns ||
      intent.params.recipientAddress ||
      intent.params.recipient ||
      'recipient'
  );

  return {
    _id: sourceMessageId
      ? `local-wallet-network-${sourceMessageId}`
      : `local-wallet-network-${Date.now()}`,
    message: `Choose a ${token} network before sending to ${recipient}.`,
    senderKind: 'agent',
    agentSender: {
      agentId: 'astro',
      provider: 'elizaos',
      displayName: 'Astro',
      avatarUrl: null,
    },
    messageType: 'agent_response',
    createdAt: new Date().toISOString(),
    agentData: {
      metadata: {
        walletSendNetworkPrompt: {
          token,
          amount: String(intent.params.amount || ''),
          amountType: String(intent.params.amountType || 'token'),
          recipient,
          options,
        },
      },
    },
  };
}

function parseWalletSendNetworkReply(text?: string | null) {
  const normalizedText = normalizeIntentText(text);
  if (/\b(arbitrum|arb)\b/.test(normalizedText)) return 'ARBITRUM';
  if (/\b(base)\b/.test(normalizedText)) return 'BASE';
  if (/\b(ethereum|mainnet|eth mainnet)\b/.test(normalizedText)) {
    return 'ETHEREUM';
  }
  if (/\b(polygon|matic|pol)\b/.test(normalizedText)) return 'POLYGON';
  if (/\b(solana|sol)\b/.test(normalizedText)) return 'SOLANA';
  return '';
}

function findPendingWalletSendNetworkIntent(
  messages: Message[],
  currentIndex: number,
  maxAgeMs = 10 * 60 * 1000
) {
  const currentTime = messageTime(messages[currentIndex]);
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    const intent = findWalletSendIntent(candidate.message || '');
    if (!intent || walletSendIntentHasNetwork(intent)) continue;
    const candidateTime = messageTime(candidate);
    if (
      currentTime &&
      candidateTime &&
      currentTime - candidateTime > maxAgeMs
    ) {
      break;
    }
    return intent;
  }
  return null;
}

function buildSyntheticWalletSendMessage(
  intent: { params: Record<string, unknown> },
  sourceMessageId?: string
): Message {
  const proposalId = sourceMessageId
    ? `local-wallet-send-${sourceMessageId}`
    : `local-wallet-send-${Date.now()}`;
  const params = intent.params;
  const token = String(params.tokenSymbol || params.token || 'TOKEN');
  const recipient = String(
    params.recipientEns || params.recipientAddress || params.recipient || 'recipient'
  );

  return {
    _id: `${proposalId}-message`,
    message: `Prepared a ${token} send to ${recipient}. Review below.`,
    senderKind: 'agent',
    agentSender: {
      agentId: 'astro',
      provider: 'elizaos',
      displayName: 'Astro',
      avatarUrl: null,
    },
    messageType: 'agent_action_proposal',
    createdAt: new Date().toISOString(),
    agentData: {
      action: 'wallet.send',
      proposalIds: [proposalId],
      proposalId,
      toolType: 'wallet.write',
      metadata: {
        riskSummary: {
          riskLevel: 'high',
          toolType: 'wallet.write',
          action: 'wallet.send',
          mode: 'proposal',
          requiresProposal: true,
          paramKeys: Object.keys(params).sort(),
        },
        normalizedParams: params,
      },
    },
  };
}

function findHyperliquidPositionTpSlIntent(text: string) {
  if (!hasHyperliquidOrderIntent(text)) return null;

  const takeProfitPrice = parseHyperliquidTakeProfitPrice(text);
  const stopLossPrice = parseHyperliquidStopLossPrice(text);
  if (!takeProfitPrice && !stopLossPrice) return null;

  const normalizedText = normalizeIntentText(text);
  if (
    /\b(open|enter|start|create|new)\b/.test(normalizedText) &&
    /\b(long|short|buy|sell)\b/.test(normalizedText)
  ) {
    return null;
  }

  const side = /\b(short|sell)\b/i.test(text)
    ? 'short'
    : /\b(long|buy)\b/i.test(text)
    ? 'long'
    : '';
  const coin = parseHyperliquidCoin(text);
  const params = {
    ...(coin ? { coin, asset: coin } : {}),
    ...(side
      ? {
          side,
          direction: side,
          isBuy: side === 'long',
        }
      : {}),
    orderMode: 'tpsl',
    orderType: 'tpsl',
    reduceOnly: true,
    positionTpsl: true,
    ...(takeProfitPrice ? { takeProfitPrice, takeProfit: takeProfitPrice } : {}),
    ...(stopLossPrice ? { stopLossPrice, stopLoss: stopLossPrice } : {}),
  };

  return { params };
}

function getPerpsPositionSide(position: HLPosition): 'long' | 'short' {
  return toFiniteNumber(position.szi) < 0 ? 'short' : 'long';
}

function getPerpsPositionOption(
  position: HLPosition,
  markets: HLMarket[]
): PerpsPositionPromptOption {
  const side = getPerpsPositionSide(position);
  const market = perpsMarketForCoin(markets, position.coin);
  const markPrice = getPerpsMarkPrice(position.coin, market);
  return {
    coin: position.coin,
    side,
    sizeCoins: formatPerpsOrderSize(
      Math.abs(toFiniteNumber(position.szi)),
      market?.szDecimals ?? 4
    ),
    entryPrice: String(position.entryPx || markPrice || ''),
    markPrice: String(markPrice || position.entryPx || ''),
    leverage: position.leverage?.value || 1,
    isCross: position.leverage?.type !== 'isolated',
    marginUsed: String(position.marginUsed || '0'),
    positionValue: String(position.positionValue || '0'),
    liquidationPrice: position.liquidationPx,
  };
}

function getPerpsPositionPromptOptions(
  intent: { params: Record<string, unknown> },
  positions: HLPosition[] | undefined,
  markets: HLMarket[]
): PerpsPositionPromptOption[] {
  const coin = String(intent.params.coin || intent.params.asset || '').trim();
  const side = String(intent.params.side || intent.params.direction || '')
    .toLowerCase();

  return (positions || [])
    .filter((position) => Math.abs(toFiniteNumber(position.szi)) > 0)
    .filter((position) => !coin || perpsCoinMatches(position.coin, coin))
    .filter((position) => {
      if (side !== 'long' && side !== 'short') return true;
      return getPerpsPositionSide(position) === side;
    })
    .map((position) => getPerpsPositionOption(position, markets));
}

function getPerpsPositionIntentWithOption(
  intent: { params: Record<string, unknown> },
  option: PerpsPositionPromptOption
) {
  const params = {
    ...intent.params,
    coin: option.coin,
    asset: option.coin,
    side: option.side,
    direction: option.side,
    isBuy: option.side === 'long',
    orderMode: 'tpsl',
    orderType: 'tpsl',
    reduceOnly: true,
    positionTpsl: true,
    price: option.entryPrice,
    entryPrice: option.entryPrice,
    markPrice: option.markPrice,
    sizeCoins: option.sizeCoins,
    positionSizeCoins: option.sizeCoins,
    sizeUsd: option.positionValue,
    amountUsd: option.positionValue,
    collateralUsd: option.marginUsed,
    leverage: String(option.leverage || 1),
    isCross: option.isCross,
    cross: option.isCross,
    liquidationPrice: option.liquidationPrice,
  };

  return { params };
}

function formatHyperliquidPriceInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';
  const decimals = value >= 1 ? 2 : 6;
  return value.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '');
}

function getNearestHyperliquidMarketByPrice(
  price: number,
  markets: HLMarket[]
) {
  if (!Number.isFinite(price) || price <= 0) return null;

  const ranked = markets
    .map((market) => {
      const mark = getPerpsMarkPrice(market.coin, market);
      return {
        market,
        distance: mark > 0 ? Math.abs(mark - price) / mark : Number.POSITIVE_INFINITY,
      };
    })
    .filter((entry) => Number.isFinite(entry.distance))
    .sort((left, right) => left.distance - right.distance);

  const nearest = ranked[0];
  return nearest && nearest.distance <= 0.35 ? nearest.market : null;
}

function getFallbackHyperliquidOrderIntentFromRiskIntent(
  intent: { params: Record<string, unknown> },
  markets: HLMarket[]
) {
  const stopLossPrice = firstTicketValue(intent.params, [
    'stopLossPrice',
    'stopLoss',
    'slPrice',
    'sl',
  ]);
  const takeProfitPrice = firstTicketValue(intent.params, [
    'takeProfitPrice',
    'takeProfit',
    'tpPrice',
    'tp',
  ]);
  const triggerPrice =
    toFiniteNumber(stopLossPrice) || toFiniteNumber(takeProfitPrice);
  if (!triggerPrice) return null;

  const requestedCoin = firstTicketValue(intent.params, ['coin', 'asset']);
  const inferredMarket = requestedCoin
    ? perpsMarketForCoin(markets, requestedCoin)
    : getNearestHyperliquidMarketByPrice(triggerPrice, markets);
  const coin = requestedCoin || inferredMarket?.coin || 'ETH';
  const selectedMarket = inferredMarket || perpsMarketForCoin(markets, coin);
  const markPrice = getPerpsMarkPrice(coin, selectedMarket);
  const stopLossValue = toFiniteNumber(stopLossPrice);
  const takeProfitValue = toFiniteNumber(takeProfitPrice);
  const requestedSide = String(
    intent.params.side || intent.params.direction || ''
  ).toLowerCase();
  const side =
    requestedSide === 'long' || requestedSide === 'short'
      ? requestedSide
      : stopLossValue > 0
      ? stopLossValue < markPrice
        ? 'long'
        : 'short'
      : takeProfitValue > 0 && takeProfitValue > markPrice
      ? 'long'
      : 'short';
  const fallbackTakeProfit =
    takeProfitPrice ||
    formatHyperliquidPriceInput(markPrice * (side === 'long' ? 1.05 : 0.95));
  const fallbackStopLoss =
    stopLossPrice ||
    formatHyperliquidPriceInput(markPrice * (side === 'long' ? 0.95 : 1.05));

  return {
    params: {
      coin,
      asset: coin,
      side,
      direction: side,
      isBuy: side === 'long',
      orderMode: 'tpsl',
      orderType: 'tpsl',
      price: formatHyperliquidPriceInput(markPrice),
      sizeUsd: '1000',
      amountUsd: '1000',
      leverage: '5',
      isCross: false,
      cross: false,
      reduceOnly: false,
      takeProfitPrice: fallbackTakeProfit,
      takeProfit: fallbackTakeProfit,
      stopLossPrice: fallbackStopLoss,
      stopLoss: fallbackStopLoss,
    },
  };
}

function buildSyntheticHyperliquidPositionPromptMessage(
  intent: { params: Record<string, unknown> },
  options: PerpsPositionPromptOption[],
  sourceMessageId?: string
): Message {
  const promptId = sourceMessageId
    ? `local-perps-position-prompt-${sourceMessageId}`
    : `local-perps-position-prompt-${Date.now()}`;
  const stopLossPrice = firstTicketValue(intent.params, [
    'stopLossPrice',
    'stopLoss',
    'slPrice',
    'sl',
  ]);
  const takeProfitPrice = firstTicketValue(intent.params, [
    'takeProfitPrice',
    'takeProfit',
    'tpPrice',
    'tp',
  ]);
  const requestedSide = String(
    intent.params.side || intent.params.direction || ''
  ).toLowerCase() as 'long' | 'short' | '';

  return {
    _id: `${promptId}-message`,
    message: 'Which open perps position should I use?',
    senderKind: 'agent',
    agentSender: {
      agentId: 'astro',
      provider: 'elizaos',
      displayName: 'Astro',
      avatarUrl: null,
    },
    messageType: 'agent_response',
    createdAt: new Date().toISOString(),
    agentData: {
      metadata: {
        perpsPositionPrompt: {
          stopLossPrice: stopLossPrice || undefined,
          takeProfitPrice: takeProfitPrice || undefined,
          requestedSide,
          options,
        },
      },
    },
  };
}

function findPendingHyperliquidPositionTpSlIntent(
  messages: Message[],
  currentIndex: number,
  maxAgeMs = 10 * 60 * 1000
) {
  const currentTime = messageTime(messages[currentIndex]);
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    const intent = findHyperliquidPositionTpSlIntent(candidate.message || '');
    if (!intent) continue;
    const hasCoin = Boolean(intent.params.coin || intent.params.asset);
    if (hasCoin) continue;
    const candidateTime = messageTime(candidate);
    if (
      currentTime &&
      candidateTime &&
      currentTime - candidateTime > maxAgeMs
    ) {
      break;
    }
    return intent;
  }
  return null;
}

function findHyperliquidOrderIntent(text: string) {
  const normalizedText = normalizeIntentText(text);
  const side = /\b(short|sell)\b/i.test(text)
    ? 'short'
    : /\b(long|buy)\b/i.test(text)
    ? 'long'
    : '';
  const coin = parseHyperliquidCoin(text);

  if (!side || !coin || !hasHyperliquidOrderIntent(text)) return null;
  if (
    /\b(show|list|what|price|mark|markets?|positions?|orders?|history)\b/.test(
      normalizedText
    ) &&
    !/\b(open|place|enter|start|go|take|create)\b/.test(normalizedText)
  ) {
    return null;
  }

  const takeProfitPrice = parseHyperliquidTakeProfitPrice(text);
  const stopLossPrice = parseHyperliquidStopLossPrice(text);
  const orderMode =
    /\b(?:tpsl|tp\s*\/\s*sl|bracket)\b/i.test(text)
      ? 'tpsl'
      : /\blimit\b/i.test(text)
      ? 'limit'
      : 'market';
  const limitPrice = parseHyperliquidLimitPrice(text);
  const params = {
    coin,
    asset: coin,
    side,
    direction: side,
    isBuy: side === 'long',
    orderMode,
    orderType: orderMode,
    sizeUsd: parseHyperliquidOrderAmount(text),
    amountUsd: parseHyperliquidOrderAmount(text),
    leverage: parseHyperliquidLeverage(text),
    isCross: true,
    cross: true,
    reduceOnly: /\breduce\s*only\b/i.test(text),
    ...(limitPrice ? { price: limitPrice, limitPrice } : {}),
    ...(takeProfitPrice ? { takeProfitPrice, takeProfit: takeProfitPrice } : {}),
    ...(stopLossPrice ? { stopLossPrice, stopLoss: stopLossPrice } : {}),
  };

  return { params };
}

function buildSyntheticHyperliquidOrderMessage(
  intent: { params: Record<string, unknown> },
  sourceMessageId?: string
): Message {
  const proposalId = sourceMessageId
    ? `local-perps-order-${sourceMessageId}`
    : `local-perps-order-${Date.now()}`;
  const params = intent.params;
  const side = String(params.side || 'long');
  const coin = String(params.coin || 'ETH');
  const displayCoin = displayPerpsCoin(coin);
  const isPositionTpsl = initialTicketBool(params, ['positionTpsl'], false);

  return {
    _id: `${proposalId}-message`,
    message: isPositionTpsl
      ? `Drafted a ${side} ${displayCoin}-PERP risk update. Review and confirm below.`
      : `Drafted a ${side} order for ${displayCoin}-PERP. Review and adjust below.`,
    senderKind: 'agent',
    agentSender: {
      agentId: 'astro',
      provider: 'elizaos',
      displayName: 'Astro',
      avatarUrl: null,
    },
    messageType: 'agent_action_proposal',
    createdAt: new Date().toISOString(),
    agentData: {
      action: 'perps.place_order',
      proposalIds: [proposalId],
      proposalId,
      toolType: 'perps.write',
      metadata: {
        riskSummary: {
          riskLevel: 'high',
          toolType: 'perps.write',
          action: 'perps.place_order',
          mode: 'proposal',
          requiresProposal: true,
          paramKeys: Object.keys(params).sort(),
        },
        normalizedParams: params,
      },
    },
  };
}

function isLocalHyperliquidProposalId(proposalId?: string | null) {
  return Boolean(
    proposalId && proposalId.startsWith(LOCAL_HYPERLIQUID_PROPOSAL_PREFIX)
  );
}

function isAgentProposalNotFoundError(error: unknown) {
  const codedError = error as { code?: unknown; message?: unknown } | null;
  return (
    codedError?.code === 'AGENT_PROPOSAL_NOT_FOUND' ||
    /agent action proposal was not found/i.test(
      String(codedError?.message || '')
    )
  );
}

function isRecoverableHyperliquidProposalError(error: unknown) {
  return (
    isAgentProposalNotFoundError(error) ||
    isProposalNoLongerPendingError(error)
  );
}

function hasHyperliquidApprovalParams(params?: Record<string, unknown>) {
  if (!params) return false;
  const coin = String(params.coin || params.asset || '').trim();
  const side = String(params.side || params.direction || '').toLowerCase();
  return Boolean(coin && (side === 'long' || side === 'short'));
}

function buildHyperliquidOrderPromptFromApprovalParams(
  params?: Record<string, unknown>
) {
  const coin = displayPerpsCoin(
    String(params?.coin || params?.asset || 'ETH').trim()
  ).toUpperCase();
  const side =
    String(params?.side || params?.direction || '').toLowerCase() === 'short'
      ? 'short'
      : 'long';
  const rawOrderMode = String(params?.orderMode || params?.orderType || '')
    .toLowerCase()
    .replace(/-/g, '_');
  const orderMode =
    rawOrderMode === 'limit'
      ? 'limit'
      : ['tpsl', 'tp_sl', 'take_profit_stop_loss'].includes(rawOrderMode)
      ? 'tpsl'
      : 'market';
  const leverage = firstTicketValue(params, ['leverage']) || '5';
  const sizeUsd =
    firstTicketValue(params, [
      'sizeUsd',
      'usdSize',
      'notionalUsd',
      'amountUsd',
      'size',
    ]) || '10';
  const price =
    orderMode === 'limit' || orderMode === 'tpsl'
      ? firstTicketValue(params, ['price', 'limitPrice', 'p'])
      : '';
  const takeProfit = firstTicketValue(params, [
    'takeProfitPrice',
    'takeProfit',
    'tpPrice',
    'tp',
  ]);
  const stopLoss = firstTicketValue(params, [
    'stopLossPrice',
    'stopLoss',
    'slPrice',
    'sl',
  ]);
  const isPositionTpsl = initialTicketBool(params, ['positionTpsl'], false);

  const parts = [
    '@astro prepare a Hyperliquid',
    orderMode,
    side,
    `order on ${coin}-PERP`,
    `for $${sizeUsd}`,
    `at ${leverage}x`,
  ];

  if (price) {
    parts.push(orderMode === 'tpsl' ? `entry price ${price}` : `limit price ${price}`);
  }
  if (takeProfit) parts.push(`take profit ${takeProfit}`);
  if (stopLoss) parts.push(`stop loss ${stopLoss}`);
  if (isPositionTpsl) parts.push('for the existing position');
  if (initialTicketBool(params, ['reduceOnly'], false)) {
    parts.push('reduce only');
  }

  return parts.join(' ');
}

function isHyperliquidPlaceOrderMessage(message: Message) {
  return (
    message.agentData?.toolType === 'perps.write' &&
    message.agentData?.action === 'perps.place_order'
  );
}

function isWalletSendMessage(message: Message) {
  return (
    message.agentData?.toolType === 'wallet.write' &&
    message.agentData?.action === 'wallet.send'
  );
}

function hasMatchingWalletSendProposal(
  messages: Message[],
  sourceMessage: Message,
  intent: { params: Record<string, unknown> } | null
) {
  if (!intent) return false;
  const sourceTime = messageTime(sourceMessage);
  const token = String(intent.params.tokenSymbol || intent.params.token || '').toUpperCase();
  const recipient = String(
    intent.params.recipient ||
      intent.params.recipientAddress ||
      intent.params.recipientEns ||
      ''
  ).toLowerCase();

  return messages.some((message) => {
    if (!isWalletSendMessage(message)) return false;
    const params = message.agentData?.metadata?.normalizedParams || {};
    const messageToken = String(params.tokenSymbol || params.token || '').toUpperCase();
    const messageRecipient = String(
      params.recipient ||
        params.recipientAddress ||
        params.recipientEns ||
        ''
    ).toLowerCase();
    if (token && messageToken && token !== messageToken) return false;
    if (recipient && messageRecipient && recipient !== messageRecipient) {
      return false;
    }

    const currentTime = messageTime(message);
    if (!sourceTime || !currentTime) return true;
    return Math.abs(currentTime - sourceTime) <= 10 * 60 * 1000;
  });
}

function hasMatchingHyperliquidProposal(
  messages: Message[],
  sourceMessage: Message,
  intent: { params: Record<string, unknown> } | null
) {
  if (!intent) return false;
  const sourceTime = messageTime(sourceMessage);
  const coin = String(intent.params.coin || '').toUpperCase();
  const side = String(intent.params.side || '').toLowerCase();

  return messages.some((message) => {
    if (!isHyperliquidPlaceOrderMessage(message)) return false;
    const params = message.agentData?.metadata?.normalizedParams || {};
    const messageCoin = String(params.coin || params.asset || '').toUpperCase();
    const messageSide = String(params.side || params.direction || '').toLowerCase();
    if (coin && messageCoin && coin !== messageCoin) return false;
    if (side && messageSide && side !== messageSide) return false;

    const currentTime = messageTime(message);
    if (!sourceTime || !currentTime) return true;
    return Math.abs(currentTime - sourceTime) <= 10 * 60 * 1000;
  });
}

function shouldHideHyperliquidMarketReadAfterOrder(
  message: Message,
  messages: Message[]
) {
  if (!isAgentLikeMessage(message)) return false;
  if (!/^Hyperliquid markets:/i.test(message.message || '')) return false;
  const messageCreatedAt = messageTime(message);

  return messages.some((candidate) => {
    if (candidate === message) return false;
    if (
      !findHyperliquidOrderIntent(candidate.message || '') &&
      !findHyperliquidPositionTpSlIntent(candidate.message || '') &&
      !findWalletSendIntent(candidate.message || '')
    ) {
      return false;
    }
    const candidateCreatedAt = messageTime(candidate);
    if (!messageCreatedAt || !candidateCreatedAt) return true;
    return (
      candidateCreatedAt <= messageCreatedAt &&
      messageCreatedAt - candidateCreatedAt <= 3 * 60 * 1000
    );
  });
}

function isMoneylinePolymarketMarket(market: PolymarketMarketPreview) {
  const question = normalizeIntentText(market.question);
  const eventTitle = normalizeIntentText(market.eventTitle);
  const outcomes = getPolymarketOutcomeLabels(market);
  const outcomeText = normalizeIntentText(`${outcomes.yes} ${outcomes.no}`);

  if (
    /\b(spread|o u|ou|over under|total)\b/.test(question) ||
    /\b(over|under)\b/.test(outcomeText) ||
    /[+-]\d+(?:\.\d+)?/.test(outcomeText)
  ) {
    return false;
  }

  return Boolean(
    question &&
      (question === eventTitle ||
        !/\b(spread|total|over|under|o u|ou)\b/.test(question))
  );
}

function getPolymarketIntentMarketType(market: PolymarketMarketPreview) {
  const label = formatPolymarketMarketLabel(market, market.eventTitle || undefined);
  if (label.kicker === 'spread') return 'spread';
  if (label.kicker === 'total') return 'total';
  if (isMoneylinePolymarketMarket(market)) return 'moneyline';
  return 'market';
}

function findPolymarketOrderIntent(
  text: string,
  visibleMarkets: PolymarketMarketPreview[]
): PolymarketOrderIntent | null {
  const normalizedText = normalizeIntentText(text);
  if (
    !visibleMarkets.length ||
    hasHyperliquidOrderIntent(text) ||
    !hasPolymarketWriteIntent(normalizedText)
  ) {
    return null;
  }

  const requestedMarketType =
    /\bmoney\s*line|moneyline\b/i.test(text)
      ? 'moneyline'
      : /\bspread\b/i.test(text)
      ? 'spread'
      : /\b(total|over|under|o\/u|ou)\b/i.test(text)
      ? 'total'
      : null;
  const requestedOrderType = /\blimit\b/i.test(text) ? 'limit' : 'market';
  const limitPriceCents =
    requestedOrderType === 'limit' ? parseLimitPriceCents(text) : '';

  let best:
    | {
        market: PolymarketMarketPreview;
        outcome: 'yes' | 'no';
        score: number;
      }
    | null = null;

  for (const market of visibleMarkets) {
    const labels = getPolymarketOutcomeLabels(market);
    const marketType = getPolymarketIntentMarketType(market);
    const marketText = normalizeIntentText(
      `${market.question || ''} ${market.eventTitle || ''} ${market.slug || ''}`
    );
    const typeScore =
      requestedMarketType && requestedMarketType === marketType ? 8 : 0;
    const typePenalty =
      requestedMarketType && requestedMarketType !== marketType ? -8 : 0;

    for (const outcome of ['yes', 'no'] as const) {
      const label = outcome === 'yes' ? labels.yes : labels.no;
      const normalizedLabel = normalizeIntentText(label);
      const labelParts = normalizedLabel
        .split(' ')
        .filter((part) => part.length >= 3);

      let score = typeScore + typePenalty;
      if (
        normalizedLabel &&
        normalizedTextHasTerm(normalizedText, normalizedLabel)
      ) {
        score += 12;
      }
      labelParts.forEach((part) => {
        if (normalizedTextHasTerm(normalizedText, part)) score += 2;
      });
      if (marketText) {
        marketText
          .split(' ')
          .filter((part) => part.length >= 4)
          .forEach((part) => {
            if (normalizedTextHasTerm(normalizedText, part)) score += 0.5;
          });
      }

      if (!best || score > best.score) {
        best = { market, outcome, score };
      }
    }
  }

  if (!best || best.score < 5) return null;

  const amount = parsePolymarketOrderAmount(text, limitPriceCents);
  const marketKey = buildPolymarketBetKey(best.market, best.outcome);

  return {
    market: best.market,
    prefill: {
      marketKey,
      outcome: best.outcome,
      side: /\bsell\b/i.test(text) ? 'SELL' : 'BUY',
      orderType: requestedOrderType,
      amount,
      limitPriceCents,
      sourceText: text,
    },
  };
}

function buildSyntheticPolymarketOrderMessage(
  intent: PolymarketOrderIntent,
  sourceMessageId?: string
): Message {
  const labels = getPolymarketOutcomeLabels(intent.market);
  const outcomeLabel =
    intent.prefill.outcome === 'yes' ? labels.yes : labels.no;
  const orderType = intent.prefill.orderType || 'market';
  const limitText =
    orderType === 'limit' && intent.prefill.limitPriceCents
      ? ` at ${intent.prefill.limitPriceCents}¢`
      : '';

  return {
    _id: sourceMessageId
      ? `local-polymarket-order-${sourceMessageId}`
      : `local-polymarket-order-${Date.now()}`,
    message: `Drafted a ${orderType} order for ${outcomeLabel}${limitText}. Review and confirm below.`,
    senderKind: 'agent',
    agentSender: {
      agentId: 'astro',
      provider: 'elizaos',
      displayName: 'Astro',
      avatarUrl: null,
    },
    messageType: 'agent_response',
    createdAt: new Date().toISOString(),
    agentData: {
      metadata: {
        toolExecution: {
          provider: 'polymarket',
          action: 'prediction.markets',
          markets: [intent.market],
        },
        polymarketOrderPrefill: intent.prefill,
      },
    },
  };
}

function isGenericAstroOnlineText(text?: string | null) {
  return /astro is online\.?\s+i can help with read-only market context/i.test(
    text || ''
  );
}

interface TypingData {
  userId: string;
  user: User;
  groupId?: string;
  isTyping: boolean;
}

// ==================== MAIN COMPONENT ====================

export default function ChatArea({
  selectedChat,
  chatType,
  currentUser,
  socket,
  onChatUpdate,
  onLeaveGroup,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, User>>(
    new Map()
  );
  const [proposalsById, setProposalsById] = useState<
    Record<string, AgentActionProposal>
  >({});
  const [actionResultsByProposalId, setActionResultsByProposalId] =
    useState<Record<string, AgentActionResultPayload>>({});
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(
    null
  );
  const [dismissedReceiptIds, setDismissedReceiptIds] = useState<Set<string>>(
    () => new Set()
  );
  const [agentStatusText, setAgentStatusText] = useState<string | null>(null);
  const [agentMutationId, setAgentMutationId] = useState<string | null>(null);
  const {
    addGroupAgent,
    agentError,
    approveAgentAction,
    availableAgents,
    isLoadingAgents,
    invokeGroupAgent,
    rejectAgentAction,
    removeGroupAgent,
  } = useGroupAgents(socket);
  const [pendingPolymarketBetKey, setPendingPolymarketBetKey] = useState<
    string | null
  >(null);
  const [inlinePolymarketProposalsByBetKey, setInlinePolymarketProposalsByBetKey] =
    useState<Record<string, AgentActionProposal>>({});
  const [inlineProposalIds, setInlineProposalIds] = useState<Set<string>>(
    () => new Set()
  );

  //State to hold current group data
  const [currentGroupData, setCurrentGroupData] =
    useState<SelectedChat | null>(selectedChat);
  const currentGroupDataRef = useRef<SelectedChat | null>(selectedChat);
  const pendingPolymarketBetKeyRef = useRef<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMoreMessages, setHasMoreMessages] =
    useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const isPinnedToBottomRef = useRef<boolean>(true);
  const forceScrollToBottomRef = useRef<boolean>(false);
  const suppressLoadMoreUntilRef = useRef<number>(0);
  const selectedChatRef = useRef<SelectedChat | null>(selectedChat);
  const recentOutgoingMessageRef = useRef<{
    key: string;
    at: number;
  } | null>(null);
  const localPolymarketIntentSuppressUntilRef = useRef<number>(0);
  const renderedPolymarketMarketsRef = useRef<
    Map<string, PolymarketMarketPreview>
  >(new Map());
  const router = useRouter();
  const isInitialLoadRef = useRef<boolean>(true);
  const isGroup = chatType === 'group';
  const selectedChatKey = selectedChat
    ? `${chatType}:${isGroup ? selectedChat._id : getDirectReceiverId(selectedChat)}`
    : 'none';
  selectedChatRef.current = selectedChat;
  const scrollMessagesToBottom = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const scroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      };

      scroll();
      window.requestAnimationFrame(() => {
        scroll();
        window.requestAnimationFrame(scroll);
      });
    },
    []
  );
  const prepareBottomAnchoredLoad = useCallback(() => {
    isPinnedToBottomRef.current = true;
    forceScrollToBottomRef.current = true;
    suppressLoadMoreUntilRef.current = Date.now() + 1500;
    previousScrollHeightRef.current = 0;
    scrollMessagesToBottom('auto');
  }, [scrollMessagesToBottom]);
  const shouldLoadAstroConsoleData = isAstroTradingDeskChat(
    currentGroupData || selectedChat,
    isGroup
  );
  const { eoaAddress } = usePolymarketWallet();
  const { accessToken, user } = useUser();
  const currentChatUser = useMemo(() => {
    const chat = currentGroupData || selectedChat;
    return chat?.participants?.find(
      (participant) => getObjectId(participant.userId?._id) === currentUser
    )?.userId;
  }, [currentGroupData, currentUser, selectedChat]);
  const walletIdentityLabel = useMemo(
    () => getUserSwopIdLabel(user, currentChatUser),
    [currentChatUser, user]
  );
  const trading = useTrading();
  const {
    authenticated: isPrivyAuthenticated,
    ready: isPrivyReady,
    user: privyUser,
  } = usePrivy();
  const walletData = useWalletData(
    isPrivyAuthenticated,
    isPrivyReady,
    privyUser
  );
  const { solWalletAddress, evmWalletAddress, evmWalletAddresses } =
    useWalletAddresses(walletData);
  const {
    tokens: walletPortfolioTokens,
    loading: isWalletPortfolioBalanceLoading,
  } = useMultiChainTokenData(
    shouldLoadAstroConsoleData ? solWalletAddress : '',
    shouldLoadAstroConsoleData
      ? evmWalletAddresses.length
        ? evmWalletAddresses
        : evmWalletAddress
      : '',
    SUPPORTED_CHAINS
  );

  const walletPortfolioBalance = useMemo(() => {
    return walletPortfolioTokens.reduce((sum, token) => {
      const value = getTokenDataUsdValue(token);
      return Number.isFinite(value) && value > 0 ? sum + value : sum;
    }, 0);
  }, [walletPortfolioTokens]);
  const perpsAgent = useHyperliquidAgent({
    enabled: shouldLoadAstroConsoleData,
  });
  const { data: perpsMarkets = [] } = useHyperliquidMarkets({
    enabled: shouldLoadAstroConsoleData,
  });
  const perpsTrading = useHyperliquidTrading(perpsAgent.agentClient);

  const { data: predictionWalletInfo, isLoading: isPredictionWalletInfoLoading } =
    useQuery({
      queryKey: ['polymarketWalletInfo', eoaAddress],
      queryFn: () => getWalletInfo(eoaAddress!, accessToken!),
      enabled: shouldLoadAstroConsoleData && Boolean(eoaAddress && accessToken),
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    });

  const predictionActiveWalletAddress = useMemo(() => {
    if (!shouldLoadAstroConsoleData) return undefined;
    if (trading.tradingWalletAddress) return trading.tradingWalletAddress;
    if (predictionWalletInfo?.recommendedWalletType === 'safe') {
      return predictionWalletInfo.safeAddress;
    }
    if (predictionWalletInfo?.depositWalletAddress) {
      return predictionWalletInfo.depositWalletAddress;
    }
    if (predictionWalletInfo?.safeAddress) return predictionWalletInfo.safeAddress;
    return eoaAddress;
  }, [
    eoaAddress,
    predictionWalletInfo?.depositWalletAddress,
    predictionWalletInfo?.recommendedWalletType,
    predictionWalletInfo?.safeAddress,
    shouldLoadAstroConsoleData,
    trading.tradingWalletAddress,
  ]);

  const predictionWalletAddresses = useMemo(() => {
    if (!shouldLoadAstroConsoleData) return [];

    const addresses = [
      ...trading.portfolioAddresses,
      trading.tradingWalletAddress,
      trading.depositWalletAddress,
      predictionWalletInfo?.depositWalletAddress,
      predictionWalletInfo?.safeAddress,
      predictionActiveWalletAddress,
    ].filter((address): address is string => Boolean(address));
    return Array.from(
      new Map(addresses.map((address) => [address.toLowerCase(), address])).values()
    );
  }, [
    predictionActiveWalletAddress,
    predictionWalletInfo?.depositWalletAddress,
    predictionWalletInfo?.safeAddress,
    shouldLoadAstroConsoleData,
    trading.depositWalletAddress,
    trading.portfolioAddresses,
    trading.tradingWalletAddress,
  ]);

  const {
    usdcBalance: activePredictionUsdcBalance,
    isLoading: isActivePredictionBalanceLoading,
  } = usePolygonBalances(
    shouldLoadAstroConsoleData && predictionActiveWalletAddress
      ? [predictionActiveWalletAddress]
      : []
  );
  const {
    usdcBalance: predictionPortfolioUsdcBalance,
    legacyUsdcBalance: predictionLegacyUsdcBalance,
    isLoading: isPredictionPortfolioBalanceLoading,
  } = usePolygonBalances(predictionWalletAddresses);

  const { data: predictionPositions = [] } = useUserPositions(
    shouldLoadAstroConsoleData ? predictionWalletAddresses : []
  );
  const { data: predictionOpenOrders = [] } = useActiveOrders(
    trading.tradingSession,
    trading.tradingWalletAddress,
    { enabled: shouldLoadAstroConsoleData }
  );
  const {
    data: perpsAccount,
    isLoading: isPerpsLoading,
  } = useHyperliquidPositions(
    shouldLoadAstroConsoleData
      ? perpsAgent.masterAddress || eoaAddress || null
      : null
  );

  const astroConsoleData = useMemo<AstroConsoleData>(
    () => ({
      eoaAddress,
      solWalletAddress,
      evmWalletAddress,
      evmWalletAddresses,
      walletIdentityLabel,
      walletPortfolioBalance,
      walletPortfolioTokens,
      predictionWalletAddress:
        predictionActiveWalletAddress || predictionWalletAddresses[0],
      predictionWalletAddresses,
      predictionUsdcBalance: activePredictionUsdcBalance,
      predictionPortfolioUsdcBalance,
      predictionLegacyUsdcBalance,
      predictionPositions,
      predictionOpenOrders,
      isWalletPortfolioBalanceLoading,
      isPredictionBalanceLoading:
        isPredictionWalletInfoLoading ||
        isActivePredictionBalanceLoading ||
        isPredictionPortfolioBalanceLoading,
      perpsAccount,
      perpsMasterAddress: perpsAgent.masterAddress || eoaAddress || null,
      isPerpsLoading,
      perpsMarkets,
      isPerpsAgentInitialized: perpsAgent.isInitialized,
      isPerpsAgentInitializing: perpsAgent.isInitializing,
      isPerpsAgentReconnecting: perpsAgent.isReconnecting,
      perpsAgentError: perpsAgent.error,
      initializePerpsAgent: perpsAgent.initializeAgent,
      isPerpsSubmitting: perpsTrading.isSubmitting,
      perpsTradingError: perpsTrading.error,
      clearPerpsTradingError: perpsTrading.clearError,
      updatePerpsLeverage: perpsTrading.updateLeverage,
      placePerpsMarketOrder: perpsTrading.placeMarketOrder,
      placePerpsLimitOrder: perpsTrading.placeLimitOrder,
      placePerpsTpSlOrder: perpsTrading.placeTpSlOrder,
      placePerpsPositionTpSlOrder: perpsTrading.placePositionTpSlOrder,
      closePerpsPosition: perpsTrading.closePosition,
    }),
    [
      eoaAddress,
      isWalletPortfolioBalanceLoading,
      isPerpsLoading,
      isActivePredictionBalanceLoading,
      isPredictionPortfolioBalanceLoading,
      isPredictionWalletInfoLoading,
      perpsAccount,
      perpsAgent.error,
      perpsAgent.initializeAgent,
      perpsAgent.isInitialized,
      perpsAgent.isInitializing,
      perpsAgent.masterAddress,
      perpsAgent.isReconnecting,
      perpsMarkets,
      perpsTrading.clearError,
      perpsTrading.closePosition,
      perpsTrading.error,
      perpsTrading.isSubmitting,
      perpsTrading.placeLimitOrder,
      perpsTrading.placeMarketOrder,
      perpsTrading.placePositionTpSlOrder,
      perpsTrading.placeTpSlOrder,
      perpsTrading.updateLeverage,
      predictionActiveWalletAddress,
      predictionLegacyUsdcBalance,
      predictionOpenOrders,
      predictionPositions,
      activePredictionUsdcBalance,
      evmWalletAddress,
      evmWalletAddresses,
      predictionPortfolioUsdcBalance,
      predictionWalletAddresses,
      solWalletAddress,
      walletPortfolioBalance,
      walletPortfolioTokens,
      walletIdentityLabel,
    ]
  );

  const MESSAGES_PER_PAGE = 20;

  const [, setRenderedPolymarketMarketVersion] =
    useState(0);

  const registerRenderedPolymarketMarkets = useCallback(
    (markets: PolymarketMarketPreview[]) => {
      if (!markets.length) return;

      let changed = false;
      markets.forEach((market) => {
        const key = getPolymarketMarketIdentity(market);
        if (!key) return;

        if (renderedPolymarketMarketsRef.current.get(key) !== market) {
          renderedPolymarketMarketsRef.current.set(key, market);
          changed = true;
        }
      });

      if (changed) {
        setRenderedPolymarketMarketVersion((version) => version + 1);
      }
    },
    []
  );

  const getPolymarketIntentMarkets = useCallback(
    (sourceMessages: Message[] = messages) =>
      mergePolymarketMarkets(
        extractVisiblePolymarketMarkets(sourceMessages),
        Array.from(renderedPolymarketMarketsRef.current.values())
      ),
    [messages]
  );

  const appendMessageIfNew = useCallback((message?: Message) => {
    if (!message?._id) return;

    setMessages((prev) => reconcileIncomingMessage(prev, message));
  }, []);

  const upsertGroupAgent = useCallback((agent: GroupAgent) => {
    setCurrentGroupData((prev) => {
      if (!prev) return prev;

      const existingAgents = prev.botUsers || [];
      const nextAgents = existingAgents.some(
        (item) => item.agentId === agent.agentId
      )
        ? existingAgents.map((item) =>
            item.agentId === agent.agentId ? { ...item, ...agent } : item
          )
        : [...existingAgents, agent];

      return {
        ...prev,
        botUsers: nextAgents,
      };
    });
  }, []);

  const markGroupAgentRemoved = useCallback((agentId: string) => {
    setCurrentGroupData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        botUsers: (prev.botUsers || []).map((agent) =>
          agent.agentId === agentId ? { ...agent, isActive: false } : agent
        ),
      };
    });
  }, []);

  // Load messages function
  const loadMessages = useCallback(
    (page: number, isInitial: boolean = false) => {
      const activeChat = selectedChatRef.current;
      if (!activeChat || !socket) return;

      if (!isInitial) {
        setIsLoadingMore(true);
      } else {
        prepareBottomAnchoredLoad();
      }

      const eventName = isGroup
        ? 'get_group_messages'
        : EVENTS.GET_CONVERSATION_HISTORY;

      const receiverId = isGroup
        ? activeChat._id
        : getDirectReceiverId(activeChat);
      const requestChatKey = `${chatType}:${receiverId}`;

      if (!receiverId) {
        setIsLoadingMore(false);
        return;
      }

      const payload = isGroup
        ? {
            groupId: activeChat._id,
            page,
            limit: MESSAGES_PER_PAGE,
          }
        : { receiverId, page, limit: MESSAGES_PER_PAGE };

      socket.emit(eventName, payload, (response: SocketResponse) => {
        const latestChat = selectedChatRef.current;
        const latestReceiverId = latestChat
          ? isGroup
            ? latestChat._id
            : getDirectReceiverId(latestChat)
          : '';
        if (`${chatType}:${latestReceiverId}` !== requestChatKey) {
          setIsLoadingMore(false);
          return;
        }

        if (response?.success) {
          const newMessages = dedupeMessages(
            (response.messages || []).filter(
              (message) => !isSyntheticPolymarketPrepareMessage(message)
            )
          );

          // Check if there are more messages to load
          setHasMoreMessages(
            newMessages.length === MESSAGES_PER_PAGE
          );

          if (isInitial) {
            prepareBottomAnchoredLoad();
            setMessages(newMessages);
          } else {
            // Prepend older messages to the beginning
            setMessages((prev) =>
              dedupeMessages([...newMessages, ...prev])
            );
          }
        } else if (response?.error) {
          console.error(
            '[ChatArea] Failed to load messages:',
            response.error
          );
        }
        setIsLoadingMore(false);
      });
    },
    [socket, isGroup, chatType, prepareBottomAnchoredLoad]
  );

  // ADD THIS: Function to refresh group info
  // const refreshGroupInfo = useCallback(() => {
  //   // loadMessages(1, true);
  //   if (!socket || !selectedChat || chatType !== "group") return;
  //   // console.log("selectedChat._id", selectedChat._id);

  //   try {
  //     socket.emit(
  //       "get_group_messages",
  //       { groupId: selectedChat._id, page: 1, limit: 20 },
  //       (groupResponse: any) => {
  //         console.log("respnse hola", groupResponse);
  //         if (groupResponse && groupResponse.success) {
  //           setCurrentGroupData(groupResponse.messages);
  //           // Call parent refresh
  //           onChatUpdate?.();
  //         }
  //       }
  //     );
  //   } catch (error) {
  //     console.log("error in get_group_info", error);
  //   }
  //   console.log("hit last");
  // }, [socket, selectedChat, chatType, onChatUpdate]);

  // UPDATE: Listen for group update events
  useEffect(() => {
    if (!socket || chatType !== 'group') return;

    const handleGroupInfoUpdated = (data: any) => {
      if (data.groupId === selectedChat?._id) {
        // Update local group data
        if (data.group) {
          setCurrentGroupData(data.group);
        } else if (data.changes) {
          // Merge changes into current data
          setCurrentGroupData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              name: data.changes.name ?? prev.name,
              description:
                data.changes.description ?? prev.description,
              settings: {
                ...prev.settings,
                groupInfo: {
                  ...prev.settings?.groupInfo,
                  groupPicture:
                    data.changes.groupPicture ??
                    prev.settings?.groupInfo?.groupPicture,
                },
              },
            };
          });
        }
      }
    };

    const handleGroupParticipantsUpdated = (data: any) => {
      if (data.groupId === selectedChat?._id) {
        // Refresh group info to get latest participant list
        loadMessages(1, true);
      }
    };

    const handleGroupDeleted = (data: any) => {
      if (data.groupId === selectedChat?._id) {
        alert('This group has been deleted');
        // Navigate back or clear selection
        window.location.reload(); // Simple approach
      }
    };

    const handleGroupAgentAdded = (data: {
      groupId?: string;
      agent?: GroupAgent;
    }) => {
      if (data.groupId !== selectedChat?._id || !data.agent) return;
      upsertGroupAgent(data.agent);
      onChatUpdate?.();
    };

    const handleGroupAgentRemoved = (data: {
      groupId?: string;
      agentId?: string;
    }) => {
      if (data.groupId !== selectedChat?._id || !data.agentId) return;
      markGroupAgentRemoved(data.agentId);
      onChatUpdate?.();
    };

    socket.on('group_info_updated', handleGroupInfoUpdated);
    socket.on(
      'group_participants_updated',
      handleGroupParticipantsUpdated
    );
    socket.on('group_member_added', handleGroupParticipantsUpdated);
    socket.on('group_member_removed', handleGroupParticipantsUpdated);
    socket.on('group_deleted', handleGroupDeleted);
    socket.on('group_agent_added', handleGroupAgentAdded);
    socket.on('group_agent_removed', handleGroupAgentRemoved);

    return () => {
      socket.off('group_info_updated', handleGroupInfoUpdated);
      socket.off(
        'group_participants_updated',
        handleGroupParticipantsUpdated
      );
      socket.off(
        'group_member_added',
        handleGroupParticipantsUpdated
      );
      socket.off(
        'group_member_removed',
        handleGroupParticipantsUpdated
      );
      socket.off('group_deleted', handleGroupDeleted);
      socket.off('group_agent_added', handleGroupAgentAdded);
      socket.off('group_agent_removed', handleGroupAgentRemoved);
    };
  }, [
    socket,
    selectedChat,
    chatType,
    loadMessages,
    markGroupAgentRemoved,
    onChatUpdate,
    upsertGroupAgent,
  ]);
  // UPDATE: Sync currentGroupData when selectedChat changes
  useEffect(() => {
    setCurrentGroupData(selectedChat);
  }, [selectedChat]);

  useEffect(() => {
    currentGroupDataRef.current = currentGroupData;
  }, [currentGroupData]);

  useEffect(() => {
    pendingPolymarketBetKeyRef.current = pendingPolymarketBetKey;
  }, [pendingPolymarketBetKey]);

  useEffect(() => {
    setMessages((prev) => {
      const next = prev.filter(
        (message) => !isSyntheticPolymarketPrepareMessage(message)
      );
      return next.length === prev.length ? prev : next;
    });
  }, [messages]);

  useEffect(() => {
    const inlineEntries: Array<[string, AgentActionProposal]> = [];
    const inlineIds: string[] = [];

    messages.forEach((message) => {
      const proposal = proposalFromMessage(message);
      const key = buildPolymarketBetKeyFromProposal(proposal);
      if (!proposal?.proposalId || !key) return;

      inlineEntries.push([key, proposal]);
      inlineIds.push(proposal.proposalId);
    });

    if (inlineEntries.length > 0) {
      setInlinePolymarketProposalsByBetKey((prev) => {
        let changed = false;
        const next = { ...prev };
        inlineEntries.forEach(([key, proposal]) => {
          if (next[key]?.proposalId !== proposal.proposalId) {
            next[key] = proposal;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }

    if (inlineIds.length > 0) {
      setInlineProposalIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        inlineIds.forEach((proposalId) => {
          if (!next.has(proposalId)) {
            next.add(proposalId);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [messages]);

  // console.log("selectedChat._id", selectedChat._id);

  // Initial load and setup
  useEffect(() => {
    const activeChat = selectedChatRef.current;
    if (!activeChat || !socket) return;

    // Reset states for new chat
    prepareBottomAnchoredLoad();
    setMessages([]);
    setCurrentPage(1);
    setHasMoreMessages(true);
    setIsTyping(false);
    setTypingUsers(new Map());
    setAgentStatusText(null);
    pendingPolymarketBetKeyRef.current = null;
    setPendingPolymarketBetKey(null);
    isInitialLoadRef.current = true;

    // Load initial messages
    loadMessages(1, true);

    // Join room
    if (isGroup) {
      socket.emit('join_group', { groupId: activeChat._id });
    } else {
      const receiverId = getDirectReceiverId(activeChat);

      socket.emit(EVENTS.JOIN_CONVERSATION, {
        receiverId,
      });
    }

    const handleNewMessage = (data: {
      message?: Message;
      conversationType?: string;
    }) => {
      if (!data?.message) return;

      if (
        !isGroup &&
        data.conversationType &&
        data.conversationType !== 'direct'
      ) {
        return;
      }

      const msg = data.message;
      if (isSyntheticPolymarketPrepareMessage(msg)) {
        return;
      }
      if (
        isAgentLikeMessage(msg) &&
        isGenericAstroOnlineText(msg.message) &&
        Date.now() < localPolymarketIntentSuppressUntilRef.current
      ) {
        return;
      }

      const otherParticipantId = getDirectReceiverId(activeChat);

      const isForCurrentChat = isGroup
        ? msg.groupId === activeChat._id
        : msg.sender?._id === otherParticipantId ||
          msg.sender?._id === currentUser ||
          msg.receiver?._id === otherParticipantId ||
          msg.receiver?._id === currentUser;

      if (isForCurrentChat) {
        setMessages((prev) => reconcileIncomingMessage(prev, msg));
      }
    };

    const handleTyping = (
      data: TypingData & { conversationType?: string }
    ) => {
      if (
        !isGroup &&
        data.conversationType &&
        data.conversationType !== 'direct'
      ) {
        return;
      }

      if (isGroup) {
        if (
          data.groupId === activeChat._id &&
          data.userId !== currentUser
        ) {
          if (data.isTyping) {
            setTypingUsers(
              (prev) => new Map(prev.set(data.userId, data.user))
            );
          } else {
            setTypingUsers((prev) => {
              const newMap = new Map(prev);
              newMap.delete(data.userId);
              return newMap;
            });
          }
        }
      } else {

        const otherParticipantId = activeChat._id;

        if (data.userId === otherParticipantId) {
          setIsTyping(data.isTyping);
        }
      }
    };

    const handleAgentInvocationStarted = (data: {
      groupId?: string;
      agentId?: string;
      status?: string;
    }) => {
      if (!isGroup || data.groupId !== activeChat._id) return;
      const activeGroupData = currentGroupDataRef.current;
      const agentName =
        activeGroupData?.botUsers?.find(
          (agent) => agent.agentId === data.agentId
        )?.displayName || 'Agent';
      setAgentStatusText(`${agentName} is thinking`);
    };

    const handleAgentGroupResponse = (data: {
      groupId?: string;
      message?: Message;
      error?: { message?: string };
    }) => {
      if (!isGroup || data.groupId !== activeChat._id) return;
      setAgentStatusText(null);

      if (data.error?.message) {
        pendingPolymarketBetKeyRef.current = null;
        setPendingPolymarketBetKey(null);
        toast.error(data.error.message);
        return;
      }

      if (
        data.message &&
        isGenericAstroOnlineText(data.message.message) &&
        Date.now() < localPolymarketIntentSuppressUntilRef.current
      ) {
        return;
      }
    };

    const handleAgentActionProposed = (data: {
      groupId?: string;
      proposal?: AgentActionProposal;
      message?: Message;
    }) => {
      if (!isGroup || data.groupId !== activeChat._id) return;
      setAgentStatusText(null);
      const activePendingBetKey = pendingPolymarketBetKeyRef.current;
      pendingPolymarketBetKeyRef.current = null;
      setPendingPolymarketBetKey(null);

      if (data.proposal?.proposalId) {
        setProposalsById((prev) => ({
          ...prev,
          [data.proposal!.proposalId]: data.proposal!,
        }));

        if (
          activePendingBetKey &&
          data.proposal.toolType === 'prediction.write'
        ) {
          setInlinePolymarketProposalsByBetKey((prev) => ({
            ...prev,
            [activePendingBetKey]: data.proposal!,
          }));
          setInlineProposalIds((prev) => {
            const next = new Set(prev);
            next.add(data.proposal!.proposalId);
            return next;
          });
          return;
        }
      }

    };

    const handleAgentActionResult = (data: AgentActionResultPayload) => {
      if (!isGroup || data.groupId !== activeChat._id || !data.proposalId) {
        return;
      }

      setActionResultsByProposalId((prev) => ({
        ...prev,
        [data.proposalId]: data,
      }));
      setProposalsById((prev) => {
        const proposal = prev[data.proposalId];
        if (!proposal) return prev;

        return {
          ...prev,
          [data.proposalId]: {
            ...proposal,
            status: data.status || proposal.status,
            approvalResult: data.result || proposal.approvalResult,
          },
        };
      });
    };

    socket.on(
      isGroup ? 'new_group_message' : EVENTS.NEW_MESSAGE,
      handleNewMessage
    );
    socket.on('user_typing_group', handleTyping);
    socket.on('typing_started', handleTyping);
    socket.on('typing_stopped', handleTyping);
    socket.on(
      GROUP_AGENT_SOCKET_EVENTS.INVOCATION_STARTED,
      handleAgentInvocationStarted
    );
    socket.on(
      GROUP_AGENT_SOCKET_EVENTS.GROUP_RESPONSE,
      handleAgentGroupResponse
    );
    socket.on(
      GROUP_AGENT_SOCKET_EVENTS.ACTION_PROPOSED,
      handleAgentActionProposed
    );
    socket.on(GROUP_AGENT_SOCKET_EVENTS.ACTION_RESULT, handleAgentActionResult);

    return () => {
      socket.off(
        isGroup ? 'new_group_message' : EVENTS.NEW_MESSAGE,
        handleNewMessage
      );
      socket.off('user_typing_group', handleTyping);
      socket.off('typing_started', handleTyping);
      socket.off('typing_stopped', handleTyping);
      socket.off(
        GROUP_AGENT_SOCKET_EVENTS.INVOCATION_STARTED,
        handleAgentInvocationStarted
      );
      socket.off(
        GROUP_AGENT_SOCKET_EVENTS.GROUP_RESPONSE,
        handleAgentGroupResponse
      );
      socket.off(
        GROUP_AGENT_SOCKET_EVENTS.ACTION_PROPOSED,
        handleAgentActionProposed
      );
      socket.off(
        GROUP_AGENT_SOCKET_EVENTS.ACTION_RESULT,
        handleAgentActionResult
      );
    };
  }, [
    appendMessageIfNew,
    selectedChatKey,
    chatType,
    socket,
    currentUser,
    isGroup,
    loadMessages,
    prepareBottomAnchoredLoad,
  ]);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0) {
      scrollMessagesToBottom('auto');
      isInitialLoadRef.current = false;
      isPinnedToBottomRef.current = true;
      forceScrollToBottomRef.current = false;
      suppressLoadMoreUntilRef.current = Date.now() + 800;
    } else if (messages.length > 0 && !isLoadingMore) {
      if (
        forceScrollToBottomRef.current ||
        isPinnedToBottomRef.current
      ) {
        scrollMessagesToBottom(
          forceScrollToBottomRef.current ? 'smooth' : 'auto'
        );
        forceScrollToBottomRef.current = false;
      }
    }
  }, [messages, isLoadingMore, scrollMessagesToBottom]);

  useEffect(() => {
    const content = messagesContentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;

    let animationFrame: number | null = null;
    const observer = new ResizeObserver(() => {
      const shouldStayAtBottom =
        isInitialLoadRef.current ||
        forceScrollToBottomRef.current ||
        isPinnedToBottomRef.current ||
        Date.now() < suppressLoadMoreUntilRef.current;

      if (!shouldStayAtBottom) return;

      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(() => {
        scrollMessagesToBottom('auto');
      });
    });

    observer.observe(content);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      observer.disconnect();
    };
  }, [scrollMessagesToBottom, selectedChatKey]);

  // Maintain scroll position after loading older messages
  useEffect(() => {
    if (
      !isLoadingMore &&
      previousScrollHeightRef.current > 0 &&
      messagesContainerRef.current
    ) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      const scrollDiff =
        newScrollHeight - previousScrollHeightRef.current;

      if (scrollDiff > 0) {
        container.scrollTop += scrollDiff;
      }
      previousScrollHeightRef.current = 0;
    }
  }, [messages, isLoadingMore]);

  useEffect(() => {
    const composer = composerInputRef.current;
    if (!composer) return;

    composer.style.height = '0px';
    composer.style.height = `${Math.min(composer.scrollHeight, 112)}px`;
  }, [newMessage]);

  // Handle scroll to load more messages
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;
    isPinnedToBottomRef.current = distanceFromBottom < 160;

    if (
      isLoadingMore ||
      !hasMoreMessages ||
      isInitialLoadRef.current ||
      forceScrollToBottomRef.current ||
      Date.now() < suppressLoadMoreUntilRef.current
    ) {
      return;
    }

    // Store current scroll height before loading more
    previousScrollHeightRef.current = container.scrollHeight;

    // Load more when scrolled to top (within 100px)
    if (container.scrollTop < 100) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadMessages(nextPage, false);
    }
  }, [currentPage, isLoadingMore, hasMoreMessages, loadMessages]);

  const handleSendMessage = useCallback((messageOverride?: string) => {
    const outgoingMessage =
      typeof messageOverride === 'string' ? messageOverride : newMessage;
    if (!outgoingMessage.trim() || !socket || !selectedChat) return;

    const receiverId = isGroup
      ? selectedChat._id
      : getDirectReceiverId(selectedChat);

    if (!receiverId) return;

    const hasAstroMention = /(?:^|\s)@?astro\b/i.test(outgoingMessage);
    const activeChat = currentGroupData || selectedChat;
    const shouldAutoMentionAstro =
      isAstroTradingDeskChat(activeChat, isGroup) &&
      !hasAstroMention;
    const canUseAstroLocalActions =
      !isGroup || hasAstroMention || shouldAutoMentionAstro;
    const messageForTransport = shouldAutoMentionAstro
      ? `@astro ${outgoingMessage}`
      : outgoingMessage;
    const outgoingKey = [
      receiverId,
      normalizeMessageForDedupe(messageForTransport),
    ].join(':');
    const now = Date.now();
    if (
      recentOutgoingMessageRef.current?.key === outgoingKey &&
      now - recentOutgoingMessageRef.current.at < 2_000
    ) {
      return;
    }
    recentOutgoingMessageRef.current = { key: outgoingKey, at: now };

    const messageData = isGroup
      ? {
          groupId: selectedChat._id,
          message: messageForTransport,
          messageType: 'text' as const,
          clientWalletContext: {
            evmWalletAddress,
            evmWalletAddresses,
            solWalletAddress,
            predictionWalletAddress:
              predictionActiveWalletAddress || predictionWalletAddresses[0],
            predictionWalletAddresses,
            tradingWalletAddress: trading.tradingWalletAddress,
            depositWalletAddress:
              trading.depositWalletAddress ||
              predictionWalletInfo?.depositWalletAddress,
            safeAddress: predictionWalletInfo?.safeAddress,
          },
        }
      : {
            receiverId,
            message: messageForTransport,
            messageType: 'text' as const,
        };

    const optimisticMessage: Message = {
      _id: `temp-${Date.now()}`,
      message: outgoingMessage,
      sender: { _id: currentUser, name: 'You' },
      receiver: isGroup
        ? null
        : {
            _id: receiverId,
            name: getDirectReceiverName(selectedChat),
            profilePic: getDirectReceiverAvatar(selectedChat),
          },
      groupId: isGroup ? selectedChat._id : null,
      messageType: 'text',
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    const localPolymarketOrderIntent =
      canUseAstroLocalActions &&
      findPolymarketOrderIntent(
        outgoingMessage,
        getPolymarketIntentMarkets(messages)
      );
    const syntheticPolymarketOrderMessage = localPolymarketOrderIntent
      ? buildSyntheticPolymarketOrderMessage(localPolymarketOrderIntent)
      : null;

    if (syntheticPolymarketOrderMessage) {
      localPolymarketIntentSuppressUntilRef.current = Date.now() + 15_000;
    }

    forceScrollToBottomRef.current = true;
    isPinnedToBottomRef.current = true;

    setMessages((prev) =>
      dedupeMessages([
        ...prev,
        optimisticMessage,
        ...(syntheticPolymarketOrderMessage
          ? [syntheticPolymarketOrderMessage]
          : []),
      ])
    );
    if (typeof messageOverride !== 'string') {
      setNewMessage('');
    }

    socket.emit(
      isGroup ? 'send_group_message' : EVENTS.SEND_MESSAGE,
      messageData,
      (response: SocketResponse) => {
        if (response?.success && response.message) {
          const acknowledgedMessage =
            shouldAutoMentionAstro && response.message.message === messageForTransport
              ? { ...response.message, message: outgoingMessage }
              : response.message;
          setMessages((prev) =>
            reconcileIncomingMessage(prev, acknowledgedMessage)
          );
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === optimisticMessage._id
                ? { ...msg, status: 'failed' as const }
                : msg
            )
          );
        }
      }
    );
  }, [
    currentUser,
    currentGroupData,
    evmWalletAddress,
    evmWalletAddresses,
    getPolymarketIntentMarkets,
    isGroup,
    messages,
    newMessage,
    predictionActiveWalletAddress,
    predictionWalletAddresses,
    predictionWalletInfo?.depositWalletAddress,
    predictionWalletInfo?.safeAddress,
    selectedChat,
    solWalletAddress,
    socket,
    trading.depositWalletAddress,
    trading.tradingWalletAddress,
  ]);

  const handlePreparePolymarketBet = useCallback(
    async (prompt: string, betKey: string) => {
      if (!selectedChat || !socket) return null;
      if (!isGroup) {
        handleSendMessage(prompt);
        return null;
      }

      pendingPolymarketBetKeyRef.current = betKey;
      setPendingPolymarketBetKey(betKey);
      setAgentStatusText('Preparing bet ticket');

      try {
        const response: any = await invokeGroupAgent({
          groupId: selectedChat._id,
          agentId: 'astro',
          message: prompt,
        });
        const proposal = response?.data?.proposal;
        const responseMessage = response?.data?.responseMessage;

        if (proposal?.proposalId) {
          setProposalsById((prev) => ({
            ...prev,
            [proposal.proposalId]: proposal,
          }));
          setInlinePolymarketProposalsByBetKey((prev) => ({
            ...prev,
            [betKey]: proposal,
          }));
          setInlineProposalIds((prev) => {
            const next = new Set(prev);
            next.add(proposal.proposalId);
            return next;
          });
          return proposal as AgentActionProposal;
        }
        if (!proposal?.proposalId) {
          appendMessageIfNew(responseMessage);
        }
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? error.message
            : 'Failed to prepare bet ticket.'
        );
      } finally {
        setAgentStatusText(null);
        pendingPolymarketBetKeyRef.current = null;
        setPendingPolymarketBetKey(null);
      }

      return null;
    },
    [
      appendMessageIfNew,
      handleSendMessage,
      invokeGroupAgent,
      isGroup,
      selectedChat,
      socket,
    ]
  );

  const handleAddAgent = async (agent: GroupAgentDescriptor) => {
    if (!selectedChat) return;

    setAgentMutationId(agent.agentId);
    try {
      const addedAgent = await addGroupAgent({
        groupId: selectedChat._id,
        agent,
      });
      upsertGroupAgent(addedAgent);
      toast.success(`${addedAgent.displayName || agent.displayName} added`);
      onChatUpdate?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add agent'
      );
    } finally {
      setAgentMutationId(null);
    }
  };

  const handleRemoveAgent = async (agentId: string) => {
    if (!selectedChat) return;

    setAgentMutationId(agentId);
    try {
      await removeGroupAgent({ groupId: selectedChat._id, agentId });
      markGroupAgentRemoved(agentId);
      toast.success('Agent removed');
      onChatUpdate?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove agent'
      );
    } finally {
      setAgentMutationId(null);
    }
  };

  const handleMentionAgent = (agent: GroupAgent) => {
    const alias = agent.mentionAliases?.[0] || `@${agent.agentId}`;
    setNewMessage((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `${alias} `;
      if (trimmed.includes(alias)) return prev;
      return `${trimmed} ${alias} `;
    });
  };

  const focusComposer = useCallback(() => {
    window.requestAnimationFrame(() => {
      const composer = composerInputRef.current;
      if (!composer) return;
      composer.focus();
      const end = composer.value.length;
      composer.setSelectionRange(end, end);
    });
  }, []);

  const applyComposerCommand = useCallback(
    (commandSeed: string) => {
      setNewMessage((prev) => {
        const trimmed = prev.trim();
        if (!trimmed || trimmed.startsWith('/')) return commandSeed;
        return `${trimmed} ${commandSeed}`;
      });
      focusComposer();
    },
    [focusComposer]
  );

  const handleComposerCommandButton = useCallback(() => {
    setNewMessage((prev) => (prev.trim() ? prev : '/'));
    focusComposer();
  }, [focusComposer]);

  const handleApprovalNextStep = useCallback(
    (approvalResult?: AgentApprovalHandoff | null) => {
      if (!approvalResult?.payload) return;

      persistAgentActionHandoff(approvalResult);

      const route = approvalResult.payload.route;
      const provider = approvalResult.payload.provider;
      if (route === '/wallet' && provider === 'hyperliquid') {
        toast.success('Opening Perps to complete the approved action.');
        router.push('/wallet?agentAction=approved');
        return;
      }

      if (route === '/wallet' && provider === 'swop') {
        if (approvalResult.payload.panel === 'send') {
          toast.success('Send approved. Confirm it from the message card.');
          return;
        }
        toast.success('Opening Swap to complete the approved action.');
        router.push('/wallet?agentAction=approved');
        return;
      }

      if (route === '/prediction' && provider === 'polymarket') {
        toast.success('Opening Predictions to complete the approved action.');
        router.push('/prediction?agentAction=approved');
        return;
      }

      if (route === '/products/create' && provider === 'marketplace') {
        toast.success('Opening Products to review the marketplace item.');
        router.push('/products/create?agentAction=approved');
      }
    },
    [router]
  );

  const handleAddPredictionFunds = useCallback(() => {
    toast('Opening Predictions funding.');
    router.push('/prediction?funds=deposit');
  }, [router]);

  const handleAddPerpsFunds = useCallback(() => {
    toast('Opening Hyperliquid deposit.');
    router.push('/wallet?perpsDeposit=1');
  }, [router]);

  const handleApproveProposal = async (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => {
    setPendingProposalId(proposalId);
    try {
      const response: any = await approveAgentAction(
        proposalId,
        approvalParams
      );
      const approvalResult =
        response?.data?.approvalResult || response?.data?.result || null;
      setActionResultsByProposalId((prev) => ({
        ...prev,
        [proposalId]: {
          proposalId,
          status: 'approved',
          result: approvalResult,
        },
      }));
      handleApprovalNextStep(approvalResult);
      toast.success('Proposal approved');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to approve proposal'
      );
    } finally {
      setPendingProposalId(null);
    }
  };

  const handleApproveInlineProposal = useCallback(
    async (
      proposalId: string,
      approvalParams?: Record<string, unknown>
    ): Promise<AgentApprovalHandoff | null> => {
      setPendingProposalId(proposalId);
      try {
        let approvalProposalId = proposalId;

        const prepareFreshHyperliquidProposal = async () => {
          if (!selectedChat || !isGroup) {
            throw new Error('Open this perps action from the Astro group chat.');
          }

          setAgentStatusText('Preparing perps ticket');
          const prepareResponse: any = await invokeGroupAgent({
            groupId: selectedChat._id,
            agentId: 'astro',
            message: buildHyperliquidOrderPromptFromApprovalParams(
              approvalParams
            ),
          });
          const preparedProposal = prepareResponse?.data?.proposal;
          const responseMessage = prepareResponse?.data?.responseMessage;

          if (preparedProposal?.proposalId) {
            setProposalsById((prev) => ({
              ...prev,
              [preparedProposal.proposalId]: preparedProposal,
            }));
            return preparedProposal.proposalId as string;
          } else {
            appendMessageIfNew(responseMessage);
            throw new Error(
              'Astro did not return a perps approval ticket. Try sending the order again.'
            );
          }
        };

        if (isLocalHyperliquidProposalId(proposalId)) {
          approvalProposalId = await prepareFreshHyperliquidProposal();
        }

        let response: any;
        try {
          response = await approveAgentAction(approvalProposalId, approvalParams);
        } catch (error) {
          if (
            !isLocalHyperliquidProposalId(proposalId) &&
            isRecoverableHyperliquidProposalError(error) &&
            hasHyperliquidApprovalParams(approvalParams)
          ) {
            approvalProposalId = await prepareFreshHyperliquidProposal();
            response = await approveAgentAction(
              approvalProposalId,
              approvalParams
            );
          } else {
            throw error;
          }
        }
        const approvalResult =
          response?.data?.approvalResult || response?.data?.result || null;
        setActionResultsByProposalId((prev) => ({
          ...prev,
          [proposalId]: {
            proposalId,
            status: 'approved',
            result: approvalResult,
          },
          [approvalProposalId]: {
            proposalId: approvalProposalId,
            status: 'approved',
            result: approvalResult,
          },
        }));
        setProposalsById((prev) => {
          const proposal = prev[approvalProposalId] || prev[proposalId];
          if (!proposal) return prev;
          return {
            ...prev,
            [approvalProposalId]: {
              ...proposal,
              status: 'approved',
              approvalResult,
            },
          };
        });
        return approvalResult;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to approve proposal'
        );
        throw error;
      } finally {
        setPendingProposalId(null);
        setAgentStatusText(null);
      }
    },
    [
      appendMessageIfNew,
      approveAgentAction,
      invokeGroupAgent,
      isGroup,
      selectedChat,
    ]
  );

  const handleInlineActionComplete = useCallback(
    (completion: AgentActionCompletion) => {
      if (!completion.proposalId) return;
      setActionResultsByProposalId((prev) => ({
        ...prev,
        [completion.proposalId!]: {
          proposalId: completion.proposalId!,
          status: completion.status,
          result: null,
        },
      }));
      setProposalsById((prev) => {
        const proposal = prev[completion.proposalId!];
        if (!proposal) return prev;
        return {
          ...prev,
          [completion.proposalId!]: {
            ...proposal,
            status: completion.status,
          },
        };
      });
    },
    []
  );

  const handleRejectProposal = async (proposalId: string) => {
    setPendingProposalId(proposalId);
    try {
      if (isLocalHyperliquidProposalId(proposalId)) {
        setActionResultsByProposalId((prev) => ({
          ...prev,
          [proposalId]: {
            proposalId,
            status: 'rejected',
          },
        }));
        toast.success('Proposal rejected');
        return;
      }

      await rejectAgentAction(proposalId);
      setActionResultsByProposalId((prev) => ({
        ...prev,
        [proposalId]: {
          proposalId,
          status: 'rejected',
        },
      }));
      toast.success('Proposal rejected');
    } catch (error) {
      if (isAgentProposalNotFoundError(error)) {
        setActionResultsByProposalId((prev) => ({
          ...prev,
          [proposalId]: {
            proposalId,
            status: 'rejected',
          },
        }));
        toast.success('Proposal dismissed');
        return;
      }

      toast.error(
        error instanceof Error ? error.message : 'Failed to reject proposal'
      );
    } finally {
      setPendingProposalId(null);
    }
  };

  const handleDismissReceipt = useCallback((receiptId: string) => {
    setDismissedReceiptIds((prev) => {
      const next = new Set(prev);
      next.add(receiptId);
      return next;
    });
  }, []);

  const polymarketIntentMarkets = getPolymarketIntentMarkets(messages);
  const syntheticPolymarketOrderSourceTexts = useMemo(
    () =>
      new Set(
        messages
          .map(
            (message) =>
              message.agentData?.metadata?.polymarketOrderPrefill?.sourceText
          )
          .map(normalizePolymarketOrderSourceText)
          .filter(Boolean)
      ),
    [messages]
  );
  const syntheticFundingOnrampSourceTexts = useMemo(
    () =>
      new Set(
        messages
          .map((message) => message.agentData?.metadata?.fundingOnramp?.sourceText)
          .map(normalizeFundingOnrampSourceText)
          .filter(Boolean)
      ),
    [messages]
  );
  const renderedReceiptIdentityKeys = useMemo(() => {
    const keys = new Set<string>();
    messages.forEach((message) => {
      messageReceiptIdentityKeys(message).forEach((key) => keys.add(key));
    });
    return keys;
  }, [messages]);

  if (!selectedChat) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center bg-[#08090b]">
        <div className="dm-rise max-w-sm text-center">
          <div className="dm-mono mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[16px] border border-[#3fe08f]/30 bg-black text-xl font-bold text-[#3fe08f] shadow-[inset_0_0_18px_rgba(63,224,143,0.12)]">
            $_
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#eceef2]">
            Swop Messages
          </h2>
          <p className="mt-2 text-sm text-[#9396a0]">
            Pick Astro Trading Desk, or create a group and mention @astro.
          </p>
        </div>
      </div>
    );
  }

  // USE currentGroupData instead of selectedChat for display
  const displayChat = isGroup ? currentGroupData : selectedChat;
  const smartsiteHref = !isGroup ? getSmartsiteHref(displayChat) : null;
  const smartsiteAnchorAttrs = smartsiteHref
    ? getSmartsiteAnchorAttrs(smartsiteHref)
    : null;
  const handleSmartsiteClick = (
    event: ReactMouseEvent<HTMLAnchorElement>
  ) => {
    if (!smartsiteHref || isExternalSmartsiteHref(smartsiteHref)) return;
    event.preventDefault();
    router.push(smartsiteHref);
  };
  const activeGroupAgents = (displayChat?.botUsers || []).filter(
    (agent) => agent.agentId && agent.isActive !== false
  );
  const isSecureAstroDesk =
    isAstroTradingDeskChat(displayChat, isGroup);
  const headerTitle = isSecureAstroDesk
    ? 'Astro'
    : isGroup
    ? displayChat?.name || 'Group'
    : displayChat?.microsite?.name || 'Contact';
  const headerSubtitle = isSecureAstroDesk
    ? '@astro - online - session #4a2'
    : isGroup
    ? formatGroupParticipants(displayChat?.participants)
    : displayChat?.microsite?.ens || 'swop contact';
  const composerCommandText = newMessage.trimStart();
  const composerCommandQuery = composerCommandText.startsWith('/')
    ? composerCommandText.slice(1).split(/\s+/)[0].toLowerCase()
    : '';
  const composerCommandHasArguments = /^\/\S+\s+\S/.test(
    composerCommandText
  );
  const filteredCommandSuggestions = composerCommandText.startsWith('/')
    ? CHAT_COMMAND_SUGGESTIONS.filter((suggestion) =>
        suggestion.command.slice(1).startsWith(composerCommandQuery)
      )
    : [];
  const showCommandPalette =
    filteredCommandSuggestions.length > 0 && !composerCommandHasArguments;

  const typingText =
    isGroup && typingUsers.size > 0
      ? Array.from(typingUsers.values())
          .map((user) => user.name)
          .join(', ') + ' is typing...'
      : isTyping
      ? 'typing...'
      : null;

  function formatGroupParticipants(
    participants?: Participant[]
  ): string {
    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return 'No members';
    }

    const memberNames = participants
      .map((participant) => {
        const user = participant.userId;
        if (user && user.name) return user.name;
        return 'Unknown User';
      })
      .filter((name) => name !== 'Unknown User');

    if (memberNames.length === 0) {
      return 'No member names available';
    }

    return memberNames.join(', ');
  }

  return (
    <div className="flex min-w-0 flex-1 bg-[#08090b]">
      <div className="flex min-w-0 flex-1 flex-col bg-[#08090b]">
        <div className="flex h-[80px] flex-shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] bg-[#0b0d10] px-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <ChatAvatar
              displayChat={displayChat}
              isGroup={isGroup}
              isAstro={isSecureAstroDesk}
              smartsiteHref={smartsiteHref}
              onSmartsiteClick={handleSmartsiteClick}
            />

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2.5">
                {smartsiteAnchorAttrs && !isSecureAstroDesk ? (
                  <a
                    {...smartsiteAnchorAttrs}
                    onClick={handleSmartsiteClick}
                    className="min-w-0 truncate text-left text-[19px] font-semibold leading-none text-[#eceef2] hover:text-[#3fe08f]"
                    title="Open SmartSite"
                  >
                    {headerTitle}
                  </a>
                ) : (
                  <h3 className="min-w-0 truncate text-left text-[19px] font-semibold leading-none text-[#eceef2]">
                    {headerTitle}
                  </h3>
                )}
                {activeGroupAgents.length > 0 && (
                  <span className="dm-mono rounded-[6px] border border-[#3fe08f]/30 bg-[#3fe08f]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
                    AGENT
                  </span>
                )}
              </div>
              {smartsiteAnchorAttrs && !isSecureAstroDesk ? (
                <a
                  {...smartsiteAnchorAttrs}
                  onClick={handleSmartsiteClick}
                  className="dm-mono mt-2 block max-w-full truncate text-left text-[12px] font-semibold text-[#5a5e69] hover:text-[#3fe08f]"
                  title="Open SmartSite"
                >
                  {headerSubtitle}
                </a>
              ) : (
                <p className="dm-mono mt-2 truncate text-[12px] font-semibold text-[#5a5e69]">
                  {headerSubtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-3">
            {isGroup && displayChat && (
              <div>
                <GroupMenu
                  group={displayChat as any}
                  socket={socket}
                  currentUser={currentUser}
                  onGroupUpdate={() => {
                    loadMessages(1, true);
                  }}
                  onLeaveGroup={onLeaveGroup}
                />
              </div>
            )}
            {!isGroup && (
              <button
                type="button"
                title="Commands"
                onClick={handleComposerCommandButton}
                className="dm-btn grid h-11 w-11 place-items-center rounded-[13px] border border-white/[0.07] bg-[#101217] text-[#9396a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            )}
            <button
              type="button"
              title="PnL command"
              onClick={() => applyComposerCommand('/pnl ')}
              className="dm-btn grid h-11 w-11 place-items-center rounded-[13px] border border-white/[0.07] bg-[#101217] text-[#9396a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <Clock3 className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              title="Internet search command"
              onClick={() => applyComposerCommand('/search ')}
              className="dm-btn grid h-11 w-11 place-items-center rounded-[13px] border border-white/[0.07] bg-[#101217] text-[#9396a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <Grid2X2 className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {isGroup && displayChat && (
          <GroupAgentControls
            activeAgents={activeGroupAgents}
            agentError={agentError}
            availableAgents={availableAgents}
            isLoadingAgents={isLoadingAgents}
            mutationAgentId={agentMutationId}
            onAddAgent={handleAddAgent}
            onMentionAgent={handleMentionAgent}
            onRemoveAgent={handleRemoveAgent}
          />
        )}

        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="dm-scroll min-h-0 flex-1 overflow-y-auto px-[22px] py-[14px]"
        >
          <div
            ref={messagesContentRef}
            className="mx-auto max-w-[760px] space-y-2"
          >
            {isLoadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#9396a0]" />
              </div>
            )}

            {!hasMoreMessages && messages.length > 0 && (
              <div className="flex justify-center py-2">
                <p className="dm-mono rounded-full border border-white/[0.07] bg-black px-3 py-1 text-[10px] font-semibold text-[#5a5e69]">
                  no more messages
                </p>
              </div>
            )}

            {(() => {
              let marketsSeenInRender: PolymarketMarketPreview[] = [];
              const renderedSyntheticOrderSourceTexts = new Set(
                syntheticPolymarketOrderSourceTexts
              );
              const renderedSyntheticFundingSourceTexts = new Set(
                syntheticFundingOnrampSourceTexts
              );

              return messages.map((message, index) => {
              const messagePolymarketMarkets =
                message.agentData?.metadata?.toolExecution?.markets || [];
              if (messagePolymarketMarkets.length > 0) {
                marketsSeenInRender = mergePolymarketMarkets(
                  marketsSeenInRender,
                  messagePolymarketMarkets
                );
              }

              if (isSyntheticPolymarketPrepareMessage(message)) return null;
              const isAgentMessage = isAgentLikeMessage(message);
              if (
                isAgentMessage &&
                isGenericAstroOnlineText(message.message)
              ) {
                return null;
              }
              if (isAgentMessage && !isNamedAgentMessage(message)) {
                return null;
              }
              if (shouldHideHyperliquidMarketReadAfterOrder(message, messages)) {
                return null;
              }
              if (
                isAgentMessage &&
                messages.some((candidate, candidateIndex) =>
                  candidateIndex !== index
                    ? shouldPreferNamedPolymarketAgentMessage(
                        message,
                        candidate
                      )
                    : false
                )
              ) {
                return null;
              }

              const receiptId = getReceiptId(
                message.agentData?.metadata?.receipt || undefined
              );
              if (receiptId && dismissedReceiptIds.has(receiptId)) {
                return null;
              }

              const hiddenProposalId = getMessageProposalId(message);
              const hiddenProposal = hiddenProposalId
                ? proposalsById[hiddenProposalId] || proposalFromMessage(message)
                : null;
              const hiddenPolymarketBetKey =
                buildPolymarketBetKeyFromProposal(hiddenProposal);
              const isHiddenInlinePolymarketProposal = Boolean(
                hiddenProposalId &&
                  !message.agentData?.metadata?.receipt &&
                  isInlinePolymarketProposalMessage({
                    message,
                    proposal: hiddenProposal,
                    proposalId: hiddenProposalId,
                    betKey: hiddenPolymarketBetKey,
                    inlineProposalIds,
                    inlineProposalsByBetKey:
                      inlinePolymarketProposalsByBetKey,
                  })
              );
              if (isHiddenInlinePolymarketProposal) {
                return null;
              }

              const senderId =
                message.sender?._id?.toString() || message.sender?._id;
              const isOwn = !isAgentMessage && senderId === currentUser;
              const isOwnOrLocalText =
                isOwn ||
                (!isAgentMessage &&
                  message.messageType === 'text' &&
                  !message.agentSender);
              const proposalId = hiddenProposalId;
              const proposal = proposalId ? hiddenProposal : null;
              const proposalSourceText =
                proposal?.toolType === 'perps.write' ||
                (proposal?.toolType === 'wallet.write' &&
                  (proposal?.action === 'wallet.swap' ||
                    proposal?.action === 'swap_tokens'))
                  ? findPreviousHumanMessageText(messages, index)
                  : undefined;
              const actionResult = proposalId
                ? actionResultsByProposalId[proposalId]
                : undefined;
              const normalizedOrderSource =
                normalizePolymarketOrderSourceText(message.message);
              const normalizedFundingSource =
                normalizeFundingOnrampSourceText(message.message);
              const hasAstroMention = /(?:^|\s)@?astro\b/i.test(
                message.message || ''
              );
              const walletNetworkReply = isOwnOrLocalText
                ? parseWalletSendNetworkReply(message.message)
                : '';
              const pendingWalletSendNetworkIntent =
                walletNetworkReply && message.messageType === 'text'
                  ? findPendingWalletSendNetworkIntent(messages, index)
                  : null;
              const canRenderLocalWalletSend =
                typeof message.message === 'string' &&
                isOwnOrLocalText &&
                !isAgentMessage &&
                message.message.trim().length > 0 &&
                message.messageType === 'text' &&
                hasWalletSendIntent(message.message) &&
                (!isGroup || hasAstroMention || isSecureAstroDesk) &&
                !renderedSyntheticOrderSourceTexts.has(normalizedOrderSource);
              const rawLocalWalletSendIntent = canRenderLocalWalletSend
                ? findWalletSendIntent(message.message)
                : pendingWalletSendNetworkIntent && walletNetworkReply
                ? {
                    params: {
                      ...pendingWalletSendNetworkIntent.params,
                      chain: walletNetworkReply,
                      network: walletNetworkReply,
                    },
                  }
                : null;
              const localWalletSendNetworkOptions =
                getWalletSendNetworkOptions(
                  rawLocalWalletSendIntent,
                  walletPortfolioTokens
                );
              const localWalletSendNeedsNetwork =
                Boolean(rawLocalWalletSendIntent) &&
                !walletSendIntentHasNetwork(rawLocalWalletSendIntent);
              const localWalletSendNetworkPromptMessage =
                rawLocalWalletSendIntent && localWalletSendNeedsNetwork
                  ? buildSyntheticWalletSendNetworkPromptMessage(
                      rawLocalWalletSendIntent,
                      localWalletSendNetworkOptions,
                      message._id || `message-${index}`
                    )
                  : null;
              const localWalletSendIntent =
                rawLocalWalletSendIntent && !localWalletSendNeedsNetwork
                  ? rawLocalWalletSendIntent
                  : null;
              const localWalletSendMessage =
                localWalletSendIntent &&
                !hasMatchingWalletSendProposal(
                  messages,
                  message,
                  localWalletSendIntent
                )
                  ? buildSyntheticWalletSendMessage(
                      localWalletSendIntent,
                      message._id || `message-${index}`
                    )
                  : null;
              if (localWalletSendMessage || localWalletSendNetworkPromptMessage) {
                renderedSyntheticOrderSourceTexts.add(normalizedOrderSource);
              }
              const canRenderLocalFundingOnramp =
                typeof message.message === 'string' &&
                isOwnOrLocalText &&
                !isAgentMessage &&
                message.message.trim().length > 0 &&
                message.messageType === 'text' &&
                (!isGroup || hasAstroMention || isSecureAstroDesk) &&
                !localWalletSendNetworkPromptMessage &&
                !localWalletSendMessage &&
                !renderedSyntheticFundingSourceTexts.has(normalizedFundingSource);
              const localFundingOnrampIntent = canRenderLocalFundingOnramp
                ? findFundingOnrampIntent(message.message)
                : null;
              const localFundingOnrampMessage = localFundingOnrampIntent
                ? buildSyntheticFundingOnrampMessage(
                    localFundingOnrampIntent,
                    message._id || `message-${index}`
                  )
                : null;
              if (localFundingOnrampMessage) {
                renderedSyntheticFundingSourceTexts.add(normalizedFundingSource);
              }
              const canRenderLocalHyperliquidOrder =
                typeof message.message === 'string' &&
                isOwnOrLocalText &&
                !isAgentMessage &&
                message.message.trim().length > 0 &&
                message.messageType === 'text' &&
                (!isGroup || hasAstroMention || isSecureAstroDesk) &&
                !localWalletSendNetworkPromptMessage &&
                !localWalletSendMessage &&
                !renderedSyntheticOrderSourceTexts.has(normalizedOrderSource);
              const hyperliquidPositionReplyCoin = isOwnOrLocalText
                ? parseHyperliquidCoin(message.message)
                : '';
              const pendingHyperliquidPositionIntent =
                hyperliquidPositionReplyCoin && message.messageType === 'text'
                  ? findPendingHyperliquidPositionTpSlIntent(messages, index)
                  : null;
              const rawLocalHyperliquidPositionIntent =
                canRenderLocalHyperliquidOrder &&
                hasHyperliquidOrderIntent(message.message)
                  ? findHyperliquidPositionTpSlIntent(message.message)
                  : pendingHyperliquidPositionIntent &&
                    hyperliquidPositionReplyCoin
                  ? {
                      params: {
                        ...pendingHyperliquidPositionIntent.params,
                        coin: hyperliquidPositionReplyCoin,
                        asset: hyperliquidPositionReplyCoin,
                      },
                    }
                  : null;
              const localHyperliquidPositionOptions =
                rawLocalHyperliquidPositionIntent
                  ? getPerpsPositionPromptOptions(
                      rawLocalHyperliquidPositionIntent,
                      astroConsoleData.perpsAccount?.positions,
                      astroConsoleData.perpsMarkets
                    )
                  : [];
              const localHyperliquidPositionPromptMessage =
                rawLocalHyperliquidPositionIntent &&
                localHyperliquidPositionOptions.length > 1 &&
                !rawLocalHyperliquidPositionIntent.params.coin
                  ? buildSyntheticHyperliquidPositionPromptMessage(
                      rawLocalHyperliquidPositionIntent,
                      localHyperliquidPositionOptions,
                      message._id || `message-${index}`
                    )
                  : null;
              const resolvedHyperliquidPositionIntent =
                rawLocalHyperliquidPositionIntent &&
                localHyperliquidPositionOptions.length === 1
                  ? getPerpsPositionIntentWithOption(
                      rawLocalHyperliquidPositionIntent,
                      localHyperliquidPositionOptions[0]
                    )
                  : null;
              const fallbackHyperliquidOrderIntent =
                rawLocalHyperliquidPositionIntent &&
                localHyperliquidPositionOptions.length === 0 &&
                !astroConsoleData.isPerpsLoading
                  ? getFallbackHyperliquidOrderIntentFromRiskIntent(
                      rawLocalHyperliquidPositionIntent,
                      astroConsoleData.perpsMarkets
                    )
                  : null;
              const localHyperliquidOrderIntent =
                resolvedHyperliquidPositionIntent ||
                fallbackHyperliquidOrderIntent ||
                (canRenderLocalHyperliquidOrder &&
                hasHyperliquidOrderIntent(message.message)
                  ? findHyperliquidOrderIntent(message.message)
                  : null);
              const localHyperliquidOrderMessage =
                localHyperliquidOrderIntent &&
                !hasMatchingHyperliquidProposal(
                  messages,
                  message,
                  localHyperliquidOrderIntent
                )
                ? buildSyntheticHyperliquidOrderMessage(
                    localHyperliquidOrderIntent,
                    message._id || `message-${index}`
                  )
                : null;
              if (
                localHyperliquidOrderMessage ||
                localHyperliquidPositionPromptMessage
              ) {
                renderedSyntheticOrderSourceTexts.add(normalizedOrderSource);
              }
              const localHyperliquidProposalId =
                localHyperliquidOrderMessage
                  ? getMessageProposalId(localHyperliquidOrderMessage)
                  : null;
              const canRenderLocalPolymarketOrder =
                typeof message.message === 'string' &&
                isOwnOrLocalText &&
                !isAgentMessage &&
                message.message.trim().length > 0 &&
                message.messageType === 'text' &&
                hasPolymarketWriteIntent(message.message) &&
                (!isGroup || hasAstroMention || isSecureAstroDesk) &&
                !localWalletSendMessage &&
                !localHyperliquidPositionPromptMessage &&
                !localHyperliquidOrderMessage &&
                !renderedSyntheticOrderSourceTexts.has(normalizedOrderSource);
              const localPolymarketOrderIntent = canRenderLocalPolymarketOrder
                ? findPolymarketOrderIntent(
                    message.message,
                    marketsSeenInRender.length > 0
                      ? marketsSeenInRender
                      : polymarketIntentMarkets
                  )
                : null;
              const localPolymarketOrderMessage = localPolymarketOrderIntent
                ? buildSyntheticPolymarketOrderMessage(
                    localPolymarketOrderIntent,
                    message._id || `message-${index}`
                  )
                : null;
              if (localPolymarketOrderMessage) {
                renderedSyntheticOrderSourceTexts.add(normalizedOrderSource);
              }

              return (
                <Fragment key={message._id || index}>
                  <Message
                    message={message}
                    isOwn={isOwn}
                    isGroup={isGroup}
                    currentUser={currentUser}
                    proposal={proposal}
                    proposalSourceText={proposalSourceText}
                    actionResult={actionResult}
                    isProposalPending={pendingProposalId === proposalId}
                    onApproveProposal={handleApproveProposal}
                    onApproveInlineProposal={handleApproveInlineProposal}
                    onInlineActionComplete={handleInlineActionComplete}
                    onRejectProposal={handleRejectProposal}
                    onPreparePolymarketBet={handlePreparePolymarketBet}
                    onAddPredictionFunds={handleAddPredictionFunds}
                    onAddPerpsFunds={handleAddPerpsFunds}
                    onDismissReceipt={handleDismissReceipt}
                    onRegisterPolymarketMarkets={
                      registerRenderedPolymarketMarkets
                    }
                    pendingPolymarketBetKey={pendingPolymarketBetKey}
                    inlinePolymarketProposalsByBetKey={
                      inlinePolymarketProposalsByBetKey
                    }
                    actionResultsByProposalId={actionResultsByProposalId}
                    pendingProposalId={pendingProposalId}
                    astroConsoleData={astroConsoleData}
                    renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
                  />
                  {localWalletSendNetworkPromptMessage && (
                    <Message
                      message={localWalletSendNetworkPromptMessage}
                      isOwn={false}
                      isGroup={isGroup}
                      currentUser={currentUser}
                      proposal={null}
                      actionResult={undefined}
                      isProposalPending={false}
                      onApproveProposal={handleApproveProposal}
                      onApproveInlineProposal={handleApproveInlineProposal}
                      onInlineActionComplete={handleInlineActionComplete}
                      onRejectProposal={handleRejectProposal}
                      onPreparePolymarketBet={handlePreparePolymarketBet}
                      onAddPredictionFunds={handleAddPredictionFunds}
                      onAddPerpsFunds={handleAddPerpsFunds}
                      onDismissReceipt={handleDismissReceipt}
                      onRegisterPolymarketMarkets={
                        registerRenderedPolymarketMarkets
                      }
                      pendingPolymarketBetKey={pendingPolymarketBetKey}
                      inlinePolymarketProposalsByBetKey={
                        inlinePolymarketProposalsByBetKey
                      }
                      actionResultsByProposalId={actionResultsByProposalId}
                      pendingProposalId={pendingProposalId}
                      astroConsoleData={astroConsoleData}
                      renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
                    />
                  )}
                  {localWalletSendMessage && (
                    <Message
                      message={localWalletSendMessage}
                      isOwn={false}
                      isGroup={isGroup}
                      currentUser={currentUser}
                      proposal={proposalFromMessage(localWalletSendMessage)}
                      actionResult={undefined}
                      isProposalPending={false}
                      onApproveProposal={handleApproveProposal}
                      onApproveInlineProposal={handleApproveInlineProposal}
                      onInlineActionComplete={handleInlineActionComplete}
                      onRejectProposal={handleRejectProposal}
                      onPreparePolymarketBet={handlePreparePolymarketBet}
                      onAddPredictionFunds={handleAddPredictionFunds}
                      onAddPerpsFunds={handleAddPerpsFunds}
                      onDismissReceipt={handleDismissReceipt}
                      onRegisterPolymarketMarkets={
                        registerRenderedPolymarketMarkets
                      }
                      pendingPolymarketBetKey={pendingPolymarketBetKey}
                      inlinePolymarketProposalsByBetKey={
                        inlinePolymarketProposalsByBetKey
                      }
                      actionResultsByProposalId={actionResultsByProposalId}
                      pendingProposalId={pendingProposalId}
                      astroConsoleData={astroConsoleData}
                      renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
                    />
                  )}
                  {localFundingOnrampMessage && (
                    <Message
                      message={localFundingOnrampMessage}
                      isOwn={false}
                      isGroup={isGroup}
                      currentUser={currentUser}
                      proposal={null}
                      actionResult={undefined}
                      isProposalPending={false}
                      onApproveProposal={handleApproveProposal}
                      onApproveInlineProposal={handleApproveInlineProposal}
                      onInlineActionComplete={handleInlineActionComplete}
                      onRejectProposal={handleRejectProposal}
                      onPreparePolymarketBet={handlePreparePolymarketBet}
                      onAddPredictionFunds={handleAddPredictionFunds}
                      onAddPerpsFunds={handleAddPerpsFunds}
                      onDismissReceipt={handleDismissReceipt}
                      onRegisterPolymarketMarkets={
                        registerRenderedPolymarketMarkets
                      }
                      pendingPolymarketBetKey={pendingPolymarketBetKey}
                      inlinePolymarketProposalsByBetKey={
                        inlinePolymarketProposalsByBetKey
                      }
                      actionResultsByProposalId={actionResultsByProposalId}
                      pendingProposalId={pendingProposalId}
                      astroConsoleData={astroConsoleData}
                      renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
                    />
                  )}
                  {localHyperliquidPositionPromptMessage && (
                    <Message
                      message={localHyperliquidPositionPromptMessage}
                      isOwn={false}
                      isGroup={isGroup}
                      currentUser={currentUser}
                      proposal={null}
                      actionResult={undefined}
                      isProposalPending={false}
                      onApproveProposal={handleApproveProposal}
                      onApproveInlineProposal={handleApproveInlineProposal}
                      onInlineActionComplete={handleInlineActionComplete}
                      onRejectProposal={handleRejectProposal}
                      onPreparePolymarketBet={handlePreparePolymarketBet}
                      onAddPredictionFunds={handleAddPredictionFunds}
                      onAddPerpsFunds={handleAddPerpsFunds}
                      onDismissReceipt={handleDismissReceipt}
                      onRegisterPolymarketMarkets={
                        registerRenderedPolymarketMarkets
                      }
                      pendingPolymarketBetKey={pendingPolymarketBetKey}
                      inlinePolymarketProposalsByBetKey={
                        inlinePolymarketProposalsByBetKey
                      }
                      actionResultsByProposalId={actionResultsByProposalId}
                      pendingProposalId={pendingProposalId}
                      astroConsoleData={astroConsoleData}
                      renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
                    />
                  )}
                  {localHyperliquidOrderMessage && (
                    <Message
                      message={localHyperliquidOrderMessage}
                      isOwn={false}
                      isGroup={isGroup}
                      currentUser={currentUser}
                      proposal={proposalFromMessage(localHyperliquidOrderMessage)}
                      actionResult={
                        localHyperliquidProposalId
                          ? actionResultsByProposalId[localHyperliquidProposalId]
                          : undefined
                      }
                      isProposalPending={
                        Boolean(localHyperliquidProposalId) &&
                        pendingProposalId === localHyperliquidProposalId
                      }
                      onApproveProposal={handleApproveProposal}
                      onApproveInlineProposal={handleApproveInlineProposal}
                      onInlineActionComplete={handleInlineActionComplete}
                      onRejectProposal={handleRejectProposal}
                      onPreparePolymarketBet={handlePreparePolymarketBet}
                      onAddPredictionFunds={handleAddPredictionFunds}
                      onAddPerpsFunds={handleAddPerpsFunds}
                      onDismissReceipt={handleDismissReceipt}
                      onRegisterPolymarketMarkets={
                        registerRenderedPolymarketMarkets
                      }
                      pendingPolymarketBetKey={pendingPolymarketBetKey}
                      inlinePolymarketProposalsByBetKey={
                        inlinePolymarketProposalsByBetKey
                      }
                      actionResultsByProposalId={actionResultsByProposalId}
                      pendingProposalId={pendingProposalId}
                      astroConsoleData={astroConsoleData}
                      renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
                    />
                  )}
                  {localPolymarketOrderMessage && (
                    <Message
                      message={localPolymarketOrderMessage}
                      isOwn={false}
                      isGroup={isGroup}
                      currentUser={currentUser}
                      proposal={null}
                      actionResult={undefined}
                      isProposalPending={false}
                      onApproveProposal={handleApproveProposal}
                      onApproveInlineProposal={handleApproveInlineProposal}
                      onInlineActionComplete={handleInlineActionComplete}
                      onRejectProposal={handleRejectProposal}
                      onPreparePolymarketBet={handlePreparePolymarketBet}
                      onAddPredictionFunds={handleAddPredictionFunds}
                      onAddPerpsFunds={handleAddPerpsFunds}
                      onDismissReceipt={handleDismissReceipt}
                      onRegisterPolymarketMarkets={
                        registerRenderedPolymarketMarkets
                      }
                      pendingPolymarketBetKey={pendingPolymarketBetKey}
                      inlinePolymarketProposalsByBetKey={
                        inlinePolymarketProposalsByBetKey
                      }
                      actionResultsByProposalId={actionResultsByProposalId}
                      pendingProposalId={pendingProposalId}
                      astroConsoleData={astroConsoleData}
                      renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
                    />
                  )}
                </Fragment>
              );
              });
            })()}

            {agentStatusText && (
              <div className="flex items-center gap-2 rounded-[10px] border border-white/[0.07] bg-black px-3 py-2 text-sm text-[#9396a0]">
                <Loader2 className="h-4 w-4 animate-spin text-[#3fe08f]" />
                <span>{agentStatusText}</span>
                <span className="typing-dots ml-1 inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3fe08f]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3fe08f]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3fe08f]" />
                </span>
              </div>
            )}

            {typingText && (
              <div className="flex items-center gap-2 text-sm text-[#9396a0]">
                <div className="typing-dots flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#9396a0]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#9396a0]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#9396a0]" />
                </div>
                {typingText}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-white/[0.07] bg-[#0b0d10] px-[22px] pb-[18px] pt-[12px]">
          <div className="relative mx-auto max-w-[980px]">
            <div className="dm-mono mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-bold text-[#5a5e69]">
              <button
                type="button"
                onClick={handleComposerCommandButton}
                className="dm-btn inline-flex items-center gap-2 text-[#3fe08f]"
              >
                <span>/</span>
                <span className="text-[#5a5e69]">commands</span>
              </button>
              <button
                type="button"
                onClick={() => applyComposerCommand('/search ')}
                className="dm-btn inline-flex items-center gap-2"
              >
                <span className="text-[#3fe08f]">/search</span>
                <span>internet</span>
              </button>
              <span>
                <span className="text-[#3fe08f]">@</span> tag a swop.id
              </span>
              <span>Enter send</span>
              <span>Shift+Enter newline</span>
            </div>

            {showCommandPalette && (
              <div className="dm-rise absolute bottom-[calc(100%+12px)] left-0 z-20 w-full max-w-[520px] rounded-[14px] border border-[#3fe08f]/20 bg-[#101217] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
                {filteredCommandSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.command}
                    type="button"
                    onClick={() => applyComposerCommand(suggestion.seed)}
                    className="dm-row flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left"
                  >
                    <span className="dm-mono grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] border border-[#3fe08f]/20 bg-black text-[13px] font-bold text-[#3fe08f]">
                      /
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="dm-mono block text-[13px] font-bold text-[#eceef2]">
                        {suggestion.command}
                      </span>
                      <span className="block truncate text-[11px] font-semibold text-[#737783]">
                        {suggestion.label} - {suggestion.hint}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex min-h-[64px] items-center gap-3 rounded-[18px] border border-white/[0.06] bg-black px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)] focus-within:border-[#3fe08f]/45 focus-within:shadow-[0_0_0_1px_rgba(63,224,143,0.16),0_18px_50px_rgba(0,0,0,0.28)]">
              <span className="dm-mono flex-shrink-0 text-[20px] font-bold leading-none text-[#3fe08f]">
                &gt;
              </span>

              <textarea
                ref={composerInputRef}
                id="chat-message-input"
                name="chatMessage"
                rows={1}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="ask anything - try /search, /send, /swap, /pnl"
                className="dm-mono max-h-28 min-h-[30px] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent pt-[3px] text-[15px] font-semibold leading-[1.65] text-[#eceef2] outline-none placeholder:text-[#4d515b]"
              />

              <button
                type="button"
                onClick={() =>
                  newMessage.trim()
                    ? handleSendMessage()
                    : handleComposerCommandButton()
                }
                className="dm-btn dm-mono inline-flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-[12px] border border-white/[0.07] bg-[#050607] px-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#9396a0] hover:text-[#eceef2]"
              >
                {newMessage.trim() ? (
                  <>
                    <Send className="h-3.5 w-3.5 text-[#3fe08f]" />
                    Send
                  </>
                ) : (
                  '/ CMD'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <DmContextPanel
        key={`${displayChat?._id || 'empty'}-${
          activeGroupAgents.length > 0 ? 'astro' : isGroup ? 'group' : 'contact'
        }`}
        mode={activeGroupAgents.length > 0 ? 'astro' : isGroup ? 'group' : 'contact'}
        displayChat={displayChat}
        activeAgents={activeGroupAgents}
        consoleData={astroConsoleData}
        smartsiteHref={smartsiteHref}
        onSmartsiteClick={handleSmartsiteClick}
        onQuickCommand={applyComposerCommand}
      />
    </div>
  );
}

function ChatAvatar({
  displayChat,
  isGroup,
  isAstro = false,
  smartsiteHref,
  onSmartsiteClick,
}: {
  displayChat: SelectedChat | null;
  isGroup: boolean;
  isAstro?: boolean;
  smartsiteHref?: string | null;
  onSmartsiteClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  if (isAstro) {
    return (
      <DmAgentTile size="h-[50px] w-[50px]" textClassName="text-[18px]" />
    );
  }

  const avatar =
    displayChat?.microsite?.profilePic ||
    displayChat?.participant?.profilePic ||
    displayChat?.settings?.groupInfo?.groupPicture;
  const name = isGroup
    ? displayChat?.name || 'Group'
    : displayChat?.microsite?.name || displayChat?.participant?.name || 'User';

  if (avatar) {
    const content = (
      <>
        <Image
          src={isUrl(avatar) ? avatar : `/images/user_avator/${avatar}@3x.png`}
          alt={name}
          width={80}
          height={80}
          quality={100}
          className="h-10 w-10 rounded-full object-cover"
        />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#08090b] bg-[#3ddc97]" />
      </>
    );

    if (smartsiteHref) {
      return (
        <a
          {...getSmartsiteAnchorAttrs(smartsiteHref)}
          onClick={onSmartsiteClick}
          className="relative flex-shrink-0 rounded-full transition hover:ring-2 hover:ring-[#3fe08f]/45"
          title="Open SmartSite"
        >
          {content}
        </a>
      );
    }

    return (
      <div className="relative flex-shrink-0">
        {content}
      </div>
    );
  }

  if (isGroup) {
    const members = displayChat?.participants?.slice(0, 3) || [];
    return (
      <div className="relative h-10 w-10 flex-shrink-0">
        {members.length ? (
          members.map((participant, index) => {
            const memberName = participant.userId?.name || 'User';
            const colors = ['#2f4256', '#5c4435', '#2f5446'];
            return (
              <div
                key={participant.userId?._id || index}
                className="absolute grid h-[23px] w-[23px] place-items-center rounded-full border-2 border-[#08090b] text-[9px] font-bold text-[#eceef2]"
                style={{
                  left: index * 9,
                  top: index * 6,
                  background: colors[index % colors.length],
                }}
              >
                {getChatInitials(memberName).slice(0, 1)}
              </div>
            );
          })
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-[10px] border border-white/[0.07] bg-[#15171d] text-[#9396a0]">
            <Users className="h-4 w-4" />
          </div>
        )}
      </div>
    );
  }

  const fallbackAvatar = (
    <>
      {getChatInitials(name)}
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#08090b] bg-[#3ddc97]" />
    </>
  );

  if (smartsiteHref) {
    return (
      <a
        {...getSmartsiteAnchorAttrs(smartsiteHref)}
        onClick={onSmartsiteClick}
        className="relative grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[#2f4256] text-[13px] font-bold text-[#eceef2] transition hover:ring-2 hover:ring-[#3fe08f]/45"
        title="Open SmartSite"
      >
        {fallbackAvatar}
      </a>
    );
  }

  return (
    <div className="relative grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[#2f4256] text-[13px] font-bold text-[#eceef2]">
      {fallbackAvatar}
    </div>
  );
}

function DmAgentTile({
  size = 'h-[34px] w-[34px]',
  textClassName = 'text-[12px]',
}: {
  size?: string;
  textClassName?: string;
}) {
  return (
    <div
      className={`dm-mono grid ${size} ${textClassName} place-items-center rounded-[10px] border border-[#3fe08f]/30 bg-black font-bold text-[#3fe08f] shadow-[inset_0_0_12px_rgba(63,224,143,0.09)]`}
    >
      $_
    </div>
  );
}

function toFiniteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCompactUsd(value: unknown) {
  const number = toFiniteNumber(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Math.abs(number) >= 1000 ? 0 : 2,
  }).format(number);
}

function formatPredictionShares(value: unknown) {
  const number = toFiniteNumber(value);
  if (number <= 0) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: number >= 100 ? 0 : number >= 10 ? 1 : 2,
  }).format(number);
}

function formatPredictionAmountInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '1';
  return value.toLocaleString('en-US', {
    maximumFractionDigits: value >= 100 ? 0 : 2,
    useGrouping: false,
  });
}

function formatSignedUsd(value: unknown) {
  const number = toFiniteNumber(value);
  const formatted = formatCompactUsd(Math.abs(number));
  if (number > 0) return `+${formatted}`;
  if (number < 0) return `-${formatted}`;
  return '$0';
}

function isOpenPredictionConsolePosition(position: PolymarketPosition) {
  return (
    !position.redeemable &&
    isVisiblePortfolioPosition(position, DUST_THRESHOLD)
  );
}

function formatWholeUsd(value: unknown) {
  const number = Math.trunc(toFiniteNumber(value));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(number);
}

function normalizeSwopIdLabel(
  value?: string | null,
  options: { appendSwopId?: boolean } = {}
) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const withoutAt = trimmed.replace(/^@/, '');
  if (/^[a-f0-9]{24}$/i.test(withoutAt)) return '';
  if (/\.swop\.id$/i.test(withoutAt)) return withoutAt;
  if (options.appendSwopId && /^[a-z0-9_-]+$/i.test(withoutAt)) {
    return `${withoutAt}.swop.id`;
  }
  return '';
}

function getUserSwopIdLabel(...profiles: Array<{
  ensName?: string;
  swopensId?: string;
  primaryMicrosite?: string;
  microsites?: Array<{
    ens?: string;
    name?: string;
    primary?: boolean;
  }>;
} | null | undefined>) {
  for (const profile of profiles) {
    const primaryMicrosite = profile?.microsites?.find(
      (microsite) => microsite.primary === true
    );
    const anyMicrositeWithEns = profile?.microsites?.find(
      (microsite) => Boolean(microsite.ens)
    );
    const label =
      normalizeSwopIdLabel(profile?.ensName, { appendSwopId: true }) ||
      normalizeSwopIdLabel(profile?.swopensId, { appendSwopId: true }) ||
      normalizeSwopIdLabel(profile?.primaryMicrosite, {
        appendSwopId: true,
      }) ||
      normalizeSwopIdLabel(primaryMicrosite?.ens, {
        appendSwopId: true,
      }) ||
      normalizeSwopIdLabel(anyMicrositeWithEns?.ens, {
        appendSwopId: true,
      });
    if (label) return label;
  }
  return 'swop.id';
}

function getInlineOrderStageButtonLabel(stage: OrderSubmissionStage) {
  switch (stage) {
    case 'preparing':
      return 'PREPARING ORDER...';
    case 'signing':
      return 'SIGNING ORDER...';
    case 'submitting':
      return 'SUBMITTING ORDER...';
    default:
      return 'CONFIRMING...';
  }
}

function getInlineOrderStageHint(stage: OrderSubmissionStage) {
  switch (stage) {
    case 'preparing':
      return 'Swop is building the order before signature.';
    case 'signing':
      return 'Signing the confirmed ticket from this card.';
    case 'submitting':
      return 'Your signed order is being sent to Polymarket.';
    default:
      return 'Confirming the order.';
  }
}

function formatUsdCents(value: unknown) {
  const number = Math.abs(toFiniteNumber(value));
  return `.${Math.round((number % 1) * 100)
    .toString()
    .padStart(2, '0')}`;
}

function isProposalNoLongerPendingError(error: unknown) {
  const agentError = error as {
    code?: string;
    message?: string;
    details?: { status?: unknown };
  };
  return (
    agentError?.code === 'AGENT_PROPOSAL_NOT_PENDING' ||
    agentError?.code === 'AGENT_PROPOSAL_EXPIRED' ||
    agentError?.details?.status === 'approved' ||
    agentError?.message?.toLowerCase().includes('no longer pending') ||
    agentError?.message?.toLowerCase().includes('proposal has expired')
  );
}

function DmContextPanel({
  mode,
  displayChat,
  consoleData,
  smartsiteHref,
  onSmartsiteClick,
  onQuickCommand,
}: {
  mode: 'astro' | 'group' | 'contact';
  displayChat?: SelectedChat | null;
  activeAgents?: GroupAgent[];
  consoleData?: AstroConsoleData;
  smartsiteHref?: string | null;
  onSmartsiteClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  onQuickCommand?: (command: string) => void;
}) {
  if (mode === 'astro') {
    const predictionPositions = consoleData?.predictionPositions || [];
    const openPredictionPositions = predictionPositions.filter(
      isOpenPredictionConsolePosition
    );
    const predictionOpenOrders = consoleData?.predictionOpenOrders || [];
    const perpsPositions = consoleData?.perpsAccount?.positions || [];
    const perpsOpenOrders = consoleData?.perpsAccount?.openOrders || [];
    const perpsAccountValue = toFiniteNumber(
      consoleData?.perpsAccount?.accountValue
    );
    const perpsPnl = toFiniteNumber(consoleData?.perpsAccount?.unrealizedPnl);
    const walletPortfolioValue = toFiniteNumber(
      consoleData?.walletPortfolioBalance
    );
    const predictionAvailableUsdc = consoleData?.predictionUsdcBalance || 0;
    const predictionPortfolioUsdc =
      consoleData?.predictionPortfolioUsdcBalance ?? predictionAvailableUsdc;
    const predictionLegacyUsdc = consoleData?.predictionLegacyUsdcBalance || 0;
    const predictionPositionsValue = openPredictionPositions.reduce(
      (sum, position) => sum + toFiniteNumber(position.currentValue),
      0
    );
    const predictionPnl = openPredictionPositions.reduce(
      (sum, position) => sum + toFiniteNumber(position.cashPnl),
      0
    );
    const balances: Array<{
      title: string;
      detail: string;
      value: string;
      delta: string;
      icon: typeof Activity;
      iconClassName: string;
    }> = [
      {
        title: 'Perps',
        detail: `${perpsPositions.length} positions · ${
          perpsOpenOrders.length
        } orders`,
        value: consoleData?.isPerpsLoading
          ? 'Loading'
          : formatCompactUsd(perpsAccountValue),
        delta: formatSignedUsd(perpsPnl),
        icon: Activity,
        iconClassName: 'bg-[#173329] text-[#3fe08f]',
      },
      {
        title: 'Predictions',
        detail:
          predictionLegacyUsdc > 0
            ? `${openPredictionPositions.length} markets · ${formatCompactUsd(
                predictionAvailableUsdc
              )} pUSD · ${formatCompactUsd(predictionLegacyUsdc)} USDC.e`
            : `${openPredictionPositions.length} open markets · ${formatCompactUsd(
                predictionAvailableUsdc
              )} pUSD`,
        value: consoleData?.isPredictionBalanceLoading
          ? 'Loading'
          : formatCompactUsd(
              predictionPortfolioUsdc +
                predictionLegacyUsdc +
                predictionPositionsValue
            ),
        delta: formatSignedUsd(predictionPnl),
        icon: BarChart3,
        iconClassName: 'bg-[#18243f] text-[#6b9bff]',
      },
    ];
    const positions = [
      ...perpsPositions.slice(0, 2).map((position) => {
        const size = toFiniteNumber(position.szi);
        const displayCoin = displayPerpsCoin(position.coin);
        return {
          symbol: `${displayCoin}-PERP`,
          tag: `${size >= 0 ? 'LONG' : 'SHORT'} ${position.leverage?.value || 1}x`,
          pnl: formatSignedUsd(toFiniteNumber(position.unrealizedPnl)),
          positive: toFiniteNumber(position.unrealizedPnl) >= 0,
          predictionPosition: null as PolymarketPosition | null,
          perpsPosition: position as HLPosition,
        };
      }),
      ...openPredictionPositions.slice(0, 2).map((position) => ({
        symbol: position.title || position.slug || 'Prediction',
        tag: position.outcome || 'YES',
        pnl: formatSignedUsd(toFiniteNumber(position.cashPnl)),
        positive: toFiniteNumber(position.cashPnl) >= 0,
        predictionPosition: position,
        perpsPosition: null as HLPosition | null,
      })),
    ].slice(0, 4);
    const pendingOrders = [
      ...perpsOpenOrders.slice(0, 1).map((order) => ({
        type: `${order.orderType || 'LIMIT'} ${order.side === 'B' ? 'BUY' : 'SELL'}`,
        detail: `${order.coin} @ ${order.limitPx || order.triggerPx || 'market'}`,
        status: 'OPEN',
        command: `@astro show ${order.coin} order`,
      })),
      ...predictionOpenOrders.slice(0, 1).map((order) => ({
        type: `${order.order_type || 'ORDER'} ${order.side}`,
        detail: `${order.outcome || 'Prediction'} @ ${formatPolymarketPrice(
          order.price
        )}`,
        status: (order.status || 'OPEN').toUpperCase(),
        command: '@astro show Polymarket orders',
      })),
    ].slice(0, 2);
    const commands = [
      { label: '/search', command: '/search ' },
      { label: '/send', command: '/send ' },
      { label: '/swap', command: '/swap ' },
      { label: '/pnl', command: '/pnl ' },
    ];

    return (
      <>
      <aside className="dm-scroll hidden w-[300px] flex-shrink-0 overflow-y-auto border-l border-white/[0.07] bg-[#0e1014] px-4 py-5 xl:block">
        <div className="mb-5 flex items-center gap-3">
          <DmAgentTile
            size="h-10 w-10"
            textClassName="text-[15px]"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold leading-tight tracking-[-0.02em] text-[#eceef2]">
              Astro console
            </div>
            <div className="dm-mono mt-1.5 inline-flex items-center gap-2 text-[10.5px] font-bold text-[#3ddc97]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc97]" />
              live · session #4a2
            </div>
          </div>
        </div>

        <ConsoleCard padClass="overflow-hidden px-4 pb-3 pt-4">
          <div className="dm-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[#737783]">
            wallet · {consoleData?.walletIdentityLabel || 'swop.id'}
          </div>
          <div className="mt-3 flex items-end gap-1.5">
            {consoleData?.isWalletPortfolioBalanceLoading ? (
              <span className="dm-mono text-[20px] font-semibold leading-none text-[#eceef2]">
                Loading
              </span>
            ) : (
              <>
                <span className="dm-mono text-[27px] font-semibold leading-none tracking-[-0.04em] text-[#eceef2]">
                  {formatWholeUsd(walletPortfolioValue)}
                </span>
                <span className="dm-mono pb-0.5 text-[16px] font-semibold leading-none tracking-[-0.03em] text-[#737783]">
                  {formatUsdCents(walletPortfolioValue)}
                </span>
              </>
            )}
          </div>
          <div className="dm-mono mt-2 flex items-center gap-2 text-[11px] font-bold">
            <span className="text-[#3ddc97]">$0</span>
            <span className="text-[#5a5e69]">· 7d</span>
          </div>
          <div className="mt-3">
            <ConsoleSparkline />
          </div>
        </ConsoleCard>

        <SectionLabel>balances</SectionLabel>
        <ConsoleCard padClass="p-0">
          {balances.map((item) => {
            const BalanceIcon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                disabled={!onQuickCommand}
                onClick={() =>
                  onQuickCommand?.(
                    item.title === 'Perps'
                      ? '@astro show Hyperliquid positions'
                      : '@astro show Polymarket positions'
                  )
                }
                className="dm-btn flex w-full items-center gap-3 border-t border-white/[0.045] px-3 py-3 text-left first:border-t-0 disabled:cursor-default"
              >
                <span
                  className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] ${item.iconClassName}`}
                >
                  <BalanceIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold leading-tight text-[#eceef2]">
                    {item.title}
                  </span>
                  <span className="dm-mono mt-1 block truncate text-[10px] font-semibold text-[#5a5e69]">
                    {item.detail}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="dm-mono block text-[12px] font-semibold leading-tight text-[#eceef2]">
                    {item.value}
                  </span>
                  <span className="dm-mono mt-1 block text-[10px] font-bold leading-tight text-[#3ddc97]">
                    {item.delta}
                  </span>
                </span>
              </button>
            );
          })}
        </ConsoleCard>

        <SectionLabel>open positions · {positions.length}</SectionLabel>
        <ConsoleCard padClass="p-0">
          {positions.length ? positions.map((position) => (
              <div key={position.symbol} className="border-t border-white/[0.045] first:border-t-0">
                <div className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left">
                  <span className="min-w-0">
                    <span className="dm-mono block truncate text-[12px] font-semibold leading-tight text-[#eceef2]">
                      {position.symbol}
                    </span>
                    <span className="dm-mono mt-1 inline-flex rounded-[5px] border border-[#3fe08f]/15 bg-black/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#3fe08f]">
                      {position.tag}
                    </span>
                  </span>
                  <span
                    className={`dm-mono shrink-0 text-[12px] font-bold ${
                      position.positive ? 'text-[#3ddc97]' : 'text-[#ff5d63]'
                    }`}
                  >
                    {position.pnl}
                  </span>
                </div>
              </div>
            )) : (
            <div className="px-3 py-3 text-[11px] text-[#737783]">
              No open trading positions yet.
            </div>
          )}
        </ConsoleCard>

        <SectionLabel>pending orders · {pendingOrders.length}</SectionLabel>
        <ConsoleCard padClass="p-0">
          {pendingOrders.length ? pendingOrders.map((order) => (
            <button
              key={order.detail}
              type="button"
              disabled={!onQuickCommand}
              onClick={() => onQuickCommand?.(order.command)}
              className="dm-btn flex w-full items-center justify-between gap-3 border-t border-white/[0.045] px-3 py-3 text-left first:border-t-0 disabled:cursor-default"
            >
              <span className="min-w-0">
                <span className="dm-mono block text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#9396a0]">
                  {order.type}
                </span>
                <span className="dm-mono mt-1 block truncate text-[12px] font-semibold text-[#eceef2]">
                  {order.detail}
                </span>
              </span>
              <span className="dm-mono shrink-0 rounded-[6px] bg-[#3ddc97]/12 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#3ddc97]">
                {order.status}
              </span>
            </button>
          )) : (
            <div className="px-3 py-3 text-[11px] text-[#737783]">
              No pending orders.
            </div>
          )}
        </ConsoleCard>

        <SectionLabel>quick commands</SectionLabel>
        <div className="grid grid-cols-2 gap-2 pb-3">
          {commands.map((command) => (
            <button
              key={command.label}
              type="button"
              disabled={!onQuickCommand}
              onClick={() => onQuickCommand?.(command.command)}
              className="dm-btn dm-mono flex h-[40px] items-center justify-center gap-2 rounded-[10px] border border-white/[0.07] bg-[#15171d] text-[12px] font-semibold text-[#eceef2] disabled:cursor-default"
            >
              <span className="text-[#3fe08f]">›</span>
              {command.label}
            </button>
          ))}
        </div>
      </aside>
      </>
    );
  }

  const members = displayChat?.participants || [];
  const title =
    mode === 'group'
      ? displayChat?.name || 'Group'
      : displayChat?.microsite?.name || displayChat?.participant?.name || 'Contact';
  const handle =
    mode === 'group'
      ? `${members.length} members`
      : displayChat?.microsite?.ens || 'swop contact';

  return (
    <aside className="dm-scroll hidden w-[300px] flex-shrink-0 overflow-y-auto border-l border-white/[0.07] bg-[#0e1014] p-4 xl:block">
      <div className="flex flex-col items-center px-2 pb-4 pt-2 text-center">
        {mode === 'group' ? (
          <div className="mb-2 grid h-14 w-14 place-items-center rounded-[14px] border border-white/[0.07] bg-[#15171d] text-[#9396a0]">
            <Users className="h-6 w-6" />
          </div>
        ) : (
          <div className="mb-2 grid h-14 w-14 place-items-center rounded-full bg-[#2f4256] text-base font-bold text-[#eceef2]">
            {getChatInitials(title)}
          </div>
        )}
        <div className="max-w-full truncate text-[17px] font-semibold tracking-[-0.02em] text-[#eceef2]">
          {title}
        </div>
        <div className="dm-mono mt-1 max-w-full truncate text-[11.5px] text-[#9396a0]">
          {handle}
        </div>
        <div className="mt-3 flex gap-2">
          {[
            [Zap, 'Pay'],
            [BarChart3, 'Market'],
          ].map(([Icon, label]) => {
            const PanelIcon = Icon as typeof Zap;
            return (
              <button
                key={label as string}
                type="button"
                className="dm-btn flex flex-col items-center gap-1 rounded-[11px] border border-white/[0.07] bg-[#15171d] px-3 py-2 text-[10.5px] font-semibold text-[#eceef2]"
              >
                <PanelIcon className="h-4 w-4 text-[#3fe08f]" />
                {label as string}
              </button>
            );
          })}
          {smartsiteHref ? (
            <a
              {...getSmartsiteAnchorAttrs(smartsiteHref)}
              onClick={onSmartsiteClick}
              className="dm-btn flex flex-col items-center gap-1 rounded-[11px] border border-white/[0.07] bg-[#15171d] px-3 py-2 text-[10.5px] font-semibold text-[#eceef2]"
              title="Open SmartSite"
            >
              <UserRound className="h-4 w-4 text-[#3fe08f]" />
              Profile
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="dm-btn flex flex-col items-center gap-1 rounded-[11px] border border-white/[0.07] bg-[#15171d] px-3 py-2 text-[10.5px] font-semibold text-[#eceef2] opacity-60"
            >
              <UserRound className="h-4 w-4 text-[#3fe08f]" />
              Profile
            </button>
          )}
        </div>
      </div>

      <SectionLabel>{mode === 'group' ? `members · ${members.length}` : 'thread'}</SectionLabel>
      <ConsoleCard padClass="p-0">
        {mode === 'group' && members.length ? (
          members.slice(0, 8).map((participant, index) => {
            const memberName = participant.userId?.name || 'Unknown';
            return (
              <div
                key={participant.userId?._id || index}
                className="flex items-center gap-2 border-t border-white/[0.045] px-3 py-2.5 first:border-t-0"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-[#2f4256] text-[10px] font-bold text-[#eceef2]">
                  {getChatInitials(memberName).slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-[#eceef2]">
                    {memberName}
                  </div>
                  <div className="dm-mono text-[10px] text-[#5a5e69]">
                    {participant.role || 'member'}
                  </div>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc97]" />
              </div>
            );
          })
        ) : (
          <div className="px-3 py-3 text-xs text-[#9396a0]">
            Messages stay in Swop chat. Agent actions appear as approval cards
            when Astro is in a group.
          </div>
        )}
      </ConsoleCard>
    </aside>
  );
}

function ConsoleSparkline() {
  return (
    <svg
      viewBox="0 0 260 54"
      aria-hidden="true"
      className="h-[54px] w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id="astro-console-spark-fill"
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="#3ddc97"
            stopOpacity="0.28"
          />
          <stop
            offset="100%"
            stopColor="#3ddc97"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path
        d="M0 42 C28 39 53 41 81 35 C108 28 135 29 161 27 C188 24 213 18 240 20 C252 21 260 18 260 18 L260 54 L0 54 Z"
        fill="url(#astro-console-spark-fill)"
      />
      <path
        d="M0 42 C28 39 53 41 81 35 C108 28 135 29 161 27 C188 24 213 18 240 20 C252 21 260 18 260 18"
        fill="none"
        stroke="#3ddc97"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function ConsoleCard({
  children,
  padClass = 'p-3.5',
}: {
  children: ReactNode;
  padClass?: string;
}) {
  return (
    <div
      className={`mb-1.5 rounded-[16px] border border-white/[0.07] bg-[#15171d] ${padClass}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-0.5 pb-2 pt-3">
      <div className="dm-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#5a5e69]">
        {children}
      </div>
    </div>
  );
}

function getChatInitials(name?: string) {
  const parts = (name || 'SW')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

// ==================== MESSAGE COMPONENT ====================

interface MessageProps {
  message: Message;
  isOwn: boolean;
  isGroup: boolean;
  currentUser: string;
  proposal?: AgentActionProposal | null;
  proposalSourceText?: string;
  actionResult?: AgentActionResultPayload;
  isProposalPending?: boolean;
  onApproveProposal: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => void;
  onApproveInlineProposal: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onRejectProposal: (proposalId: string) => void;
  onPreparePolymarketBet: (
    prompt: string,
    betKey: string
  ) => Promise<AgentActionProposal | null>;
  onAddPredictionFunds: () => void;
  onAddPerpsFunds: () => void;
  onDismissReceipt: (receiptId: string) => void;
  onRegisterPolymarketMarkets: (markets: PolymarketMarketPreview[]) => void;
  pendingPolymarketBetKey?: string | null;
  inlinePolymarketProposalsByBetKey?: Record<string, AgentActionProposal>;
  actionResultsByProposalId?: Record<string, AgentActionResultPayload>;
  pendingProposalId?: string | null;
  astroConsoleData: AstroConsoleData;
  renderedReceiptIdentityKeys: Set<string>;
}

function Message({
  message,
  isOwn,
  isGroup,
  currentUser,
  proposal,
  proposalSourceText,
  actionResult,
  isProposalPending = false,
  onApproveProposal,
  onApproveInlineProposal,
  onInlineActionComplete,
  onRejectProposal,
  onPreparePolymarketBet,
  onAddPredictionFunds,
  onAddPerpsFunds,
  onDismissReceipt,
  onRegisterPolymarketMarkets,
  pendingPolymarketBetKey,
  inlinePolymarketProposalsByBetKey = {},
  actionResultsByProposalId = {},
  pendingProposalId = null,
  astroConsoleData,
  renderedReceiptIdentityKeys,
}: MessageProps) {
  const isAgent = isAgentLikeMessage(message);
  const isUnnamedAgent = isAgent && !isNamedAgentMessage(message);
  const proposalId = proposal?.proposalId || getMessageProposalId(message);
  const polymarketMarkets = useMemo(
    () => message.agentData?.metadata?.toolExecution?.markets || [],
    [message.agentData?.metadata?.toolExecution?.markets]
  );
  const polymarketPositions =
    message.agentData?.metadata?.toolExecution?.positions || [];
  const polymarketOrderPrefill =
    message.agentData?.metadata?.polymarketOrderPrefill || null;
  const fundingOnramp =
    message.agentData?.metadata?.fundingOnramp || null;
  const marketplaceItems =
    message.agentData?.metadata?.toolExecution?.items || [];
  const walletReceive =
    message.agentData?.metadata?.toolExecution?.walletReceive || null;
  const perpsPositions =
    message.agentData?.metadata?.toolExecution?.perpsPositions || null;
  const walletSendNetworkPrompt =
    message.agentData?.metadata?.walletSendNetworkPrompt || null;
  const perpsPositionPrompt =
    message.agentData?.metadata?.perpsPositionPrompt || null;
  const researchSources =
    message.agentData?.metadata?.toolExecution?.sources || [];
  const sportsResearch =
    message.agentData?.metadata?.toolExecution?.sportsResearch || null;
  const researchQuery =
    message.agentData?.metadata?.toolExecution?.query || null;
  const researchCheckedAt =
    message.agentData?.metadata?.toolExecution?.checkedAt || null;
  const receipt = message.agentData?.metadata?.receipt || null;
  const hasAgentReceipt = isAgent && Boolean(receipt);
  const researchPolymarketQuery = useMemo(
    () =>
      extractPolymarketOddsQueryFromResearch(
        message.message,
        researchQuery
      ),
    [message.message, researchQuery]
  );
  const shouldResolveResearchToPolymarket =
    isAgent &&
    researchSources.length > 0 &&
    Boolean(researchPolymarketQuery) &&
    /\b(odds|predictions?|bets?|betting|champion|championship|finals|futures?|game\s*\d+|moneyline|spread|total)\b/i.test(
      `${message.message || ''} ${researchQuery || ''}`
    );
  const {
    data: researchPolymarketMarkets = [],
    isLoading: isLoadingResearchPolymarketMarkets,
  } = useQuery({
    queryKey: [
      'chat-research-polymarket-markets',
      researchPolymarketQuery,
    ],
    queryFn: async () => {
      const params = buildPolymarketResearchMarketParams(
        researchPolymarketQuery,
        `${message.message || ''} ${researchQuery || ''}`
      );
      const response = await fetch(
        `/api/polymarket/desktop/markets?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to load odds markets');
      const markets = (await response.json().catch(() => [])) as unknown[];
      return markets
        .map(normalizePolymarketMarketPreview)
        .filter((market): market is PolymarketMarketPreview => Boolean(market));
    },
    enabled: shouldResolveResearchToPolymarket,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const polymarketQueryContext = useMemo(
    () =>
      [researchPolymarketQuery, researchQuery]
        .filter(Boolean)
        .join(' '),
    [researchPolymarketQuery, researchQuery]
  );
  const polymarketDetectionContext = useMemo(
    () =>
      [polymarketQueryContext, message.message]
        .filter(Boolean)
        .join(' '),
    [message.message, polymarketQueryContext]
  );
  const rawDisplayPolymarketMarkets =
    polymarketMarkets.length > 0
      ? polymarketMarkets
      : researchPolymarketMarkets;
  const displayPolymarketMarkets = useMemo(
    () =>
      filterPolymarketMarketsForQuery(
        rawDisplayPolymarketMarkets,
        polymarketQueryContext,
        polymarketDetectionContext
      ),
    [
      polymarketDetectionContext,
      polymarketQueryContext,
      rawDisplayPolymarketMarkets,
    ]
  );
  const hasAgentMarkets = isAgent && displayPolymarketMarkets.length > 0;
  const shouldHideUnnamedPolymarketAgent =
    isUnnamedAgent && (hasAgentMarkets || shouldResolveResearchToPolymarket);
  const hasAgentPolymarketPositions =
    isAgent && polymarketPositions.length > 0;
  const hasAgentMarketplaceItems = isAgent && marketplaceItems.length > 0;
  const hasAgentFundingOnramp = isAgent && Boolean(fundingOnramp);
  const hasAgentWalletReceive = isAgent && Boolean(walletReceive?.address);
  const hasAgentPerpsPositions = isAgent && Boolean(perpsPositions);
  const hasAgentWalletSendNetworkPrompt =
    isAgent && Boolean(walletSendNetworkPrompt);
  const hasAgentPerpsPositionPrompt =
    isAgent && Boolean(perpsPositionPrompt);
  const hasAgentResearchSources = isAgent && researchSources.length > 0;
  const hasAgentSportsResearch =
    isAgent && Boolean(sportsResearch?.groups?.some((group) => group.items?.length));
  const showResearchSources =
    hasAgentResearchSources &&
    !hasAgentSportsResearch &&
    (!shouldResolveResearchToPolymarket ||
      (!isLoadingResearchPolymarketMarkets &&
        displayPolymarketMarkets.length === 0));
  const hasAgentRichContent =
    isAgent &&
    (hasAgentMarkets ||
      hasAgentPolymarketPositions ||
      hasAgentFundingOnramp ||
      hasAgentMarketplaceItems ||
      hasAgentWalletReceive ||
      hasAgentPerpsPositions ||
      hasAgentWalletSendNetworkPrompt ||
      hasAgentPerpsPositionPrompt ||
      hasAgentSportsResearch ||
      hasAgentResearchSources ||
      shouldResolveResearchToPolymarket ||
      Boolean(proposalId) ||
      hasAgentReceipt);
  const status = actionResult?.status || proposal?.status || 'pending';
  const initiatingUserId = getObjectId(proposal?.initiatingUserId);
  const canAct = !initiatingUserId || initiatingUserId === currentUser;
  const isPolymarketProposal =
    proposal?.toolType === 'prediction.write' &&
    (proposal?.action === 'prediction.prepare_order' ||
      proposal?.action === 'prediction.submit_order');

  useEffect(() => {
    if (
      isAgent &&
      !shouldHideUnnamedPolymarketAgent &&
      displayPolymarketMarkets.length > 0
    ) {
      onRegisterPolymarketMarkets(displayPolymarketMarkets);
    }
  }, [
    displayPolymarketMarkets,
    isAgent,
    onRegisterPolymarketMarkets,
    shouldHideUnnamedPolymarketAgent,
  ]);

  const showMessageText =
    !hasAgentRichContent &&
    !hasAgentResearchSources &&
    (!isPolymarketProposal || !isGenericAgentProposalText(message.message));
  const isInlinePolymarketProposal = Boolean(
    proposalId &&
      isInlinePolymarketProposalMessage({
        message,
        proposal,
        proposalId,
        betKey: buildPolymarketBetKeyFromProposal(proposal),
        inlineProposalIds: new Set(),
        inlineProposalsByBetKey: inlinePolymarketProposalsByBetKey,
      })
  );
  const polymarketOrderProposalId = polymarketOrderPrefill?.marketKey
    ? inlinePolymarketProposalsByBetKey[polymarketOrderPrefill.marketKey]
        ?.proposalId
    : '';
  const hasRenderedPolymarketOrderReceipt = Boolean(
    polymarketOrderProposalId &&
      renderedReceiptIdentityKeys.has(`proposal:${polymarketOrderProposalId}`)
  );

  if (shouldHideUnnamedPolymarketAgent || hasRenderedPolymarketOrderReceipt) {
    return null;
  }

  return (
    <div
      className={`dm-rise mb-2 flex ${
        isOwn ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex flex-col ${
          isOwn ? 'items-end' : 'items-start'
        } ${
          hasAgentRichContent
            ? 'w-full min-w-0 max-w-[460px]'
            : 'max-w-[74%] md:max-w-[680px]'
        }`}
      >
        <div
          className={`${
            hasAgentRichContent
                ? 'p-0'
                : `px-[13px] py-[9px] ${
                  isOwn
                    ? 'dm-mono rounded-[14px] rounded-tr-[6px] border border-[#43e58f] bg-[#43e58f] text-[#06120b] shadow-[0_18px_45px_rgba(63,224,143,0.16)]'
                    : isAgent
                    ? `${AGENT_TERMINAL_BUBBLE_CLASS} rounded-tl-md`
                    : 'dm-mono rounded-[14px] rounded-tl-[6px] border border-white/[0.07] bg-[#15171d] text-[#eceef2]'
                }`
          } ${message.status === 'failed' ? 'opacity-50' : ''}`}
        >
          {isGroup && !isOwn && (
            <div
              className={`mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold ${
                isAgent ? 'text-[#3fe08f]' : 'text-[#9396a0]'
              }`}
            >
              {isAgent ? (
                <Bot className="h-3.5 w-3.5" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-[#3fe08f]" />
              )}
              <span>
                {isAgent
                  ? message.agentSender?.displayName || 'Agent'
                  : message.sender?.name || 'Unknown'}
              </span>
            </div>
          )}
          {showMessageText && (
            <div
              className={
                hasAgentRichContent
                  ? `${AGENT_TERMINAL_BUBBLE_CLASS} mb-2 break-words`
                  : isOwn
                  ? 'dm-mono break-words text-[13.5px] font-semibold leading-[1.6]'
                  : 'dm-mono break-words text-[14px] font-semibold leading-[1.65]'
              }
            >
              {message.message}
            </div>
          )}
          {hasAgentReceipt && receipt && (
            <AgentActionReceiptCard
              receipt={receipt}
              onDone={() => {
                const receiptId = getReceiptId(receipt);
                if (receiptId) onDismissReceipt(receiptId);
              }}
            />
          )}
          {isAgent && (
            <PolymarketMarketCards
              markets={displayPolymarketMarkets}
              onPrepareBet={onPreparePolymarketBet}
              pendingBetKey={pendingPolymarketBetKey}
              inlineProposalsByBetKey={inlinePolymarketProposalsByBetKey}
              actionResultsByProposalId={actionResultsByProposalId}
              pendingProposalId={pendingProposalId}
              orderPrefill={polymarketOrderPrefill}
              canAct={canAct}
              onApproveInlineProposal={onApproveInlineProposal}
              onInlineActionComplete={onInlineActionComplete}
              onRejectProposal={onRejectProposal}
              onAddPredictionFunds={onAddPredictionFunds}
              astroConsoleData={astroConsoleData}
              renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
            />
          )}
          {isAgent && polymarketPositions.length > 0 && (
            <PolymarketPositionsCard
              positions={polymarketPositions}
            />
          )}
          {isAgent &&
            shouldResolveResearchToPolymarket &&
            isLoadingResearchPolymarketMarkets &&
            displayPolymarketMarkets.length === 0 && (
              <AgentLoadingCard label="Loading Polymarket odds" />
            )}
          {isAgent && fundingOnramp && (
            <div className="mt-2 rounded-[18px] border border-white/[0.07] bg-[#15171d] p-3 text-[#eceef2]">
              <CoinbaseOnrampFunding
                initialNetwork={fundingOnramp.initialNetwork}
                initialAmount={fundingOnramp.initialAmount}
                variant="dark"
                compact
              />
            </div>
          )}
          {isAgent && marketplaceItems.length > 0 && (
            <MarketplaceItemCards items={marketplaceItems} />
          )}
          {isAgent && hasAgentSportsResearch && sportsResearch && (
            <SportsResearchBriefCard research={sportsResearch} />
          )}
          {isAgent && showResearchSources && (
            <SportsResearchSourceCards
              sources={researchSources}
              checkedAt={researchCheckedAt}
            />
          )}
          {isAgent && walletReceive?.address && (
            <WalletReceiveQrCard walletReceive={walletReceive} />
          )}
          {isAgent && perpsPositions && (
            <HyperliquidPositionsCard
              summary={perpsPositions}
              astroConsoleData={astroConsoleData}
            />
          )}
          {isAgent && walletSendNetworkPrompt && (
            <WalletSendNetworkPromptCard
              prompt={walletSendNetworkPrompt}
              onApproveInline={onApproveInlineProposal}
              onInlineActionComplete={onInlineActionComplete}
              onReject={onRejectProposal}
              astroConsoleData={astroConsoleData}
            />
          )}
          {isAgent && perpsPositionPrompt && (
            <PerpsPositionPromptCard
              prompt={perpsPositionPrompt}
              canAct={canAct}
              isPending={isProposalPending}
              onApproveInline={onApproveInlineProposal}
              onInlineActionComplete={onInlineActionComplete}
              onReject={onRejectProposal}
              onAddFunds={onAddPerpsFunds}
              astroConsoleData={astroConsoleData}
            />
          )}
          {proposalId && !isInlinePolymarketProposal && (
            <AgentProposalCard
              proposal={proposal}
              proposalId={proposalId}
              status={status}
              actionResult={actionResult}
              canAct={canAct}
              isPending={isProposalPending}
              onApprove={onApproveProposal}
              onApproveInline={onApproveInlineProposal}
              onInlineActionComplete={onInlineActionComplete}
              onReject={onRejectProposal}
              onAddPredictionFunds={onAddPredictionFunds}
              onAddPerpsFunds={onAddPerpsFunds}
              astroConsoleData={astroConsoleData}
              sourceText={proposalSourceText}
            />
          )}
        </div>
        <p
          className={`dm-mono mt-1 px-1 text-[10px] font-semibold ${
            isOwn ? 'text-[#5a5e69]' : 'text-[#5a5e69]'
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {message.status === 'sending' && ' · sending'}
          {message.status === 'failed' && ' · failed'}
        </p>
      </div>
    </div>
  );
}

function getResearchSourceHost(source: ResearchSourcePreview) {
  if (source.sourceName) return source.sourceName;
  if (!source.url) return 'source';
  try {
    return new URL(source.url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

function getResearchCheckedLabel(checkedAt?: string | null) {
  return checkedAt
    ? new Date(checkedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
}

function SportsResearchBriefCard({
  research,
}: {
  research: SportsResearchBrief;
}) {
  const checkedLabel = getResearchCheckedLabel(research.checkedAt);
  const groups = (research.groups || []).filter((group) => group.items?.length);

  return (
    <div className={`mt-2 w-full overflow-hidden text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-[#eceef2]">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-[7px] bg-[#3fe08f]/15">
              <BarChart3 className="h-3.5 w-3.5 text-[#3fe08f]" />
            </span>
            <span className="truncate">{research.title || 'sports research'}</span>
          </div>
          {(research.subtitle || research.sourceName) && (
            <div className="dm-mono mt-1 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-[#6d717d]">
              {[research.sourceName, research.subtitle].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        {checkedLabel && (
          <span className="dm-mono rounded-[6px] bg-[#3fe08f]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ef7c8]">
            {checkedLabel}
          </span>
        )}
      </div>

      <div className="grid gap-3 px-3.5 py-3">
        {groups.slice(0, 6).map((group, groupIndex) => (
          <div
            key={`${group.title || 'group'}-${groupIndex}`}
            className="rounded-[12px] border border-white/[0.07] bg-black/20"
          >
            {group.title && (
              <div className="border-b border-white/[0.06] px-3 py-2">
                <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
                  {group.title}
                </div>
              </div>
            )}
            <div className="divide-y divide-white/[0.06]">
              {(group.items || []).slice(0, 8).map((item, itemIndex) => (
                <div
                  key={`${item.label || 'item'}-${itemIndex}`}
                  className="grid gap-1 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-[13px] font-semibold leading-snug text-[#eceef2]">
                      {item.label || 'Item'}
                    </span>
                    {(item.value || item.status) && (
                      <span className="shrink-0 text-right text-[13px] font-bold text-[#74f5ad]">
                        {item.value || item.status}
                      </span>
                    )}
                  </div>
                  {item.note && (
                    <p className="text-[12px] leading-relaxed text-[#a5a8b2]">
                      {item.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {research.notes?.length ? (
          <div className="dm-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6d717d]">
            {research.notes.slice(0, 2).join(' · ')}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SportsResearchSourceCards({
  sources,
  checkedAt,
}: {
  sources: ResearchSourcePreview[];
  checkedAt?: string | null;
}) {
  const checkedLabel = getResearchCheckedLabel(checkedAt);

  return (
    <div className={`mt-2 w-full overflow-hidden text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-[#eceef2]">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-[7px] bg-[#3fe08f]/15">
              <BarChart3 className="h-3.5 w-3.5 text-[#3fe08f]" />
            </span>
            <span className="truncate">sports research</span>
          </div>
        </div>
        {checkedLabel && (
          <span className="dm-mono rounded-[6px] bg-[#3fe08f]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ef7c8]">
            {checkedLabel}
          </span>
        )}
      </div>

      <div className="grid gap-2 px-3.5 py-3">
        {sources.slice(0, 5).map((source, index) => {
          const host = getResearchSourceHost(source);

          return (
            <div
              key={`${source.title || host}-${index}`}
              className="rounded-[12px] border border-white/[0.07] bg-black/20 p-3"
            >
              <div className="dm-mono mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#3fe08f]">
                {host}
              </div>
              <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#eceef2]">
                {source.title || host}
              </div>
              {source.snippet && (
                <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-[#a5a8b2]">
                  {source.snippet}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentLoadingCard({ label }: { label: string }) {
  return (
    <div className={`mt-2 w-full overflow-hidden text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-center gap-2 px-3.5 py-3 text-[13px] font-semibold text-[#eceef2]">
        <Loader2 className="h-4 w-4 animate-spin text-[#3fe08f]" />
        {label}
      </div>
    </div>
  );
}

function formatWalletAddress(address: string) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function buildWalletQrValue(walletReceive: WalletReceiveQrDetails) {
  if (
    walletReceive.chainType === 'evm' &&
    walletReceive.chainId &&
    walletReceive.address
  ) {
    return `ethereum:${walletReceive.address}@${walletReceive.chainId}`;
  }

  return walletReceive.address;
}

function WalletReceiveQrCard({
  walletReceive,
}: {
  walletReceive: WalletReceiveQrDetails;
}) {
  const [copied, setCopied] = useState(false);
  const networkLabel =
    walletReceive.networkLabel ||
    walletReceive.network ||
    'Wallet';
  const qrValue = buildWalletQrValue(walletReceive);

  const handleCopy = async () => {
    const didCopy = await copyTextToClipboard(walletReceive.address);
    if (!didCopy) {
      toast.error('Could not copy address.');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mt-2 w-full rounded-[18px] border border-[#3fe08f]/35 bg-[#111318] p-4 text-[#eceef2] shadow-[0_18px_40px_-24px_rgba(63,224,143,0.45)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="dm-mono mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3fe08f]">
            <QrCode className="h-3.5 w-3.5" />
            Receive QR
          </div>
          <div className="text-base font-semibold">{networkLabel}</div>
          {walletReceive.assetHint && (
            <div className="mt-1 text-xs leading-relaxed text-[#9396a0]">
              {walletReceive.assetHint}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy address"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.04] text-[#eceef2] transition hover:border-[#3fe08f]/45 hover:text-[#3fe08f]"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div className="flex justify-center rounded-[14px] bg-white p-3">
          <QRCodeSVG
            value={qrValue}
            size={156}
            level="H"
            includeMargin
          />
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-3 rounded-[14px] border border-white/[0.07] bg-black/20 p-3">
          <div>
            <div className="dm-mono mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
              Address
            </div>
            <div className="dm-mono break-all text-xs leading-relaxed text-[#eceef2]">
              {walletReceive.address}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="dm-mono rounded-[8px] border border-[#3fe08f]/30 bg-[#3fe08f]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
              {formatWalletAddress(walletReceive.address)}
            </span>
            {walletReceive.source === 'client_session' && (
              <span className="dm-mono rounded-[8px] border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9396a0]">
                active wallet
              </span>
            )}
          </div>
          {walletReceive.warning && (
            <div className="text-[11px] leading-relaxed text-[#9396a0]">
              {walletReceive.warning}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getReceiptId(receipt?: AgentActionCompletion | null) {
  if (!receipt) return '';
  return (
    receipt.proposalId ||
    receipt.orderId?.toString() ||
    receipt.txHash ||
    `${receipt.provider || 'agent'}:${receipt.placedAt || ''}`
  );
}

function formatReceiptMoney(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return 'n/a';
  }
  if (typeof value === 'string' && value.trim().startsWith('$')) {
    return value.trim();
  }
  return formatCompactUsd(value);
}

function shortReceiptHash(receipt: AgentActionCompletion) {
  const value = receipt.txHash || receipt.orderId;
  if (!value) return '';
  const text = String(value);
  if (text.length <= 12) return text;
  return `${text.slice(0, 5)}...${text.slice(-4)}`;
}

function receiptSubtitle(receipt: AgentActionCompletion) {
  if (receipt.subtitle) return receipt.subtitle;
  if (receipt.provider === 'hyperliquid') return 'perps · frontend signed';
  if (receipt.provider === 'polymarket') return 'prediction · self-custodied';
  if (receipt.provider === 'marketplace') return 'marketplace · published';
  return 'self-custodied · settled';
}

function escapeSvgText(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapShareText(value: unknown, maxChars: number, maxLines: number) {
  const words = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const trimmed = lines.slice(0, maxLines);
  trimmed[trimmed.length - 1] = `${trimmed[trimmed.length - 1]
    .slice(0, Math.max(0, maxChars - 1))
    .trim()}...`;
  return trimmed;
}

function receiptShareFileName(receipt: AgentActionCompletion) {
  const id = getReceiptId(receipt) || shortReceiptHash(receipt) || Date.now();
  return `swop-ticket-${String(id).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 48)}.png`;
}

function buildReceiptShareSvg(receipt: AgentActionCompletion) {
  const confirmed = receipt.status !== 'failed';
  const title =
    receipt.subject ||
    receipt.title ||
    (receipt.provider === 'hyperliquid'
      ? 'Perps order'
      : receipt.provider === 'polymarket'
        ? 'Prediction order'
        : 'Swap');
  const placedAt = receipt.placedAt ? new Date(receipt.placedAt) : new Date();
  const placedLabel = placedAt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  const titleLines = wrapShareText(title, 20, 2);
  const subtitle = receiptSubtitle(receipt);
  const hash = shortReceiptHash(receipt) || 'audit logged';
  const headlineAmount =
    receipt.toWin !== undefined ? formatReceiptMoney(receipt.toWin) : 'confirmed';
  const accent = confirmed ? '#3fe08f' : '#ff5d63';
  const status = confirmed ? 'CONFIRMED' : 'FAILED';
  const detailRows = [
    ['STAKE', formatReceiptMoney(receipt.stake)],
    ['TO WIN', receipt.toWin !== undefined ? formatReceiptMoney(receipt.toWin) : 'settled'],
    ['PAYOUT', receipt.payout !== undefined ? formatReceiptMoney(receipt.payout) : 'n/a'],
    ['PLACED', placedLabel],
  ];

  return `
<svg width="1200" height="900" viewBox="0 0 1200 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="900" fill="#08090b"/>
  <rect x="136" y="96" width="928" height="708" rx="44" fill="#15171d" stroke="${accent}" stroke-opacity="0.42" stroke-width="3"/>
  <rect x="136" y="96" width="928" height="112" rx="44" fill="#111318"/>
  <path d="M136 208H1064" stroke="white" stroke-opacity="0.07" stroke-width="2"/>
  <path d="M140 210V756C140 782.51 161.49 804 188 804H1012C1038.51 804 1060 782.51 1060 756V210" stroke="${accent}" stroke-opacity="0.65" stroke-width="5"/>
  <text x="204" y="166" fill="${accent}" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="8">✓ TICKET</text>
  <rect x="430" y="127" width="214" height="48" rx="16" fill="${accent}" fill-opacity="0.12" stroke="${accent}" stroke-opacity="0.22"/>
  <text x="537" y="160" fill="${accent}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="900" text-anchor="middle" letter-spacing="4">${status}</text>
  <text x="998" y="166" fill="#737783" font-family="monospace" font-size="24" font-weight="700" text-anchor="end">${escapeSvgText(hash)}</text>

  ${titleLines
    .map(
      (line, index) =>
        `<text x="204" y="${292 + index * 46}" fill="#eceef2" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="800">${escapeSvgText(line)}</text>`,
    )
    .join('')}
  <text x="204" y="${titleLines.length > 1 ? 392 : 348}" fill="#737783" font-family="monospace" font-size="26" font-weight="700">${escapeSvgText(subtitle)}</text>
  <text x="982" y="310" fill="${accent}" font-family="monospace" font-size="62" font-weight="900" text-anchor="end">${escapeSvgText(headlineAmount)}</text>

  <path d="M204 430H996" stroke="white" stroke-opacity="0.08" stroke-width="2"/>

  ${detailRows
    .map(([label, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? 204 : 606;
      const y = 500 + row * 146;
      const valueColor = label === 'TO WIN' ? accent : '#eceef2';
      return `
  <text x="${x}" y="${y}" fill="#6f7380" font-family="monospace" font-size="25" font-weight="800" letter-spacing="7">${escapeSvgText(label)}</text>
  <text x="${x}" y="${y + 62}" fill="${valueColor}" font-family="monospace" font-size="38" font-weight="900">${escapeSvgText(value)}</text>`;
    })
    .join('')}

  <text x="600" y="752" fill="#5a5e69" font-family="monospace" font-size="22" font-weight="800" text-anchor="middle">self-custodied · settled through Swop · ${escapeSvgText(hash)}</text>
  <text x="600" y="846" fill="#3fe08f" fill-opacity="0.82" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" text-anchor="middle">Swop</text>
</svg>`;
}

async function createReceiptShareImage(receipt: AgentActionCompletion) {
  if (typeof window === 'undefined') {
    throw new Error('Sharing is only available in the browser.');
  }

  const svg = buildReceiptShareSvg(receipt);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = new window.Image();
    image.decoding = 'async';
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Ticket image failed to render.'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.drawImage(image, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Ticket image could not be created.'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareReceiptImage(receipt: AgentActionCompletion) {
  const blob = await createReceiptShareImage(receipt);
  const fileName = receiptShareFileName(receipt);
  const file = new File([blob], fileName, { type: 'image/png' });
  const shareData = {
    text: '📈 Here’s my call. Follow it on Swopme.app',
    files: [file],
  };

  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return 'shared';
  }

  const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem })
    .ClipboardItem;
  if (navigator.clipboard?.write && ClipboardItemCtor) {
    await navigator.clipboard.write([
      new ClipboardItemCtor({ 'image/png': blob }),
    ]);
    return 'copied';
  }

  downloadBlob(blob, fileName);
  return 'downloaded';
}

function AgentActionReceiptCard({
  receipt,
  onDone,
}: {
  receipt: AgentActionCompletion;
  onDone: () => void;
}) {
  const [isSharing, setIsSharing] = useState(false);
  const confirmed = receipt.status !== 'failed';
  const receiptExecution =
    receipt.executionResult && typeof receipt.executionResult === 'object'
      ? receipt.executionResult
      : {};
  const isSwapReceipt =
    receipt.provider === 'swop' &&
    (receipt.action === 'wallet.swap' ||
      receiptExecution.kind === 'swap' ||
      Boolean(receiptExecution.fromToken && receiptExecution.toToken));
  const title =
    receipt.subject ||
    receipt.title ||
    (receipt.provider === 'hyperliquid'
      ? 'Perps order'
      : receipt.provider === 'polymarket'
        ? 'Prediction order'
        : 'Swap');
  const placedAt = receipt.placedAt
    ? new Date(receipt.placedAt)
    : new Date();
  const canView = Boolean(receipt.txUrl);
  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const result = await shareReceiptImage(receipt);
      if (result === 'shared') {
        toast.success('Ticket ready to share.');
      } else if (result === 'copied') {
        toast.success('Ticket image copied. Paste it into your chat.');
      } else {
        toast.success('Ticket image downloaded.');
      }
    } catch (error) {
      console.error('Failed to share ticket image:', error);
      toast.error('Could not share this ticket image.');
    } finally {
      setIsSharing(false);
    }
  };
  const swapFromLabel = [
    receiptExecution.fromAmount,
    receiptExecution.fromToken,
  ]
    .filter(Boolean)
    .join(' ');
  const swapToLabel = [receiptExecution.toAmount, receiptExecution.toToken]
    .filter(Boolean)
    .join(' ');
  const swapRouteLabel =
    String(receiptExecution.routeLabel || receiptExecution.provider || '')
      .trim() || receiptSubtitle(receipt);

  if (isSwapReceipt) {
    const networkLabel = [
      receiptExecution.fromChain,
      receiptExecution.toChain &&
      receiptExecution.toChain !== receiptExecution.fromChain
        ? receiptExecution.toChain
        : null,
    ]
      .filter(Boolean)
      .join(' to ');
    return (
      <div className="mt-2 w-full max-w-[460px] overflow-hidden rounded-[16px] border border-[#3fe08f]/25 bg-gradient-to-b from-[#15171d] to-[#111318] text-[#eceef2] shadow-[0_24px_70px_-34px_rgba(63,224,143,0.45)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] ${
                confirmed ? 'bg-[#3fe08f]/15' : 'bg-[#ff5d63]/15'
              }`}
            >
              {confirmed ? (
                <Check className="h-3.5 w-3.5 text-[#3fe08f]" />
              ) : (
                <X className="h-3.5 w-3.5 text-[#ffb2b6]" />
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-bold">
                {confirmed ? 'Swap submitted' : 'Swap failed'}
              </div>
              <div className="dm-mono mt-0.5 truncate text-[10px] text-[#6f7380]">
                {swapRouteLabel}
              </div>
            </div>
          </div>
          <span
            className={`dm-mono rounded-[6px] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
              confirmed
                ? 'bg-[#3fe08f]/10 text-[#9ef7c8]'
                : 'bg-[#ff5d63]/15 text-[#ffb2b6]'
            }`}
          >
            {confirmed ? 'confirmed' : 'failed'}
          </span>
        </div>

        <div className="border-l-2 border-[#3fe08f] px-4 py-4">
          <div className="rounded-[14px] border border-white/[0.07] bg-[#0f1116] p-3.5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0">
                <div className={TICKET_LABEL_CLASS}>you paid</div>
                <div className="dm-mono mt-1 truncate text-[17px] font-bold text-[#eceef2]">
                  {swapFromLabel || 'submitted'}
                </div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full border border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#3fe08f]">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="min-w-0 text-right">
                <div className={TICKET_LABEL_CLASS}>you received</div>
                <div className="dm-mono mt-1 truncate text-[17px] font-bold text-[#3fe08f]">
                  {swapToLabel || 'quoted'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-[13px] border border-[#3fe08f]/15 bg-[#101217]">
            {([
              ['Route', swapRouteLabel],
              ['Network', networkLabel || receiptSubtitle(receipt)],
              ['Price', receiptExecution.price || '--'],
              ['Impact', receiptExecution.priceImpact || '--'],
              ['Fee', receiptExecution.fee || '--'],
              ['Tx hash', shortReceiptHash(receipt) || 'pending'],
            ] as Array<[string, unknown]>).map(([label, value], index, rows) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-3 px-3 py-2 ${
                  index === rows.length - 1
                    ? ''
                    : 'border-b border-white/[0.06]'
                }`}
              >
                <span className="text-[11.5px] font-semibold text-[#6f7380]">
                  {label}
                </span>
                <span className="dm-mono min-w-0 truncate text-right text-[11.5px] font-bold text-[#eceef2]">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>

          {!confirmed && receipt.error && (
            <div className="mt-3 rounded-[10px] border border-[#ff5d63]/25 bg-[#ff5d63]/10 px-3 py-2 text-[11px] font-semibold text-[#ffb2b6]">
              {String(receipt.error)}
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onDone}
              className="dm-btn h-10 rounded-[11px] border border-white/[0.07] bg-[#111318] text-[13px] font-semibold text-[#9396a0] hover:bg-white/[0.04]"
            >
              Done
            </button>
            <button
              type="button"
              disabled={isSharing}
              onClick={() => void handleShare()}
              className="dm-btn inline-flex h-10 items-center justify-center gap-2 rounded-[11px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 text-[13px] font-bold text-[#dfffee] hover:bg-[#3fe08f]/15 disabled:cursor-wait disabled:opacity-45"
            >
              {isSharing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              Share
            </button>
            <button
              type="button"
              disabled={!canView}
              onClick={() => {
                if (receipt.txUrl)
                  window.open(receipt.txUrl, '_blank', 'noopener,noreferrer');
              }}
              className="dm-btn inline-flex h-10 items-center justify-center gap-2 rounded-[11px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 text-[13px] font-bold text-[#dfffee] hover:bg-[#3fe08f]/15 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {receipt.explorerLabel || (canView ? 'View tx' : 'No tx yet')}
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="dm-mono mt-4 text-center text-[10px] font-semibold text-[#5a5e69]">
            self-custodied · settled through Swop ·{' '}
            {shortReceiptHash(receipt) || 'audit logged'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[18px] border border-[#3fe08f]/20 bg-[#15171d] text-[#eceef2] shadow-[0_24px_70px_-36px_rgba(63,224,143,0.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
        <div className="dm-mono flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
          <Check className="h-3.5 w-3.5" />
          <span className="truncate">
            Ticket · {confirmed ? 'confirmed' : 'failed'}
          </span>
        </div>
        <div className="dm-mono max-w-[120px] truncate text-[10px] text-[#5a5e69]">
          {shortReceiptHash(receipt)}
        </div>
      </div>

      <div className="border-l-2 border-[#3fe08f] px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-[18px] font-bold tracking-[-0.02em]">
              {title}
            </div>
            <div className="dm-mono mt-1 truncate text-[11px] font-semibold text-[#6f7380]">
              {receiptSubtitle(receipt)}
            </div>
          </div>
          {receipt.toWin !== undefined && (
            <div className="dm-mono shrink-0 text-right text-[24px] font-bold text-[#3fe08f]">
              {formatReceiptMoney(receipt.toWin)}
            </div>
          )}
        </div>

        <div className="my-4 h-px bg-white/[0.07]" />

        {isSwapReceipt ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <div className={TICKET_LABEL_CLASS}>you paid</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {swapFromLabel || 'submitted'}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>you received</div>
              <div className="dm-mono mt-1 text-[15px] font-bold text-[#3fe08f]">
                {swapToLabel || 'quoted'}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>route</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {swapRouteLabel}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>placed</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {placedAt.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <div className={TICKET_LABEL_CLASS}>stake</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {formatReceiptMoney(receipt.stake)}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>to win</div>
              <div className="dm-mono mt-1 text-[15px] font-bold text-[#3fe08f]">
                {receipt.toWin !== undefined
                  ? formatReceiptMoney(receipt.toWin)
                  : 'settled'}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>payout</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {receipt.payout !== undefined
                  ? formatReceiptMoney(receipt.payout)
                  : 'n/a'}
              </div>
            </div>
            <div>
              <div className={TICKET_LABEL_CLASS}>placed</div>
              <div className="dm-mono mt-1 text-[15px] font-bold">
                {placedAt.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            </div>
          </div>
        )}

          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onDone}
              className="dm-btn h-10 rounded-[11px] border border-white/[0.07] bg-[#111318] text-[13px] font-semibold text-[#9396a0] hover:bg-white/[0.04]"
            >
              Done
            </button>
            <button
              type="button"
              disabled={isSharing}
              onClick={() => void handleShare()}
              className="dm-btn inline-flex h-10 items-center justify-center gap-2 rounded-[11px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 text-[13px] font-bold text-[#dfffee] hover:bg-[#3fe08f]/15 disabled:cursor-wait disabled:opacity-45"
            >
              {isSharing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              Share
            </button>
            <button
              type="button"
              disabled={!canView}
            onClick={() => {
              if (receipt.txUrl) window.open(receipt.txUrl, '_blank', 'noopener,noreferrer');
            }}
            className="dm-btn inline-flex h-10 items-center justify-center gap-2 rounded-[11px] border border-white/[0.07] bg-[#111318] text-[13px] font-semibold text-[#eceef2] hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {receipt.explorerLabel || (canView ? 'View tx' : 'No tx yet')}
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="dm-mono mt-4 text-center text-[10px] font-semibold text-[#5a5e69]">
          self-custodied · settled through Swop ·{' '}
          {shortReceiptHash(receipt) || 'audit logged'}
        </div>
      </div>
    </div>
  );
}

function MarketplaceItemCards({ items }: { items: MarketplaceItemPreview[] }) {
  if (!items.length) return null;

  return (
    <div className="mt-2 grid gap-2">
      {items.slice(0, 4).map((item, index) => {
        const href =
          item.profileUrl ||
          (item.sellerUsername ? `/sp/${item.sellerUsername}` : null);
        return (
          <div
            key={item.id || item.templateId || index}
            className={`${AGENT_PANEL_CLASS} overflow-hidden`}
          >
            <div className="flex gap-3 p-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[12px] border border-white/[0.07] bg-black">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#3fe08f]">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-bold text-[#eceef2]">
                      {item.name}
                    </div>
                    <div className="dm-mono mt-1 truncate text-[10px] font-semibold text-[#6f7380]">
                      {item.sellerName || item.sellerUsername || 'Swop seller'} ·{' '}
                      {item.category || 'item'}
                    </div>
                  </div>
                  <div className="dm-mono shrink-0 text-[13px] font-bold text-[#3fe08f]">
                    {formatCompactUsd(item.price || 0)}
                  </div>
                </div>
                {item.description && (
                  <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#9396a0]">
                    {item.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="dm-mono text-[10px] font-semibold text-[#5a5e69]">
                    {item.available !== null && item.available !== undefined
                      ? `${item.available} available`
                      : 'marketplace'}
                  </span>
                  <button
                    type="button"
                    disabled={!href}
                    onClick={() => {
                      if (href) window.open(href, '_blank', 'noopener,noreferrer');
                    }}
                    className="dm-btn inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 px-3 text-[11px] font-bold text-[#dfffee] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Open
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PolymarketMarketCards({
  markets,
  onPrepareBet,
  pendingBetKey,
  inlineProposalsByBetKey,
  actionResultsByProposalId,
  pendingProposalId,
  orderPrefill,
  canAct,
  onApproveInlineProposal,
  onInlineActionComplete,
  onRejectProposal,
  onAddPredictionFunds,
  astroConsoleData,
  renderedReceiptIdentityKeys,
}: {
  markets: PolymarketMarketPreview[];
  onPrepareBet: (
    prompt: string,
    betKey: string
  ) => Promise<AgentActionProposal | null>;
  pendingBetKey?: string | null;
  inlineProposalsByBetKey: Record<string, AgentActionProposal>;
  actionResultsByProposalId: Record<string, AgentActionResultPayload>;
  pendingProposalId?: string | null;
  orderPrefill?: PolymarketOrderPrefill | null;
  canAct: boolean;
  onApproveInlineProposal: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onRejectProposal: (proposalId: string) => void;
  onAddPredictionFunds: () => void;
  astroConsoleData: AstroConsoleData;
  renderedReceiptIdentityKeys: Set<string>;
}) {
  if (!markets.length) return null;

  const marketGroups = groupPolymarketMarkets(markets);

  return (
    <div className="mt-2 grid gap-3">
      {marketGroups.slice(0, 4).map((group, index) =>
        group.isEventGroup && group.markets.length > 1 ? (
          <PolymarketGameMarketCard
            key={group.key}
            group={group}
            onPrepareBet={onPrepareBet}
            pendingBetKey={pendingBetKey}
            inlineProposalsByBetKey={inlineProposalsByBetKey}
            actionResultsByProposalId={actionResultsByProposalId}
            pendingProposalId={pendingProposalId}
            orderPrefill={orderPrefill}
            canAct={canAct}
            onApproveInlineProposal={onApproveInlineProposal}
            onInlineActionComplete={onInlineActionComplete}
            onRejectProposal={onRejectProposal}
            onAddPredictionFunds={onAddPredictionFunds}
            astroConsoleData={astroConsoleData}
            renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
          />
        ) : (
          <PolymarketMarketCard
            key={
              group.markets[0]?.conditionId ||
              group.markets[0]?.id ||
              group.markets[0]?.slug ||
              group.key
            }
            market={group.markets[0]}
            onPrepareBet={onPrepareBet}
            pendingBetKey={pendingBetKey}
            inlineProposalsByBetKey={inlineProposalsByBetKey}
            actionResultsByProposalId={actionResultsByProposalId}
            pendingProposalId={pendingProposalId}
            orderPrefill={orderPrefill}
            canAct={canAct}
            onApproveInlineProposal={onApproveInlineProposal}
            onInlineActionComplete={onInlineActionComplete}
            onRejectProposal={onRejectProposal}
            onAddPredictionFunds={onAddPredictionFunds}
            astroConsoleData={astroConsoleData}
            renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
            preferLiveChart={index === 0}
          />
        )
      )}
    </div>
  );
}

function AgentMarketBlock({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className="my-3 w-full min-w-0 max-w-full border-l-2 border-[#3fe08f] pl-3">
      <div className="dm-mono mb-2 flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
        <span className="min-w-0 truncate">{label}</span>
        {meta ? (
          <span className="shrink-0 tracking-[0.05em] text-[#5a5e69]">
            {meta}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function PolymarketPositionsCard({
  positions,
}: {
  positions: PolymarketPosition[];
}) {
  const openPositions = positions.filter(isOpenPredictionConsolePosition);
  const displayPositions = (openPositions.length ? openPositions : positions).slice(
    0,
    4
  );
  const totalValue = displayPositions.reduce(
    (sum, position) => sum + toFiniteNumber(position.currentValue),
    0
  );
  const totalPnl = displayPositions.reduce(
    (sum, position) => sum + toFiniteNumber(position.cashPnl),
    0
  );
  const hasMore = positions.length > displayPositions.length;

  return (
    <div className={`${AGENT_PANEL_CLASS} mt-2 w-full overflow-hidden text-xs`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-3.5 py-3">
        <div className="min-w-0">
          <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
            polymarket positions
          </div>
          <div className="mt-1 text-[15px] font-bold text-[#eceef2]">
            {openPositions.length || positions.length} position
            {(openPositions.length || positions.length) === 1 ? '' : 's'}
          </div>
        </div>
        <div className="dm-mono shrink-0 text-right text-[10px] font-semibold">
          <div className="text-[#eceef2]">{formatCompactUsd(totalValue)}</div>
          <div className={totalPnl >= 0 ? 'text-[#3fe08f]' : 'text-[#ff5d63]'}>
            {formatSignedUsd(totalPnl)}
          </div>
        </div>
      </div>

      <div className="grid gap-0">
        {displayPositions.map((position) => {
          const pnl = toFiniteNumber(position.cashPnl);
          const percentPnl = toFiniteNumber(position.percentPnl);
          const pnlLabel =
            percentPnl === 0
              ? formatSignedUsd(pnl)
              : `${formatSignedUsd(pnl)} · ${
                  percentPnl > 0 ? '+' : ''
                }${percentPnl.toFixed(2)}%`;
          return (
            <div
              key={`${position.conditionId}-${position.asset}`}
              className="border-t border-white/[0.045] first:border-t-0"
            >
              <div className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#eceef2]">
                    {position.title || 'Prediction market'}
                  </span>
                  <span className="dm-mono mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#737783]">
                    <span className="rounded-[5px] border border-[#3fe08f]/15 bg-black/25 px-1.5 py-0.5 text-[#3fe08f]">
                      {position.outcome || 'Outcome'}
                    </span>
                    <span>{formatPredictionShares(position.size)} shares</span>
                    <span>{formatPolymarketPrice(position.curPrice)}</span>
                  </span>
                </span>
                <span
                  className={`dm-mono shrink-0 text-right text-[11px] font-bold ${
                    pnl >= 0 ? 'text-[#3fe08f]' : 'text-[#ff5d63]'
                  }`}
                >
                  {pnlLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="border-t border-white/[0.045] px-3.5 py-2 text-[11px] font-semibold text-[#737783]">
          {positions.length - displayPositions.length} more position
          {positions.length - displayPositions.length === 1 ? '' : 's'} available.
        </div>
      )}
    </div>
  );
}

function PolymarketGameMarketCard({
  group,
  onPrepareBet,
  pendingBetKey,
  inlineProposalsByBetKey,
  actionResultsByProposalId,
  pendingProposalId,
  orderPrefill,
  canAct,
  onApproveInlineProposal,
  onInlineActionComplete,
  onRejectProposal,
  onAddPredictionFunds,
  astroConsoleData,
  renderedReceiptIdentityKeys,
}: {
  group: PolymarketMarketGroup;
  onPrepareBet: (
    prompt: string,
    betKey: string
  ) => Promise<AgentActionProposal | null>;
  pendingBetKey?: string | null;
  inlineProposalsByBetKey: Record<string, AgentActionProposal>;
  actionResultsByProposalId: Record<string, AgentActionResultPayload>;
  pendingProposalId?: string | null;
  orderPrefill?: PolymarketOrderPrefill | null;
  canAct: boolean;
  onApproveInlineProposal: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onRejectProposal: (proposalId: string) => void;
  onAddPredictionFunds: () => void;
  astroConsoleData: AstroConsoleData;
  renderedReceiptIdentityKeys: Set<string>;
}) {
  const primaryMarket = group.markets[0];
  const title =
    primaryMarket.eventTitle ||
    humanizePolymarketEventSlug(primaryMarket.eventSlug) ||
    primaryMarket.question ||
    'Prediction markets';
  const timing = formatPolymarketMarketTiming(primaryMarket);
  const league = inferPolymarketLeague(primaryMarket);
  const liveLabel = primaryMarket.eventLive
    ? `Live${timing && timing !== 'Live' ? ` · ${timing}` : ''}`
    : timing;

  return (
    <AgentMarketBlock
      label={`market · ${league}`}
      meta={new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}
    >
      <div
        className={`${AGENT_PANEL_CLASS} w-full min-w-0 max-w-[460px] overflow-hidden text-xs`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
          <div className="dm-mono inline-flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ff5d63]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff5d63]" />
            <span className="min-w-0 truncate">{liveLabel || 'market'}</span>
          </div>
          <span className="dm-mono text-[10px] uppercase tracking-[0.08em] text-[#5a5e69]">
            {league}
          </span>
        </div>

        <div className="px-4 py-3.5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 break-words text-[14px] font-semibold leading-snug text-[#eceef2] [overflow-wrap:anywhere]">
              {title}
            </div>
            <div className="dm-mono shrink-0 text-right text-[10px] text-[#5a5e69]">
              {group.markets.length} markets
            </div>
          </div>

          <div className="mt-4 grid min-w-0 gap-3">
            {group.markets.map((market, index) => (
              <PolymarketMarketCard
                key={market.conditionId || market.id || market.slug || index}
                market={market}
                onPrepareBet={onPrepareBet}
                pendingBetKey={pendingBetKey}
                inlineProposalsByBetKey={inlineProposalsByBetKey}
                actionResultsByProposalId={actionResultsByProposalId}
                pendingProposalId={pendingProposalId}
                orderPrefill={orderPrefill}
                canAct={canAct}
                onApproveInlineProposal={onApproveInlineProposal}
                onInlineActionComplete={onInlineActionComplete}
                onRejectProposal={onRejectProposal}
                onAddPredictionFunds={onAddPredictionFunds}
                astroConsoleData={astroConsoleData}
                renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
                preferLiveChart={false}
                embeddedInGroup
                groupTitle={title}
              />
            ))}
          </div>
        </div>

        <div className="dm-mono flex items-center justify-between gap-3 border-t border-dashed border-white/[0.07] px-4 py-3 text-[10px]">
          <span className="truncate text-[#5a5e69]">
            self-custodied · swop book
          </span>
          <span className="shrink-0 text-[#9396a0]">tap an odd to bet →</span>
        </div>
      </div>
    </AgentMarketBlock>
  );
}

function PolymarketMarketCard({
  market,
  onPrepareBet,
  pendingBetKey,
  inlineProposalsByBetKey,
  actionResultsByProposalId,
  pendingProposalId,
  orderPrefill,
  canAct,
  onApproveInlineProposal,
  onInlineActionComplete,
  onRejectProposal,
  onAddPredictionFunds,
  astroConsoleData,
  renderedReceiptIdentityKeys,
  preferLiveChart,
  embeddedInGroup = false,
  groupTitle,
}: {
  market: PolymarketMarketPreview;
  onPrepareBet: (
    prompt: string,
    betKey: string
  ) => Promise<AgentActionProposal | null>;
  pendingBetKey?: string | null;
  inlineProposalsByBetKey: Record<string, AgentActionProposal>;
  actionResultsByProposalId: Record<string, AgentActionResultPayload>;
  pendingProposalId?: string | null;
  orderPrefill?: PolymarketOrderPrefill | null;
  canAct: boolean;
  onApproveInlineProposal: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onRejectProposal: (proposalId: string) => void;
  onAddPredictionFunds: () => void;
  astroConsoleData: AstroConsoleData;
  renderedReceiptIdentityKeys: Set<string>;
  preferLiveChart: boolean;
  embeddedInGroup?: boolean;
  groupTitle?: string;
}) {
  const question = market.question || 'Polymarket market';
  const displayQuestion = formatPolymarketMarketLabel(market, groupTitle);
  const outcomes = getPolymarketOutcomeLabels(market);
  const yesPrice = formatPolymarketPrice(market.yesPrice);
  const noPrice = formatPolymarketPrice(market.noPrice);
  const timing = formatPolymarketMarketTiming(market);
  const yesKey = buildPolymarketBetKey(market, 'yes');
  const noKey = buildPolymarketBetKey(market, 'no');
  const matchingOrderPrefill = orderPrefillMatchesMarket(
    orderPrefill,
    market,
    yesKey,
    noKey
  )
    ? orderPrefill
    : null;
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no' | null>(
    matchingOrderPrefill?.outcome || null
  );
  const [orderMode, setOrderMode] = useState<'market' | 'limit'>(
    matchingOrderPrefill?.orderType || 'market'
  );
  const [stake, setStake] = useState(matchingOrderPrefill?.amount || '1');
  const [limitPrice, setLimitPrice] = useState(
    matchingOrderPrefill?.limitPriceCents || ''
  );
  const [localReceipt, setLocalReceipt] =
    useState<AgentActionCompletion | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmInFlightRef = useRef(false);
  const trading = useTrading();
  const { accessToken } = useUser();
  const {
    submitOrder,
    isSubmitting: isSubmittingOrder,
    orderStage,
  } = useClobOrder(trading.tradingSession, trading.tradingWalletAddress);

  useEffect(() => {
    if (!matchingOrderPrefill) return;
    setSelectedOutcome(matchingOrderPrefill.outcome);
    setOrderMode(matchingOrderPrefill.orderType || 'market');
    setStake(matchingOrderPrefill.amount || '1');
    setLimitPrice(matchingOrderPrefill.limitPriceCents || '');
  }, [
    matchingOrderPrefill,
    matchingOrderPrefill?.amount,
    matchingOrderPrefill?.limitPriceCents,
    matchingOrderPrefill?.marketKey,
    matchingOrderPrefill?.orderType,
    matchingOrderPrefill?.outcome,
  ]);

  const selectedKey =
    selectedOutcome === 'yes'
      ? yesKey
      : selectedOutcome === 'no'
      ? noKey
      : '';
  const selectedPrice =
    selectedOutcome === 'yes'
      ? market.yesPrice
      : selectedOutcome === 'no'
      ? market.noPrice
      : undefined;
  const selectedPriceLabel =
    selectedOutcome === 'yes'
      ? yesPrice
      : selectedOutcome === 'no'
      ? noPrice
      : '';
  const selectedLabel =
    selectedOutcome === 'yes' ? outcomes.yes : outcomes.no;
  const selectedAccent =
    selectedOutcome === 'no' ? '#ff5d63' : '#3fe08f';
  const stakeValue = Number(stake || 0);
  const selectedProbability = parsePolymarketProbability(selectedPrice, 0.5);
  const isLimitOrder = orderMode === 'limit';
  const limitPriceDecimal = Number(limitPrice || 0) / 100;
  const effectiveProbability =
    isLimitOrder && limitPriceDecimal > 0
      ? limitPriceDecimal
      : selectedProbability;
  const orderShares =
    effectiveProbability > 0 && stakeValue > 0
      ? stakeValue / effectiveProbability
      : 0;
  const orderCost =
    stakeValue > 0 ? stakeValue : 0;
  const payoutTotal = Math.max(0, orderShares);
  const payout = {
    profit: Math.max(0, payoutTotal - Math.max(0, orderCost)),
    total: payoutTotal,
  };
  const isSelectedPending = Boolean(
    selectedOutcome && pendingBetKey === selectedKey
  );
  const isPreparing = Boolean(pendingBetKey);
  const isBusy = isPreparing || isConfirming || isSubmittingOrder;
  const activeOrderStage = orderStage !== 'idle';
  const inlineProposal = selectedOutcome
    ? inlineProposalsByBetKey[selectedKey]
    : null;
  const inlineActionResult = inlineProposal?.proposalId
    ? actionResultsByProposalId[inlineProposal.proposalId]
    : undefined;
  const existingApprovalResult =
    inlineActionResult?.result || inlineProposal?.approvalResult || null;
  const inlineStatus =
    inlineActionResult?.status || inlineProposal?.status || null;
  const canUseInlineProposal = Boolean(
    inlineProposal?.proposalId &&
      (inlineStatus === 'pending' ||
        (inlineStatus === 'approved' &&
          existingApprovalResult?.payload?.proposalId ===
            inlineProposal.proposalId))
  );
  const isInlineProposalPending =
    inlineProposal?.proposalId === pendingProposalId;
  const selectedTokenId = selectedOutcome
    ? getPolymarketTokenId(market, selectedOutcome)
    : '';
  const approvalParams =
    selectedOutcome
      ? {
          marketId: market.id || undefined,
          conditionId: market.conditionId || undefined,
          slug: market.slug || undefined,
          tokenId: selectedTokenId || undefined,
          outcome: selectedOutcome,
          outcomeLabel: selectedLabel,
          side: 'BUY',
          amount: isLimitOrder
            ? formatPredictionAmountInput(orderShares)
            : stake,
          orderType: orderMode,
          price: isLimitOrder ? limitPriceDecimal : undefined,
        }
      : undefined;
  const availableUsdc = astroConsoleData.predictionUsdcBalance;
  const amountDialMax = Math.max(
    25,
    Math.ceil(Math.max(availableUsdc || 0, stakeValue || 0, 1))
  );
  const isBalanceLoading = astroConsoleData.isPredictionBalanceLoading;
  const needsPredictionFunds = Boolean(
    selectedOutcome &&
      canAct &&
      !isBalanceLoading &&
      orderCost > availableUsdc
  );
  const needsTradingSetup = Boolean(
    selectedOutcome && canAct && !trading.isTradingSessionComplete
  );
  const isBelowMinimum = Boolean(selectedOutcome && orderCost > 0 && orderCost < 1);
  const hasInvalidLimitPrice = Boolean(
    selectedOutcome &&
      isLimitOrder &&
      (limitPriceDecimal <= 0 || limitPriceDecimal >= 1)
  );
  const predictionShortfall = Math.max(0, orderCost - availableUsdc);
  const canConfirmBet =
    Boolean(stakeValue && stakeValue > 0) &&
    canAct &&
    !isBalanceLoading &&
    !isBelowMinimum &&
    !hasInvalidLimitPrice &&
    !needsPredictionFunds &&
    !isBusy &&
    !isInlineProposalPending &&
    inlineStatus !== 'executed' &&
    Boolean(selectedTokenId);
  const handleConfirmBet = async () => {
    if (!selectedOutcome) return;
    if (confirmInFlightRef.current) return;

    if (needsPredictionFunds) {
      onAddPredictionFunds();
      return;
    }

    if (needsTradingSetup) {
      setTradeError(null);
      setIsConfirming(true);
      try {
        await trading.initializeTradingSession();
        setTradeError('Trading setup is ready. Confirm again to place this ticket.');
        toast.success('Trading setup is ready.');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Trading setup could not be completed.';
        setTradeError(message);
        toast.error(message);
      } finally {
        setIsConfirming(false);
      }
      return;
    }

    if (!canConfirmBet) return;

    setTradeError(null);
    setIsConfirming(true);
    confirmInFlightRef.current = true;

    try {
      let proposal = canUseInlineProposal ? inlineProposal : null;
      if (!proposal?.proposalId) {
        proposal = await onPrepareBet(
          buildPolymarketBetPrompt(
            market,
            selectedOutcome,
            isLimitOrder ? orderShares : stake,
            {
              orderType: orderMode,
              limitPriceCents: isLimitOrder ? limitPrice : undefined,
            }
          ),
          selectedKey
        );
      }

      if (!proposal?.proposalId) {
        throw new Error('Swop could not create the approval ticket. Try again.');
      }

      const getApprovalResultForProposal = (
        candidate: AgentActionProposal
      ) => {
        if (
          existingApprovalResult?.payload?.proposalId ===
          candidate.proposalId
        ) {
          return existingApprovalResult;
        }
        if (
          candidate.approvalResult?.payload?.proposalId ===
          candidate.proposalId
        ) {
          return candidate.approvalResult;
        }
        return null;
      };

      let approvalResult =
        getApprovalResultForProposal(proposal) ||
        null;

      if (!approvalResult) {
        try {
          approvalResult = await onApproveInlineProposal(
            proposal.proposalId,
            approvalParams
          );
        } catch (approvalError) {
          if (!isProposalNoLongerPendingError(approvalError)) {
            throw approvalError;
          }

          proposal = await onPrepareBet(
            buildPolymarketBetPrompt(
              market,
              selectedOutcome,
              isLimitOrder ? orderShares : stake,
              {
                orderType: orderMode,
                limitPriceCents: isLimitOrder ? limitPrice : undefined,
              }
            ),
            selectedKey
          );
          if (!proposal?.proposalId) {
            throw new Error(
              'Swop could not refresh the approval ticket. Try again.'
            );
          }
          approvalResult = await onApproveInlineProposal(
            proposal.proposalId,
            approvalParams
          );
        }
      }
      if (!approvalResult?.payload?.proposalId) {
        throw new Error('Swop approval was not returned by the backend.');
      }
      persistAgentActionHandoff(approvalResult);

      const orderResult = await submitOrder({
        tokenId: selectedTokenId,
        conditionId: market.conditionId || market.id || undefined,
        size: isLimitOrder ? orderShares : stakeValue,
        side: 'BUY',
        negRisk: undefined,
        price: isLimitOrder ? limitPriceDecimal : undefined,
        isMarketOrder: !isLimitOrder,
        fillType: isLimitOrder ? undefined : 'FOK',
        showWalletUIs: false,
      });

      const estimatedShares = orderShares;
      const completionDraft: Omit<
        AgentActionCompletion,
        | 'proposalId'
        | 'proposalNonce'
        | 'invocationId'
        | 'agentId'
        | 'groupId'
        | 'action'
        | 'toolType'
      > & { proposalId?: string } = {
        proposalId: proposal.proposalId,
        status: 'executed',
        provider: 'polymarket',
        title: question,
        subtitle: `${selectedLabel} · buy ${orderMode}`,
        subject: selectedLabel,
        side: 'BUY',
        stake: orderCost,
        toWin: Math.max(0, estimatedShares - orderCost),
        payout: estimatedShares,
        orderId: orderResult.orderId,
        explorerLabel: orderResult.orderId ? 'View order' : undefined,
        executionResult: {
          orderId: orderResult.orderId,
          marketId: market.conditionId || market.id,
          marketTitle: question,
          outcome: selectedLabel,
          side: 'BUY',
          shares: estimatedShares,
          price: effectiveProbability,
          orderType: orderMode,
          tokenId: selectedTokenId,
        },
      };

      const localCompletion = {
          ...completionDraft,
          proposalId: proposal.proposalId,
          placedAt: new Date().toISOString(),
        } as AgentActionCompletion;
      let completion = localCompletion;
      try {
        completion =
          (await completeAgentActionFromHandoff(
            completionDraft,
            accessToken
          )) || localCompletion;
      } catch (completionError) {
        console.warn(
          'Polymarket order placed, but Swop completion reporting failed:',
          completionError
        );
      }

      setLocalReceipt(completion);
      onInlineActionComplete(completion);
      toast.success('Prediction ticket confirmed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to place bet.';
      setTradeError(message);
      toast.error(message);
    } finally {
      confirmInFlightRef.current = false;
      setIsConfirming(false);
    }
  };

  if (localReceipt) {
    if (hasRenderedReceiptIdentity(localReceipt, renderedReceiptIdentityKeys)) {
      return null;
    }

    return (
      <AgentActionReceiptCard
        receipt={localReceipt}
        onDone={() => setLocalReceipt(null)}
      />
    );
  }

  if (selectedOutcome) {
    const selectedShellClass = embeddedInGroup
      ? 'overflow-hidden bg-[#15171d] text-xs'
      : `${AGENT_PANEL_CLASS} overflow-hidden text-xs`;

    return (
      <div className={selectedShellClass}>
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-3.5 py-3">
          <button
            type="button"
            onClick={() => setSelectedOutcome(null)}
            disabled={isBusy}
            className="dm-btn grid h-7 w-7 place-items-center rounded-[8px] border border-white/[0.07] bg-black/25 text-[#9396a0] disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="dm-mono min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
            {isLimitOrder ? 'limit order · polymarket' : 'bet slip · polymarket'}
          </div>
          {timing && (
            <div className="dm-mono inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#ff5d63]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5d63]" />
              {timing}
            </div>
          )}
        </div>

        <div className="p-3.5">
          <div
            className="mb-3.5 flex items-center justify-between gap-3 rounded-[11px] border px-3 py-2.5"
            style={{
              borderColor: `${selectedAccent}66`,
              background: `${selectedAccent}14`,
            }}
          >
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold text-[#eceef2]">
                {selectedLabel}
              </div>
              <div className="dm-mono mt-0.5 line-clamp-2 text-[10.5px] text-[#5a5e69]">
                {question}
              </div>
            </div>
            <div
              className="dm-mono flex-shrink-0 text-[17px] font-bold"
              style={{ color: selectedAccent }}
            >
              {isLimitOrder
                ? limitPrice
                  ? `${limitPrice}¢ limit`
                  : 'set limit'
                : selectedPriceLabel || 'mkt'}
            </div>
          </div>

          <div className="mb-3.5 grid grid-cols-2 rounded-[11px] border border-white/[0.07] bg-black/25 p-1">
            {(['market', 'limit'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setOrderMode(mode);
                  setTradeError(null);
                  if (mode === 'limit' && !limitPrice) {
                    setLimitPrice(String(Math.round(selectedProbability * 100)));
                  }
                }}
                disabled={isBusy}
                className={`dm-btn rounded-[9px] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] disabled:opacity-50 ${
                  orderMode === mode
                    ? 'bg-[#eceef2] text-[#071008]'
                    : 'text-[#737783] hover:text-[#eceef2]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {isLimitOrder && (
            <div className="mb-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="dm-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                  limit price
                </span>
                <span className="dm-mono text-[10px] text-[#5a5e69]">
                  current {selectedPriceLabel || 'mkt'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-[11px] border border-white/[0.07] bg-black px-3.5 py-2.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="99"
                  step="1"
                  value={limitPrice}
                  onChange={(event) =>
                    setLimitPrice(
                      event.target.value.replace(/[^\d]/g, '').slice(0, 2)
                    )
                  }
                  disabled={isBusy}
                  className="dm-mono min-w-0 flex-1 bg-transparent text-xl font-bold tracking-[-0.02em] text-[#eceef2] outline-none disabled:opacity-60"
                />
                <span className="dm-mono text-[11px] text-[#5a5e69]">
                  cents
                </span>
              </div>
            </div>
          )}

          <div className="rounded-[12px] border border-white/[0.07] bg-black/35 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="dm-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                amount
              </span>
              <span className="dm-mono text-[10px] text-[#5a5e69]">
                {Math.round(effectiveProbability * 100)}¢ / share
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-[11px] border border-white/[0.07] bg-black px-3.5 py-2.5">
              <span className="dm-mono text-xl font-bold text-[#9396a0]">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.5"
                value={stake}
                onChange={(event) => setStake(event.target.value)}
                disabled={isBusy}
                className="dm-mono min-w-0 flex-1 bg-transparent text-xl font-bold tracking-[-0.02em] text-[#eceef2] outline-none disabled:opacity-60"
              />
              <span className="dm-mono text-[11px] text-[#5a5e69]">
                USDC
              </span>
            </div>

            <div className="mt-3">
              <input
                type="range"
                min="1"
                max={amountDialMax}
                step="0.5"
                value={Math.min(
                  amountDialMax,
                  Math.max(1, Number.isFinite(stakeValue) ? stakeValue : 1)
                )}
                onChange={(event) =>
                  setStake(formatPredictionAmountInput(Number(event.target.value)))
                }
                disabled={isBusy}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#23262e] accent-[#3fe08f] disabled:cursor-wait disabled:opacity-60"
                aria-label="Adjust bet amount"
              />
            </div>

            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[1, 5, 10, 25].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setStake(String(chip))}
                  disabled={isBusy}
                  className="dm-btn rounded-[8px] border px-2 py-1.5 text-[11.5px] font-bold disabled:opacity-50"
                  style={{
                    borderColor:
                      Math.abs(stakeValue - chip) < 0.001
                        ? `${selectedAccent}66`
                        : 'rgba(255,255,255,0.07)',
                    background:
                      Math.abs(stakeValue - chip) < 0.001
                        ? `${selectedAccent}16`
                        : '#15171d',
                    color:
                      Math.abs(stakeValue - chip) < 0.001
                        ? selectedAccent
                        : '#9396a0',
                  }}
                >
                  ${chip}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[10px] border border-white/[0.07] bg-[#101217] px-3 py-2">
                <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                  cost
                </div>
                <div className="dm-mono mt-1 text-[14px] font-bold text-[#eceef2]">
                  {formatCompactUsd(orderCost)}
                </div>
              </div>
              <div className="rounded-[10px] border border-white/[0.07] bg-[#101217] px-3 py-2">
                <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                  shares
                </div>
                <div className="dm-mono mt-1 text-[14px] font-bold text-[#3fe08f]">
                  {formatPredictionShares(orderShares)}
                </div>
              </div>
            </div>

            <div className="mt-2 flex justify-between gap-3 border-t border-dashed border-white/[0.07] pt-2">
              <span className="dm-mono text-xs text-[#9396a0]">to win</span>
              <span className="dm-mono text-[13px] font-bold text-[#3ddc97]">
                +{formatCompactUsd(payout.profit)}
              </span>
            </div>
          </div>

          <div
            className={`mt-3 rounded-[10px] border px-3 py-2 text-[11px] ${
              needsPredictionFunds
                ? 'border-[#e8920f]/25 bg-[#e8920f]/10 text-[#ffd08a]'
                : hasInvalidLimitPrice
                ? 'border-[#e8920f]/25 bg-[#e8920f]/10 text-[#ffd08a]'
                : isBelowMinimum
                ? 'border-[#e8920f]/25 bg-[#e8920f]/10 text-[#ffd08a]'
                : 'border-white/[0.07] bg-black/25 text-[#9396a0]'
            }`}
          >
            {isBalanceLoading ? (
              'Checking Polymarket balance...'
            ) : hasInvalidLimitPrice ? (
              'Limit price must be between 1¢ and 99¢.'
            ) : isBelowMinimum ? (
              'Minimum Polymarket order is $1.00.'
            ) : needsPredictionFunds ? (
              <>
                Add funds first. Available pUSD is{' '}
                <span className="font-semibold text-[#eceef2]">
                  {formatCompactUsd(availableUsdc)}
                </span>
                {predictionShortfall > 0
                  ? `, ${formatCompactUsd(predictionShortfall)} short.`
                  : '.'}
              </>
            ) : (
              <>
                Available pUSD{' '}
                <span className="font-semibold text-[#eceef2]">
                  {formatCompactUsd(availableUsdc)}
                </span>
                .
              </>
            )}
          </div>
          {tradeError && (
            <div className="mt-2 rounded-[10px] border border-[#ff5d63]/25 bg-[#ff5d63]/10 px-3 py-2 text-[11px] text-[#ffb2b6]">
              {tradeError}
            </div>
          )}
          {activeOrderStage && (
            <div className="mt-2 rounded-[10px] border border-[#3fe08f]/25 bg-[#3fe08f]/10 px-3 py-2 text-[11px] text-[#a9f7cc]">
              {getInlineOrderStageHint(orderStage)}
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmBet}
            disabled={(!canConfirmBet && !needsPredictionFunds) || isBusy}
            className="dm-btn mt-3.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-[#3fe08f] px-3 font-bold tracking-[0.08em] text-[#071008] disabled:cursor-wait disabled:opacity-60"
          >
            {(isSelectedPending || isInlineProposalPending || isConfirming || isSubmittingOrder) && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            {needsPredictionFunds ? (
              <>
                <Plus className="h-3.5 w-3.5" />
                ADD FUNDS
              </>
            ) : needsTradingSetup
              ? isConfirming
                ? 'SETTING UP...'
                : 'ENABLE TRADING'
              : inlineStatus === 'executed'
              ? 'BET CONFIRMED'
              : activeOrderStage
              ? getInlineOrderStageButtonLabel(orderStage)
              : isConfirming
              ? 'APPROVING...'
              : isLimitOrder
              ? `CONFIRM LIMIT · ${formatCompactUsd(orderCost)} · ${formatPredictionShares(orderShares)} SH`
              : `CONFIRM BET · ${formatCompactUsd(orderCost)} · ${formatPredictionShares(orderShares)} SH`}
          </button>
          {inlineProposal?.proposalId && inlineStatus !== 'approved' && inlineStatus !== 'executed' && (
            <button
              type="button"
              onClick={() => onRejectProposal(inlineProposal.proposalId)}
              disabled={!canAct || isInlineProposalPending}
              className="dm-btn mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-white/[0.07] bg-black/20 px-3 text-[12px] font-semibold text-[#eceef2] disabled:cursor-wait disabled:opacity-60"
            >
              <Ban className="h-3.5 w-3.5" />
              Reject ticket
            </button>
          )}
          <div className="dm-mono mt-2 text-center text-[9.5px] text-[#5a5e69]">
            {inlineProposal?.proposalId
              ? 'Swop validated · self-custodied'
              : 'self-custodied · no chat prompt sent · swop book'}
          </div>
        </div>
      </div>
    );
  }

  if (embeddedInGroup) {
    const groupContextTitle = formatGroupedPolymarketMarketTitle(
      market,
      displayQuestion,
      groupTitle
    );
    const groupContextMeta = formatGroupedPolymarketMarketMeta(
      market,
      displayQuestion,
      groupTitle
    );

    return (
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <div className="mb-2 min-w-0">
          <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#5a5e69]">
            {displayQuestion.kicker}
          </div>
          <div
            className="mt-1 line-clamp-2 min-w-0 break-words text-[12.5px] font-semibold leading-snug text-[#eceef2] [overflow-wrap:anywhere]"
            title={groupContextTitle}
          >
            {groupContextTitle}
          </div>
          {groupContextMeta ? (
            <div className="dm-mono mt-1 truncate text-[9.5px] font-semibold text-[#5a5e69]">
              {groupContextMeta}
            </div>
          ) : null}
        </div>
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <button
            type="button"
            onClick={() => setSelectedOutcome('yes')}
            disabled={isPreparing}
            className="dm-btn inline-flex h-11 min-w-0 max-w-full items-center justify-between gap-2 rounded-[9px] border border-[#3fe08f]/40 bg-[#3fe08f]/12 px-3 font-semibold text-[#eceef2] hover:bg-[#3fe08f]/18 disabled:cursor-wait disabled:opacity-70"
          >
            <span className="min-w-0 truncate">{outcomes.yes}</span>
            <span className="dm-mono shrink-0 font-bold text-[#3fe08f]">
              {yesPrice || 'mkt'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedOutcome('no')}
            disabled={isPreparing}
            className="dm-btn inline-flex h-11 min-w-0 max-w-full items-center justify-between gap-2 rounded-[9px] border border-white/[0.07] bg-[#15171d] px-3 font-semibold text-[#eceef2] hover:border-[#ff5d63]/35 hover:bg-[#ff5d63]/10 disabled:cursor-wait disabled:opacity-70"
          >
            <span className="min-w-0 truncate">{outcomes.no}</span>
            <span className="dm-mono shrink-0 font-bold text-[#3fe08f]">
              {noPrice || 'mkt'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${AGENT_PANEL_CLASS} overflow-hidden p-3 text-xs`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="dm-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
            prediction market
          </div>
          <div className="mt-1 line-clamp-2 font-semibold leading-snug text-[#eceef2]">
            {question}
          </div>
        </div>
        {timing && (
          <span className="dm-mono shrink-0 rounded-[5px] border border-white/[0.07] bg-black/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#3fe08f]">
            {timing}
          </span>
        )}
      </div>

      <MiniPolymarketChart market={market} preferLiveHistory={preferLiveChart} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSelectedOutcome('yes')}
          disabled={isPreparing}
          className="dm-btn inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-[8px] bg-[#3fe08f] px-2 font-semibold text-[#031008] hover:bg-[#64f2aa] disabled:cursor-wait disabled:opacity-70"
        >
          <span className="truncate">
            {outcomes.yes} {yesPrice}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedOutcome('no')}
          disabled={isPreparing}
          className="dm-btn inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-[8px] border border-[#ff5d63]/35 bg-[#ff5d63]/10 px-2 font-semibold text-[#ffb2b6] hover:bg-[#ff5d63]/20 disabled:cursor-wait disabled:opacity-70"
        >
          <span className="truncate">
            {outcomes.no} {noPrice}
          </span>
        </button>
      </div>
      <div className="dm-mono mt-3 flex items-center justify-between border-t border-dashed border-white/[0.07] pt-2.5 text-[10px]">
        <span className="text-[#5a5e69]">self-custodied · swop book</span>
        <span className="text-[#9396a0]">tap an odd to bet →</span>
      </div>
    </div>
  );
}

function MiniPolymarketChart({
  market,
  preferLiveHistory,
}: {
  market: PolymarketMarketPreview;
  preferLiveHistory: boolean;
}) {
  const yesTokenId = getPolymarketTokenId(market, 'yes');
  const noTokenId = getPolymarketTokenId(market, 'no');
  const yesProbability = parsePolymarketProbability(market.yesPrice, 0.5);
  const noProbability = parsePolymarketProbability(
    market.noPrice,
    1 - yesProbability
  );
  const { yesHistory, noHistory, loading } = usePolymarketPriceHistory(
    yesTokenId,
    noTokenId,
    Boolean(preferLiveHistory && yesTokenId && noTokenId)
  );
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const seed =
    market.conditionId || market.id || market.slug || market.question || 'market';
  const { yesSeries, noSeries, tMin, tMax, pMin, pMax, hasLiveHistory } =
    useMemo(() => {
      const hasHistory = yesHistory.length >= 2 && noHistory.length >= 2;
      const yesSeriesNext = hasHistory
        ? yesHistory
        : buildSyntheticProbabilitySeries(yesProbability, `${seed}:yes`);
      const noSeriesNext = hasHistory
        ? noHistory
        : buildSyntheticProbabilitySeries(noProbability, `${seed}:no`);
      const combined = [...yesSeriesNext, ...noSeriesNext];
      const times = combined.map((point) => point.t);
      const values = combined.map((point) => point.p);
      const minValue = Math.max(0, Math.min(...values) - 0.08);
      const maxValue = Math.min(1, Math.max(...values) + 0.08);

      return {
        yesSeries: yesSeriesNext,
        noSeries: noSeriesNext,
        tMin: Math.min(...times),
        tMax: Math.max(...times),
        pMin: minValue,
        pMax: maxValue <= minValue ? Math.min(1, minValue + 0.1) : maxValue,
        hasLiveHistory: hasHistory,
      };
    }, [yesHistory, noHistory, yesProbability, noProbability, seed]);

  const yesPath = historyToMiniPath(yesSeries, tMin, tMax, pMin, pMax);
  const noPath = historyToMiniPath(noSeries, tMin, tMax, pMin, pMax);
  const chartWidth = 260;
  const chartHeight = 86;
  const activeYesPoint =
    activeIndex === null ? null : yesSeries[activeIndex] || null;
  const activeNoPoint = activeYesPoint
    ? getNearestHistoryPoint(noSeries, activeYesPoint.t)
    : null;
  const activeX = activeYesPoint
    ? ((activeYesPoint.t - tMin) / Math.max(1, tMax - tMin)) * chartWidth
    : null;
  const activeYesY = activeYesPoint
    ? chartHeight -
      ((activeYesPoint.p - pMin) / Math.max(0.0001, pMax - pMin)) *
        chartHeight
    : null;
  const activeNoY = activeNoPoint
    ? chartHeight -
      ((activeNoPoint.p - pMin) / Math.max(0.0001, pMax - pMin)) *
        chartHeight
    : null;
  const displayYesProbability = activeYesPoint?.p ?? yesProbability;
  const displayNoProbability = activeNoPoint?.p ?? noProbability;
  const activeTimeLabel = activeYesPoint
    ? formatPolymarketChartTime(activeYesPoint.t)
    : '';

  const updateActivePoint = useCallback(
    (clientX: number) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect || yesSeries.length < 2) return;

      const ratio = clampRatio((clientX - rect.left) / rect.width);
      setActiveIndex(Math.round(ratio * (yesSeries.length - 1)));
    },
    [yesSeries.length]
  );

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    updateActivePoint(event.clientX);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    updateActivePoint(event.clientX);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') {
      setActiveIndex(null);
    }
  };

  return (
    <div
      ref={chartRef}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={(event) => {
        if (yesSeries.length < 2) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        setActiveIndex((current) => {
          const nextIndex =
            current === null
              ? yesSeries.length - 1
              : current + (event.key === 'ArrowRight' ? 1 : -1);
          return Math.max(0, Math.min(yesSeries.length - 1, nextIndex));
        });
      }}
      className="group/chart cursor-crosshair rounded-[10px] border border-white/[0.07] bg-black/30 p-2 outline-none transition-colors hover:border-[#3fe08f]/30 focus-visible:border-[#3fe08f]/50 focus-visible:ring-2 focus-visible:ring-[#3fe08f]/15"
      aria-label="Interactive Polymarket probability chart. Hover, tap, or use arrow keys to inspect prices."
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="dm-mono text-[#9396a0]">full probability</span>
        <span className="text-[#5a5e69]">
          {activeTimeLabel || (loading ? 'loading' : hasLiveHistory ? 'live' : 'preview')}
        </span>
      </div>
      <svg
        viewBox="0 0 260 86"
        role="img"
        aria-label="Polymarket probability chart"
        className="h-24 w-full overflow-visible"
      >
        <defs>
          <linearGradient id={`yes-fill-${hashId(seed)}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7df7b2" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7df7b2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 18 H260 M0 43 H260 M0 68 H260" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        {yesPath && (
          <>
            <path
              d={`${yesPath} L 260 86 L 0 86 Z`}
              fill={`url(#yes-fill-${hashId(seed)})`}
              opacity="0.8"
            />
            <path
              d={yesPath}
              fill="none"
              stroke="#7df7b2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </>
        )}
        {noPath && (
          <path
            d={noPath}
            fill="none"
            stroke="#ff8791"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.75"
            strokeWidth="1.8"
          />
        )}
        {activeX !== null && (
          <>
            <line
              x1={activeX}
              x2={activeX}
              y1="0"
              y2="86"
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            {activeYesY !== null && (
              <circle
                cx={activeX}
                cy={activeYesY}
                r="3.5"
                fill="#7df7b2"
                stroke="#071008"
                strokeWidth="1.5"
              />
            )}
            {activeNoY !== null && (
              <circle
                cx={activeX}
                cy={activeNoY}
                r="3"
                fill="#ff8791"
                stroke="#071008"
                strokeWidth="1.5"
              />
            )}
          </>
        )}
      </svg>
      <div className="dm-mono mt-1 flex items-center justify-between gap-3 text-[11px]">
        <span className="text-[#3fe08f]">
          Yes {Math.round(displayYesProbability * 100)}%
        </span>
        {activeTimeLabel && (
          <span className="hidden rounded-full border border-white/[0.07] bg-black/35 px-2 py-0.5 text-[9px] text-[#9396a0] sm:inline">
            inspect
          </span>
        )}
        <span className="text-[#ffb2b6]">
          No {Math.round(displayNoProbability * 100)}%
        </span>
      </div>
    </div>
  );
}

function usePolymarketPriceHistory(
  yesTokenId: string | undefined,
  noTokenId: string | undefined,
  enabled: boolean
) {
  const [yesHistory, setYesHistory] = useState<HistoryPoint[]>([]);
  const [noHistory, setNoHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !yesTokenId || !noTokenId) {
      setYesHistory([]);
      setNoHistory([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchOne = (tokenId: string) =>
      fetch(
        `/api/polymarket/prices-history?tokenId=${encodeURIComponent(
          tokenId
        )}&interval=max&fidelity=30`
      )
        .then((response) => (response.ok ? response.json() : { history: [] }))
        .then((payload) => {
          const raw = Array.isArray(payload?.history) ? payload.history : [];
          return raw
            .map((point: { t?: number; p?: number | string }) => ({
              t: Number(point.t),
              p: Number(point.p),
            }))
            .filter(
              (point: HistoryPoint) =>
                Number.isFinite(point.t) &&
                Number.isFinite(point.p) &&
                point.p >= 0 &&
                point.p <= 1
            );
        })
        .catch(() => [] as HistoryPoint[]);

    Promise.all([fetchOne(yesTokenId), fetchOne(noTokenId)]).then(
      ([yes, no]) => {
        if (cancelled) return;
        setYesHistory(yes);
        setNoHistory(no);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [enabled, yesTokenId, noTokenId]);

  return { yesHistory, noHistory, loading };
}

function parsePolymarketProbability(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return clampProbability(fallback);
  return clampProbability(number > 1 ? number / 100 : number);
}

function clampProbability(value: number) {
  return Math.max(0.01, Math.min(0.99, value));
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function getNearestHistoryPoint(series: HistoryPoint[], timestamp: number) {
  if (!series.length) return null;

  return series.reduce((nearest, point) =>
    Math.abs(point.t - timestamp) < Math.abs(nearest.t - timestamp)
      ? point
      : nearest
  );
}

function formatPolymarketChartTime(timestamp: number) {
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildSyntheticProbabilitySeries(endProbability: number, seed: string) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 24 * 60 * 60;
  const points = 18;
  const startProbability = clampProbability(
    endProbability + (seededRand(seed, 0) - 0.5) * 0.16
  );

  return Array.from({ length: points }, (_, index) => {
    const ratio = index / (points - 1);
    const trend =
      startProbability + (endProbability - startProbability) * ratio;
    const wave =
      Math.sin((ratio * Math.PI * 2.2) + seededRand(seed, 1) * 2) * 0.025;
    const noise = (seededRand(seed, index + 3) - 0.5) * 0.035;

    return {
      t: start + Math.round((now - start) * ratio),
      p: clampProbability(trend + wave + noise * (1 - ratio * 0.45)),
    };
  });
}

function historyToMiniPath(
  series: HistoryPoint[],
  tMin: number,
  tMax: number,
  pMin: number,
  pMax: number
) {
  if (series.length < 2) return '';
  const width = 260;
  const height = 86;
  const span = Math.max(1, tMax - tMin);
  const probabilitySpan = Math.max(0.0001, pMax - pMin);
  const points = series.map((point) => ({
    x: ((point.t - tMin) / span) * width,
    y: height - ((point.p - pMin) / probabilitySpan) * height,
  }));

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    const controlX = ((previous.x + next.x) / 2).toFixed(2);
    d += ` C ${controlX} ${previous.y.toFixed(2)}, ${controlX} ${next.y.toFixed(
      2
    )}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return d;
}

function seededRand(seed: string, salt: number) {
  let hash = 2166136261;
  const input = `${seed}:${salt}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function hashId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'market';
}

function isSyntheticPolymarketPrepareMessage(message: Message) {
  const text = String(message.message || '').trim();
  return (
    /(?:^|\s)@?astro\b.*\bprepare\s+a\s+Polymarket\s+BUY\b/i.test(text) &&
    /\b(marketId|conditionId|slug|tokenId|outcomeLabel)\b/i.test(text)
  );
}

function isGenericAgentProposalText(value: string) {
  return /I can prepare that for approval\. Swop will validate the details before anything is signed\./i.test(
    value || ''
  );
}

function parseMarketArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function marketScalar(value: unknown): string | number | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

function normalizePolymarketMarketPreview(
  market: unknown
): PolymarketMarketPreview | null {
  if (!market || typeof market !== 'object') return null;
  const raw = market as Record<string, unknown>;
  const outcomes = parseMarketArray(raw.outcomes);
  const prices = parseMarketArray(raw.outcomePrices);
  const clobTokenIds = parseMarketArray(raw.clobTokenIds);
  const question = String(raw.question || raw.title || '').trim();

  if (!question || clobTokenIds.length === 0) return null;

  return {
    id: String(raw.id || raw.conditionId || '').trim() || null,
    conditionId: String(raw.conditionId || raw.id || '').trim() || null,
    slug: String(raw.slug || '').trim() || null,
    eventTitle: String(raw.eventTitle || '').trim() || null,
    eventSlug: String(raw.eventSlug || '').trim() || null,
    eventLive: Boolean(raw.eventLive),
    gameStartTime:
      String(raw.gameStartTime || raw.eventStartDate || raw.endDateIso || '').trim() ||
      null,
    question,
    clobTokenIds,
    outcomes,
    yesPrice: marketScalar(raw.yesPrice) ?? prices[0] ?? null,
    noPrice: marketScalar(raw.noPrice) ?? prices[1] ?? null,
    volume: marketScalar(raw.volume) ?? marketScalar(raw.volume24hr),
  };
}

function getPolymarketOutcomeLabels(market: PolymarketMarketPreview) {
  return {
    yes: market.outcomes?.[0] || 'Yes',
    no: market.outcomes?.[1] || 'No',
  };
}

function groupPolymarketMarkets(
  markets: PolymarketMarketPreview[]
): PolymarketMarketGroup[] {
  const groups: PolymarketMarketGroup[] = [];
  const byKey = new Map<string, PolymarketMarketGroup>();

  markets.forEach((market) => {
    const eventKey = getPolymarketEventGroupKey(market);
    const key =
      eventKey ||
      `market:${market.conditionId || market.id || market.slug || market.question || groups.length}`;
    const existing = byKey.get(key);

    if (existing) {
      existing.markets.push(market);
      return;
    }

    const nextGroup = {
      key,
      isEventGroup: Boolean(eventKey),
      markets: [market],
    };
    byKey.set(key, nextGroup);
    groups.push(nextGroup);
  });

  return groups;
}

function getPolymarketEventGroupKey(market: PolymarketMarketPreview) {
  const eventSlug = market.eventSlug?.trim();
  if (eventSlug) return `event:${eventSlug.toLowerCase()}`;

  const eventTitle = market.eventTitle?.trim();
  if (eventTitle) return `event:${eventTitle.toLowerCase()}`;

  return '';
}

function humanizePolymarketEventSlug(slug?: string | null) {
  if (!slug) return '';
  return slug
    .replace(/-\d{4}-\d{2}-\d{2}.*/u, '')
    .split('-')
    .filter(Boolean)
    .map((part) =>
      part.length <= 4
        ? part.toUpperCase()
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`
    )
    .join(' ');
}

type PolymarketMarketDisplayLabel = {
  kicker: string;
  title: string;
  detail: string;
};

function formatPolymarketMarketLabel(
  market: PolymarketMarketPreview,
  groupTitle?: string
): PolymarketMarketDisplayLabel {
  const question = market.question || 'Prediction market';
  const normalizedQuestion = question.trim();
  const normalizedGroupTitle = groupTitle?.trim();
  const loweredQuestion = normalizedQuestion.toLowerCase();
  const loweredGroupTitle = normalizedGroupTitle?.toLowerCase();

  if (loweredGroupTitle && loweredQuestion === loweredGroupTitle) {
    return {
      kicker: 'moneyline',
      title: 'Winner',
      detail: '',
    };
  }

  if (/spread/u.test(loweredQuestion)) {
    return {
      kicker: 'spread',
      title: normalizedQuestion.replace(/^spread:\s*/iu, ''),
      detail: '',
    };
  }

  if (/(?:o\/u|over\/under|total)/iu.test(normalizedQuestion)) {
    return {
      kicker: 'total',
      title: normalizedQuestion.replace(/^(?:total|o\/u):\s*/iu, ''),
      detail: '',
    };
  }

  return {
    kicker: 'market',
    title: normalizedQuestion,
    detail: '',
  };
}

function formatGroupedPolymarketMarketTitle(
  market: PolymarketMarketPreview,
  displayQuestion: PolymarketMarketDisplayLabel,
  groupTitle?: string
) {
  const question = market.question?.trim() || '';
  const normalizedGroupTitle = groupTitle?.trim() || '';
  const normalizedTitle = displayQuestion.title.trim();
  const groupKey = normalizeIntentText(normalizedGroupTitle);
  const titleKey = normalizeIntentText(normalizedTitle);
  const questionKey = normalizeIntentText(question);

  if (normalizedTitle && normalizedTitle !== 'Winner' && titleKey !== groupKey) {
    return normalizedTitle;
  }

  if (question && questionKey !== groupKey) {
    return question;
  }

  const slugTailContext = getPolymarketMarketSlugTailLabel(market);
  if (slugTailContext) {
    return slugTailContext;
  }

  const outcomes = getPolymarketOutcomeLabels(market);
  if (
    displayQuestion.kicker === 'moneyline' &&
    !areGenericPolymarketOutcomeLabels(outcomes)
  ) {
    return `${outcomes.yes} vs. ${outcomes.no}`;
  }

  const slugContext = humanizePolymarketEventSlug(
    market.slug || market.eventSlug || ''
  );
  if (slugContext && normalizeIntentText(slugContext) !== groupKey) {
    return slugContext;
  }

  if (displayQuestion.kicker === 'moneyline') return 'Moneyline winner';
  if (displayQuestion.kicker === 'spread') return 'Spread';
  if (displayQuestion.kicker === 'total') return 'Total';
  return 'Market';
}

function formatGroupedPolymarketMarketMeta(
  market: PolymarketMarketPreview,
  displayQuestion: PolymarketMarketDisplayLabel,
  groupTitle?: string
) {
  const pieces: string[] = [];
  const title = formatGroupedPolymarketMarketTitle(
    market,
    displayQuestion,
    groupTitle
  );
  const titleKey = normalizeIntentText(title);

  if (displayQuestion.detail) {
    pieces.push(displayQuestion.detail);
  }

  const readableSlugTail = getPolymarketMarketSlugTailLabel(market);

  if (
    readableSlugTail &&
    !titleKey.includes(normalizeIntentText(readableSlugTail))
  ) {
    pieces.push(readableSlugTail);
  }

  return pieces.slice(0, 2).join(' · ');
}

function getPolymarketMarketSlugTailLabel(market: PolymarketMarketPreview) {
  const slug = market.slug?.trim() || '';
  const eventSlug = market.eventSlug?.trim() || '';

  if (!slug || !eventSlug) return '';
  if (!slug.toLowerCase().startsWith(eventSlug.toLowerCase())) return '';

  return humanizePolymarketEventSlug(
    slug.slice(eventSlug.length).replace(/^-+/u, '')
  );
}

function areGenericPolymarketOutcomeLabels(outcomes: { yes: string; no: string }) {
  return (
    normalizeIntentText(outcomes.yes) === 'yes' &&
    normalizeIntentText(outcomes.no) === 'no'
  );
}

function getPolymarketTokenId(
  market: PolymarketMarketPreview,
  outcome: 'yes' | 'no'
) {
  return market.clobTokenIds?.[outcome === 'yes' ? 0 : 1] || '';
}

function buildPolymarketBetKey(
  market: PolymarketMarketPreview,
  outcome: 'yes' | 'no'
) {
  return [
    market.conditionId || market.id || market.slug || market.question || 'market',
    outcome,
    getPolymarketTokenId(market, outcome),
  ]
    .filter(Boolean)
    .join(':');
}

function orderPrefillMatchesMarket(
  prefill: PolymarketOrderPrefill | null | undefined,
  market: PolymarketMarketPreview,
  yesKey: string,
  noKey: string
) {
  if (!prefill) return false;
  if (prefill.marketKey) {
    return prefill.marketKey === yesKey || prefill.marketKey === noKey;
  }

  const marketKey =
    market.conditionId || market.id || market.slug || market.question || '';
  return Boolean(
    marketKey &&
      prefill.sourceText &&
      normalizeIntentText(prefill.sourceText).includes(
        normalizeIntentText(marketKey)
      )
  );
}

function buildPolymarketBetKeyFromProposal(
  proposal?: AgentActionProposal | null
) {
  if (
    !proposal ||
    proposal.toolType !== 'prediction.write' ||
    (proposal.action !== 'prediction.prepare_order' &&
      proposal.action !== 'prediction.submit_order')
  ) {
    return '';
  }

  const params = proposal.normalizedParams || {};
  const outcome = initialPredictionOutcome(params);
  const tokenId = firstTicketValue(params, ['tokenId', 'token_id', 'asset']);
  const marketKey = firstTicketValue(params, [
    'conditionId',
    'condition_id',
    'marketId',
    'market_id',
    'id',
    'slug',
    'marketSlug',
  ]);

  return [marketKey || 'market', outcome, tokenId].filter(Boolean).join(':');
}

function isInlinePolymarketProposalMessage({
  message,
  proposal,
  proposalId,
  betKey,
  inlineProposalIds,
  inlineProposalsByBetKey,
}: {
  message: Message;
  proposal?: AgentActionProposal | null;
  proposalId: string;
  betKey?: string;
  inlineProposalIds: Set<string>;
  inlineProposalsByBetKey: Record<string, AgentActionProposal>;
}) {
  const isPolymarketOrder =
    proposal?.toolType === 'prediction.write' &&
    (proposal.action === 'prediction.prepare_order' ||
      proposal.action === 'prediction.submit_order');
  if (!isPolymarketOrder) return false;

  if (inlineProposalIds.has(proposalId)) return true;

  if (
    betKey &&
    inlineProposalsByBetKey[betKey]?.proposalId === proposalId
  ) {
    return true;
  }

  return isGenericAgentProposalText(message.message);
}

function formatPolymarketPrice(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  const cents = number <= 1 ? number * 100 : number;
  return `${Math.round(cents)}¢`;
}

function formatPolymarketMarketTiming(market: PolymarketMarketPreview) {
  if (market.eventLive) return 'Live';
  const raw = market.gameStartTime;
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function inferPolymarketLeague(market: PolymarketMarketPreview) {
  const text = [
    market.eventTitle,
    market.eventSlug,
    market.question,
    market.slug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(wnba|fever|valkyries|liberty|lynx|aces|storm|wings|sun|sky|dream|mercury|mystics|sparks|tempo)\b/.test(text)) {
    return 'WNBA';
  }
  if (/\b(nba|lakers|warriors|spurs|thunder|celtics|knicks|nets|heat|bucks|nuggets|suns|mavericks|clippers|kings|grizzlies|rockets|pelicans|jazz|trail blazers|timberwolves|pacers|magic|hornets|hawks|bulls|cavaliers|pistons|raptors|wizards|76ers)\b/.test(text)) {
    return 'NBA';
  }
  if (/\b(mlb|mets|marlins|yankees|dodgers|giants|red sox|cubs|cardinals|phillies|braves|padres|astros|rangers|mariners|blue jays|orioles|rays|twins|tigers|royals|guardians|white sox|athletics|angels|rockies|diamondbacks|brewers|pirates|reds|nationals)\b/.test(text)) {
    return 'MLB';
  }
  if (/\b(nfl|chiefs|eagles|cowboys|giants|jets|patriots|packers|bears|lions|vikings|bills|dolphins|ravens|steelers|bengals|browns|texans|colts|titans|jaguars|broncos|chargers|raiders|commanders|falcons|panthers|saints|buccaneers|cardinals|rams|seahawks|49ers)\b/.test(text)) {
    return 'NFL';
  }
  if (/\b(nhl|rangers|islanders|devils|bruins|maple leafs|canadiens|senators|sabres|penguins|flyers|capitals|hurricanes|panthers|lightning|red wings|blue jackets|blackhawks|wild|jets|predators|blues|stars|avalanche|utah|golden knights|ducks|kings|sharks|kraken|canucks|flames|oilers)\b/.test(text)) {
    return 'NHL';
  }
  if (/\b(soccer|epl|premier league|champions league|mls|liga|serie a|bundesliga|uefa|fifa)\b/.test(text)) {
    return 'SOCCER';
  }
  if (/\b(ufc|mma|boxing)\b/.test(text)) {
    return 'MMA';
  }

  return 'SPORTS';
}

function buildPolymarketBetPrompt(
  market: PolymarketMarketPreview,
  outcome: 'yes' | 'no',
  amount: string | number = 10,
  options?: {
    orderType?: 'market' | 'limit';
    limitPriceCents?: string;
  }
) {
  const tokenId = getPolymarketTokenId(market, outcome);
  const labels = getPolymarketOutcomeLabels(market);
  const outcomeLabel = outcome === 'yes' ? labels.yes : labels.no;
  const normalizedAmount = Number(amount);
  const stake =
    Number.isFinite(normalizedAmount) && normalizedAmount > 0
      ? normalizedAmount
      : 10;
  const orderType = options?.orderType || 'market';
  const limitPriceCents = Number(options?.limitPriceCents || 0);
  const limitPriceDecimal =
    orderType === 'limit' && Number.isFinite(limitPriceCents)
      ? limitPriceCents / 100
      : 0;
  const parts = [
    '@astro prepare a Polymarket BUY',
    outcome.toUpperCase(),
    orderType === 'limit'
      ? `limit order for ${stake} shares`
      : `bet for $${stake}`,
    `on "${
      market.question || market.eventTitle || 'this market'
    }"`,
  ];

  if (market.id) parts.push(`marketId ${market.id}`);
  if (market.conditionId) parts.push(`conditionId ${market.conditionId}`);
  if (market.slug) parts.push(`slug ${market.slug}`);
  if (tokenId) parts.push(`tokenId ${tokenId}`);
  parts.push(`outcome ${outcome}`);
  parts.push(`outcomeLabel "${outcomeLabel}"`);
  parts.push(`orderType ${orderType}`);
  if (orderType === 'limit' && limitPriceDecimal > 0) {
    parts.push(`price ${limitPriceDecimal}`);
  }

  return parts.join(' ');
}

function GroupAgentControls({
  activeAgents,
  agentError,
  availableAgents,
  isLoadingAgents,
  mutationAgentId,
  onAddAgent,
  onMentionAgent,
  onRemoveAgent,
}: {
  activeAgents: GroupAgent[];
  agentError: string | null;
  availableAgents: GroupAgentDescriptor[];
  isLoadingAgents: boolean;
  mutationAgentId: string | null;
  onAddAgent: (agent: GroupAgentDescriptor) => void;
  onMentionAgent: (agent: GroupAgent) => void;
  onRemoveAgent: (agentId: string) => void;
}) {
  const activeIds = new Set(activeAgents.map((agent) => agent.agentId));
  const addableAgents = availableAgents.filter(
    (agent) => !activeIds.has(agent.agentId)
  );
  const showAgentCatalogError = Boolean(agentError && activeAgents.length === 0);

  if (!isLoadingAgents && !agentError && activeAgents.length === 0 && addableAgents.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] bg-[#08090b] px-[22px] py-2">
      {activeAgents.map((agent) => (
        <div
          key={agent.agentId}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#3fe08f]/35 bg-[#3fe08f]/10 pl-2.5 pr-1 text-[12px] font-semibold text-[#3fe08f]"
        >
          <Bot className="h-3 w-3" />
          <button
            type="button"
            title={`Mention ${agent.displayName}`}
            onClick={() => onMentionAgent(agent)}
            className="max-w-28 truncate"
          >
            {agent.displayName}
          </button>
          <button
            type="button"
            title={`Remove ${agent.displayName}`}
            onClick={() => onRemoveAgent(agent.agentId)}
            disabled={mutationAgentId === agent.agentId}
            className="dm-btn grid h-5 w-5 place-items-center rounded-full text-[#3fe08f] hover:bg-[#3fe08f]/10 disabled:opacity-50"
          >
            {mutationAgentId === agent.agentId ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </button>
        </div>
      ))}

      {addableAgents.map((agent) => (
        <button
          key={agent.agentId}
          type="button"
          title={`Add ${agent.displayName}`}
          onClick={() => onAddAgent(agent)}
          disabled={mutationAgentId === agent.agentId}
          className="dm-btn inline-flex h-7 items-center gap-1.5 rounded-full border border-white/[0.07] bg-[#15171d] px-2.5 text-[12px] font-semibold text-[#eceef2] hover:bg-white/[0.05] disabled:opacity-50"
        >
          {mutationAgentId === agent.agentId ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          <span className="max-w-28 truncate">{agent.displayName}</span>
        </button>
      ))}

      {isLoadingAgents && (
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/[0.07] px-2.5 text-xs text-[#9396a0]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading
        </span>
      )}

      {showAgentCatalogError && (
        <span
          title={agentError || undefined}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#e8920f]/25 bg-[#e8920f]/10 px-2.5 text-xs text-[#e8920f]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Agent list unavailable
        </span>
      )}
    </div>
  );
}

function buildPerpsPositionPromptProposal(
  prompt: PerpsPositionPrompt,
  option: PerpsPositionPromptOption
): AgentActionProposal {
  const proposalSeed = [
    option.coin,
    option.side,
    prompt.takeProfitPrice || 'tp',
    prompt.stopLossPrice || 'sl',
  ]
    .join('-')
    .replace(/[^a-zA-Z0-9_-]/g, '-');
  const params = {
    coin: option.coin,
    asset: option.coin,
    side: option.side,
    direction: option.side,
    isBuy: option.side === 'long',
    orderMode: 'tpsl',
    orderType: 'tpsl',
    reduceOnly: true,
    positionTpsl: true,
    price: option.entryPrice || option.markPrice,
    entryPrice: option.entryPrice || option.markPrice,
    markPrice: option.markPrice,
    takeProfitPrice: prompt.takeProfitPrice,
    takeProfit: prompt.takeProfitPrice,
    stopLossPrice: prompt.stopLossPrice,
    stopLoss: prompt.stopLossPrice,
    sizeUsd: option.marginUsed,
    amountUsd: option.marginUsed,
    collateralUsd: option.marginUsed,
    positionValue: option.positionValue,
    sizeCoins: option.sizeCoins,
    positionSizeCoins: option.sizeCoins,
    leverage: String(option.leverage || 1),
    isCross: option.isCross,
    cross: option.isCross,
    liquidationPrice: option.liquidationPrice,
  };

  return {
    proposalId: `${LOCAL_HYPERLIQUID_PROPOSAL_PREFIX}position-${proposalSeed}`,
    toolType: 'perps.write',
    action: 'perps.place_order',
    status: 'pending',
    normalizedParams: params,
    riskSummary: {
      riskLevel: 'high',
      toolType: 'perps.write',
      action: 'perps.place_order',
      mode: 'proposal',
      requiresProposal: true,
      paramKeys: Object.keys(params).sort(),
    },
  };
}

function getHyperliquidPreviewSide(
  position: HyperliquidPositionPreview
): 'long' | 'short' {
  if (position.side === 'short') return 'short';
  if (position.side === 'long') return 'long';
  return toFiniteNumber(position.szi) < 0 ? 'short' : 'long';
}

function getHyperliquidPreviewMarkPrice(
  position: HyperliquidPositionPreview,
  market?: HLMarket
) {
  const size = Math.abs(toFiniteNumber(position.szi));
  const positionValue = toFiniteNumber(position.positionValue);
  const markFromValue = size > 0 && positionValue > 0 ? positionValue / size : 0;
  const marketMark = market ? getPerpsMarkPrice(position.coin, market) : 0;
  return (
    toFiniteNumber(position.markPx) ||
    markFromValue ||
    marketMark ||
    toFiniteNumber(position.entryPx)
  );
}

function formatPerpsRoe(value: unknown) {
  const raw = toFiniteNumber(value);
  const percent = Math.abs(raw) <= 1 ? raw * 100 : raw;
  const digits = Math.abs(percent) >= 10 ? 1 : 2;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(digits)}%`;
}

function HyperliquidPositionsCard({
  summary,
  astroConsoleData,
}: {
  summary: HyperliquidPositionsPreview;
  astroConsoleData: AstroConsoleData;
}) {
  const positions = (summary.positions || []).filter((position) =>
    Boolean(position.coin)
  );
  const accountValue = toFiniteNumber(summary.accountValue);
  const withdrawable = toFiniteNumber(summary.withdrawable);

  return (
    <div className={`${AGENT_PANEL_CLASS} mt-2 w-full overflow-hidden rounded-[14px] text-xs`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-3.5 py-3">
        <div className="min-w-0">
          <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
            hyperliquid positions
          </div>
          <div className="mt-1 text-[15px] font-bold text-[#eceef2]">
            {positions.length
              ? `${positions.length} open position${positions.length === 1 ? '' : 's'}`
              : 'No open positions'}
          </div>
        </div>
        {(accountValue > 0 || withdrawable > 0) && (
          <div className="dm-mono shrink-0 text-right text-[10px] font-semibold text-[#9396a0]">
            {accountValue > 0 && (
              <div className="text-[#eceef2]">{formatCompactUsd(accountValue)}</div>
            )}
            {withdrawable > 0 && (
              <div className="text-[#5a5e69]">
                {formatCompactUsd(withdrawable)} free
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-2 p-3">
        {positions.length === 0 ? (
          <div className="rounded-[10px] border border-[#e8920f]/25 bg-[#e8920f]/10 px-3 py-2 text-[11px] font-semibold text-[#ffd08a]">
            No open Hyperliquid perps positions found.
          </div>
        ) : (
          positions.map((position, index) => {
            const side = getHyperliquidPreviewSide(position);
            const displayCoin =
              position.displayCoin || displayPerpsCoin(position.coin);
            const market = perpsMarketForCoin(
              astroConsoleData.perpsMarkets,
              position.coin
            );
            const size = Math.abs(toFiniteNumber(position.szi));
            const markPrice = getHyperliquidPreviewMarkPrice(position, market);
            const entryPrice = toFiniteNumber(position.entryPx);
            const pnl = toFiniteNumber(position.unrealizedPnl);
            const roe = formatPerpsRoe(position.returnOnEquity);
            const leverageValue = position.leverage?.value || 1;
            const marginMode =
              position.leverage?.type === 'isolated' ? 'isolated' : 'cross';
            const liquidationPrice = toFiniteNumber(position.liquidationPx);
            const marginUsed = toFiniteNumber(position.marginUsed);
            const notional = toFiniteNumber(position.positionValue);
            const liqDistancePct =
              liquidationPrice > 0 && markPrice > 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      side === 'long'
                        ? ((markPrice - liquidationPrice) / markPrice) * 100
                        : ((liquidationPrice - markPrice) / markPrice) * 100
                    )
                  )
                : null;
            const tone =
              side === 'short'
                ? 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ffb2b6]'
                : 'border-[#3fe08f]/30 bg-[#3fe08f]/10 text-[#a9f7cc]';
            const pnlTone = pnl >= 0 ? 'text-[#3fe08f]' : 'text-[#ff5d63]';

            return (
              <div
                key={`${position.coin}-${position.szi || index}`}
                className="rounded-[12px] border border-white/[0.07] bg-black/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`dm-mono rounded-[5px] border px-1.5 py-0.5 text-[9px] font-bold uppercase ${tone}`}
                      >
                        {side} · {leverageValue}x
                      </span>
                      <span className="truncate text-[16px] font-bold text-[#eceef2]">
                        {displayCoin}-PERP
                      </span>
                    </div>
                    <div className="dm-mono mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5a5e69]">
                      {marginMode} margin
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`dm-mono text-[18px] font-black ${pnlTone}`}>
                      {formatSignedUsd(pnl)}
                    </div>
                    <div className={`dm-mono mt-0.5 text-[10px] font-bold ${pnlTone}`}>
                      {roe} ROE
                    </div>
                  </div>
                </div>

                <svg
                  viewBox="0 0 116 48"
                  className={`mt-3 h-10 w-full ${pnl >= 0 ? 'text-[#3fe08f]' : 'text-[#ff5d63]'}`}
                  role="img"
                  aria-label={`${displayCoin} position sparkline`}
                >
                  <path
                    d={perpsSparkPath(116, 48)}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                </svg>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <PerpsMetric
                    label="size"
                    value={`${formatPerpsOrderSize(
                      size,
                      market?.szDecimals ?? 4
                    )} ${displayCoin}`}
                  />
                  <PerpsMetric
                    label="entry"
                    value={`$${formatPerpsPrice(entryPrice)}`}
                  />
                  <PerpsMetric
                    label="mark"
                    value={`$${formatPerpsPrice(markPrice)}`}
                  />
                  <PerpsMetric
                    label="margin"
                    value={formatCompactUsd(marginUsed)}
                  />
                  <PerpsMetric
                    label="notional"
                    value={formatCompactUsd(notional)}
                  />
                  <PerpsMetric
                    label="liq."
                    value={
                      liquidationPrice > 0
                        ? `$${formatPerpsPrice(liquidationPrice)}`
                        : '--'
                    }
                    tone="text-[#ffb2b6]"
                  />
                </div>

                {liqDistancePct !== null && (
                  <div className="mt-3">
                    <div className="mb-1.5 flex justify-between text-[10px] font-semibold text-[#5a5e69]">
                      <span>Liq distance</span>
                      <span className="dm-mono text-[#9396a0]">
                        {liqDistancePct.toFixed(1)}% away
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full ${
                          liqDistancePct < 8 ? 'bg-[#ff5d63]' : 'bg-[#3fe08f]'
                        }`}
                        style={{
                          width: `${Math.max(4, Math.min(100, liqDistancePct))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PerpsPositionPromptCard({
  prompt,
  canAct,
  isPending,
  onApproveInline,
  onInlineActionComplete,
  onReject,
  onAddFunds,
  astroConsoleData,
}: {
  prompt: PerpsPositionPrompt;
  canAct: boolean;
  isPending: boolean;
  onApproveInline: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onReject: (proposalId: string) => void;
  onAddFunds: () => void;
  astroConsoleData: AstroConsoleData;
}) {
  const [selectedOption, setSelectedOption] =
    useState<PerpsPositionPromptOption | null>(
      prompt.options.length === 1 ? prompt.options[0] : null
    );
  const localProposal = useMemo(
    () =>
      selectedOption
        ? buildPerpsPositionPromptProposal(prompt, selectedOption)
        : null,
    [prompt, selectedOption]
  );

  if (localProposal) {
    return (
      <HyperliquidProposalFlowTicket
        proposal={localProposal}
        proposalId={localProposal.proposalId}
        status={localProposal.status || 'pending'}
        canAct={canAct}
        isPending={isPending}
        onApproveInline={onApproveInline}
        onInlineActionComplete={onInlineActionComplete}
        onReject={onReject}
        onAddFunds={onAddFunds}
        astroConsoleData={astroConsoleData}
      />
    );
  }

  return (
    <div className={`${AGENT_PANEL_CLASS} mt-2 overflow-hidden rounded-[14px]`}>
      <div className="border-b border-white/[0.07] px-3.5 py-3">
        <div className="dm-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#3fe08f]">
          choose perps position
        </div>
        <div className="mt-1 text-[12px] text-[#9396a0]">
          {prompt.takeProfitPrice && `TP ${prompt.takeProfitPrice}`}
          {prompt.takeProfitPrice && prompt.stopLossPrice ? ' · ' : ''}
          {prompt.stopLossPrice && `SL ${prompt.stopLossPrice}`}
        </div>
      </div>
      <div className="grid gap-2 p-3">
        {prompt.options.length > 0 ? (
          prompt.options.map((option) => {
            const displayCoin = displayPerpsCoin(option.coin);
            const tone =
              option.side === 'short'
                ? 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ffb2b6]'
                : 'border-[#3fe08f]/30 bg-[#3fe08f]/10 text-[#a9f7cc]';
            return (
              <button
                key={`${option.coin}-${option.side}-${option.sizeCoins}`}
                type="button"
                onClick={() => setSelectedOption(option)}
                disabled={!canAct || isPending}
                className="dm-btn w-full rounded-[11px] border border-white/[0.07] bg-black/20 p-3 text-left hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`dm-mono rounded-[5px] border px-1.5 py-0.5 text-[9px] font-bold uppercase ${tone}`}
                      >
                        {option.side}
                      </span>
                      <span className="truncate text-[14px] font-bold text-[#eceef2]">
                        {displayCoin}-PERP
                      </span>
                    </div>
                    <div className="dm-mono mt-2 text-[10px] text-[#6f7380]">
                      {option.sizeCoins} {displayCoin} · {option.leverage}x{' '}
                      {option.isCross ? 'cross' : 'isolated'}
                    </div>
                  </div>
                  <div className="dm-mono shrink-0 text-right text-[10px] text-[#9396a0]">
                    <div>entry ${formatPerpsPrice(option.entryPrice)}</div>
                    <div>mark ${formatPerpsPrice(option.markPrice)}</div>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-[10px] border border-[#e8920f]/25 bg-[#e8920f]/10 px-3 py-2 text-[11px] text-[#ffd08a]">
            No matching open perps positions found.
          </div>
        )}
      </div>
    </div>
  );
}

function AgentProposalCard({
  proposal,
  proposalId,
  status,
  actionResult,
  canAct,
  isPending,
  onApprove,
  onApproveInline,
  onInlineActionComplete,
  onReject,
  onAddPredictionFunds,
  onAddPerpsFunds,
  astroConsoleData,
  sourceText,
}: {
  proposal?: AgentActionProposal | null;
  proposalId: string;
  status: string;
  actionResult?: AgentActionResultPayload;
  canAct: boolean;
  isPending: boolean;
  onApprove: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => void;
  onApproveInline: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onReject: (proposalId: string) => void;
  onAddPredictionFunds: () => void;
  onAddPerpsFunds: () => void;
  astroConsoleData: AstroConsoleData;
  sourceText?: string;
}) {
  const isOpen = status === 'pending';
  const nextStep = getApprovalNextStep(actionResult?.result);
  const isHyperliquidPerpsAction =
    proposal?.toolType === 'perps.write' &&
    (proposal?.action === 'perps.place_order' ||
      proposal?.action === 'perps.close_position');
  const isPolymarketOrder =
    proposal?.toolType === 'prediction.write' &&
    (proposal?.action === 'prediction.prepare_order' ||
      proposal?.action === 'prediction.submit_order');
  const isWalletSwap =
    proposal?.toolType === 'wallet.write' &&
    (proposal?.action === 'wallet.swap' ||
      proposal?.action === 'swap_tokens');
  const isWalletSend =
    proposal?.toolType === 'wallet.write' &&
    (proposal?.action === 'wallet.send' ||
      proposal?.action === 'transfer_token' ||
      proposal?.action === 'transfer_sol');

  if (isHyperliquidPerpsAction) {
    return (
      <HyperliquidProposalFlowTicket
        proposal={proposal}
        proposalId={proposalId}
        status={status}
        canAct={canAct}
        isPending={isPending}
        onApproveInline={onApproveInline}
        onInlineActionComplete={onInlineActionComplete}
        onReject={onReject}
        onAddFunds={onAddPerpsFunds}
        astroConsoleData={astroConsoleData}
        sourceText={sourceText}
      />
    );
  }

  if (isWalletSwap) {
    return (
      <SwapProposalTicket
        proposal={proposal}
        proposalId={proposalId}
        status={status}
        canAct={canAct}
        isOpen={isOpen}
        isPending={isPending}
        onInlineActionComplete={onInlineActionComplete}
        onReject={onReject}
        astroConsoleData={astroConsoleData}
        sourceText={sourceText}
      />
    );
  }

  if (isWalletSend) {
    const walletSendIntent = proposal?.normalizedParams
      ? { params: proposal.normalizedParams }
      : null;
    if (!walletSendIntentHasNetwork(walletSendIntent)) {
      const token =
        firstTicketValue(proposal?.normalizedParams, [
          'tokenSymbol',
          'token',
          'asset',
          'currency',
        ]) || 'TOKEN';
      const recipient =
        firstTicketValue(proposal?.normalizedParams, [
          'recipientEns',
          'recipientName',
          'recipientAddress',
          'recipient',
          'to',
        ]) || 'recipient';
      return (
        <WalletSendNetworkPromptCard
          prompt={{
            token,
            amount:
              firstTicketValue(proposal?.normalizedParams, [
                'amount',
                'amountUsd',
              ]) || '',
            amountType:
              firstTicketValue(proposal?.normalizedParams, ['amountType']) ||
              (initialTicketBool(proposal?.normalizedParams, ['isUSD'], false)
                ? 'usd'
                : 'token'),
            recipient,
            options: getWalletSendNetworkOptions(
              walletSendIntent,
              astroConsoleData.walletPortfolioTokens
            ),
          }}
          proposal={proposal}
          proposalId={proposalId}
          status={status}
          canAct={canAct}
          isPending={isPending}
          onApproveInline={onApproveInline}
          onInlineActionComplete={onInlineActionComplete}
          onReject={onReject}
          astroConsoleData={astroConsoleData}
        />
      );
    }
    return (
      <WalletSendProposalTicket
        proposal={proposal}
        proposalId={proposalId}
        status={status}
        canAct={canAct}
        isOpen={isOpen}
        isPending={isPending}
        onApproveInline={onApproveInline}
        onInlineActionComplete={onInlineActionComplete}
        onReject={onReject}
        astroConsoleData={astroConsoleData}
      />
    );
  }

  return (
    <div className={`mt-2 w-full max-w-[460px] overflow-visible text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-[#eceef2]">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-[7px] bg-[#3fe08f]/15">
              <ShieldCheck className="h-3.5 w-3.5 text-[#3fe08f]" />
            </span>
            <span className="truncate">
              {formatActionLabel(proposal?.action)}
            </span>
          </div>
          <div className="dm-mono mt-1 truncate text-[10px] text-[#5a5e69]">
            {proposal?.toolType || 'agent action'} · {proposalId}
          </div>
        </div>
        <span
          className={`dm-mono rounded-[5px] px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] ${proposalStatusClass(
            status
          )}`}
        >
          {status}
        </span>
      </div>

      <div className="grid gap-1.5 px-3.5 pt-3">
        {(proposal?.riskSummary?.riskLevel || proposal?.expiresAt) && (
          <div className="dm-mono flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-[#5a5e69]">
            {proposal?.riskSummary?.riskLevel && (
              <span>
                risk{' '}
                <span className="font-semibold capitalize text-[#eceef2]">
                  {proposal.riskSummary.riskLevel}
                </span>
              </span>
            )}
            {proposal?.expiresAt && (
              <span>
                expires{' '}
                <span className="font-semibold text-[#eceef2]">
                  {new Date(proposal.expiresAt).toLocaleTimeString()}
                </span>
              </span>
            )}
          </div>
        )}
        {!isHyperliquidPerpsAction && !isPolymarketOrder && proposal?.normalizedParams &&
          Object.keys(proposal.normalizedParams).length > 0 && (
            <div className="dm-mono mt-1 rounded-[8px] border border-white/[0.07] bg-black/25 p-2 text-[11px] text-[#9396a0]">
              {Object.entries(proposal.normalizedParams)
                .slice(0, 4)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <span>{key}</span>
                    <span className="truncate text-right">
                      {formatParamValue(value)}
                    </span>
                  </div>
                ))}
            </div>
        )}
        {nextStep && (
          <div className="rounded-[8px] border border-[#3fe08f]/15 bg-[#3fe08f]/10 px-2 py-1.5 text-[#dfffee]">
            {nextStep}
          </div>
        )}
      </div>

      {isPolymarketOrder && (
        <PolymarketProposalTicket
          proposal={proposal}
          proposalId={proposalId}
          canAct={canAct}
          isOpen={isOpen}
          isPending={isPending}
          onApprove={onApprove}
          onReject={onReject}
          onAddFunds={onAddPredictionFunds}
          availableUsdc={astroConsoleData.predictionUsdcBalance}
          isBalanceLoading={astroConsoleData.isPredictionBalanceLoading}
          positions={astroConsoleData.predictionPositions}
        />
      )}

      {isOpen && !isHyperliquidPerpsAction && !isPolymarketOrder && (
        <div className="mx-3.5 mb-3 mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onApprove(proposalId)}
            disabled={!canAct || isPending}
            className={TICKET_PRIMARY_BUTTON_CLASS}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Approve
          </button>
          <button
            type="button"
            onClick={() => onReject(proposalId)}
            disabled={!canAct || isPending}
            className={`${TICKET_REJECT_BUTTON_CLASS} flex-1`}
          >
            <Ban className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

const HYPERLIQUID_TICKET_COINS = [
  'BTC',
  'ETH',
  'SOL',
  'HYPE',
  'PAXG',
  'BRENTOIL',
  'NATGAS',
  'SPCX',
  'XRP',
  'DOGE',
];
const HYPERLIQUID_MIN_ORDER_USD = 10;
const HYPERLIQUID_MARKET_ALIASES: Record<string, string[]> = {
  GOLD: ['PAXG', 'GOLD'],
  XAU: ['PAXG', 'GOLD'],
  XAUUSD: ['PAXG', 'GOLD'],
  PAXG: ['PAXG'],
  OIL: ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  BRENT: ['BRENTOIL'],
  BRENTOIL: ['BRENTOIL'],
  'BRENT OIL': ['BRENTOIL'],
  CRUDE: ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  'CRUDE OIL': ['BRENTOIL', 'OIL', 'USOIL', 'WTI'],
  'NATURAL GAS': ['NATGAS'],
  NATGAS: ['NATGAS'],
  'NAT GAS': ['NATGAS'],
  SPACEX: ['SPCX', 'SPACEX'],
  'SPACE X': ['SPCX', 'SPACEX'],
};

function firstTicketValue(
  params: Record<string, unknown> | undefined,
  names: string[]
) {
  if (!params) return '';
  for (const name of names) {
    const value = params[name];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function normalizePerpsMarketQuery(value: string) {
  return value
    .replace(/-?PERP\b/gi, ' ')
    .replace(/[$]/g, '')
    .replace(/[^a-zA-Z0-9: .&/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function compactPerpsMarketKey(value: string) {
  return normalizePerpsMarketQuery(value).replace(/[^A-Z0-9]/g, '');
}

function perpsAliasTargets(value: string) {
  const normalized = normalizePerpsMarketQuery(value);
  const compact = compactPerpsMarketKey(value);
  return [
    ...(HYPERLIQUID_MARKET_ALIASES[normalized] || []),
    ...(HYPERLIQUID_MARKET_ALIASES[compact] || []),
  ];
}

function ticketObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function firstNestedTicketValue(
  params: Record<string, unknown> | undefined,
  names: string[]
) {
  const direct = firstTicketValue(params, names);
  if (direct) return direct;

  const quote = ticketObject(params?.quote);
  const estimate = ticketObject(params?.estimate);
  const route = ticketObject(params?.route);
  return (
    firstTicketValue(quote, names) ||
    firstTicketValue(estimate, names) ||
    firstTicketValue(route, names)
  );
}

function formatSwapAmount(value: unknown) {
  if (value === undefined || value === null || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value).trim();
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: number >= 100 ? 2 : 6,
  }).format(number);
}

function formatSwapPercent(value: unknown) {
  if (value === undefined || value === null || value === '') return '--';
  if (typeof value === 'string' && value.includes('%')) return value.trim();
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value).trim();
  const percent = Math.abs(number) <= 1 ? number * 100 : number;
  return `${percent.toFixed(percent >= 10 ? 1 : 2)}%`;
}

function normalizeWalletSendChainValue(value?: string | number | null): Network {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('arb')) return 'ARBITRUM';
  if (normalized.includes('base')) return 'BASE';
  if (normalized.includes('polygon') || normalized.includes('matic')) {
    return 'POLYGON';
  }
  if (normalized.includes('sol')) return 'SOLANA';
  if (normalized.includes('sepolia')) return 'SEPOLIA';
  return 'ETHEREUM';
}

function getWalletSendChainId(value?: string | number | null) {
  const chain = normalizeWalletSendChainValue(value);
  return CHAIN_ID[chain] || CHAIN_ID[chain.toLowerCase() as keyof typeof CHAIN_ID];
}

function isChatEvmWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function isChatSolanaWalletAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}

function getChatSolanaSignerAddressSet(
  addresses: Array<string | null | undefined>
) {
  return new Set(
    addresses
      .map((address) => String(address || '').trim())
      .filter(Boolean)
  );
}

function isChatWalletSendTokenOwnedBySigner({
  token,
  evmSignerAddresses,
  solanaSignerAddresses,
}: {
  token: TokenData;
  evmSignerAddresses?: Set<string>;
  solanaSignerAddresses?: Set<string>;
}) {
  if (!token.walletAddress) return true;
  if (String(token.chain || '').toUpperCase() === 'SOLANA') {
    return (
      !solanaSignerAddresses?.size ||
      solanaSignerAddresses.has(token.walletAddress)
    );
  }
  const owner = normalizeChatEvmAddress(token.walletAddress);
  return !evmSignerAddresses?.size || evmSignerAddresses.has(owner);
}

function buildChatWalletSendToken({
  symbol,
  chain,
  tokens,
  evmSignerAddresses,
  solanaSignerAddresses,
}: {
  symbol?: string | null;
  chain?: string | number | null;
  tokens: TokenData[];
  evmSignerAddresses?: Set<string>;
  solanaSignerAddresses?: Set<string>;
}) {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  if (!normalizedSymbol) return null;
  const chainName = chain ? normalizeWalletSendChainValue(chain) : '';
  const chainId = chain ? String(getWalletSendChainId(chain) || '') : '';
  const matches = tokens.filter((token) => {
    const tokenSymbol = String(token?.symbol || '').toUpperCase();
    const tokenChain = String(token?.chain || '').toUpperCase();
    const tokenChainId = String(token?.chainId || '');
    return (
      tokenSymbol === normalizedSymbol &&
      (!chainName || tokenChain === chainName || tokenChainId === chainId)
    );
  });
  const ownedMatches = matches.filter((token) =>
    isChatWalletSendTokenOwnedBySigner({
      token,
      evmSignerAddresses,
      solanaSignerAddresses,
    })
  );
  const candidates =
    ownedMatches.length || !matches.some((token) => token.walletAddress)
      ? ownedMatches.length
        ? ownedMatches
        : matches
      : [];

  return (
    candidates.find((token) => Number(token.balance || 0) > 0) ||
    candidates[0] ||
    null
  );
}

function getWalletSendExplorerTxUrl(chain: string, hash: string) {
  const normalized = normalizeWalletSendChainValue(chain);
  if (!hash) return undefined;
  if (normalized === 'SOLANA') return `https://solscan.io/tx/${hash}`;
  if (normalized === 'ARBITRUM') return `https://arbiscan.io/tx/${hash}`;
  if (normalized === 'BASE') return `https://basescan.org/tx/${hash}`;
  if (normalized === 'POLYGON') return `https://polygonscan.com/tx/${hash}`;
  if (normalized === 'SEPOLIA') return `https://sepolia.etherscan.io/tx/${hash}`;
  return `https://etherscan.io/tx/${hash}`;
}

type ChatEvmProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type ChatEvmWalletLike = {
  address?: string | null;
  walletClientType?: string | null;
  chainId?: string | null;
  switchChain?: (chainId: number) => Promise<void>;
  getEthereumProvider?: () => Promise<ChatEvmProvider | null>;
};

function normalizeChatEvmAddress(value?: string | null) {
  const trimmed = String(value || '').trim();
  return isChatEvmWalletAddress(trimmed) ? trimmed.toLowerCase() : '';
}

function parseChatEvmQuantityToBigInt(value: unknown) {
  if (value === undefined || value === null || value === '') return 0n;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? BigInt(Math.floor(value)) : 0n;
  }
  const raw = String(value).trim();
  if (!raw) return 0n;
  try {
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

function getChatEvmNativeSymbol(chainId: number) {
  if (chainId === 137) return 'POL';
  if (chainId === 56) return 'BNB';
  return 'ETH';
}

function getChatEvmGasBufferWei(chainId: number, transactionCount = 1) {
  const count = BigInt(Math.max(1, transactionCount));
  if (chainId === 1) return ethers.parseEther('0.001') * count;
  if (chainId === 137) return ethers.parseEther('0.2') * count;
  if (chainId === 56) return ethers.parseEther('0.0002') * count;
  return ethers.parseEther('0.00005') * count;
}

function formatChatEvmNativeAmount(valueWei: bigint) {
  const value = ethers.formatEther(valueWei);
  return formatSwapAmount(value || '0') || '0';
}

function getChatEvmWalletCandidates(
  wallets: ChatEvmWalletLike[],
  preferredAddresses: Array<string | null | undefined>
) {
  const preferred = Array.from(
    new Set(preferredAddresses.map(normalizeChatEvmAddress).filter(Boolean))
  );
  return [...wallets]
    .filter((wallet) => normalizeChatEvmAddress(wallet.address))
    .sort((a, b) => {
      const aAddress = normalizeChatEvmAddress(a.address);
      const bAddress = normalizeChatEvmAddress(b.address);
      const aPreferred = preferred.indexOf(aAddress);
      const bPreferred = preferred.indexOf(bAddress);
      if (aPreferred !== bPreferred) {
        if (aPreferred === -1) return 1;
        if (bPreferred === -1) return -1;
        return aPreferred - bPreferred;
      }
      if (a.walletClientType === 'privy' && b.walletClientType !== 'privy') {
        return -1;
      }
      if (a.walletClientType !== 'privy' && b.walletClientType === 'privy') {
        return 1;
      }
      return 0;
    });
}

async function resolveChatEvmWalletForTransaction({
  wallets,
  chainId,
  preferredAddresses,
  requiredNativeWei,
  networkLabel,
}: {
  wallets: ChatEvmWalletLike[];
  chainId: number;
  preferredAddresses: Array<string | null | undefined>;
  requiredNativeWei: bigint;
  networkLabel: string;
}) {
  const chain = getChatSwapViemChain(chainId);
  if (!chain) throw new Error(`Unsupported ${networkLabel} network.`);

  const candidates = getChatEvmWalletCandidates(wallets, preferredAddresses);
  if (!candidates.length) {
    throw new Error('No connected EVM signing wallet is available.');
  }

  const client = createPublicClient({ chain, transport: http() });
  let bestAddress = '';
  let bestBalance = 0n;

  for (const wallet of candidates) {
    const address = normalizeChatEvmAddress(wallet.address);
    if (!address || !wallet.getEthereumProvider) continue;
    const publicBalance = await client
      .getBalance({ address: address as `0x${string}` })
      .catch(() => 0n);
    if (wallet.switchChain) {
      await wallet.switchChain(chainId).catch(() => undefined);
    }
    const provider = await wallet.getEthereumProvider().catch(() => null);
    const providerBalance = provider
      ? parseChatEvmQuantityToBigInt(
          await provider
            .request({
              method: 'eth_getBalance',
              params: [wallet.address || address, 'latest'],
            })
            .catch(() => 0n)
        )
      : 0n;
    const balance =
      providerBalance > publicBalance ? providerBalance : publicBalance;
    if (balance >= bestBalance) {
      bestBalance = balance;
      bestAddress = wallet.address || address;
    }
    if (balance >= requiredNativeWei && provider) {
      return {
        wallet,
        provider,
        address: wallet.address || address,
        nativeBalanceWei: balance,
      };
    }
  }

  const nativeSymbol = getChatEvmNativeSymbol(chainId);
  const visibleAddress = bestAddress ? formatWalletAddress(bestAddress) : 'it';
  throw new Error(
    `${networkLabel} gas uses ${nativeSymbol} on ${networkLabel}, not mainnet ETH. The signing wallet ${visibleAddress} has ${formatChatEvmNativeAmount(
      bestBalance
    )} ${nativeSymbol} on ${networkLabel}, but this transaction needs about ${formatChatEvmNativeAmount(
      requiredNativeWei
    )} ${nativeSymbol}.`
  );
}

async function resolveChatWalletSendRecipient({
  recipientValue,
  token,
  userId,
  accessToken,
}: {
  recipientValue: string;
  token: TokenData;
  userId?: string | null;
  accessToken?: string | null;
}): Promise<ReceiverData | null> {
  const trimmed = recipientValue.trim().replace(/^@/, '');
  if (!trimmed) return null;

  const tokenChain = String(token.chain || '').toUpperCase();
  if (
    (tokenChain === 'SOLANA' && isChatSolanaWalletAddress(trimmed)) ||
    (tokenChain !== 'SOLANA' && isChatEvmWalletAddress(trimmed))
  ) {
    return { address: trimmed, isEns: false };
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl || !accessToken) return null;

  const url = `${apiUrl}/api/v1/user/search?q=${encodeURIComponent(
    trimmed
  )}&userId=${userId || ''}&filter=all&page=1&limit=10`;
  const data = await getConnectionsUserData(url, accessToken);
  if (data?.state !== 'success') return null;

  const results = data.data?.results || [];
  const normalized = trimmed.toLowerCase();
  const result =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results.find((item: any) => String(item.ens || '').toLowerCase() === normalized) ||
    results[0];
  if (!result) return null;

  const address =
    tokenChain === 'SOLANA'
      ? result.ensData?.solanaAddress
      : result.ensData?.evmAddress;
  if (!address) return null;

  return {
    address,
    ensName: result.ens || trimmed,
    isEns: true,
    avatar: result.profilePic,
  };
}

function WalletSendProposalTicket({
  proposal,
  proposalId,
  status,
  canAct,
  isOpen,
  isPending,
  onApproveInline,
  onInlineActionComplete,
  onReject,
  onChangeNetwork,
  astroConsoleData,
}: {
  proposal?: AgentActionProposal | null;
  proposalId: string;
  status: string;
  canAct: boolean;
  isOpen: boolean;
  isPending: boolean;
  onApproveInline: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onReject: (proposalId: string) => void;
  onChangeNetwork?: () => void;
  astroConsoleData: AstroConsoleData;
}) {
  const { accessToken, user } = useUser();
  const queryClient = useQueryClient();
  const { wallets: evmWallets } = useEvmWallets();
  const { connectWallet } = useConnectWallet();
  const { wallets: solanaWallets, ready: solanaWalletsReady } =
    useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [localReceipt, setLocalReceipt] =
    useState<AgentActionCompletion | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLocallyDismissed, setIsLocallyDismissed] = useState(false);
  const params = proposal?.normalizedParams || {};
  const token =
    firstTicketValue(params, ['tokenSymbol', 'token', 'asset', 'currency']) ||
    'TOKEN';
  const amount = firstTicketValue(params, ['amount', 'amountUsd']) || '0';
  const amountType =
    firstTicketValue(params, ['amountType']) ||
    (initialTicketBool(params, ['isUSD'], false) ? 'usd' : 'token');
  const recipient =
    firstTicketValue(params, [
      'recipientEns',
      'recipientName',
      'recipientAddress',
      'recipient',
      'to',
    ]) || 'recipient';
  const chain = firstTicketValue(params, ['chain', 'network']);
  const isLocalProposal = proposalId.startsWith('local-wallet-send-');
  const sendAmountLabel =
    amountType === 'usd'
      ? `${formatCompactUsd(amount)} in ${token}`
      : `${formatSwapAmount(amount)} ${token}`;
  const selectedNetwork = chain ? normalizeWalletSendChainValue(chain) : null;
  const evmSignerAddresses = useMemo(
    () =>
      getChatSwapSignableAddressSet([
        ...evmWallets.map((wallet) => wallet.address),
        astroConsoleData.evmWalletAddress,
        ...(astroConsoleData.evmWalletAddresses || []),
        astroConsoleData.eoaAddress,
      ]),
    [
      astroConsoleData.eoaAddress,
      astroConsoleData.evmWalletAddress,
      astroConsoleData.evmWalletAddresses,
      evmWallets,
    ]
  );
  const solanaSignerAddresses = useMemo(
    () =>
      getChatSolanaSignerAddressSet(
        [
          ...solanaWallets.map((wallet) => wallet.address),
          astroConsoleData.solWalletAddress,
        ]
      ),
    [astroConsoleData.solWalletAddress, solanaWallets]
  );
  const sendToken = buildChatWalletSendToken({
    symbol: token,
    chain: chain || undefined,
    tokens: astroConsoleData.walletPortfolioTokens,
    evmSignerAddresses,
    solanaSignerAddresses,
  });
  const hasUnsignableMatchingToken = useMemo(() => {
    const chainName = chain ? normalizeWalletSendChainValue(chain) : '';
    const chainId = chain ? String(getWalletSendChainId(chain) || '') : '';
    return astroConsoleData.walletPortfolioTokens.some((walletToken) => {
      const tokenSymbol = String(walletToken?.symbol || '').toUpperCase();
      const tokenChain = String(walletToken?.chain || '').toUpperCase();
      const tokenChainId = String(walletToken?.chainId || '');
      return (
        tokenSymbol === String(token || '').toUpperCase() &&
        Number(walletToken.balance || 0) > 0 &&
        (!chainName || tokenChain === chainName || tokenChainId === chainId) &&
        !isChatWalletSendTokenOwnedBySigner({
          token: walletToken,
          evmSignerAddresses,
          solanaSignerAddresses,
        })
      );
    });
  }, [
    astroConsoleData.walletPortfolioTokens,
    chain,
    evmSignerAddresses,
    solanaSignerAddresses,
    token,
  ]);
  const transactionAmountPreview =
    selectedNetwork && sendToken
      ? (() => {
          try {
            return calculateTransactionAmount({
              step: 'confirm',
              token: sendToken,
              amount,
              isUSD: amountType === 'usd',
              recipient: null,
              nft: null,
              network: selectedNetwork,
            });
          } catch {
            return '';
          }
        })()
      : '';
  const tokenBalance = Number(sendToken?.balance || 0);
  const hasEnoughBalance =
    !transactionAmountPreview ||
    (Number.isFinite(tokenBalance) &&
      tokenBalance + 0.00000001 >= Number(transactionAmountPreview || 0));
  const networkMeta = getWalletSendNetworkMeta(selectedNetwork);
  const displayRecipient =
    recipient.startsWith('0x') || isChatSolanaWalletAddress(recipient)
      ? formatWalletAddress(recipient)
      : recipient;

  const handleConfirmSend = async () => {
    const approvalParams = {
      token,
      tokenSymbol: token,
      asset: token,
      amount,
      amountType,
      isUSD: amountType === 'usd',
      recipient,
      recipientAddress:
        firstTicketValue(params, ['recipientAddress']) || undefined,
      recipientEns:
        firstTicketValue(params, ['recipientEns', 'recipientName']) ||
        (recipient.includes('.') ? recipient : undefined),
      chain: chain || undefined,
      network: chain || undefined,
    };

    if (!sendToken) {
      setSendError(
        hasUnsignableMatchingToken
          ? `That ${token} balance is on ${chain || 'this network'}, but the wallet that owns it is not connected for signing. Reconnect that wallet, then try again.`
          : `No ${token} balance found for ${chain || 'this network'}.`
      );
      return;
    }
    if (!selectedNetwork) {
      setSendError('Pick a network before confirming this send.');
      return;
    }
    if (!hasEnoughBalance) {
      setSendError(
        `Not enough ${token} on ${selectedNetwork}. Pick another network or lower the amount.`
      );
      return;
    }

    setSendError(null);
    setIsConfirming(true);

    try {
      let approvalResult: AgentApprovalHandoff | null = null;
      if (isLocalProposal) {
        approvalResult = {
          status: 'approved',
          nextStep: 'wallet_send_inline_signing_required',
          payload: {
            proposalId,
            action: 'wallet.send',
            toolType: 'wallet.write',
            provider: 'swop',
            route: '/dashboard/chat',
            panel: 'send',
            normalizedParams: approvalParams,
            prefill: approvalParams,
          },
        };
        persistAgentActionHandoff(approvalResult);
      } else {
        approvalResult =
          proposal?.approvalResult?.payload?.proposalId === proposalId
            ? proposal.approvalResult
            : await onApproveInline(proposalId, approvalParams);
        if (!approvalResult?.payload?.proposalId) {
          throw new Error('Swop approval was not returned by the backend.');
        }
        persistAgentActionHandoff(approvalResult);
      }

      const recipientData = await resolveChatWalletSendRecipient({
        recipientValue: recipient,
        token: sendToken,
        userId: user?._id,
        accessToken,
      });
      if (!recipientData) {
        throw new Error('Could not resolve that recipient for this network.');
      }

      const network = normalizeWalletSendChainValue(chain || sendToken.chain);
      const sendFlow: SendFlowState = {
        step: 'confirm',
        token: sendToken,
        amount,
        isUSD: amountType === 'usd',
        recipient: recipientData,
        nft: null,
        network,
      };
      const transactionAmount = calculateTransactionAmount(sendFlow);
      let hash = '';
      let senderAddress = '';

      if (network === 'SOLANA') {
        const selectedSolanaWallet =
          solanaWallets.find(
            (wallet) => wallet.address === astroConsoleData.solWalletAddress
          ) || solanaWallets[0];
        if (!solanaWalletsReady || !selectedSolanaWallet?.address) {
          throw new Error('Solana wallet is not ready yet.');
        }
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
            'https://api.mainnet-beta.solana.com'
        );
        const transaction = await TransactionService.buildSolanaTokenTransfer(
          selectedSolanaWallet,
          sendFlow,
          connection
        );
        const serializedTransaction = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });
        const result = await signAndSendTransaction({
          transaction: new Uint8Array(serializedTransaction),
          wallet: selectedSolanaWallet,
          options: { sponsor: false },
        });
        hash =
          typeof result.signature === 'string'
            ? result.signature
            : bs58.encode(result.signature);
        senderAddress = selectedSolanaWallet.address;
      } else {
        const chainId = getWalletSendChainId(network);
        if (!chainId) throw new Error(`Unsupported ${network} send network.`);
        const nativeValueWei = !sendToken.address
          ? ethers.parseEther(transactionAmount)
          : 0n;
        const requiredNativeWei =
          nativeValueWei + getChatEvmGasBufferWei(chainId);
        const {
          provider,
          address: fromAddress,
        } = await resolveChatEvmWalletForTransaction({
          wallets: evmWallets as ChatEvmWalletLike[],
          chainId,
          preferredAddresses: [
            sendToken.walletAddress,
            astroConsoleData.evmWalletAddress,
            ...(astroConsoleData.evmWalletAddresses || []),
            astroConsoleData.eoaAddress,
          ],
          requiredNativeWei,
          networkLabel: network,
        });
        senderAddress = fromAddress;

        if (!sendToken.address) {
          const result = await provider.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: fromAddress,
                to: recipientData.address,
                value: ethers.toBeHex(nativeValueWei),
                chainId: `0x${chainId.toString(16)}`,
              },
            ],
          });
          hash = String(result || '');
        } else {
          const erc20Interface = new ethers.Interface([
            'function transfer(address to, uint256 amount) returns (bool)',
          ]);
          const amountInWei = ethers.parseUnits(
            transactionAmount,
            sendToken.decimals
          );
          const tokenData = erc20Interface.encodeFunctionData('transfer', [
            recipientData.address,
            amountInWei,
          ]);
          const result = await provider.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: fromAddress,
                to: sendToken.address,
                data: tokenData,
                chainId: `0x${chainId.toString(16)}`,
              },
            ],
          });
          hash = String(result || '');
        }
      }

      try {
        await postAgentWalletSendToFeed({
          accessToken,
          user,
          hash,
          senderAddress,
          recipientAddress: recipientData.address,
          recipientEns: recipientData.isEns ? recipientData.ensName : undefined,
          amount: transactionAmount,
          token: sendToken,
          tokenSymbol: token,
          network,
        });
      } catch (feedError) {
        console.warn('Wallet send executed, but feed posting failed:', feedError);
      }

      const completionDraft: Omit<
        AgentActionCompletion,
        | 'proposalId'
        | 'proposalNonce'
        | 'invocationId'
        | 'agentId'
        | 'groupId'
        | 'action'
        | 'toolType'
      > & { proposalId?: string } = {
        proposalId,
        status: 'executed',
        provider: 'swop',
        title: `Sent ${sendAmountLabel}`,
        subtitle: `${network} · ${recipientData.ensName || formatWalletAddress(recipientData.address)}`,
        subject: token,
        stake: amountType === 'usd' ? amount : undefined,
        placedAt: new Date().toISOString(),
        txHash: hash,
        txUrl: getWalletSendExplorerTxUrl(network, hash),
        explorerLabel: 'View tx',
        executionResult: {
          hash,
          token,
          amount,
          amountType,
          tokenAmount: transactionAmount,
          network,
          recipient: recipientData.address,
          recipientName: recipientData.ensName || recipient,
        },
      };

      let completion = {
        ...completionDraft,
        proposalId,
      } as AgentActionCompletion;
      if (!isLocalProposal) {
        try {
          completion =
            (await completeAgentActionFromHandoff(
              completionDraft,
              accessToken
            )) || completion;
        } catch (completionError) {
          console.warn(
            'Wallet send executed, but Swop completion reporting failed:',
            completionError
          );
        }
      }

      setLocalReceipt(completion);
      onInlineActionComplete(completion);
      queryClient.invalidateQueries({ queryKey: ['walletTokens'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Send confirmed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send transaction.';
      try {
        const failedCompletion = await completeAgentActionFromHandoff(
          {
            proposalId,
            status: 'failed',
            provider: 'swop',
            title: `Send ${token}`,
            subtitle: chain || 'wallet send',
            subject: token,
            error: message,
          },
          accessToken
        );
        if (failedCompletion) {
          onInlineActionComplete(failedCompletion);
        } else {
          clearAgentActionHandoff();
        }
      } catch {
        clearAgentActionHandoff();
      }
      setSendError(message);
      toast.error(message);
    } finally {
      setIsConfirming(false);
    }
  };

  if (localReceipt) {
    return (
      <AgentActionReceiptCard
        receipt={localReceipt}
        onDone={() => setLocalReceipt(null)}
      />
    );
  }

  if (isLocallyDismissed) {
    return null;
  }

  return (
    <div
      className="mt-2 w-full max-w-[520px] border-l-2 border-[#3fe08f] pl-2 text-xs"
      data-status={status}
    >
      <div className={`${AGENT_PANEL_CLASS} overflow-hidden rounded-[14px]`}>
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-3 py-2.5">
          <div className="min-w-0">
            <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
              send {token}
            </div>
            <div className="mt-1 truncate text-[15px] font-bold text-[#eceef2]">
              Preview transfer
            </div>
          </div>
          <div className="dm-mono flex shrink-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
            <span className="rounded-full bg-[#3fe08f] px-1.5 py-0.5 text-[#031008]">
              ✓ chain
            </span>
            <span>—</span>
            <span className="rounded-full bg-[#3fe08f] px-1.5 py-0.5 text-[#031008]">
              2 preview
            </span>
            <span>—</span>
            <span className="text-[#eceef2]">3 confirm</span>
          </div>
        </div>

        <div className="grid gap-2 p-3">
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#73543d] text-[11px] font-bold text-[#f1e2d5]">
                {displayRecipient.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-[#eceef2]">
                  {displayRecipient}
                </div>
                <div className="dm-mono truncate text-[10px] text-[#5a5e69]">
                  recipient
                </div>
              </div>
            </div>
            <div className="dm-mono shrink-0 text-right text-[13px] font-bold text-[#3fe08f]">
              {sendAmountLabel}
            </div>
          </div>

          <div className="rounded-[10px] border border-white/[0.07] bg-black/20">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.06] px-3 py-2">
              <span className="text-[11px] font-semibold text-[#9396a0]">
                From
              </span>
              <span className="inline-flex items-center gap-2 text-[12px] font-bold text-[#eceef2]">
                <span className="dm-mono flex h-5 w-5 items-center justify-center rounded-full border border-[#3fe08f]/30 bg-[#3fe08f]/10 text-[10px] text-[#3fe08f]">
                  {networkMeta.initial}
                </span>
                {selectedNetwork || 'Select network'}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.06] px-3 py-2">
              <span className="text-[11px] font-semibold text-[#9396a0]">
                To
              </span>
              <span className="max-w-[260px] truncate text-right text-[12px] font-bold text-[#eceef2]">
                {displayRecipient}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.06] px-3 py-2">
              <span className="text-[11px] font-semibold text-[#9396a0]">
                Amount
              </span>
              <span className="dm-mono text-right text-[12px] font-bold text-[#eceef2]">
                {transactionAmountPreview
                  ? `${formatSwapAmount(transactionAmountPreview)} ${token}`
                  : sendAmountLabel}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.06] px-3 py-2">
              <span className="text-[11px] font-semibold text-[#9396a0]">
                Network fee
              </span>
              <span className="dm-mono text-right text-[12px] font-bold text-[#eceef2]">
                {networkMeta.feeLabel}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.06] px-3 py-2">
              <span className="text-[11px] font-semibold text-[#9396a0]">
                Est. time
              </span>
              <span className="dm-mono text-right text-[12px] font-bold text-[#eceef2]">
                {networkMeta.timeLabel}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2">
              <span className="text-[11px] font-bold text-[#eceef2]">
                You pay
              </span>
              <span className="dm-mono text-right text-[13px] font-bold text-[#3fe08f]">
                {amountType === 'usd'
                  ? formatCompactUsd(amount)
                  : `${formatSwapAmount(amount)} ${token}`}
              </span>
            </div>
          </div>

          {!hasEnoughBalance && (
            <div className="rounded-[10px] border border-[#ffcc66]/25 bg-[#ffcc66]/10 px-3 py-2 text-[11px] font-semibold text-[#ffd17a]">
              This network does not have enough {token}. Change chain or lower
              the amount.
            </div>
          )}

          {isOpen && (
            <div className="flex gap-2 pt-1">
              {onChangeNetwork && (
                <button
                  type="button"
                  onClick={onChangeNetwork}
                  disabled={isPending || isConfirming}
                  className="dm-btn inline-flex h-10 items-center justify-center rounded-[11px] border border-white/[0.07] bg-black/20 px-3 text-[12px] font-semibold text-[#9396a0] hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Change chain
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={
                  !canAct || isPending || isConfirming || !hasEnoughBalance
                }
                className={TICKET_PRIMARY_BUTTON_CLASS}
              >
                {isPending || isConfirming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Confirm send
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLocalProposal) {
                    setIsLocallyDismissed(true);
                    return;
                  }
                  onReject(proposalId);
                }}
                disabled={!canAct || isPending || isConfirming}
                className={TICKET_REJECT_BUTTON_CLASS}
              >
                <Ban className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          )}
          {sendError && (
            <div className="grid gap-2 rounded-[10px] border border-[#ff5d63]/25 bg-[#ff5d63]/10 px-3 py-2 text-[11px] font-semibold text-[#ffb3b7]">
              <span>{sendError}</span>
              {hasUnsignableMatchingToken && (
                <button
                  type="button"
                  onClick={() => connectWallet()}
                  className="dm-btn inline-flex h-8 w-fit items-center justify-center rounded-[9px] border border-[#ffb3b7]/30 bg-[#ffb3b7]/10 px-3 text-[11px] font-bold text-[#ffe1e3] hover:bg-[#ffb3b7]/15"
                >
                  Connect owning wallet
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WalletSendNetworkPromptCard({
  prompt,
  proposal,
  proposalId,
  status = 'pending',
  canAct = true,
  isPending = false,
  onApproveInline,
  onInlineActionComplete,
  onReject,
  astroConsoleData,
}: {
  prompt: WalletSendNetworkPrompt;
  proposal?: AgentActionProposal | null;
  proposalId?: string;
  status?: string;
  canAct?: boolean;
  isPending?: boolean;
  onApproveInline: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onReject: (proposalId: string) => void;
  astroConsoleData: AstroConsoleData;
}) {
  const { wallets: evmWallets } = useEvmWallets();
  const { connectWallet } = useConnectWallet();
  const { wallets: solanaWallets } = useSolanaWallets();
  const [selectedChain, setSelectedChain] = useState('');
  const evmSignerAddresses = useMemo(
    () =>
      getChatSwapSignableAddressSet([
        ...evmWallets.map((wallet) => wallet.address),
        astroConsoleData.evmWalletAddress,
        ...(astroConsoleData.evmWalletAddresses || []),
        astroConsoleData.eoaAddress,
      ]),
    [
      astroConsoleData.eoaAddress,
      astroConsoleData.evmWalletAddress,
      astroConsoleData.evmWalletAddresses,
      evmWallets,
    ]
  );
  const solanaSignerAddresses = useMemo(
    () =>
      getChatSolanaSignerAddressSet(
        [
          ...solanaWallets.map((wallet) => wallet.address),
          astroConsoleData.solWalletAddress,
        ]
      ),
    [astroConsoleData.solWalletAddress, solanaWallets]
  );
  const promptIntent = useMemo(
    () => ({
      params: {
        token: prompt.token,
        tokenSymbol: prompt.token,
        amount: prompt.amount,
        amountType: prompt.amountType,
        isUSD: prompt.amountType === 'usd',
      },
    }),
    [prompt.amount, prompt.amountType, prompt.token]
  );
  const options = useMemo(
    () =>
      getWalletSendNetworkOptions(
        promptIntent,
        astroConsoleData.walletPortfolioTokens,
        evmSignerAddresses,
        solanaSignerAddresses
      ),
    [
      astroConsoleData.walletPortfolioTokens,
      evmSignerAddresses,
      promptIntent,
      solanaSignerAddresses,
    ]
  );
  if (selectedChain) {
    const recipientIsAddress =
      /^0x[a-fA-F0-9]{40}$/.test(prompt.recipient) ||
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(prompt.recipient);
    const activeProposalId =
      proposalId ||
      `local-wallet-send-${prompt.token}-${prompt.recipient}-${selectedChain}`;
    const normalizedParams = {
      ...(proposal?.normalizedParams || {}),
      token: prompt.token,
      tokenSymbol: prompt.token,
      asset: prompt.token,
      amount: prompt.amount,
      amountType: prompt.amountType,
      isUSD: prompt.amountType === 'usd',
      recipient: prompt.recipient,
      recipientAddress: recipientIsAddress ? prompt.recipient : undefined,
      recipientEns: recipientIsAddress ? undefined : prompt.recipient,
      chain: selectedChain,
      network: selectedChain,
    };
    const localProposal: AgentActionProposal = {
      ...(proposal || {}),
      proposalId: activeProposalId,
      action: 'wallet.send',
      toolType: 'wallet.write',
      status: proposal?.status || 'pending',
      normalizedParams,
      riskSummary: {
        ...(proposal?.riskSummary || {}),
        riskLevel: 'high',
        toolType: 'wallet.write',
        action: 'wallet.send',
        mode: 'proposal',
        requiresProposal: true,
        paramKeys: [
          'amount',
          'amountType',
          'asset',
          'chain',
          'isUSD',
          'network',
          'recipient',
          recipientIsAddress ? 'recipientAddress' : 'recipientEns',
          'token',
          'tokenSymbol',
        ],
      },
    };

    return (
      <WalletSendProposalTicket
        proposal={localProposal}
        proposalId={localProposal.proposalId}
        status={status}
        canAct={canAct}
        isOpen={status === 'pending'}
        isPending={isPending}
        onApproveInline={onApproveInline}
        onInlineActionComplete={onInlineActionComplete}
        onReject={() => {
          if (proposalId && onReject) {
            onReject(proposalId);
            return;
          }
          setSelectedChain('');
        }}
        onChangeNetwork={() => setSelectedChain('')}
        astroConsoleData={astroConsoleData}
      />
    );
  }

  const amountLabel =
    prompt.amountType === 'usd'
      ? `${formatCompactUsd(prompt.amount)} in ${prompt.token}`
      : `${formatSwapAmount(prompt.amount)} ${prompt.token}`;
  return (
    <div className="mt-2 w-full max-w-[520px] border-l-2 border-[#3fe08f] pl-2 text-xs">
      <div className={`${AGENT_PANEL_CLASS} overflow-hidden rounded-[14px]`}>
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-3 py-2.5">
          <div className="min-w-0">
            <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
              send {prompt.token}
            </div>
            <div className="mt-1 truncate text-[15px] font-bold text-[#eceef2]">
              Select network
            </div>
          </div>
          <div className="dm-mono flex shrink-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
            <span className="rounded-full bg-[#3fe08f] px-1.5 py-0.5 text-[#031008]">
              1 chain
            </span>
            <span>—</span>
            <span>2 preview</span>
            <span>—</span>
            <span>3 confirm</span>
          </div>
        </div>
        <div className="grid gap-2 p-3">
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-[#eceef2]">
                {prompt.recipient}
              </div>
              <div className="dm-mono mt-0.5 truncate text-[10px] text-[#5a5e69]">
                recipient
              </div>
            </div>
            <div className="dm-mono shrink-0 text-right text-[13px] font-bold text-[#3fe08f]">
              {amountLabel}
            </div>
          </div>
          <div className={TICKET_LABEL_CLASS}>pay from · your {prompt.token} balances</div>
          <div className="grid gap-2">
            {options.length ? (
              options.map((option) => (
                <button
                  type="button"
                  key={option.chain}
                  onClick={() => {
                    if (option.hasEnoughBalance) setSelectedChain(option.chain);
                  }}
                  disabled={!option.hasEnoughBalance}
                  className="dm-btn flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2 text-left hover:border-[#3fe08f]/35 hover:bg-[#3fe08f]/10 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="dm-mono flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[12px] font-bold text-[#3fe08f]">
                      {getWalletSendNetworkMeta(option.chain).initial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-bold text-[#eceef2]">
                          {option.chain}
                        </span>
                        {option.isBest && (
                          <span className="dm-mono rounded-[4px] border border-[#3fe08f]/25 bg-[#3fe08f]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
                            best
                          </span>
                        )}
                      </div>
                      <div className="dm-mono mt-0.5 text-[10px] text-[#5a5e69]">
                        fee {option.feeLabel} · {option.timeLabel}
                      </div>
                    </div>
                  </div>
                  <div className="dm-mono shrink-0 text-right text-[11px] font-semibold text-[#9396a0]">
                    {option.balance
                      ? `${formatSwapAmount(option.balance)} ${prompt.token}`
                      : 'balance unavailable'}
                    {option.usdValue > 0 && (
                      <div className="text-[#3fe08f]">
                        {formatCompactUsd(option.usdValue)} avail
                      </div>
                    )}
                    {!option.hasEnoughBalance && (
                      <div className="text-[#ffcc66]">not enough</div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[10px] border border-[#ffcc66]/25 bg-[#ffcc66]/10 px-3 py-2 text-[11px] font-semibold text-[#ffd17a]">
                <div>
                  No {prompt.token} balance was found in your connected
                  wallets.
                </div>
                <button
                  type="button"
                  onClick={() => connectWallet()}
                  className="dm-btn mt-2 inline-flex h-8 items-center justify-center rounded-[9px] border border-[#ffd17a]/30 bg-[#ffd17a]/10 px-3 text-[11px] font-bold text-[#ffe2a5] hover:bg-[#ffd17a]/15"
                >
                  Connect owning wallet
                </button>
              </div>
            )}
          </div>
          {options.length > 0 && (
            <div className="dm-mono rounded-[9px] border border-[#3fe08f]/15 bg-[#3fe08f]/10 px-3 py-2 text-[10.5px] font-semibold text-[#a9f7cc]">
              Pick a network to build the final send card.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getSwapRouteLabel(params?: Record<string, unknown>) {
  const explicit = firstNestedTicketValue(params, ['routeLabel', 'routeName']);
  if (explicit) return explicit;
  const fromChain = firstNestedTicketValue(params, [
    'fromChain',
    'inputChain',
    'chain',
    'network',
  ]);
  const toChain = firstNestedTicketValue(params, [
    'toChain',
    'outputChain',
    'receiverChain',
  ]);
  if (fromChain && toChain && fromChain !== toChain) {
    return `${fromChain} to ${toChain}`;
  }
  return 'route';
}

type ChatSwapTokenMeta = {
  symbol: string;
  address: string;
  decimals: number;
  chainId: string;
  chainName: string;
};

type ChatSwapSelectableToken = ChatSwapTokenMeta & {
  key: string;
  balance?: string;
  usdValue?: number;
  priceUsd?: number;
  isWalletToken?: boolean;
  walletAddress?: string;
};

type ChatSwapPromptIntent = {
  fromSymbol?: string;
  toSymbol?: string;
  amount?: string;
  amountType?: 'token' | 'usd';
  fromChainId?: string;
  toChainId?: string;
  quoteOnly?: boolean;
};

type ChatSwapQuoteState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  receiveAmount?: string;
  price?: string;
  priceImpact?: number | string;
  fee?: string;
  routeLabel?: string;
  provider?: string;
  rawQuote?: Record<string, unknown>;
  amountInSmallestUnit?: string;
  inputAmount?: string;
  outputAmount?: string;
  error?: string;
};

const SOLANA_CHAIN_ID = '1151111081099710';
const EVM_NATIVE_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000000000';

const CHAT_SWAP_CHAIN_IDS: Record<TokenData['chain'], string> = {
  ETHEREUM: '1',
  BASE: '8453',
  ARBITRUM: '42161',
  SEPOLIA: '11155111',
  POLYGON: '137',
  SOLANA: SOLANA_CHAIN_ID,
};

const CHAT_SWAP_CHAIN_NAMES: Record<string, string> = {
  '1': 'Ethereum',
  '8453': 'Base',
  '42161': 'Arbitrum',
  '11155111': 'Sepolia',
  '137': 'Polygon',
  [SOLANA_CHAIN_ID]: 'Solana',
};

const SWAP_NUMBER_WORDS: Record<string, string> = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
};

const SWAP_TOKEN_ALIASES: Record<string, string> = {
  ETHEREUM: 'ETH',
  ETHER: 'ETH',
  ETH: 'ETH',
  SOLANA: 'SOL',
  SOL: 'SOL',
  WRAPPEDSOL: 'SOL',
  WSOL: 'SOL',
  USD: 'USDC',
  DOLLAR: 'USDC',
  DOLLARS: 'USDC',
  USDC: 'USDC',
  USDT: 'USDT',
  MATIC: 'POL',
  POLYGON: 'POL',
  POL: 'POL',
};

const CHAT_SWAP_TOKEN_META: Record<string, ChatSwapTokenMeta> = {
  [`${SOLANA_CHAIN_ID}:SOL`]: {
    symbol: 'SOL',
    address: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    chainId: SOLANA_CHAIN_ID,
    chainName: 'Solana',
  },
  [`${SOLANA_CHAIN_ID}:WSOL`]: {
    symbol: 'SOL',
    address: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    chainId: SOLANA_CHAIN_ID,
    chainName: 'Solana',
  },
  [`${SOLANA_CHAIN_ID}:USDC`]: {
    symbol: 'USDC',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    chainId: SOLANA_CHAIN_ID,
    chainName: 'Solana',
  },
  [`${SOLANA_CHAIN_ID}:USDT`]: {
    symbol: 'USDT',
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    chainId: SOLANA_CHAIN_ID,
    chainName: 'Solana',
  },
  [`${SOLANA_CHAIN_ID}:JUP`]: {
    symbol: 'JUP',
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    chainId: SOLANA_CHAIN_ID,
    chainName: 'Solana',
  },
  [`${SOLANA_CHAIN_ID}:BONK`]: {
    symbol: 'BONK',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    chainId: SOLANA_CHAIN_ID,
    chainName: 'Solana',
  },
  '1:ETH': {
    symbol: 'ETH',
    address: EVM_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    chainId: '1',
    chainName: 'Ethereum',
  },
  '1:USDC': {
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    chainId: '1',
    chainName: 'Ethereum',
  },
  '8453:ETH': {
    symbol: 'ETH',
    address: EVM_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    chainId: '8453',
    chainName: 'Base',
  },
  '8453:USDC': {
    symbol: 'USDC',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    chainId: '8453',
    chainName: 'Base',
  },
  '42161:ETH': {
    symbol: 'ETH',
    address: EVM_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    chainId: '42161',
    chainName: 'Arbitrum',
  },
  '42161:USDC': {
    symbol: 'USDC',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
    chainId: '42161',
    chainName: 'Arbitrum',
  },
  '137:POL': {
    symbol: 'POL',
    address: EVM_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    chainId: '137',
    chainName: 'Polygon',
  },
  '137:MATIC': {
    symbol: 'POL',
    address: EVM_NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    chainId: '137',
    chainName: 'Polygon',
  },
  '137:USDC': {
    symbol: 'USDC',
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    decimals: 6,
    chainId: '137',
    chainName: 'Polygon',
  },
};

function normalizeSwapSymbol(value: string) {
  return value
    .replace(/^\$/, '')
    .replace(/\s+/g, '')
    .replace(/\.E$/i, '')
    .toUpperCase();
}

function normalizeSwapIntentSymbol(value: string) {
  const normalized = normalizeSwapSymbol(value.replace(/[^a-zA-Z0-9.$]/g, ''));
  if (!normalized || normalized === 'TOKEN') return '';
  return SWAP_TOKEN_ALIASES[normalized] || normalized;
}

function isPlaceholderSwapToken(value: string) {
  const normalized = normalizeSwapSymbol(value);
  return !normalized || normalized === 'TOKEN' || normalized === 'SETTOKEN';
}

function normalizeSwapChainId(value: string, fallback = SOLANA_CHAIN_ID) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (/^\d+$/.test(normalized)) return normalized;
  if (normalized.includes('sol')) return SOLANA_CHAIN_ID;
  if (normalized.includes('base')) return '8453';
  if (normalized.includes('arb')) return '42161';
  if (normalized.includes('poly') || normalized.includes('matic')) return '137';
  if (normalized.includes('eth') || normalized.includes('mainnet')) return '1';
  return fallback;
}

function formatSwapChainName(chainId: string) {
  return CHAT_SWAP_CHAIN_NAMES[chainId] || chainId;
}

function getAgentFeedIdentity(user?: Partial<User> | null) {
  const userId = String(user?._id || '').trim();
  const smartsiteId = String(user?.primaryMicrosite || '').trim();
  return userId && smartsiteId ? { userId, smartsiteId } : null;
}

function toAgentFeedNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getTokenUnitPriceUsd(token?: Partial<TokenData> | null) {
  const price = Number(token?.marketData?.price || token?.nativeTokenPrice || 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function triggerAgentFeedRefresh() {
  useModalStore.getState().triggerFeedRefetch();
}

async function postAgentWalletSendToFeed({
  accessToken,
  user,
  hash,
  senderAddress,
  recipientAddress,
  recipientEns,
  amount,
  token,
  tokenSymbol,
  network,
}: {
  accessToken?: string | null;
  user?: Partial<User> | null;
  hash: string;
  senderAddress: string;
  recipientAddress: string;
  recipientEns?: string;
  amount: string | number;
  token?: Partial<TokenData> | null;
  tokenSymbol: string;
  network: Network;
}) {
  const identity = getAgentFeedIdentity(user);
  if (!accessToken || !identity || !hash) return null;

  const amountNumber = toAgentFeedNumber(amount);
  const unitPrice = getTokenUnitPriceUsd(token);
  const tokenPrice = unitPrice > 0 ? amountNumber * unitPrice : undefined;

  const result = await postFeed(
    {
      postType: 'transaction',
      smartsiteId: identity.smartsiteId,
      userId: identity.userId,
      content: {
        transaction_type: 'token',
        sender_wallet_address: senderAddress,
        receiver_ens: recipientEns || '',
        receiver_wallet_address: recipientAddress,
        amount: amountNumber,
        token: tokenSymbol,
        currency: tokenSymbol,
        chain: token?.chain || network,
        tokenPrice,
        transaction_hash: hash,
      },
    },
    accessToken
  );

  triggerAgentFeedRefresh();
  return result;
}

async function postAgentSwapToFeed({
  accessToken,
  user,
  signature,
  walletAddress,
  inputToken,
  outputToken,
  inputAmount,
  outputAmount,
  slippageBps = 100,
}: {
  accessToken?: string | null;
  user?: Partial<User> | null;
  signature: string;
  walletAddress?: string;
  inputToken: ChatSwapSelectableToken;
  outputToken: ChatSwapSelectableToken;
  inputAmount: string | number;
  outputAmount: string | number;
  slippageBps?: number;
}) {
  const identity = getAgentFeedIdentity(user);
  if (!accessToken || !identity || !signature) return null;

  const result = await postFeed(
    {
      smartsiteId: identity.smartsiteId,
      userId: identity.userId,
      postType: 'swapTransaction',
      content: {
        signature,
        walletAddress: walletAddress || inputToken.walletAddress || '',
        inputToken: {
          symbol: inputToken.symbol,
          amount: toAgentFeedNumber(inputAmount),
          decimals: inputToken.decimals,
          mint: inputToken.address,
          price: inputToken.priceUsd || '0',
          tokenImg: '',
          chain: inputToken.chainId,
        },
        outputToken: {
          symbol: outputToken.symbol,
          amount: toAgentFeedNumber(outputAmount),
          decimals: outputToken.decimals,
          mint: outputToken.address,
          price: outputToken.priceUsd || '0',
          tokenImg: '',
          chain: outputToken.chainId,
        },
      },
      walletAddress: walletAddress || inputToken.walletAddress || '',
      slippageBps,
      platformFeeBps: 0,
      timestamp: Date.now(),
      transactionType: 'SWAP',
      network: inputToken.chainName.toLowerCase(),
    },
    accessToken
  );

  triggerAgentFeedRefresh();
  return result;
}

function getSwapTokenKey(token: ChatSwapTokenMeta & { walletAddress?: string }) {
  const owner = token.walletAddress
    ? `:${token.walletAddress.toLowerCase()}`
    : '';
  return `${token.chainId}:${normalizeSwapSymbol(
    token.symbol
  )}:${token.address.toLowerCase()}${owner}`;
}

function getTokenDataSwapChainId(token: TokenData) {
  return token.chainId
    ? String(token.chainId)
    : CHAT_SWAP_CHAIN_IDS[token.chain] || SOLANA_CHAIN_ID;
}

function getTokenDataUsdValue(token: TokenData) {
  const explicitValue = Number(token.value);
  if (Number.isFinite(explicitValue) && explicitValue > 0) {
    return explicitValue;
  }
  const balance = Number(token.balance || 0);
  const price = Number(token.marketData?.price || token.nativeTokenPrice || 0);
  return Number.isFinite(balance) && Number.isFinite(price)
    ? balance * price
    : 0;
}

function getTokenDataPriceUsd(token: TokenData) {
  const price = Number(token.marketData?.price || token.nativeTokenPrice || 0);
  if (Number.isFinite(price) && price > 0) return price;
  const balance = Number(token.balance || 0);
  const value = getTokenDataUsdValue(token);
  return balance > 0 && value > 0 ? value / balance : 0;
}

function walletTokenToChatSwapToken(
  token: TokenData
): ChatSwapSelectableToken | null {
  const symbol = normalizeSwapIntentSymbol(token.symbol || '');
  const chainId = getTokenDataSwapChainId(token);
  if (!symbol || !chainId) return null;

  const meta = resolveChatSwapToken(symbol, chainId);
  const nativeAddress =
    chainId === SOLANA_CHAIN_ID
      ? CHAT_SWAP_TOKEN_META[`${SOLANA_CHAIN_ID}:SOL`]?.address
      : EVM_NATIVE_TOKEN_ADDRESS;
  const address =
    token.address ||
    meta?.address ||
    (token.isNative ? nativeAddress : '') ||
    '';
  if (!address) return null;

  const swapToken: ChatSwapSelectableToken = {
    symbol: meta?.symbol || symbol,
    address,
    decimals: token.decimals ?? meta?.decimals ?? 18,
    chainId,
    chainName: meta?.chainName || formatSwapChainName(chainId),
    key: '',
    balance: token.balance || '',
    usdValue: getTokenDataUsdValue(token),
    priceUsd: getTokenDataPriceUsd(token),
    isWalletToken: true,
    walletAddress: token.walletAddress,
  };
  return { ...swapToken, key: getSwapTokenKey(swapToken) };
}

function getWalletSwapTokenOptions(tokens: TokenData[]) {
  const byKey = new Map<string, ChatSwapSelectableToken>();
  tokens.forEach((token) => {
    const balance = Number(token.balance || 0);
    if (!Number.isFinite(balance) || balance <= 0) return;
    const option = walletTokenToChatSwapToken(token);
    if (!option) return;
    const existing = byKey.get(option.key);
    if (!existing || (option.usdValue || 0) > (existing.usdValue || 0)) {
      byKey.set(option.key, option);
    }
  });
  return Array.from(byKey.values()).sort(
    (a, b) => (b.usdValue || 0) - (a.usdValue || 0)
  );
}

function getChatSwapSignableAddressSet(addresses: Array<string | null | undefined>) {
  return new Set(addresses.map(normalizeChatEvmAddress).filter(Boolean));
}

function isChatSwapTokenOwnedBySigner(
  option: ChatSwapSelectableToken,
  evmSignerAddresses: Set<string>,
  solanaSignerAddresses: Set<string>
) {
  if (!option.walletAddress) return true;
  if (option.chainId === SOLANA_CHAIN_ID) {
    return (
      solanaSignerAddresses.size === 0 ||
      solanaSignerAddresses.has(option.walletAddress)
    );
  }
  const owner = normalizeChatEvmAddress(option.walletAddress);
  return evmSignerAddresses.size === 0 || evmSignerAddresses.has(owner);
}

function getSwapQuoteTokenOptions(tokens: TokenData[]) {
  const byKey = new Map<string, ChatSwapSelectableToken>();

  getWalletSwapTokenOptions(tokens).forEach((option) => {
    byKey.set(option.key, option);
  });

  Object.values(CHAT_SWAP_TOKEN_META).forEach((meta) => {
    const option: ChatSwapSelectableToken = {
      ...meta,
      key: getSwapTokenKey(meta),
      usdValue: 0,
      priceUsd: 0,
      isWalletToken: false,
    };
    if (!byKey.has(option.key)) byKey.set(option.key, option);
  });

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.isWalletToken !== b.isWalletToken) return a.isWalletToken ? -1 : 1;
    if ((b.usdValue || 0) !== (a.usdValue || 0)) {
      return (b.usdValue || 0) - (a.usdValue || 0);
    }
    return `${a.symbol}:${a.chainName}`.localeCompare(
      `${b.symbol}:${b.chainName}`
    );
  });
}

function findSwapSelectableToken(
  options: ChatSwapSelectableToken[],
  symbol?: string,
  chainId?: string,
  preferWallet = false
) {
  const normalizedSymbol = normalizeSwapIntentSymbol(symbol || '');
  if (!normalizedSymbol) return null;
  const matches = options.filter((option) => {
    const optionSymbol = normalizeSwapSymbol(option.symbol);
    return (
      (optionSymbol === normalizedSymbol ||
        optionSymbol === normalizedSymbol.replace(/^W/, '')) &&
      (!chainId || option.chainId === chainId)
    );
  });
  if (!matches.length) return null;
  if (preferWallet) {
    return (
      matches.find((option) => option.isWalletToken && (option.usdValue || 0) > 0) ||
      matches.find((option) => option.isWalletToken) ||
      matches[0]
    );
  }
  return matches[0];
}

function parseSwapNumberish(value?: string) {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  return SWAP_NUMBER_WORDS[normalized] || normalized;
}

function parseSwapPromptAmount(text: string) {
  const numberish = '([0-9]+(?:\\.[0-9]+)?|one|two|three|four|five|six|seven|eight|nine|ten)';
  const dollarMatch =
    text.match(new RegExp(`\\$\\s*${numberish}`, 'i')) ||
    text.match(
      new RegExp(`\\b${numberish}\\s*(?:usd|usdc|dollars?|bucks)\\b`, 'i')
    );
  if (dollarMatch?.[1]) {
    return { amount: parseSwapNumberish(dollarMatch[1]), amountType: 'usd' as const };
  }

  const tokenMatch = text.match(
    new RegExp(
      `\\b(?:swap|convert|trade|sell)\\s+${numberish}\\s+[a-zA-Z][a-zA-Z0-9]{1,10}\\b`,
      'i'
    )
  );
  if (tokenMatch?.[1]) {
    return {
      amount: parseSwapNumberish(tokenMatch[1]),
      amountType: 'token' as const,
    };
  }

  return { amount: '', amountType: 'token' as const };
}

function parseSwapPromptIntent(text?: string | null): ChatSwapPromptIntent {
  const raw = String(text || '');
  const lowered = raw.toLowerCase();
  const amount = parseSwapPromptAmount(raw);
  const intent: ChatSwapPromptIntent = {
    ...amount,
    quoteOnly: /\b(quote|price|estimate)\b/i.test(raw),
  };

  const explicitFromChain =
    lowered.match(/\b(?:from|on|using)\s+(solana|base|arbitrum|arb|polygon|ethereum|mainnet)\b/)?.[1] ||
    '';
  const explicitToChain =
    lowered.match(/\b(?:to|on)\s+(solana|base|arbitrum|arb|polygon|ethereum|mainnet)\b/)?.[1] ||
    '';
  if (explicitFromChain) {
    intent.fromChainId = normalizeSwapChainId(explicitFromChain);
  }
  if (explicitToChain) {
    intent.toChainId = normalizeSwapChainId(explicitToChain);
  }

  const buyWith = raw.match(
    /\bbuy\s+([a-zA-Z][a-zA-Z0-9]{1,10})\s+(?:with|using|for)\s+([a-zA-Z][a-zA-Z0-9]{1,10})\b/i
  );
  if (buyWith) {
    intent.toSymbol = normalizeSwapIntentSymbol(buyWith[1]);
    intent.fromSymbol = normalizeSwapIntentSymbol(buyWith[2]);
    return intent;
  }

  const ofTokenPair = raw.match(
    /\b(?:of|in)\s+([a-zA-Z][a-zA-Z0-9]{1,10})\s+(?:for|to|into)\s+([a-zA-Z][a-zA-Z0-9]{1,10})\b/i
  );
  if (ofTokenPair) {
    intent.fromSymbol = normalizeSwapIntentSymbol(ofTokenPair[1]);
    intent.toSymbol = normalizeSwapIntentSymbol(ofTokenPair[2]);
    return intent;
  }

  const swapPair = raw.match(
    /\b(?:swap|convert|trade|quote)\b(?:\s+only)?(?:\s+(?:\$?\s*)?(?:[0-9]+(?:\.[0-9]+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:usd|usdc|dollars?|bucks)?(?:\s+of)?)?\s+([a-zA-Z][a-zA-Z0-9]{1,10})\s+(?:for|to|into)\s+([a-zA-Z][a-zA-Z0-9]{1,10})\b/i
  );
  if (swapPair) {
    intent.fromSymbol = normalizeSwapIntentSymbol(swapPair[1]);
    intent.toSymbol = normalizeSwapIntentSymbol(swapPair[2]);
    return intent;
  }

  const fromToken = raw.match(
    /\b(?:from|with|using|pay(?:ing)?|sell(?:ing)?)\s+([a-zA-Z][a-zA-Z0-9]{1,10})\b/i
  )?.[1];
  const toToken = raw.match(
    /\b(?:to|for|into|receive|get)\s+([a-zA-Z][a-zA-Z0-9]{1,10})\b/i
  )?.[1];
  intent.fromSymbol = normalizeSwapIntentSymbol(fromToken || '');
  intent.toSymbol = normalizeSwapIntentSymbol(toToken || '');
  return intent;
}

function getSwapTokenShortLabel(option?: ChatSwapSelectableToken | null) {
  if (!option) return 'Select token';
  return `${option.symbol} · ${option.chainName}`;
}

function getSwapTokenSubLabel(option?: ChatSwapSelectableToken | null) {
  if (!option) return '';
  const parts = [];
  if (option.balance) {
    parts.push(`${formatSwapAmount(option.balance)} ${option.symbol}`);
  }
  if (option.usdValue && option.usdValue > 0) {
    parts.push(formatCompactUsd(option.usdValue));
  }
  return parts.join(' · ');
}

function resolveChatSwapToken(
  symbol: string,
  chainId: string
): ChatSwapTokenMeta | null {
  const normalizedSymbol = normalizeSwapSymbol(symbol);
  return (
    CHAT_SWAP_TOKEN_META[`${chainId}:${normalizedSymbol}`] ||
    CHAT_SWAP_TOKEN_META[`${chainId}:${normalizedSymbol.replace(/^W/, '')}`] ||
    null
  );
}

function toSmallestSwapUnit(
  amount: string,
  decimals: number
): string | null {
  const normalized = amount.replace(/[$,_\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const [whole, fractionRaw = ''] = normalized.split('.');
  const fraction = (fractionRaw + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(`${whole}${fraction}`).toString();
}

function fromSmallestSwapUnit(amount: unknown, decimals: number) {
  const raw = String(amount ?? '').trim();
  if (!/^\d+$/.test(raw)) return '';
  const padded =
    raw.length > decimals
      ? raw
      : `${'0'.repeat(decimals - raw.length + 1)}${raw}`;
  const whole = padded.slice(0, -decimals) || '0';
  const fraction = padded.slice(-decimals).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

function formatSwapQuoteRate(
  fromAmount: string,
  toAmount: string,
  fromSymbol: string,
  toSymbol: string
) {
  const from = Number(fromAmount);
  const to = Number(toAmount);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0) return '';
  return `${formatSwapAmount(to / from)} ${toSymbol}/${fromSymbol}`;
}

function formatSwapQuoteUsd(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: number >= 10 ? 2 : 4,
  }).format(number);
}

function formatSwapAmountInputValue(
  value: number,
  maximumFractionDigits = 8
) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return value.toLocaleString('en-US', {
    maximumFractionDigits,
    useGrouping: false,
  });
}

async function withChatSwapQuoteTimeout<T>(
  promise: Promise<T>,
  provider: string,
  timeoutMs: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              `${provider} quote is taking too long. Try refreshing the quote.`
            )
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function getLifiFeeLabel(quote: Record<string, unknown>) {
  const estimate = ticketObject(quote.estimate);
  const feeCosts = Array.isArray(estimate?.feeCosts)
    ? estimate?.feeCosts
    : [];
  const gasCosts = Array.isArray(estimate?.gasCosts)
    ? estimate?.gasCosts
    : [];
  const usdFee = [...feeCosts, ...gasCosts].reduce((sum, item) => {
    const cost = ticketObject(item);
    const amountUsd = Number(cost?.amountUSD ?? cost?.amountUsd);
    return Number.isFinite(amountUsd) ? sum + amountUsd : sum;
  }, 0);
  return usdFee > 0 ? formatSwapQuoteUsd(usdFee) : 'included';
}

function getChatSwapExplorerTxUrl(chainId: string, txHash: string) {
  const explorerUrls: Record<string, string> = {
    [SOLANA_CHAIN_ID]: `https://solscan.io/tx/${txHash}`,
    '1': `https://etherscan.io/tx/${txHash}`,
    '56': `https://bscscan.com/tx/${txHash}`,
    '137': `https://polygonscan.com/tx/${txHash}`,
    '42161': `https://arbiscan.io/tx/${txHash}`,
    '8453': `https://basescan.org/tx/${txHash}`,
  };
  return explorerUrls[chainId] || `https://etherscan.io/tx/${txHash}`;
}

function getChatSwapViemChain(chainId: number) {
  switch (chainId) {
    case 1:
      return mainnet;
    case 56:
      return bsc;
    case 137:
      return polygon;
    case 42161:
      return arbitrum;
    case 8453:
      return base;
    default:
      return null;
  }
}

function isNativeEvmSwapToken(token?: ChatSwapSelectableToken | null) {
  const symbol = normalizeSwapSymbol(token?.symbol || '');
  const address = String(token?.address || '').toLowerCase();
  return (
    ['ETH', 'POL', 'MATIC', 'BNB', 'AVAX'].includes(symbol) ||
    address === EVM_NATIVE_TOKEN_ADDRESS.toLowerCase()
  );
}

async function ensureChatEvmSwapAllowance({
  tokenAddress,
  owner,
  spender,
  amountWei,
  chainId,
  provider,
  switchChain,
}: {
  tokenAddress: string;
  owner: string;
  spender: string;
  amountWei: string;
  chainId: number;
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  switchChain?: (chainId: number) => Promise<void>;
}) {
  if (
    !tokenAddress ||
    tokenAddress.toLowerCase() === EVM_NATIVE_TOKEN_ADDRESS.toLowerCase()
  ) {
    return;
  }

  const chain = getChatSwapViemChain(chainId);
  if (!chain) throw new Error('Unsupported EVM swap chain.');

  const client = createPublicClient({ chain, transport: http() });
  const allowance = await client.readContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner as `0x${string}`, spender as `0x${string}`],
  });
  if (allowance >= BigInt(amountWei)) return;

  if (switchChain) {
    await switchChain(chainId);
  }

  const approveData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender as `0x${string}`, BigInt(amountWei)],
  });

  await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: owner,
        to: tokenAddress,
        data: approveData,
        chainId: `0x${chainId.toString(16)}`,
      },
    ],
  });
}

function SwapProposalTicket({
  proposal,
  proposalId,
  status,
  canAct,
  isOpen,
  isPending,
  onInlineActionComplete,
  onReject,
  astroConsoleData,
  sourceText,
}: {
  proposal?: AgentActionProposal | null;
  proposalId: string;
  status: string;
  canAct: boolean;
  isOpen: boolean;
  isPending: boolean;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onReject: (proposalId: string) => void;
  astroConsoleData: AstroConsoleData;
  sourceText?: string;
}) {
  const { accessToken, user } = useUser();
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const { wallets: evmWallets } = useEvmWallets();
  const { wallets: solanaWallets, ready: solanaWalletsReady } =
    useSolanaWallets();
  const { signTransaction } = useSignTransaction();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [localReceipt, setLocalReceipt] =
    useState<AgentActionCompletion | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [inlineSwapStatus, setInlineSwapStatus] = useState<string | null>(null);
  const [isConfirmingSwap, setIsConfirmingSwap] = useState(false);
  const [openTokenSelector, setOpenTokenSelector] = useState<
    'from' | 'to' | null
  >(null);
  const params = proposal?.normalizedParams;
  const promptIntent = useMemo(
    () => parseSwapPromptIntent(sourceText),
    [sourceText]
  );
  const evmSignerAddresses = useMemo(
    () =>
      getChatSwapSignableAddressSet([
        ...evmWallets.map((wallet) => wallet.address),
        astroConsoleData.evmWalletAddress,
        ...(astroConsoleData.evmWalletAddresses || []),
        astroConsoleData.eoaAddress,
      ]),
    [
      astroConsoleData.eoaAddress,
      astroConsoleData.evmWalletAddress,
      astroConsoleData.evmWalletAddresses,
      evmWallets,
    ]
  );
  const solanaSignerAddresses = useMemo(
    () =>
      getChatSolanaSignerAddressSet([
        ...solanaWallets.map((wallet) => wallet.address),
        astroConsoleData.solWalletAddress,
      ]),
    [astroConsoleData.solWalletAddress, solanaWallets]
  );
  const walletFromOptions = useMemo(
    () =>
      getWalletSwapTokenOptions(astroConsoleData.walletPortfolioTokens).filter(
        (option) =>
          isChatSwapTokenOwnedBySigner(
            option,
            evmSignerAddresses,
            solanaSignerAddresses
          )
      ),
    [
      astroConsoleData.walletPortfolioTokens,
      evmSignerAddresses,
      solanaSignerAddresses,
    ]
  );
  const quoteTokenOptions = useMemo(
    () => getSwapQuoteTokenOptions(astroConsoleData.walletPortfolioTokens),
    [astroConsoleData.walletPortfolioTokens]
  );
  const paramFromToken = firstNestedTicketValue(params, [
      'fromTokenSymbol',
      'inputTokenSymbol',
      'fromToken',
      'inputToken',
      'payToken',
    ]);
  const paramToToken = firstNestedTicketValue(params, [
      'toTokenSymbol',
      'outputTokenSymbol',
      'toToken',
      'outputToken',
      'receiveToken',
    ]);
  const paramPayAmount = firstNestedTicketValue(params, [
    'amount',
    'fromAmount',
    'inputAmount',
    'payAmount',
    'sellAmount',
  ]);
  const receiveAmount = firstNestedTicketValue(params, [
    'outputAmount',
    'toAmount',
    'outAmount',
    'receiveAmount',
    'buyAmount',
    'estimatedOutput',
    'estimatedToAmount',
    'outputAmountFormatted',
  ]);
  const price = firstNestedTicketValue(params, [
    'price',
    'rate',
    'executionPrice',
    'priceUsd',
  ]);
  const priceImpact = firstNestedTicketValue(params, [
    'priceImpactPct',
    'priceImpact',
    'impact',
  ]);
  const fee = firstNestedTicketValue(params, [
    'feeUsd',
    'networkFeeUsd',
    'gasFeeUsd',
    'fee',
    'estimatedFee',
  ]);
  const quoteOnly =
    params?.quoteOnly === true ||
    params?.onlyQuote === true ||
    params?.execute === false ||
    params?.doNotExecute === true ||
    promptIntent.quoteOnly === true;
  const initialAmountType =
    firstNestedTicketValue(params, ['amountType']).toLowerCase() ||
    promptIntent.amountType ||
    'token';
  const paramFromChainId = normalizeSwapChainId(
    firstNestedTicketValue(params, [
      'fromChainId',
      'inputChainId',
      'fromChain',
      'inputChain',
      'chain',
      'network',
    ]),
    promptIntent.fromChainId || ''
  );
  const paramToChainId = normalizeSwapChainId(
    firstNestedTicketValue(params, [
      'toChainId',
      'outputChainId',
      'toChain',
      'outputChain',
      'receiverChain',
    ]),
    promptIntent.toChainId || paramFromChainId || ''
  );
  const fromSymbolGuess = isPlaceholderSwapToken(paramFromToken)
    ? promptIntent.fromSymbol || ''
    : normalizeSwapIntentSymbol(paramFromToken);
  const toSymbolGuess = isPlaceholderSwapToken(paramToToken)
    ? promptIntent.toSymbol || ''
    : normalizeSwapIntentSymbol(paramToToken);
  const initialFromOption =
    findSwapSelectableToken(
      walletFromOptions,
      fromSymbolGuess,
      paramFromChainId || undefined,
      true
    ) ||
    walletFromOptions[0] ||
    null;
  const initialToOption =
    findSwapSelectableToken(
      quoteTokenOptions,
      toSymbolGuess,
      paramToChainId || undefined,
      false
    ) ||
    (toSymbolGuess
      ? findSwapSelectableToken(quoteTokenOptions, toSymbolGuess)
      : null) ||
    findSwapSelectableToken(quoteTokenOptions, 'USDC', initialFromOption?.chainId) ||
    quoteTokenOptions.find(
      (option) => option.key !== initialFromOption?.key
    ) ||
    null;
  const [selectedFromKey, setSelectedFromKey] = useState(
    initialFromOption?.key || ''
  );
  const [selectedToKey, setSelectedToKey] = useState(
    initialToOption?.key || ''
  );
  const [amountInput, setAmountInput] = useState(
    paramPayAmount || promptIntent.amount || ''
  );
  const preferredEvmSignerAddress = useMemo(() => {
    return (
      getChatEvmWalletCandidates(evmWallets as ChatEvmWalletLike[], [
        astroConsoleData.evmWalletAddress,
        ...(astroConsoleData.evmWalletAddresses || []),
        astroConsoleData.eoaAddress,
      ])[0]?.address || ''
    );
  }, [
    astroConsoleData.eoaAddress,
    astroConsoleData.evmWalletAddress,
    astroConsoleData.evmWalletAddresses,
    evmWallets,
  ]);
  const stateSeedRef = useRef('');
  const stateSeed = `${proposalId}:${initialFromOption?.key || ''}:${
    initialToOption?.key || ''
  }:${paramPayAmount || promptIntent.amount || ''}`;

  useEffect(() => {
    if (stateSeedRef.current === stateSeed) return;
    stateSeedRef.current = stateSeed;
    setSelectedFromKey(initialFromOption?.key || '');
    setSelectedToKey(initialToOption?.key || '');
    setAmountInput(paramPayAmount || promptIntent.amount || '');
  }, [
    initialFromOption?.key,
    initialToOption?.key,
    paramPayAmount,
    promptIntent.amount,
    stateSeed,
  ]);

  const selectedFromOption =
    walletFromOptions.find((option) => option.key === selectedFromKey) ||
    initialFromOption;
  const selectedToOption =
    quoteTokenOptions.find((option) => option.key === selectedToKey) ||
    initialToOption;
  const fromSelectOptions =
    selectedFromOption &&
    !walletFromOptions.some((option) => option.key === selectedFromOption.key)
      ? [selectedFromOption, ...walletFromOptions]
      : walletFromOptions;
  const fromToken = selectedFromOption?.symbol || fromSymbolGuess || 'TOKEN';
  const toToken = selectedToOption?.symbol || toSymbolGuess || 'TOKEN';
  const fromChainId = selectedFromOption?.chainId || paramFromChainId || SOLANA_CHAIN_ID;
  const toChainId = selectedToOption?.chainId || paramToChainId || fromChainId;
  const amountType = initialAmountType;
  const isJupiterRoute =
    (selectedFromOption?.chainId === SOLANA_CHAIN_ID &&
      selectedToOption?.chainId === SOLANA_CHAIN_ID) ||
    (fromChainId === SOLANA_CHAIN_ID && toChainId === SOLANA_CHAIN_ID);
  const dynamicProvider = isJupiterRoute ? 'Jupiter' : 'LiFi';
  const rawRouteLabel = getSwapRouteLabel(params);
  const routeLabel =
    rawRouteLabel.toLowerCase() === 'route'
      ? isJupiterRoute
        ? 'Jupiter'
        : `${formatSwapChainName(fromChainId)} to ${formatSwapChainName(toChainId)}`
      : rawRouteLabel;
  const payAmount = amountInput.trim();
  const selectedFromPriceUsd = selectedFromOption?.priceUsd || 0;
  const maxSellAmount = Number(selectedFromOption?.balance || 0);
  const normalizedPayAmount = payAmount.replace(/[$,_\s]/g, '');
  const normalizedPayNumber = Number(normalizedPayAmount);
  const sellTokenAmount =
    amountType === 'usd'
      ? selectedFromPriceUsd > 0
        ? normalizedPayNumber / selectedFromPriceUsd
        : 0
      : normalizedPayNumber;
  const sellUsdAmount =
    amountType === 'usd'
      ? normalizedPayNumber
      : selectedFromPriceUsd > 0
      ? sellTokenAmount * selectedFromPriceUsd
      : 0;
  const hasValidSellAmount =
    Number.isFinite(sellTokenAmount) && sellTokenAmount > 0;
  const hasSpendableBalance =
    Number.isFinite(maxSellAmount) && maxSellAmount > 0;
  const amountBalanceTolerance = Math.max(maxSellAmount * 0.000001, 0.000000001);
  const amountExceedsBalance =
    hasSpendableBalance &&
    hasValidSellAmount &&
    sellTokenAmount > maxSellAmount + amountBalanceTolerance;
  const amountDialPercent =
    hasSpendableBalance && hasValidSellAmount
      ? Math.min(100, Math.max(0, (sellTokenAmount / maxSellAmount) * 100))
      : 0;
  const sellTokenDisplay = hasValidSellAmount
    ? `${formatSwapAmount(sellTokenAmount)} ${fromToken}`
    : `0 ${fromToken}`;
  const sellUsdDisplay =
    sellUsdAmount > 0 ? formatCompactUsd(sellUsdAmount) : '--';
  const setAmountFromTokenAmount = (tokenAmount: number) => {
    const clampedTokenAmount = Math.max(0, tokenAmount);
    if (amountType === 'usd' && selectedFromPriceUsd > 0) {
      setAmountInput(
        formatSwapAmountInputValue(clampedTokenAmount * selectedFromPriceUsd, 2)
      );
      return;
    }
    setAmountInput(formatSwapAmountInputValue(clampedTokenAmount));
  };
  const setAmountFromPercent = (percent: number) => {
    if (!hasSpendableBalance) return;
    const clampedPercent = Math.min(100, Math.max(0, percent));
    setAmountFromTokenAmount(maxSellAmount * (clampedPercent / 100));
  };
  const [quoteState, setQuoteState] = useState<ChatSwapQuoteState>({
    status: 'idle',
  });
  const quoteRequestIdRef = useRef(0);
  const quoteCacheRef = useRef(
    new Map<string, { state: ChatSwapQuoteState; ts: number }>()
  );

  const fetchSwapQuote = useCallback(async () => {
    const requestId = quoteRequestIdRef.current + 1;
    quoteRequestIdRef.current = requestId;
    const publishQuoteState = (next: ChatSwapQuoteState) => {
      setQuoteState(next);
      return next;
    };

    if (!payAmount) {
      return publishQuoteState({ status: 'idle' });
    }

    const fromSymbol = normalizeSwapSymbol(fromToken);
    if (!selectedFromOption || !selectedToOption) {
      return publishQuoteState({
        status: 'error',
        error: 'Pick the token you want to swap and the token you want to buy.',
      });
    }
    if (selectedFromOption.key === selectedToOption.key) {
      return publishQuoteState({
        status: 'error',
        error: 'Pick a different quote token.',
      });
    }
    const usdSizedNonStable =
      amountType === 'usd' &&
      !['USDC', 'USDT', 'DAI', 'PUSD'].includes(fromSymbol);
    const tokenSizedPayAmount =
      usdSizedNonStable && selectedFromOption.priceUsd
        ? String(normalizedPayNumber / selectedFromOption.priceUsd)
        : normalizedPayAmount || payAmount;
    if (usdSizedNonStable) {
      const usdAmount = normalizedPayNumber;
      if (
        !Number.isFinite(usdAmount) ||
        usdAmount <= 0 ||
        !selectedFromOption.priceUsd
      ) {
        return publishQuoteState({
          status: 'error',
          error: `Enter a ${fromSymbol} amount or pick a token with a live USD price.`,
        });
      }
    }

    const inputToken = selectedFromOption;
    const outputToken = selectedToOption;
    if (!inputToken || !outputToken) {
      return publishQuoteState({
        status: 'error',
        error: `No ${dynamicProvider} token metadata for ${fromToken} to ${toToken}.`,
      });
    }

    const tokenSizedPayNumber = Number(tokenSizedPayAmount);
    if (!hasSpendableBalance) {
      return publishQuoteState({
        status: 'error',
        error: `Pick a ${fromSymbol} token with a wallet balance to quote this swap.`,
      });
    }
    if (
      Number.isFinite(tokenSizedPayNumber) &&
      tokenSizedPayNumber > maxSellAmount + amountBalanceTolerance
    ) {
      return publishQuoteState({
        status: 'error',
        error: `Amount is above your ${formatSwapAmount(maxSellAmount)} ${fromSymbol} balance.`,
      });
    }

    const amountInSmallestUnit = toSmallestSwapUnit(
      tokenSizedPayAmount,
      inputToken.decimals
    );
    if (!amountInSmallestUnit || amountInSmallestUnit === '0') {
      return publishQuoteState({
        status: 'error',
        error: 'Enter a valid swap amount to quote.',
      });
    }

    const quoteCacheKey = [
      dynamicProvider,
      inputToken.key,
      outputToken.key,
      amountInSmallestUnit,
    ].join('|');
    const cachedQuote = quoteCacheRef.current.get(quoteCacheKey);
    if (cachedQuote && Date.now() - cachedQuote.ts < 12_000) {
      return publishQuoteState({ ...cachedQuote.state, status: 'success' });
    }

    setQuoteState((previous) => ({
      ...previous,
      status: 'loading',
      error: undefined,
    }));

    try {
      if (isJupiterRoute) {
        const result = await withChatSwapQuoteTimeout(
          fetchJupiterQuote({
            inputMint: inputToken.address,
            outputMint: outputToken.address,
            amount: amountInSmallestUnit,
            slippageBps: 100,
          }),
          'Jupiter',
          8_000
        );
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Jupiter did not return a quote.');
        }

        const quote = result.data as Record<string, unknown>;
        const outputAmount = fromSmallestSwapUnit(
          quote.outAmount,
          outputToken.decimals
        );
        const inputAmount = fromSmallestSwapUnit(
          quote.inAmount || amountInSmallestUnit,
          inputToken.decimals
        );
        if (!outputAmount) {
          throw new Error('Jupiter returned a route without output amount.');
        }
        if (quoteRequestIdRef.current !== requestId) return null;
        const nextQuoteState: ChatSwapQuoteState = {
          status: 'success',
          provider: 'Jupiter',
          routeLabel: 'Jupiter',
          receiveAmount: outputAmount,
          price: formatSwapQuoteRate(
            inputAmount || tokenSizedPayAmount,
            outputAmount,
            inputToken.symbol,
            outputToken.symbol
          ),
          priceImpact: quote.priceImpactPct as string | number | undefined,
          fee: 'included',
          rawQuote: quote,
          amountInSmallestUnit,
          inputAmount: inputAmount || tokenSizedPayAmount,
          outputAmount,
        };
        quoteCacheRef.current.set(quoteCacheKey, {
          state: nextQuoteState,
          ts: Date.now(),
        });
        return publishQuoteState(nextQuoteState);
      }

      const fromAddress =
        inputToken.chainId === SOLANA_CHAIN_ID
          ? inputToken.walletAddress || astroConsoleData.solWalletAddress
          : inputToken.walletAddress ||
            preferredEvmSignerAddress ||
            astroConsoleData.evmWalletAddress ||
            astroConsoleData.eoaAddress;
      const toAddress =
        outputToken.chainId === SOLANA_CHAIN_ID
          ? outputToken.walletAddress || astroConsoleData.solWalletAddress
          : outputToken.walletAddress ||
            preferredEvmSignerAddress ||
            astroConsoleData.evmWalletAddress ||
            astroConsoleData.eoaAddress;
      if (!fromAddress || !toAddress) {
        throw new Error('Connect the source and receive wallet to quote LiFi.');
      }

      const result = await withChatSwapQuoteTimeout(
        fetchLifiQuote({
          fromChain: inputToken.chainId,
          toChain: outputToken.chainId,
          fromToken: inputToken.address,
          toToken: outputToken.address,
          fromAddress,
          toAddress,
          fromAmount: amountInSmallestUnit,
          slippage: 0.005,
        }),
        'LiFi',
        12_000
      );
      if (!result.success || !result.data) {
        throw new Error(result.error || 'LiFi did not return a quote.');
      }

      const quote = result.data as Record<string, unknown>;
      const estimate = ticketObject(quote.estimate);
      const rawOutput = estimate?.toAmount ?? quote.toAmount;
      const rawInput = estimate?.fromAmount ?? quote.fromAmount;
      const outputAmount = fromSmallestSwapUnit(
        rawOutput,
        outputToken.decimals
      );
      const inputAmount = fromSmallestSwapUnit(
        rawInput || amountInSmallestUnit,
        inputToken.decimals
      );
      if (!outputAmount) {
        throw new Error('LiFi returned a route without output amount.');
      }
      const fromAmountUsd = Number(
        estimate?.fromAmountUSD ?? quote.fromAmountUSD
      );
      const toAmountUsd = Number(estimate?.toAmountUSD ?? quote.toAmountUSD);
      const impact =
        Number.isFinite(fromAmountUsd) &&
        Number.isFinite(toAmountUsd) &&
        fromAmountUsd > 0
          ? (toAmountUsd - fromAmountUsd) / fromAmountUsd
          : undefined;
      if (quoteRequestIdRef.current !== requestId) return null;
      const nextQuoteState: ChatSwapQuoteState = {
        status: 'success',
        provider: 'LiFi',
        routeLabel: `${inputToken.chainName} to ${outputToken.chainName}`,
        receiveAmount: outputAmount,
        price: formatSwapQuoteRate(
          inputAmount || tokenSizedPayAmount,
          outputAmount,
          inputToken.symbol,
          outputToken.symbol
        ),
        priceImpact: impact,
        fee: getLifiFeeLabel(quote),
        rawQuote: quote,
        amountInSmallestUnit,
        inputAmount: inputAmount || tokenSizedPayAmount,
        outputAmount,
      };
      quoteCacheRef.current.set(quoteCacheKey, {
        state: nextQuoteState,
        ts: Date.now(),
      });
      return publishQuoteState(nextQuoteState);
    } catch (error) {
      if (quoteRequestIdRef.current !== requestId) return null;
      return publishQuoteState({
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Unable to quote this swap route.',
      });
    }
  }, [
    amountType,
    astroConsoleData.eoaAddress,
    astroConsoleData.evmWalletAddress,
    astroConsoleData.solWalletAddress,
    preferredEvmSignerAddress,
    fromToken,
    hasSpendableBalance,
    isJupiterRoute,
    maxSellAmount,
    amountBalanceTolerance,
    normalizedPayAmount,
    normalizedPayNumber,
    payAmount,
    selectedFromOption,
    selectedToOption,
    toToken,
    dynamicProvider,
  ]);

  useEffect(() => {
    const quoteDelayMs = payAmount ? 450 : 0;
    const timeoutId = window.setTimeout(() => {
      void fetchSwapQuote();
    }, quoteDelayMs);
    return () => window.clearTimeout(timeoutId);
  }, [fetchSwapQuote, payAmount]);

  const fromTokenIsStable = ['USDC', 'USDT', 'DAI', 'PUSD'].includes(
    normalizeSwapSymbol(fromToken)
  );
  const executionPayAmount =
    amountType === 'usd' &&
    !fromTokenIsStable &&
    selectedFromOption?.priceUsd &&
    normalizedPayNumber > 0
      ? String(normalizedPayNumber / selectedFromOption.priceUsd)
      : normalizedPayAmount || payAmount;
  const hasUsableSwapSelection = Boolean(
    selectedFromOption &&
      selectedToOption &&
      payAmount &&
      selectedFromOption.key !== selectedToOption.key &&
      hasValidSellAmount &&
      hasSpendableBalance &&
      !amountExceedsBalance
  );
  const payLabel = payAmount
    ? amountType === 'usd'
      ? `${sellTokenDisplay} · ${formatCompactUsd(normalizedPayNumber)}`
      : sellUsdAmount > 0
      ? `${formatSwapAmount(payAmount)} ${fromToken} · ${formatCompactUsd(
          sellUsdAmount
        )}`
      : `${formatSwapAmount(payAmount)} ${fromToken}`
    : `0.00 ${fromToken}`;
  const quotedReceiveAmount = quoteState.receiveAmount || receiveAmount;
  const receiveLabel = quotedReceiveAmount
    ? `${formatSwapAmount(quotedReceiveAmount)} ${toToken}`
    : quoteState.status === 'loading'
    ? `Quoting ${toToken}`
    : quoteState.status === 'error'
    ? 'Quote unavailable'
    : `0.00 ${toToken}`;
  const displayPrice = quoteState.price || price || '--';
  const displayPriceImpact =
    quoteState.priceImpact !== undefined
      ? formatSwapPercent(quoteState.priceImpact)
      : formatSwapPercent(priceImpact);
  const displayFee = quoteState.fee || fee || '--';
  const displayProvider = quoteState.provider || dynamicProvider;
  const displayRouteLabel = quoteState.routeLabel || routeLabel;
  const isQuoteLoading = quoteState.status === 'loading';
  const isQuoteError = quoteState.status === 'error';
  const isSwapBusy = isPending || isConfirmingSwap;
  const headerStatusText = isQuoteLoading
    ? 'quoting'
    : inlineSwapStatus
    ? 'signing'
    : isQuoteError
    ? 'needs route'
    : quoteState.status === 'success'
    ? 'quoted'
    : isOpen
    ? 'ready'
    : status;
  const isTerminal =
    status === 'approved' ||
    status === 'executed' ||
    status === 'failed' ||
    status === 'rejected' ||
    status === 'expired';
  const actionLabel = quoteOnly
    ? inlineSwapStatus || isQuoteLoading
      ? 'Getting quote...'
      : quoteState.status === 'success'
      ? 'Refresh quote'
      : 'Get quote'
    : inlineSwapStatus || isSwapBusy
    ? inlineSwapStatus || 'Signing...'
    : status === 'approved'
    ? 'Approved'
    : status === 'executed'
    ? 'Confirmed'
    : 'Confirm swap';
  const handleConfirmSwap = async () => {
    if (quoteOnly) {
      setInlineSwapStatus('Refreshing quote...');
      try {
        await fetchSwapQuote();
      } finally {
        setInlineSwapStatus(null);
      }
      return;
    }

    if (
      !canAct ||
      isConfirmingSwap ||
      !selectedFromOption ||
      !selectedToOption
    ) {
      return;
    }

    setSwapError(null);
    setIsConfirmingSwap(true);

    try {
      const executionQuote =
        quoteState.status === 'success' && quoteState.rawQuote
          ? quoteState
          : await fetchSwapQuote();

      if (
        !executionQuote ||
        executionQuote.status !== 'success' ||
        !executionQuote.rawQuote
      ) {
        throw new Error('Get a live quote before confirming this swap.');
      }

      const amountInSmallestUnit =
        executionQuote.amountInSmallestUnit ||
        toSmallestSwapUnit(executionPayAmount, selectedFromOption.decimals);
      if (!amountInSmallestUnit || amountInSmallestUnit === '0') {
        throw new Error('Enter a valid swap amount.');
      }

      await getAccessToken().catch(() => null);

      let txHash = '';
      let txChainId = selectedFromOption.chainId;
      const outputAmount =
        executionQuote.receiveAmount ||
        executionQuote.outputAmount ||
        quotedReceiveAmount ||
        '';

      if (isJupiterRoute) {
        const selectedSolanaWallet =
          solanaWallets.find(
            (wallet) => wallet.address === astroConsoleData.solWalletAddress
          ) || solanaWallets[0];
        if (!solanaWalletsReady || !selectedSolanaWallet?.address) {
          throw new Error('Solana wallet is not ready yet.');
        }

        setInlineSwapStatus('Preparing Jupiter order...');
        const orderResult = await getJupiterOrder({
          inputMint: selectedFromOption.address,
          outputMint: selectedToOption.address,
          amount: amountInSmallestUnit,
          taker: selectedSolanaWallet.address,
        });
        if (!orderResult.success || !orderResult.data) {
          throw new Error(orderResult.error || 'Jupiter did not return an order.');
        }

        const order = orderResult.data as Record<string, unknown>;
        const orderTxB64 = String(order.transaction || '');
        const requestId = String(order.requestId || '');
        if (!orderTxB64 || !requestId) {
          throw new Error('Jupiter did not return a signable transaction.');
        }

        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
            'https://api.mainnet-beta.solana.com',
          { commitment: 'confirmed', confirmTransactionInitialTimeout: 60000 }
        );
        const transaction = VersionedTransaction.deserialize(
          Buffer.from(orderTxB64, 'base64')
        );
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.message.recentBlockhash = blockhash;

        setInlineSwapStatus('Sign swap...');
        const { signedTransaction } = await signTransaction({
          transaction: new Uint8Array(transaction.serialize()),
          wallet: selectedSolanaWallet,
        });

        setInlineSwapStatus('Submitting swap...');
        const executeResult = await postJupiterExecute({
          signedTransaction: Buffer.from(signedTransaction).toString('base64'),
          requestId,
        });
        if (!executeResult.success || !executeResult.data) {
          throw new Error(
            executeResult.error || 'Failed to submit Jupiter swap.'
          );
        }
        const executeData = executeResult.data as Record<string, unknown>;
        if (executeData.status === 'Failed') {
          throw new Error(
            String(executeData.error || executeData.code || 'Jupiter swap failed.')
          );
        }
        txHash = String(executeData.signature || '');
        if (!txHash) {
          throw new Error('No transaction signature returned from Jupiter.');
        }
      } else if (selectedFromOption.chainId === SOLANA_CHAIN_ID) {
        const selectedSolanaWallet =
          solanaWallets.find(
            (wallet) => wallet.address === astroConsoleData.solWalletAddress
          ) || solanaWallets[0];
        if (!solanaWalletsReady || !selectedSolanaWallet?.address) {
          throw new Error('Solana wallet is not ready yet.');
        }

        const transactionRequest = ticketObject(
          executionQuote.rawQuote.transactionRequest
        );
        const rawTx = transactionRequest?.transaction || transactionRequest?.data;
        if (!rawTx) {
          throw new Error('LiFi did not return a Solana transaction.');
        }

        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
            'https://api.mainnet-beta.solana.com',
          { commitment: 'confirmed', confirmTransactionInitialTimeout: 60000 }
        );
        const transaction = VersionedTransaction.deserialize(
          Buffer.from(String(rawTx), 'base64')
        );
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.message.recentBlockhash = blockhash;

        setInlineSwapStatus('Sign swap...');
        const result = await signAndSendTransaction({
          transaction: new Uint8Array(transaction.serialize()),
          wallet: selectedSolanaWallet,
        });
        txHash =
          typeof result.signature === 'string'
            ? result.signature
            : bs58.encode(result.signature);
      } else {
        const chainIdNumber = Number(selectedFromOption.chainId);
        if (!Number.isFinite(chainIdNumber)) {
          throw new Error('Unsupported EVM swap chain.');
        }

        const transactionRequest = ticketObject(
          executionQuote.rawQuote.transactionRequest
        );
        if (!transactionRequest?.to || !transactionRequest?.data) {
          throw new Error('LiFi did not return an EVM transaction.');
        }

        const estimate = ticketObject(executionQuote.rawQuote.estimate);
        const spender = String(
          estimate?.approvalAddress ||
            executionQuote.rawQuote.approvalAddress ||
            ''
        );
        const amountRaw = String(
          estimate?.fromAmount ||
            executionQuote.rawQuote.fromAmount ||
            amountInSmallestUnit
        );
        const transactionValueWei =
          parseChatEvmQuantityToBigInt(transactionRequest.value) ||
          (isNativeEvmSwapToken(selectedFromOption)
            ? parseChatEvmQuantityToBigInt(amountRaw)
            : 0n);
        const estimatedTransactionCount =
          !isNativeEvmSwapToken(selectedFromOption) &&
          spender &&
          selectedFromOption.address
            ? 2
            : 1;
        const { wallet: evmWallet, provider, address: fromAddress } =
          await resolveChatEvmWalletForTransaction({
            wallets: evmWallets as ChatEvmWalletLike[],
            chainId: chainIdNumber,
            preferredAddresses: [
              selectedFromOption.walletAddress,
              astroConsoleData.evmWalletAddress,
              ...(astroConsoleData.evmWalletAddresses || []),
              astroConsoleData.eoaAddress,
            ],
            requiredNativeWei:
              transactionValueWei +
              getChatEvmGasBufferWei(
                chainIdNumber,
                estimatedTransactionCount
              ),
            networkLabel: selectedFromOption.chainName,
          });
        if (
          !isNativeEvmSwapToken(selectedFromOption) &&
          spender &&
          selectedFromOption.address
        ) {
          setInlineSwapStatus('Approve token spend...');
          await ensureChatEvmSwapAllowance({
            tokenAddress: selectedFromOption.address,
            owner: fromAddress,
            spender,
            amountWei: amountRaw,
            chainId: chainIdNumber,
            provider,
            switchChain: evmWallet.switchChain?.bind(evmWallet),
          });
        }

        const rawTxRequest: Record<string, unknown> = {
          ...transactionRequest,
          from: fromAddress,
          chainId: `0x${chainIdNumber.toString(16)}`,
        };
        const gasField = rawTxRequest.gasLimit ?? rawTxRequest.gas;
        const gasNumber =
          typeof gasField === 'string'
            ? parseInt(gasField, gasField.startsWith('0x') ? 16 : 10)
            : Number(gasField);
        if (Number.isFinite(gasNumber) && gasNumber > 20_000_000) {
          const cappedGas = `0x${(20_000_000).toString(16)}`;
          if (rawTxRequest.gasLimit !== undefined) {
            rawTxRequest.gasLimit = cappedGas;
          }
          if (rawTxRequest.gas !== undefined) {
            rawTxRequest.gas = cappedGas;
          }
        }

        setInlineSwapStatus('Sign swap...');
        const hash = await provider.request({
          method: 'eth_sendTransaction',
          params: [rawTxRequest],
        });
        txHash = String(hash || '');
        txChainId = selectedFromOption.chainId;
      }

      if (!txHash) {
        throw new Error('Swap submitted without a transaction hash.');
      }

      try {
        await postAgentSwapToFeed({
          accessToken,
          user,
          signature: txHash,
          walletAddress:
            selectedFromOption.walletAddress ||
            selectedToOption.walletAddress ||
            (selectedFromOption.chainId === SOLANA_CHAIN_ID
              ? astroConsoleData.solWalletAddress
              : astroConsoleData.evmWalletAddress ||
                astroConsoleData.eoaAddress ||
                ''),
          inputToken: selectedFromOption,
          outputToken: selectedToOption,
          inputAmount: executionQuote.inputAmount || executionPayAmount,
          outputAmount,
        });
      } catch (feedError) {
        console.warn('Wallet swap executed, but feed posting failed:', feedError);
      }

      const completionDraft: Omit<
        AgentActionCompletion,
        | 'proposalId'
        | 'proposalNonce'
        | 'invocationId'
        | 'agentId'
        | 'groupId'
        | 'action'
        | 'toolType'
      > & { proposalId?: string } = {
        proposalId,
        status: 'executed',
        provider: 'swop',
        title: `Swapped ${fromToken} to ${toToken}`,
        subtitle: `${displayProvider} · ${displayRouteLabel}`,
        subject: `${fromToken} -> ${toToken}`,
        stake: sellUsdAmount > 0 ? sellUsdAmount : executionPayAmount,
        placedAt: new Date().toISOString(),
        txHash,
        txUrl: getChatSwapExplorerTxUrl(txChainId, txHash),
        explorerLabel: 'View tx',
        executionResult: {
          kind: 'swap',
          hash: txHash,
          provider: displayProvider,
          routeLabel: displayRouteLabel,
          fromToken,
          toToken,
          fromAmount: formatSwapAmount(executionPayAmount),
          toAmount: outputAmount ? formatSwapAmount(outputAmount) : '',
          fromChain: selectedFromOption.chainName,
          toChain: selectedToOption.chainName,
          price: displayPrice,
          priceImpact: displayPriceImpact,
          fee: displayFee,
        },
      };

      let completion = {
        ...completionDraft,
        proposalId,
      } as AgentActionCompletion;
      try {
        completion =
          (await completeAgentActionFromHandoff(
            completionDraft,
            accessToken
          )) || completion;
      } catch (completionError) {
        console.warn(
          'Wallet swap executed, but Swop completion reporting failed:',
          completionError
        );
      }

      setLocalReceipt(completion);
      onInlineActionComplete(completion);
      queryClient.invalidateQueries({ queryKey: ['walletTokens'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Swap submitted.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to confirm swap.';
      try {
        const failedCompletion = await completeAgentActionFromHandoff(
          {
            proposalId,
            status: 'failed',
            provider: 'swop',
            title: `Swap ${fromToken} to ${toToken}`,
            subtitle: displayRouteLabel,
            subject: `${fromToken} -> ${toToken}`,
            error: message,
          },
          accessToken
        );
        if (failedCompletion) {
          onInlineActionComplete(failedCompletion);
        } else {
          clearAgentActionHandoff();
        }
      } catch {
        clearAgentActionHandoff();
      }
      setSwapError(message);
      toast.error(message);
    } finally {
      setInlineSwapStatus(null);
      setIsConfirmingSwap(false);
    }
  };

  const renderTokenSelector = (
    kind: 'from' | 'to',
    selected: ChatSwapSelectableToken | null | undefined,
    options: ChatSwapSelectableToken[],
    onSelect: (key: string) => void,
    emphasized = false
  ) => {
    const isOpenSelector = openTokenSelector === kind;
    const optionList = options.slice(0, 42);
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() =>
            setOpenTokenSelector(isOpenSelector ? null : kind)
          }
          disabled={!options.length}
          className={`dm-btn flex h-10 max-w-[190px] items-center gap-2 rounded-full border py-0 pl-2 pr-3 text-left transition ${
            emphasized
              ? 'border-[#3fe08f]/30 bg-[#3fe08f]/12 text-[#3fe08f]'
              : 'border-white/[0.07] bg-black/30 text-[#eceef2]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span
            className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[8.5px] font-black uppercase ${
              emphasized
                ? 'bg-[#3fe08f]/20 text-[#9ef7c8]'
                : 'bg-white/[0.08] text-[#eceef2]'
            }`}
          >
            {(selected?.symbol || '---').slice(0, 3)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">
            {getSwapTokenShortLabel(selected)}
          </span>
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-[#3fe08f]" />
        </button>

        {isOpenSelector && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-30 max-h-72 w-72 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-[14px] border border-white/[0.09] bg-[#111318] p-1.5 shadow-[0_24px_64px_-18px_rgba(0,0,0,0.9)]">
            {optionList.length ? (
              optionList.map((option) => {
                const active = option.key === selected?.key;
                const subLabel = getSwapTokenSubLabel(option);
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      onSelect(option.key);
                      setOpenTokenSelector(null);
                    }}
                    className={`dm-btn flex w-full items-center gap-3 rounded-[11px] px-3 py-2 text-left ${
                      active
                        ? 'border border-[#3fe08f]/35 bg-[#3fe08f]/12'
                        : 'border border-transparent hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-white/[0.07] text-[9.5px] font-black uppercase text-[#eceef2]">
                      {option.symbol.slice(0, 3)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold text-[#eceef2]">
                        {getSwapTokenShortLabel(option)}
                      </span>
                      <span className="dm-mono mt-0.5 block truncate text-[10px] font-semibold text-[#6f7380]">
                        {subLabel || (option.isWalletToken ? 'wallet token' : 'quote token')}
                      </span>
                    </span>
                    {active && <Check className="h-3.5 w-3.5 text-[#3fe08f]" />}
                  </button>
                );
              })
            ) : (
              <div className="rounded-[11px] border border-[#ffb14a]/25 bg-[#ffb14a]/10 px-3 py-2 text-[11px] font-semibold text-[#ffd08a]">
                No tokens available.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (localReceipt) {
    return (
      <AgentActionReceiptCard
        receipt={localReceipt}
        onDone={() => setLocalReceipt(null)}
      />
    );
  }

  return (
    <div className={`mt-2 w-full max-w-[460px] overflow-hidden text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-[#eceef2]">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-[7px] bg-[#3fe08f]/15">
              <ArrowRightLeft className="h-3.5 w-3.5 text-[#3fe08f]" />
            </span>
            <span className="truncate">swap quote</span>
          </div>
          <div className="dm-mono mt-1 truncate text-[10px] text-[#5a5e69]">
            {fromToken} to {toToken} · {proposalId}
          </div>
        </div>
        <span
          className={`dm-mono inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
            isQuoteError || status === 'failed' || status === 'rejected'
              ? 'bg-[#ff5d63]/15 text-[#ffb2b6]'
              : 'bg-[#3fe08f]/10 text-[#9ef7c8]'
          }`}
        >
          {isQuoteLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Radio className="h-3 w-3" />
          )}
          {headerStatusText}
        </span>
      </div>

      <div className="px-3.5 pb-3 pt-3">
      <div className="mb-3 space-y-1.5">
        <div className="rounded-[14px] border border-white/[0.07] bg-[#0f1116] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className={TICKET_LABEL_CLASS}>you pay</span>
            <span className="dm-mono truncate text-[10px] font-semibold text-[#5a5e69]">
              Bal ·{' '}
              {selectedFromOption?.balance
                ? `${formatSwapAmount(selectedFromOption.balance)} ${fromToken}`
                : `0 ${fromToken}`}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent dm-mono text-[28px] font-bold leading-none text-[#eceef2] outline-none placeholder:text-[#5a5e69]"
            />
            {renderTokenSelector(
              'from',
              selectedFromOption,
              fromSelectOptions,
              setSelectedFromKey
            )}
          </div>
          <div className="mt-3 rounded-[12px] border border-white/[0.06] bg-black/25 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className={TICKET_LABEL_CLASS}>sell amount</span>
              <span className="dm-mono text-[10px] font-bold text-[#3fe08f]">
                {Math.round(amountDialPercent)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={amountDialPercent}
              onChange={(event) =>
                setAmountFromPercent(Number(event.target.value))
              }
              disabled={!hasSpendableBalance}
              aria-label="Adjust sell amount"
              className="mt-2 h-2 w-full cursor-pointer accent-[#3fe08f] disabled:cursor-not-allowed disabled:opacity-40"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-[10px] border border-white/[0.05] bg-[#111318] px-2.5 py-2">
                <div className={TICKET_LABEL_CLASS}>token amount</div>
                <div className="dm-mono mt-1 truncate text-[12px] font-bold text-[#eceef2]">
                  {sellTokenDisplay}
                </div>
              </div>
              <div className="min-w-0 rounded-[10px] border border-white/[0.05] bg-[#111318] px-2.5 py-2 text-right">
                <div className={TICKET_LABEL_CLASS}>dollar value</div>
                <div className="dm-mono mt-1 truncate text-[12px] font-bold text-[#3fe08f]">
                  {sellUsdDisplay}
                </div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setAmountFromPercent(percent)}
                  disabled={!hasSpendableBalance}
                  className="dm-btn h-7 rounded-[8px] border border-white/[0.07] bg-[#101217] text-[10.5px] font-bold text-[#a5a9b4] hover:border-[#3fe08f]/35 hover:text-[#3fe08f] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {percent === 100 ? 'Max' : `${percent}%`}
                </button>
              ))}
            </div>
          </div>
          {amountExceedsBalance && (
            <div className="mt-2 rounded-[9px] border border-[#ffb14a]/25 bg-[#ffb14a]/10 px-3 py-2 text-[10.5px] font-semibold text-[#ffd08a]">
              Amount is above your {formatSwapAmount(maxSellAmount)} {fromToken}{' '}
              balance.
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <div className="grid h-8 w-8 place-items-center rounded-[10px] border border-white/[0.07] bg-black/40 text-[#3fe08f]">
            <ArrowRightLeft className="h-3.5 w-3.5 rotate-90" />
          </div>
        </div>

        <div className="rounded-[14px] border border-white/[0.07] bg-[#0f1116] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className={TICKET_LABEL_CLASS}>you get</span>
            <span className="dm-mono truncate text-[10px] font-semibold text-[#5a5e69]">
              {selectedToOption?.chainName || formatSwapChainName(toChainId)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="min-w-0 flex-1 dm-mono text-[28px] font-bold leading-none text-[#3fe08f]">
              {quotedReceiveAmount
                ? formatSwapAmount(quotedReceiveAmount)
                : quoteState.status === 'loading'
                ? '...'
                : '0.00'}
            </div>
            {renderTokenSelector(
              'to',
              selectedToOption,
              quoteTokenOptions,
              setSelectedToKey,
              true
            )}
          </div>
        </div>
      </div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
          best route · {displayProvider}
        </div>
        {quoteOnly && (
          <div className="dm-mono rounded-[6px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 px-2 py-1 text-[8.5px] font-bold uppercase text-[#9ef7c8]">
            quote only
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[13px] border border-[#3fe08f]/15 bg-[#101217] shadow-[0_18px_42px_-30px_rgba(63,224,143,0.45)]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2">
          <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
            route · {displayRouteLabel}
          </div>
          <div className="dm-mono rounded-[6px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 px-2 py-0.5 text-[8.5px] font-bold uppercase text-[#3fe08f]">
            {displayProvider}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-4">
          <div className="min-w-0">
            <div className={TICKET_LABEL_CLASS}>you pay</div>
            <div className="dm-mono mt-1 truncate text-[18px] font-bold text-[#eceef2]">
              {payLabel}
            </div>
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-full border border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#3fe08f]">
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="min-w-0 text-right">
            <div className={TICKET_LABEL_CLASS}>you get</div>
            <div className="dm-mono mt-1 truncate text-[18px] font-bold text-[#3fe08f]">
              {receiveLabel}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/[0.07] px-3 py-2">
          <div className="min-w-0">
            <div className={TICKET_LABEL_CLASS}>price</div>
            <div className="dm-mono mt-1 truncate text-[10.5px] font-semibold text-[#a5a9b4]">
              {displayPrice}
            </div>
          </div>
          <div className="min-w-0 text-center">
            <div className={TICKET_LABEL_CLASS}>impact</div>
            <div className="dm-mono mt-1 truncate text-[10.5px] font-semibold text-[#a5a9b4]">
              {displayPriceImpact}
            </div>
          </div>
          <div className="min-w-0 text-right">
            <div className={TICKET_LABEL_CLASS}>fee</div>
            <div className="dm-mono mt-1 truncate text-[10.5px] font-semibold text-[#a5a9b4]">
              {displayFee}
            </div>
          </div>
        </div>

        {isTerminal && (
          <div className="dm-mono border-t border-[#3fe08f]/15 bg-[#3fe08f]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9ef7c8]">
            {status === 'executed'
              ? 'confirmed'
              : status === 'approved'
              ? 'approved · open wallet to sign'
              : status}
          </div>
        )}
      </div>

      {quoteState.error && (
        <div className="mt-3 rounded-[10px] border border-[#ffb14a]/25 bg-[#ffb14a]/10 px-3 py-2 text-[11px] font-semibold text-[#ffd08a]">
          {quoteState.error}
        </div>
      )}

      {swapError && (
        <div className="mt-3 rounded-[10px] border border-[#ff5d63]/25 bg-[#ff5d63]/10 px-3 py-2 text-[11px] font-semibold text-[#ffb2b6]">
          {swapError}
        </div>
      )}

      {inlineSwapStatus && !swapError && (
        <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 px-3 py-2 text-[11px] font-semibold text-[#9ef7c8]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {inlineSwapStatus}
        </div>
      )}

      {isOpen && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              void handleConfirmSwap();
            }}
            disabled={
              !canAct || isSwapBusy || isQuoteLoading || !hasUsableSwapSelection
            }
            className={TICKET_PRIMARY_BUTTON_CLASS}
          >
            {isQuoteLoading || isConfirmingSwap ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : status === 'approved' || status === 'executed' ? (
              <Check className="h-3.5 w-3.5" />
            ) : quoteOnly ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <ArrowRightLeft className="h-3.5 w-3.5" />
            )}
            {actionLabel}
          </button>
          <button
            type="button"
            onClick={() => onReject(proposalId)}
            disabled={!canAct || isPending}
            className={TICKET_REJECT_BUTTON_CLASS}
          >
            <Ban className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}

      {!canAct && isOpen && (
        <p className="mt-2 text-[11px] text-[#ffd08a]">
          Only the user who asked Astro to prepare this swap can approve it.
        </p>
      )}
      </div>
    </div>
  );
}

function initialTicketSide(params?: Record<string, unknown>) {
  const value =
    params?.side ??
    params?.direction ??
    params?.isLong ??
    params?.isBuy ??
    params?.sideDirection;
  if (typeof value === 'boolean') return value ? 'long' : 'short';
  const normalized = String(value || '').toLowerCase();
  if (['long', 'buy', 'bid'].includes(normalized)) return 'long';
  if (['short', 'sell', 'ask'].includes(normalized)) return 'short';
  return '';
}

function initialTicketMode(params?: Record<string, unknown>) {
  const normalized = firstTicketValue(params, [
    'orderMode',
    'orderType',
    'type',
  ]).toLowerCase();
  if (normalized === 'limit' || normalized === 'post_only') return 'limit';
  if (
    ['tpsl', 'tp_sl', 'take_profit_stop_loss', 'take-profit-stop-loss'].includes(
      normalized
    )
  ) {
    return 'tpsl';
  }
  return 'market';
}

function initialPerpsSizeUsd(params?: Record<string, unknown>) {
  return firstTicketValue(params, [
    'sizeUsd',
    'usdSize',
    'notionalUsd',
    'amountUsd',
    'totalUsd',
    'amount',
    'usd',
    'notional',
    'valueUsd',
    'orderValueUsd',
  ]);
}

function initialTicketBool(
  params: Record<string, unknown> | undefined,
  names: string[],
  fallback: boolean
) {
  const value = names
    .map((name) => params?.[name])
    .find((entry) => entry !== undefined && entry !== null && entry !== '');
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }
  return fallback;
}

function positiveInput(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

type HyperliquidTicketFlow =
  | 'order'
  | 'authorizing'
  | 'opening'
  | 'opened'
  | 'manage';
type InlineHyperliquidOrderMode = 'market' | 'limit' | 'tpsl';

interface HyperliquidInlineReceipt {
  coin: string;
  side: 'long' | 'short';
  orderMode: InlineHyperliquidOrderMode;
  isPositionTpsl?: boolean;
  isClose?: boolean;
  leverage: number;
  isCross: boolean;
  collateralUsd: number;
  notionalUsd: number;
  sizeCoins: string;
  entryPrice: number;
  exitPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  liquidationPrice: number;
  feeUsd: number;
  orderId?: string | number;
  placedAt: string;
}

const HYPERLIQUID_FALLBACK_MARKS: Record<string, number> = {
  BTC: 74000,
  ETH: 3250,
  SOL: 165,
  HYPE: 35,
  PAXG: 2000,
  GOLD: 2000,
  XRP: 2.2,
  DOGE: 0.2,
  BRENTOIL: 95,
  NATGAS: 3.2,
  SPCX: 200,
};

function displayPerpsCoin(coin: string) {
  return coin.includes(':') ? coin.split(':').pop() || coin : coin;
}

function perpsQueryMatchesCoin(coin: string, query: string) {
  const coinKey = compactPerpsMarketKey(coin);
  const displayKey = compactPerpsMarketKey(displayPerpsCoin(coin));
  const queryKey = compactPerpsMarketKey(query);
  const aliasKeys = perpsAliasTargets(query).map((target) =>
    compactPerpsMarketKey(target)
  );

  return [queryKey, ...aliasKeys].some(
    (target) => target && (target === coinKey || target === displayKey)
  );
}

function initialPerpsCoin(params?: Record<string, unknown>) {
  const requested = firstTicketValue(params, [
    'marketQuery',
    'requestedMarket',
    'requestedMarketSymbol',
  ]);
  const direct = firstTicketValue(params, ['coin', 'symbol', 'asset']);

  if (direct && (!requested || perpsQueryMatchesCoin(direct, requested))) {
    return direct;
  }

  if (requested) {
    return perpsAliasTargets(requested)[0] || requested;
  }

  return direct;
}

function perpsCoinMatches(candidate: string, coin: string) {
  const normalizedCandidate = candidate.trim().toUpperCase();
  const normalizedCoin = coin.trim().toUpperCase();
  const candidateDisplay = displayPerpsCoin(candidate).toUpperCase();
  const coinDisplay = displayPerpsCoin(coin).toUpperCase();
  const coinAliasTargets = perpsAliasTargets(coin).map((target) =>
    target.toUpperCase()
  );
  return (
    normalizedCandidate === normalizedCoin ||
    candidateDisplay === normalizedCoin ||
    normalizedCandidate === coinDisplay ||
    candidateDisplay === coinDisplay ||
    coinAliasTargets.includes(normalizedCandidate) ||
    coinAliasTargets.includes(candidateDisplay)
  );
}

function perpsMarketForCoin(markets: HLMarket[], coin: string) {
  return (
    markets.find((market) => perpsCoinMatches(market.coin, coin)) ||
    markets.find((market) =>
      market.displayCoin ? perpsCoinMatches(market.displayCoin, coin) : false
    )
  );
}

function getPerpsMarkPrice(coin: string, market?: HLMarket) {
  const live = toFiniteNumber(market?.markPrice || market?.midPrice);
  if (live > 0) return live;
  return HYPERLIQUID_FALLBACK_MARKS[displayPerpsCoin(coin).toUpperCase()] || 1;
}

function formatPerpsPrice(value: unknown) {
  const number = toFiniteNumber(value);
  if (number >= 1000) {
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (number >= 1) {
    return number.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  }
  return number.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function formatPerpsOrderSize(value: number, decimals = 4) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return value.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '');
}

function formatPerpsInputAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function clampPerpsLeverage(value: unknown, market?: HLMarket) {
  const max = Math.max(1, market?.maxLeverage || 50);
  const number = Math.round(toFiniteNumber(value));
  if (!Number.isFinite(number) || number <= 0) return 1;
  return Math.min(max, Math.max(1, number));
}

function estimatePerpsLiquidationPrice(
  entryPrice: number,
  side: 'long' | 'short',
  leverage: number
) {
  if (!entryPrice || !leverage) return 0;
  const move = 1 / Math.max(1, leverage);
  return side === 'long'
    ? entryPrice * Math.max(0, 1 - move)
    : entryPrice * (1 + move);
}

function perpsSparkPath(width = 116, height = 48) {
  const points = [0.18, 0.24, 0.22, 0.36, 0.34, 0.5, 0.47, 0.61, 0.58, 0.72];
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - point * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function extractInlineHyperliquidOrderId(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const text = JSON.stringify(value);
  const oidMatch = text.match(/"oid"\s*:\s*"?([0-9A-Za-z_-]+)"?/);
  if (oidMatch?.[1]) return oidMatch[1];
  const orderIdMatch = text.match(/"orderId"\s*:\s*"?([0-9A-Za-z_-]+)"?/);
  return orderIdMatch?.[1];
}

function summarizeInlineHyperliquidResult(value: unknown) {
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  if (!('status' in record) && !('response' in record) && !('data' in record)) {
    return record;
  }
  return {
    status: record.status,
    response: record.response,
    data: record.data,
  };
}

function mergeMissingHyperliquidPromptParams(
  proposalParams: Record<string, unknown> | undefined,
  sourceText?: string
) {
  const base = { ...(proposalParams || {}) };
  const sourceParams = sourceText
    ? (findHyperliquidOrderIntent(sourceText)?.params as
        | Record<string, unknown>
        | undefined)
    : null;

  if (!sourceParams) return base;

  Object.entries(sourceParams).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() &&
      (base[key] === undefined || base[key] === null || String(base[key]).trim() === '')
    ) {
      base[key] = value;
    }
  });

  const sourceRiskPrices = [
    sourceParams.takeProfitPrice,
    sourceParams.takeProfit,
    sourceParams.tpPrice,
    sourceParams.tp,
    sourceParams.stopLossPrice,
    sourceParams.stopLoss,
    sourceParams.slPrice,
    sourceParams.sl,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const sourceHasRiskPrice = sourceRiskPrices.length > 0;
  const sourceHasExplicitEntry = Boolean(
    sourceParams.price || sourceParams.limitPrice || sourceParams.entryPrice
  );
  if (sourceHasRiskPrice && !sourceHasExplicitEntry) {
    ['price', 'limitPrice', 'p'].forEach((key) => {
      const value = String(base[key] || '').trim();
      if (sourceRiskPrices.includes(value)) {
        delete base[key];
      }
    });
  }

  if (
    sourceHasRiskPrice &&
    !/\b(limit|tpsl)\b/i.test(
      String(base.orderMode || base.orderType || '')
    )
  ) {
    base.orderMode = sourceParams.orderMode || 'market';
    base.orderType = sourceParams.orderType || base.orderMode;
  }

  return base;
}

function HyperliquidProposalFlowTicket({
  proposal,
  proposalId,
  status,
  canAct,
  isPending,
  onApproveInline,
  onInlineActionComplete,
  onReject,
  onAddFunds,
  astroConsoleData,
  sourceText,
}: {
  proposal?: AgentActionProposal | null;
  proposalId: string;
  status: string;
  canAct: boolean;
  isPending: boolean;
  onApproveInline: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  onReject: (proposalId: string) => void;
  onAddFunds: () => void;
  astroConsoleData: AstroConsoleData;
  sourceText?: string;
}) {
  const { accessToken, user, primaryMicrosite } = useUser();
  const queryClient = useQueryClient();
  const params = useMemo(
    () =>
      mergeMissingHyperliquidPromptParams(
        proposal?.normalizedParams,
        sourceText
      ),
    [proposal?.normalizedParams, sourceText]
  );
  const isClosePosition =
    proposal?.toolType === 'perps.write' &&
    proposal?.action === 'perps.close_position';
  const [coin, setCoin] = useState(
    initialPerpsCoin(params) || 'ETH'
  );
  const [side, setSide] = useState<'long' | 'short'>(
    initialTicketSide(params) === 'short' ? 'short' : 'long'
  );
  const [orderMode, setOrderMode] = useState<InlineHyperliquidOrderMode>(
    isClosePosition
      ? 'market'
      : (initialTicketMode(params) as InlineHyperliquidOrderMode)
  );
  const [price, setPrice] = useState(
    firstTicketValue(params, ['price', 'limitPrice', 'p'])
  );
  const [takeProfit, setTakeProfit] = useState(
    firstTicketValue(params, ['takeProfitPrice', 'takeProfit', 'tpPrice', 'tp'])
  );
  const [stopLoss, setStopLoss] = useState(
    firstTicketValue(params, ['stopLossPrice', 'stopLoss', 'slPrice', 'sl'])
  );
  const [collateralUsd, setCollateralUsd] = useState(
    initialPerpsSizeUsd(params) || ''
  );
  const [leverage, setLeverage] = useState(
    firstTicketValue(params, ['leverage']) || '5'
  );
  const [isCross] = useState(
    initialTicketBool(params, ['isCross', 'cross'], false)
  );
  const [reduceOnly] = useState(
    initialTicketBool(params, ['reduceOnly'], false)
  );
  const isPositionTpsl = initialTicketBool(params, ['positionTpsl'], false);
  const [flow, setFlow] = useState<HyperliquidTicketFlow>('order');
  const [localError, setLocalError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<HyperliquidInlineReceipt | null>(null);

  useEffect(() => {
    setCoin(initialPerpsCoin(params) || 'ETH');
    setSide(initialTicketSide(params) === 'short' ? 'short' : 'long');
    setOrderMode(
      isClosePosition
        ? 'market'
        : (initialTicketMode(params) as InlineHyperliquidOrderMode)
    );
    setPrice(firstTicketValue(params, ['price', 'limitPrice', 'p']));
    setTakeProfit(
      firstTicketValue(params, ['takeProfitPrice', 'takeProfit', 'tpPrice', 'tp'])
    );
    setStopLoss(
      firstTicketValue(params, ['stopLossPrice', 'stopLoss', 'slPrice', 'sl'])
    );
    setCollateralUsd(initialPerpsSizeUsd(params) || '');
    setLeverage(firstTicketValue(params, ['leverage']) || '5');
    setFlow('order');
    setLocalError(null);
    setReceipt(null);
  }, [params, proposalId, isClosePosition]);

  const requestedAssetIndex = Number(
    firstTicketValue(params, ['assetIndex', 'assetId', 'a'])
  );
  const selectedMarket =
    perpsMarketForCoin(astroConsoleData.perpsMarkets, coin) ||
    (Number.isFinite(requestedAssetIndex)
      ? astroConsoleData.perpsMarkets.find(
          (market) => market.index === requestedAssetIndex
        )
      : undefined);
  const markPrice = getPerpsMarkPrice(coin, selectedMarket);
  const requestedCloseSide = initialTicketSide(params);
  const matchingClosePosition = isClosePosition
    ? astroConsoleData.perpsAccount?.positions.find((position) => {
        if (Math.abs(toFiniteNumber(position.szi)) <= 0) return false;
        if (!perpsCoinMatches(position.coin, selectedMarket?.coin || coin)) {
          return false;
        }
        if (requestedCloseSide !== 'long' && requestedCloseSide !== 'short') {
          return true;
        }
        return getPerpsPositionSide(position) === requestedCloseSide;
      }) || null
    : null;
  const closePositionSide: 'long' | 'short' =
    matchingClosePosition
      ? getPerpsPositionSide(matchingClosePosition)
      : requestedCloseSide === 'short'
      ? 'short'
      : 'long';
  const requestedCloseSizeCoins = toFiniteNumber(
    firstTicketValue(params, [
      'size',
      'sz',
      'sizeCoins',
      'positionSizeCoins',
      'coinSize',
      'totalSize',
      'closeSize',
    ])
  );
  const matchingCloseSizeCoins = Math.abs(
    toFiniteNumber(matchingClosePosition?.szi)
  );
  const closeSizeCoinsValue =
    requestedCloseSizeCoins > 0
      ? matchingCloseSizeCoins > 0
        ? Math.min(requestedCloseSizeCoins, matchingCloseSizeCoins)
        : requestedCloseSizeCoins
      : matchingCloseSizeCoins;
  const closeSize = formatPerpsOrderSize(
    closeSizeCoinsValue,
    selectedMarket?.szDecimals ?? 4
  );
  const closeMarkPrice =
    toFiniteNumber(firstTicketValue(params, ['markPrice', 'price', 'exitPrice'])) ||
    markPrice ||
    toFiniteNumber(matchingClosePosition?.entryPx);
  const closeEntryPrice =
    toFiniteNumber(firstTicketValue(params, ['entryPrice'])) ||
    toFiniteNumber(matchingClosePosition?.entryPx) ||
    closeMarkPrice;
  const closeCollateralUsd =
    toFiniteNumber(
      firstTicketValue(params, ['collateralUsd', 'marginUsed', 'marginUsd'])
    ) || toFiniteNumber(matchingClosePosition?.marginUsed);
  const closeNotionalUsd =
    closeSizeCoinsValue * closeMarkPrice ||
    toFiniteNumber(matchingClosePosition?.positionValue);
  const closeLeverageValue =
    toFiniteNumber(firstTicketValue(params, ['leverage'])) ||
    matchingClosePosition?.leverage?.value ||
    1;
  const closeIsCross = matchingClosePosition
    ? matchingClosePosition.leverage.type !== 'isolated'
    : initialTicketBool(params, ['isCross', 'cross'], false);
  const closeLiquidationPrice =
    toFiniteNumber(firstTicketValue(params, ['liquidationPrice'])) ||
    toFiniteNumber(matchingClosePosition?.liquidationPx);
  const maxLeverage = selectedMarket?.maxLeverage || 50;
  const leverageValue = clampPerpsLeverage(leverage, selectedMarket);
  const requestedSizeCoins = firstTicketValue(params, [
    'positionSizeCoins',
    'sizeCoins',
    'coinSize',
    'sz',
    'totalSize',
  ]);
  const collateralUsdValue = toFiniteNumber(collateralUsd);
  const entryPriceFromParams = firstTicketValue(params, [
    'entryPrice',
    'price',
    'markPrice',
  ]);
  const positionSizeCoinsValue = toFiniteNumber(requestedSizeCoins);
  const collateralNotionalUsd = collateralUsdValue * leverageValue;
  const positionNotionalUsd =
    positionSizeCoinsValue > 0
      ? positionSizeCoinsValue * markPrice
      : toFiniteNumber(initialPerpsSizeUsd(params));
  const notionalUsd = isClosePosition
    ? closeNotionalUsd
    : isPositionTpsl
    ? positionNotionalUsd
    : collateralNotionalUsd;
  const sizeCoinsValue =
    isClosePosition
      ? closeSizeCoinsValue
      : isPositionTpsl && positionSizeCoinsValue > 0
      ? positionSizeCoinsValue
      : markPrice > 0
      ? notionalUsd / markPrice
      : 0;
  const orderSize = isClosePosition
    ? closeSize
    : formatPerpsOrderSize(sizeCoinsValue, selectedMarket?.szDecimals ?? 4);
  const usesCustomEntryPrice =
    !isClosePosition &&
    !isPositionTpsl &&
    (orderMode === 'limit' || orderMode === 'tpsl');
  const needsEntryPrice = usesCustomEntryPrice && !positiveInput(price);
  const entryPrice =
    usesCustomEntryPrice && !needsEntryPrice
      ? toFiniteNumber(price)
      : toFiniteNumber(entryPriceFromParams) || markPrice;
  const takeProfitValue = toFiniteNumber(takeProfit);
  const stopLossValue = toFiniteNumber(stopLoss);
  const hasTakeProfit = positiveInput(takeProfit);
  const hasStopLoss = positiveInput(stopLoss);
  const activeSide = isClosePosition ? closePositionSide : side;
  const hasTriggerPrices = hasTakeProfit || hasStopLoss;
  const showTriggerControls =
    !isClosePosition && (orderMode === 'tpsl' || hasTriggerPrices);
  const tpslNeedsPrices =
    showTriggerControls && !hasTakeProfit && !hasStopLoss;
  const riskPriceError =
    !showTriggerControls || entryPrice <= 0
      ? ''
      : activeSide === 'long'
      ? hasTakeProfit && takeProfitValue <= entryPrice
        ? 'Take profit must be above entry for a long.'
        : hasStopLoss && stopLossValue >= entryPrice
        ? 'Stop loss must be below entry for a long.'
        : ''
      : hasTakeProfit && takeProfitValue >= entryPrice
      ? 'Take profit must be below entry for a short.'
      : hasStopLoss && stopLossValue <= entryPrice
      ? 'Stop loss must be above entry for a short.'
      : '';
  const liquidationPrice = isClosePosition
    ? closeLiquidationPrice
    : toFiniteNumber(firstTicketValue(params, ['liquidationPrice'])) ||
      estimatePerpsLiquidationPrice(entryPrice, side, leverageValue);
  const openFee = isPositionTpsl
    ? 0
    : (isClosePosition ? closeNotionalUsd : notionalUsd) * 0.0005;
  const availableMargin = toFiniteNumber(
    astroConsoleData.perpsAccount?.withdrawable
  );
  const accountValue = toFiniteNumber(
    astroConsoleData.perpsAccount?.accountValue
  );
  const canTradeInChat = status === 'pending' || status === 'approved';
  const isBelowMinimumNotional =
    !isClosePosition &&
    !isPositionTpsl &&
    positiveInput(collateralUsd) &&
    notionalUsd < HYPERLIQUID_MIN_ORDER_USD;
  const minimumCollateralRequired =
    HYPERLIQUID_MIN_ORDER_USD / Math.max(1, leverageValue || 1);
  const needsPerpsFunds =
    canTradeInChat &&
    canAct &&
    !isClosePosition &&
    !isPositionTpsl &&
    !isBelowMinimumNotional &&
    !reduceOnly &&
    !astroConsoleData.isPerpsLoading &&
    (accountValue <= 0 || collateralUsdValue > availableMargin);
  const canDepositForOrder = needsPerpsFunds && !isBelowMinimumNotional;
  const fundingShortfall = Math.max(0, collateralUsdValue - availableMargin);
  const isTicketActionBusy = flow === 'authorizing' || flow === 'opening';
  const isAuthorizingSigner =
    flow === 'authorizing' || astroConsoleData.isPerpsAgentInitializing;
  const isAgentBusy =
    isAuthorizingSigner ||
    astroConsoleData.isPerpsAgentReconnecting ||
    astroConsoleData.isPerpsSubmitting ||
    isTicketActionBusy ||
    isPending;
  const closePositionUnavailable =
    isClosePosition &&
    !astroConsoleData.isPerpsLoading &&
    closeSizeCoinsValue <= 0;
  const closeCanSubmit = Boolean(
    canTradeInChat &&
      canAct &&
      selectedMarket &&
      closeSizeCoinsValue > 0 &&
      closeMarkPrice > 0 &&
      !astroConsoleData.isPerpsLoading
  );
  const canSubmit = isClosePosition
    ? closeCanSubmit
    : Boolean(
        canTradeInChat &&
          canAct &&
          !needsPerpsFunds &&
          coin.trim() &&
          (isPositionTpsl || positiveInput(collateralUsd)) &&
          !isBelowMinimumNotional &&
          positiveInput(leverage) &&
          selectedMarket &&
          toFiniteNumber(orderSize) > 0 &&
          !needsEntryPrice &&
          !tpslNeedsPrices &&
          !riskPriceError
      );
  const sideLabel = activeSide === 'short' ? 'Short' : 'Long';
  const ticketCoin = isClosePosition
    ? matchingClosePosition?.coin || selectedMarket?.coin || coin
    : coin;
  const ticketDisplayCoin = displayPerpsCoin(ticketCoin);
  const triggerLabel =
    [hasTakeProfit ? 'TP' : null, hasStopLoss ? 'SL' : null]
      .filter(Boolean)
      .join('/') || 'TP/SL';
  const sideTone =
    activeSide === 'short'
      ? 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ffb2b6]'
      : 'border-[#3fe08f]/30 bg-[#3fe08f]/10 text-[#a9f7cc]';
  const marginModeLabel = `${
    isClosePosition ? (closeIsCross ? 'cross' : 'isolated') : isCross ? 'cross' : 'isolated'
  } margin${isClosePosition || reduceOnly ? ' · reduce only' : ''}`;
  const primaryLabel =
    isAuthorizingSigner
      ? 'Approving perps signer...'
      : isTicketActionBusy
      ? isClosePosition
        ? 'Closing position...'
        : isPositionTpsl
        ? 'Setting triggers...'
        : 'Opening position...'
      : isBelowMinimumNotional
      ? `Minimum ${formatCompactUsd(minimumCollateralRequired)} collateral`
      : needsPerpsFunds
      ? 'Deposit to Hyperliquid'
      : !isClosePosition && !isPositionTpsl && !positiveInput(collateralUsd)
      ? 'Set size'
      : !astroConsoleData.isPerpsAgentInitialized
      ? 'Approve perps signer'
      : !selectedMarket
      ? 'Loading market'
      : isClosePosition
      ? `Close ${sideLabel} ${ticketDisplayCoin}-PERP`
      : isPositionTpsl
      ? `Set ${triggerLabel} · ${ticketDisplayCoin}-PERP`
      : orderMode === 'tpsl'
      ? `Place TP/SL ${sideLabel} · ${formatCompactUsd(collateralUsdValue)}`
      : orderMode === 'limit'
      ? `Place limit ${sideLabel} · ${formatCompactUsd(collateralUsdValue)}`
      : hasTriggerPrices
      ? `Open ${leverageValue}x ${sideLabel} + ${triggerLabel}`
      : `Open ${leverageValue}x ${sideLabel} · ${formatCompactUsd(
          collateralUsdValue
        )}`;

  const buildReceipt = (
    orderId?: string | number
  ): HyperliquidInlineReceipt => ({
    coin,
    side,
    orderMode,
    isPositionTpsl,
    leverage: leverageValue,
    isCross,
    collateralUsd: isPositionTpsl
      ? toFiniteNumber(firstTicketValue(params, ['collateralUsd', 'marginUsed']))
      : collateralUsdValue,
    notionalUsd,
    sizeCoins: orderSize,
    entryPrice,
    takeProfitPrice:
      showTriggerControls && hasTakeProfit ? takeProfitValue : undefined,
    stopLossPrice:
      showTriggerControls && hasStopLoss ? stopLossValue : undefined,
    liquidationPrice,
    feeUsd: openFee,
    orderId,
    placedAt: new Date().toISOString(),
  });

  const buildCloseReceipt = (
    orderId?: string | number
  ): HyperliquidInlineReceipt => ({
    coin: selectedMarket?.coin || matchingClosePosition?.coin || coin,
    side: closePositionSide,
    orderMode: 'market',
    isClose: true,
    leverage: closeLeverageValue,
    isCross: closeIsCross,
    collateralUsd: closeCollateralUsd,
    notionalUsd: closeNotionalUsd,
    sizeCoins: closeSize,
    entryPrice: closeEntryPrice,
    exitPrice: closeMarkPrice,
    liquidationPrice: closeLiquidationPrice,
    feeUsd: closeNotionalUsd * 0.0005,
    orderId,
    placedAt: new Date().toISOString(),
  });

  const handleClosePosition = async () => {
    if (
      !astroConsoleData.isPerpsAgentInitialized &&
      !astroConsoleData.isPerpsAgentInitializing
    ) {
      setLocalError(null);
      try {
        setFlow('authorizing');
        await astroConsoleData.initializePerpsAgent();
        setFlow('order');
      } catch (error) {
        setFlow('order');
        setLocalError(
          error instanceof Error
            ? error.message
            : 'Could not enable Perps trading.'
        );
      }
      return;
    }

    if (!closeCanSubmit || !selectedMarket) return;

    setLocalError(null);
    astroConsoleData.clearPerpsTradingError();
    setFlow('opening');

    try {
      const approvalParams = {
        coin: selectedMarket.coin || matchingClosePosition?.coin || coin,
        asset: selectedMarket.coin || matchingClosePosition?.coin || coin,
        assetIndex: selectedMarket.index,
        side: closePositionSide,
        direction: closePositionSide,
        isLong: closePositionSide === 'long',
        size: closeSize,
        sz: closeSize,
        sizeCoins: closeSize,
        markPrice: String(closeMarkPrice),
        entryPrice: String(closeEntryPrice),
        collateralUsd: String(closeCollateralUsd),
        leverage: String(closeLeverageValue),
        isCross: closeIsCross,
        reduceOnly: true,
      };
      const approvalResult =
        proposal?.approvalResult?.payload?.proposalId === proposalId
          ? proposal.approvalResult
          : await onApproveInline(proposalId, approvalParams);

      if (!approvalResult?.payload?.proposalId) {
        throw new Error('Swop approval was not returned by the backend.');
      }
      const executionProposalId = approvalResult.payload.proposalId;
      persistAgentActionHandoff(approvalResult);

      const orderResult = await astroConsoleData.closePerpsPosition(
        selectedMarket.index,
        closeSize,
        closePositionSide === 'long',
        String(closeMarkPrice)
      );

      const orderId = extractInlineHyperliquidOrderId(orderResult);
      const closed = buildCloseReceipt(orderId);
      const closeCoin = selectedMarket.coin || matchingClosePosition?.coin || coin;
      upsertPerpsPositionFeed({
        token: accessToken,
        userId: user?._id,
        smartsiteId: user?.primaryMicrosite || primaryMicrosite,
        content: {
          provider: 'hyperliquid',
          positionKey: buildPerpsPositionKey({
            userId: user?._id,
            masterAddress: astroConsoleData.perpsMasterAddress,
            coin: closeCoin,
          }),
          coin: closeCoin,
          side: closePositionSide,
          status: 'closed',
          event: 'close',
          leverage: closeLeverageValue,
          marginMode: closeIsCross ? 'cross' : 'isolated',
          entryPrice: closeEntryPrice,
          markPrice: closeMarkPrice,
          exitPrice: closeMarkPrice,
          liquidationPrice: closeLiquidationPrice || null,
          collateralUsd: closeCollateralUsd,
          notionalUsd: closeNotionalUsd,
          sizeCoins: closeSizeCoinsValue,
          returnPct: toFiniteNumber(matchingClosePosition?.returnOnEquity) * 100,
          unrealizedPnl: toFiniteNumber(matchingClosePosition?.unrealizedPnl),
          feeUsd: closed.feeUsd,
          orderId: orderId ? String(orderId) : undefined,
          masterAddress: astroConsoleData.perpsMasterAddress,
          updatedAt: closed.placedAt,
          closedAt: closed.placedAt,
        },
      }).catch((feedError) => {
        console.warn('Failed to update perps feed card:', feedError);
      });

      const completionDraft: Omit<
        AgentActionCompletion,
        | 'proposalId'
        | 'proposalNonce'
        | 'invocationId'
        | 'agentId'
        | 'groupId'
        | 'action'
        | 'toolType'
      > & { proposalId?: string } = {
        proposalId: executionProposalId,
        status: 'executed',
        provider: 'hyperliquid',
        title: `${displayPerpsCoin(closeCoin)}-PERP`,
        subtitle: `${sideLabel} position closed`,
        subject: `${displayPerpsCoin(closeCoin)}-PERP`,
        side: closePositionSide,
        stake: closeCollateralUsd,
        payout: closeNotionalUsd,
        placedAt: closed.placedAt,
        orderId,
        explorerLabel: orderId ? 'View order' : undefined,
        executionResult: {
          action: 'perps.close_position',
          orderId,
          coin: closeCoin,
          side: closePositionSide,
          assetIndex: selectedMarket.index,
          sizeCoins: closeSize,
          entryPrice: closeEntryPrice,
          exitPrice: closeMarkPrice,
          collateralUsd: closeCollateralUsd,
          notionalUsd: closeNotionalUsd,
          leverage: closeLeverageValue,
          isCross: closeIsCross,
          feeUsd: closed.feeUsd,
          orderResult: summarizeInlineHyperliquidResult(orderResult),
        },
      };
      const localCompletion = {
        ...completionDraft,
        proposalId: executionProposalId,
      } as AgentActionCompletion;
      let completion = localCompletion;
      try {
        completion =
          (await completeAgentActionFromHandoff(
            completionDraft,
            accessToken
          )) || localCompletion;
      } catch (completionError) {
        console.warn(
          'Hyperliquid close placed, but Swop completion reporting failed:',
          completionError
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['hl-positions'] });
      setReceipt(closed);
      setFlow('opened');
      onInlineActionComplete(completion);
      toast.success('Perps close order sent.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to close position.';
      setLocalError(message);
      setFlow('order');
      toast.error(message);
    }
  };

  const handleOpenPosition = async () => {
    if (canDepositForOrder) {
      onAddFunds();
      return;
    }

    if (
      !astroConsoleData.isPerpsAgentInitialized &&
      !astroConsoleData.isPerpsAgentInitializing
    ) {
      setLocalError(null);
      try {
        setFlow('authorizing');
        await astroConsoleData.initializePerpsAgent();
        setFlow('order');
      } catch (error) {
        setFlow('order');
        setLocalError(
          error instanceof Error
            ? error.message
            : 'Could not enable Perps trading.'
        );
      }
      return;
    }

    if (!canSubmit || !selectedMarket) return;

    setLocalError(null);
    astroConsoleData.clearPerpsTradingError();
    setFlow('opening');

    try {
      const approvalParams = {
        coin,
        side,
        orderMode,
        price:
          usesCustomEntryPrice || isPositionTpsl ? String(entryPrice) : undefined,
        takeProfitPrice:
          showTriggerControls && hasTakeProfit ? takeProfit : undefined,
        stopLossPrice:
          showTriggerControls && hasStopLoss ? stopLoss : undefined,
        sizeUsd: String(notionalUsd),
        sizeCoins: orderSize,
        leverage: String(leverageValue),
        isCross,
        reduceOnly,
        positionTpsl: isPositionTpsl || undefined,
        collateralUsd: isPositionTpsl
          ? firstTicketValue(params, ['collateralUsd', 'marginUsed'])
          : undefined,
        markPrice: isPositionTpsl ? String(markPrice) : undefined,
        liquidationPrice: isPositionTpsl ? String(liquidationPrice) : undefined,
      };
      const approvalResult =
        proposal?.approvalResult?.payload?.proposalId === proposalId
          ? proposal.approvalResult
          : await onApproveInline(proposalId, approvalParams);

      if (!approvalResult?.payload?.proposalId) {
        throw new Error('Swop approval was not returned by the backend.');
      }
      const executionProposalId = approvalResult.payload.proposalId;
      persistAgentActionHandoff(approvalResult);

      if (!isPositionTpsl) {
        await astroConsoleData.updatePerpsLeverage(
          selectedMarket.index,
          leverageValue,
          isCross
        );
      }

      let orderResult: unknown;
      if (orderMode === 'tpsl' && isPositionTpsl) {
        orderResult = await astroConsoleData.placePerpsPositionTpSlOrder({
          assetIndex: selectedMarket.index,
          isLong: side === 'long',
          size: orderSize,
          stopLossPrice: hasStopLoss ? stopLoss : undefined,
          takeProfitPrice: hasTakeProfit ? takeProfit : undefined,
        });
      } else if (orderMode === 'tpsl') {
        orderResult = await astroConsoleData.placePerpsTpSlOrder({
          assetIndex: selectedMarket.index,
          isBuy: side === 'long',
          size: orderSize,
          entryPrice: price,
          stopLossPrice: stopLoss,
          takeProfitPrice: takeProfit,
        });
      } else if (orderMode === 'limit') {
        orderResult = await astroConsoleData.placePerpsLimitOrder({
          assetIndex: selectedMarket.index,
          isBuy: side === 'long',
          size: orderSize,
          price,
          reduceOnly,
        });
      } else {
        orderResult = await astroConsoleData.placePerpsMarketOrder(
          selectedMarket.index,
          side === 'long',
          orderSize,
          String(markPrice)
        );
        if (hasTriggerPrices) {
          const triggerResult =
            await astroConsoleData.placePerpsPositionTpSlOrder({
              assetIndex: selectedMarket.index,
              isLong: side === 'long',
              size: orderSize,
              stopLossPrice: hasStopLoss ? stopLoss : undefined,
              takeProfitPrice: hasTakeProfit ? takeProfit : undefined,
            });
          orderResult = {
            entryOrder: summarizeInlineHyperliquidResult(orderResult),
            triggerOrder: summarizeInlineHyperliquidResult(triggerResult),
          };
        }
      }

      const orderId = extractInlineHyperliquidOrderId(orderResult);
      const opened = buildReceipt(orderId);
      const existingPosition = astroConsoleData.perpsAccount?.positions.find(
        (position) => perpsCoinMatches(position.coin, coin)
      );
      const existingSide =
        existingPosition && toFiniteNumber(existingPosition.szi) < 0
          ? 'short'
          : existingPosition
          ? 'long'
          : null;
      const existingSizeCoins = Math.abs(
        toFiniteNumber(existingPosition?.szi)
      );
      const openedSizeCoins = toFiniteNumber(opened.sizeCoins);
      const isReducingExistingPosition = Boolean(
        existingSide && existingSide !== side
      );
      const nextSizeCoins =
        existingSide && existingSide === side
          ? existingSizeCoins + openedSizeCoins
          : isReducingExistingPosition
          ? Math.max(0, existingSizeCoins - openedSizeCoins)
          : openedSizeCoins;
      const feedEvent: PerpsPositionFeedEvent =
        existingSide && existingSide === side
          ? 'add'
          : isReducingExistingPosition && nextSizeCoins <= 0
          ? 'close'
          : isReducingExistingPosition
          ? 'reduce'
          : 'open';
      const feedStatus: PerpsPositionFeedStatus =
        feedEvent === 'close' ? 'closed' : 'open';
      const feedSide = existingSide || side;
      const feedEntryPrice =
        feedEvent === 'add' && existingSizeCoins > 0
          ? (toFiniteNumber(existingPosition?.entryPx) * existingSizeCoins +
              opened.entryPrice * openedSizeCoins) /
            Math.max(existingSizeCoins + openedSizeCoins, 1)
          : existingPosition
          ? toFiniteNumber(existingPosition.entryPx) || opened.entryPrice
          : opened.entryPrice;
      const existingMarginUsd = toFiniteNumber(existingPosition?.marginUsed);
      const existingNotionalUsd = toFiniteNumber(
        existingPosition?.positionValue
      );
      const remainingRatio =
        existingSizeCoins > 0 ? nextSizeCoins / existingSizeCoins : 0;
      const feedSizeCoins =
        feedStatus === 'closed' ? existingSizeCoins : nextSizeCoins;
      const feedCollateralUsd =
        feedStatus === 'closed'
          ? existingMarginUsd
          : feedEvent === 'add'
          ? existingMarginUsd + opened.collateralUsd
          : isReducingExistingPosition
          ? existingMarginUsd * remainingRatio
          : opened.collateralUsd;
      const feedNotionalUsd =
        feedStatus === 'closed'
          ? existingNotionalUsd
          : feedEvent === 'add'
          ? existingNotionalUsd + opened.notionalUsd
          : isReducingExistingPosition
          ? nextSizeCoins * opened.entryPrice
          : opened.notionalUsd;

      if (!isPositionTpsl) {
        upsertPerpsPositionFeed({
          token: accessToken,
          userId: user?._id,
          smartsiteId: user?.primaryMicrosite || primaryMicrosite,
          content: {
            provider: 'hyperliquid',
            positionKey: buildPerpsPositionKey({
              userId: user?._id,
              masterAddress: astroConsoleData.perpsMasterAddress,
              coin,
            }),
            coin,
            side: feedSide,
            status: feedStatus,
            event: feedEvent,
            leverage: leverageValue,
            marginMode: isCross ? 'cross' : 'isolated',
            entryPrice: feedEntryPrice,
            markPrice: opened.entryPrice,
            exitPrice: feedStatus === 'closed' ? opened.entryPrice : undefined,
            liquidationPrice,
            collateralUsd: feedCollateralUsd,
            notionalUsd: feedNotionalUsd,
            sizeCoins: feedSizeCoins,
            returnPct: toFiniteNumber(existingPosition?.returnOnEquity) * 100,
            unrealizedPnl: toFiniteNumber(existingPosition?.unrealizedPnl),
            feeUsd: opened.feeUsd,
            orderId: orderId ? String(orderId) : undefined,
            masterAddress: astroConsoleData.perpsMasterAddress,
            updatedAt: opened.placedAt,
            openedAt: existingPosition ? undefined : opened.placedAt,
            closedAt: feedStatus === 'closed' ? opened.placedAt : undefined,
          },
        }).catch((feedError) => {
          console.warn('Failed to update perps feed card:', feedError);
        });
      }
      const completionDraft: Omit<
        AgentActionCompletion,
        | 'proposalId'
        | 'proposalNonce'
        | 'invocationId'
        | 'agentId'
        | 'groupId'
        | 'action'
        | 'toolType'
      > & { proposalId?: string } = {
        proposalId: executionProposalId,
        status: 'executed',
        provider: 'hyperliquid',
        title: `${displayPerpsCoin(coin)}-PERP`,
        subtitle: isPositionTpsl
          ? `${sideLabel} position · ${triggerLabel} set`
          : `${sideLabel} ${orderMode} · ${leverageValue}x ${
              isCross ? 'cross' : 'isolated'
            }`,
        subject: `${displayPerpsCoin(coin)}-PERP`,
        side,
        stake: isPositionTpsl ? 0 : collateralUsdValue,
        payout: notionalUsd,
        placedAt: opened.placedAt,
        orderId,
        explorerLabel: orderId ? 'View order' : undefined,
        executionResult: {
          orderId,
          coin,
          side,
          orderMode,
          positionTpsl: isPositionTpsl,
          leverage: leverageValue,
          isCross,
          collateralUsd: opened.collateralUsd,
          notionalUsd,
          sizeCoins: orderSize,
          entryPrice,
          takeProfitPrice:
            showTriggerControls && hasTakeProfit ? takeProfitValue : undefined,
          stopLossPrice:
            showTriggerControls && hasStopLoss ? stopLossValue : undefined,
          liquidationPrice,
          feeUsd: openFee,
          orderResult: summarizeInlineHyperliquidResult(orderResult),
        },
      };
      const localCompletion = {
        ...completionDraft,
        proposalId: executionProposalId,
      } as AgentActionCompletion;
      let completion = localCompletion;
      try {
        completion =
          (await completeAgentActionFromHandoff(
            completionDraft,
            accessToken
          )) || localCompletion;
      } catch (completionError) {
        console.warn(
          'Hyperliquid order placed, but Swop completion reporting failed:',
          completionError
        );
      }

      setReceipt(opened);
      setFlow('opened');
      onInlineActionComplete(completion);
      toast.success(
        isPositionTpsl ? 'Perps triggers set.' : 'Perps position opened.'
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to open position.';
      setLocalError(message);
      setFlow('order');
      toast.error(message);
    }
  };

  if (flow === 'opened' && receipt) {
    const receiptDisplayCoin = displayPerpsCoin(receipt.coin);
    const receiptTriggerLabel =
      [receipt.takeProfitPrice ? 'TP' : null, receipt.stopLossPrice ? 'SL' : null]
        .filter(Boolean)
        .join('/') || 'TP/SL';
    return (
      <div className="mt-2 w-full max-w-[460px] border-l-2 border-[#3fe08f] pl-2 text-xs">
        <div className={`${AGENT_PANEL_CLASS} overflow-hidden rounded-[14px]`}>
          <div className="border-b border-white/[0.07] px-3 py-2.5">
            <div className="dm-mono flex items-center justify-between gap-3 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
              <span>
                perps ·{' '}
                {receipt.isClose
                  ? 'position closed'
                  : receipt.isPositionTpsl
                  ? `${receiptTriggerLabel} set`
                  : 'position opened'}
              </span>
              {receipt.orderId && (
                <span className="truncate text-[#5a5e69]">
                  tx {String(receipt.orderId).slice(0, 10)}
                </span>
              )}
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={`dm-mono inline-flex rounded-[5px] border px-1.5 py-0.5 text-[9px] font-bold uppercase ${sideTone}`}
                >
                  {receipt.side} {receipt.leverage}x
                </div>
                <div className="mt-2 text-[15px] font-bold text-[#eceef2]">
                  {receiptDisplayCoin}-PERP
                </div>
              </div>
              <div className="dm-mono text-right text-[13px] font-bold text-[#3fe08f]">
                +$0.00
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <PerpsMetric
                label="entry"
                value={`$${formatPerpsPrice(receipt.entryPrice)}`}
              />
              <PerpsMetric
                label="size"
                value={`${receipt.sizeCoins} ${receiptDisplayCoin}`}
              />
              {receipt.isClose ? (
                <PerpsMetric
                  label="exit"
                  value={`$${formatPerpsPrice(receipt.exitPrice)}`}
                  tone="text-[#3fe08f]"
                />
              ) : (
                <PerpsMetric
                  label="liq. price"
                  value={`$${formatPerpsPrice(receipt.liquidationPrice)}`}
                  tone="text-[#ff5d63]"
                />
              )}
              <PerpsMetric
                label="collateral"
                value={formatCompactUsd(receipt.collateralUsd)}
              />
              <PerpsMetric
                label="notional"
                value={formatCompactUsd(receipt.notionalUsd)}
              />
              <PerpsMetric label="fee" value={formatCompactUsd(receipt.feeUsd)} />
              {receipt.takeProfitPrice && (
                <PerpsMetric
                  label="take profit"
                  value={`$${formatPerpsPrice(receipt.takeProfitPrice)}`}
                  tone="text-[#3fe08f]"
                />
              )}
              {receipt.stopLossPrice && (
                <PerpsMetric
                  label="stop loss"
                  value={`$${formatPerpsPrice(receipt.stopLossPrice)}`}
                  tone="text-[#ff5d63]"
                />
              )}
            </div>

            <div
              className={`mt-3 grid gap-2 ${
                receipt.isClose ? 'grid-cols-1' : 'grid-cols-2'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setFlow('order');
                  setReceipt(null);
                }}
                className={TICKET_REJECT_BUTTON_CLASS}
              >
                {receipt.isClose
                  ? 'Close another'
                  : receipt.isPositionTpsl
                  ? 'Adjust again'
                  : 'New order'}
              </button>
              {!receipt.isClose && (
                <button
                  type="button"
                  onClick={() => setFlow('manage')}
                  className={TICKET_PRIMARY_BUTTON_CLASS}
                >
                  Manage
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (flow === 'manage' && receipt) {
    const receiptDisplayCoin = displayPerpsCoin(receipt.coin);
    const pnl = receipt.collateralUsd * 0.36;
    return (
      <div className="mt-2 w-full max-w-[460px] border-l-2 border-[#3fe08f] pl-2 text-xs">
        <div className={`${AGENT_PANEL_CLASS} overflow-hidden rounded-[14px]`}>
          <div className="p-3">
            <div className="dm-mono flex items-center justify-between text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#5a5e69]">
              <span>perps · manage {receiptDisplayCoin}-PERP</span>
              <span className="text-[#3fe08f]">live</span>
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div
                className={`dm-mono inline-flex rounded-[5px] border px-1.5 py-0.5 text-[9px] font-bold uppercase ${sideTone}`}
              >
                {receipt.side} {receipt.leverage}x
              </div>
              <div className="text-right">
                <div className="dm-mono text-[18px] font-bold text-[#3fe08f]">
                  {formatSignedUsd(pnl)}
                </div>
                <div className="dm-mono text-[10px] text-[#3fe08f]">+36.0%</div>
              </div>
            </div>
            <svg
              viewBox="0 0 300 72"
              className="mt-3 h-[72px] w-full text-[#3fe08f]"
              role="img"
              aria-label={`${receiptDisplayCoin} position sparkline`}
            >
              <defs>
                <linearGradient
                  id={`perps-manage-${proposalId}`}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`${perpsSparkPath(300, 58)} L 300 72 L 0 72 Z`}
                fill={`url(#perps-manage-${proposalId})`}
              />
              <path
                d={perpsSparkPath(300, 58)}
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <PerpsMetric
                label="entry"
                value={`$${formatPerpsPrice(receipt.entryPrice)}`}
              />
              <PerpsMetric
                label="mark"
                value={`$${formatPerpsPrice(markPrice)}`}
              />
              <PerpsMetric
                label="liq. price"
                value={`$${formatPerpsPrice(receipt.liquidationPrice)}`}
                tone="text-[#ff5d63]"
              />
              <PerpsMetric
                label="size"
                value={`${receipt.sizeCoins} ${receiptDisplayCoin}`}
              />
              <PerpsMetric
                label="collateral"
                value={formatCompactUsd(receipt.collateralUsd)}
              />
              <PerpsMetric
                label="notional"
                value={formatCompactUsd(receipt.notionalUsd)}
              />
              {receipt.takeProfitPrice && (
                <PerpsMetric
                  label="take profit"
                  value={`$${formatPerpsPrice(receipt.takeProfitPrice)}`}
                  tone="text-[#3fe08f]"
                />
              )}
              {receipt.stopLossPrice && (
                <PerpsMetric
                  label="stop loss"
                  value={`$${formatPerpsPrice(receipt.stopLossPrice)}`}
                  tone="text-[#ff5d63]"
                />
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onAddFunds}
                className={TICKET_REJECT_BUTTON_CLASS}
              >
                <Plus className="h-3.5 w-3.5" />
                Add margin
              </button>
              <button
                type="button"
                disabled
                title="Close position from the Perps panel for now."
                className="dm-btn inline-flex h-10 items-center justify-center rounded-[11px] border border-[#ff5d63]/20 bg-[#ff5d63]/10 px-3 text-[13px] font-semibold text-[#ffb2b6] opacity-70"
              >
                Close position
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFlow('opened')}
              className="dm-mono mt-3 w-full text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#6f7380] hover:text-[#eceef2]"
            >
              back to receipt
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-[460px] border-l-2 border-[#3fe08f] pl-2 text-xs">
      <div className="dm-mono mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
        perps · {isClosePosition ? 'close position' : isPositionTpsl ? 'manage position' : 'new order'}
      </div>
      <div className="dm-mono mb-2 text-[10px] text-[#6f7380]">
        {isClosePosition
          ? `closing ${ticketDisplayCoin}-PERP · confirm below`
          : isPositionTpsl
          ? `set triggers for ${ticketDisplayCoin}-PERP · confirm below`
          : `building order ${ticketDisplayCoin}-PERP · pick leverage and collateral below`}
      </div>

      <div className={`${AGENT_PANEL_CLASS} overflow-hidden rounded-[14px] p-3`}>
        <div className="dm-mono flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.14em] text-[#5a5e69]">
          <span>
            perps · {isClosePosition ? 'close' : isPositionTpsl ? 'manage' : 'open'}{' '}
            {ticketDisplayCoin}-PERP
          </span>
          <span>
            {isClosePosition
              ? closeIsCross
                ? 'cross'
                : 'isolated'
              : isCross
              ? 'cross'
              : 'isolated'}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('long')}
            disabled={
              isClosePosition ||
              isPositionTpsl ||
              !canTradeInChat ||
              isTicketActionBusy
            }
            className={`h-9 rounded-[8px] border text-[12px] font-bold ${
              activeSide === 'long'
                ? 'border-[#3fe08f]/45 bg-[#3fe08f]/10 text-[#3fe08f]'
                : 'border-white/[0.07] bg-black/20 text-[#9396a0] hover:bg-white/[0.04]'
            } disabled:opacity-60`}
          >
            -&gt; Long
          </button>
          <button
            type="button"
            onClick={() => setSide('short')}
            disabled={
              isClosePosition ||
              isPositionTpsl ||
              !canTradeInChat ||
              isTicketActionBusy
            }
            className={`h-9 rounded-[8px] border text-[12px] font-bold ${
              activeSide === 'short'
                ? 'border-[#ff5d63]/40 bg-[#ff5d63]/10 text-[#ffb2b6]'
                : 'border-white/[0.07] bg-black/20 text-[#9396a0] hover:bg-white/[0.04]'
            } disabled:opacity-60`}
          >
            -&gt; Short
          </button>
        </div>

        {isClosePosition ? (
          <div className="mt-3 rounded-[10px] border border-[#ff5d63]/20 bg-[#ff5d63]/10 px-3 py-2">
            <div className={TICKET_LABEL_CLASS}>action</div>
            <div className="mt-1 text-[13px] font-semibold text-[#ffd8da]">
              Close {sideLabel.toLowerCase()} {ticketDisplayCoin}-PERP
            </div>
          </div>
        ) : isPositionTpsl ? (
          <div className="mt-3 rounded-[10px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 px-3 py-2">
            <div className={TICKET_LABEL_CLASS}>action</div>
            <div className="mt-1 text-[13px] font-semibold text-[#dfffee]">
              Set reduce-only TP/SL triggers
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className={TICKET_LABEL_CLASS}>order type</span>
              <span className="dm-mono text-[10px] font-bold uppercase text-[#6f7380]">
                {orderMode === 'tpsl' ? 'bracket' : orderMode}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                ['market', 'Market'],
                ['limit', 'Limit'],
                ['tpsl', 'TP/SL'],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    setOrderMode(mode as InlineHyperliquidOrderMode)
                  }
                  disabled={!canTradeInChat || isTicketActionBusy}
                  className={`h-8 rounded-[7px] border text-[10.5px] font-bold ${
                    orderMode === mode
                      ? 'border-[#3fe08f]/45 bg-[#3fe08f]/10 text-[#3fe08f]'
                      : 'border-white/[0.07] bg-black/20 text-[#6f7380] hover:text-[#eceef2]'
                  } disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <div className={TICKET_LABEL_CLASS}>mark price</div>
            <div className="dm-mono mt-1 text-[18px] font-bold text-[#eceef2]">
              ${formatPerpsPrice(markPrice)}
            </div>
          </div>
          <svg
            viewBox="0 0 116 48"
            className="h-12 w-[116px] text-[#3fe08f]"
            role="img"
            aria-label={`${ticketCoin} sparkline`}
          >
            <path
              d={perpsSparkPath()}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
        </div>

        {!isClosePosition && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className={TICKET_LABEL_CLASS}>leverage</span>
              <span className="dm-mono text-[11px] font-bold text-[#3fe08f]">
                {leverageValue}x
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[2, 5, 10, 20, 25, 40].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setLeverage(String(Math.min(value, maxLeverage)))
                  }
                  disabled={
                    isPositionTpsl ||
                    value > maxLeverage ||
                    !canTradeInChat ||
                    isTicketActionBusy
                  }
                  className={`h-8 rounded-[7px] border text-[10.5px] font-bold ${
                    leverageValue === value
                      ? 'border-[#3fe08f]/45 bg-[#3fe08f]/10 text-[#3fe08f]'
                      : 'border-white/[0.07] bg-black/20 text-[#6f7380] hover:text-[#eceef2]'
                  } disabled:cursor-not-allowed disabled:opacity-35`}
                >
                  {value}x
                </button>
              ))}
            </div>
            <input
              type="range"
              min="1"
              max={maxLeverage}
              step="1"
              value={leverageValue}
              onChange={(event) => setLeverage(event.target.value)}
              disabled={isPositionTpsl || !canTradeInChat || isTicketActionBusy}
              className="mt-3 h-1.5 w-full accent-[#3fe08f]"
            />
          </div>
        )}

        {isClosePosition ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <PerpsMetric
              label="close size"
              value={`${closeSize} ${ticketDisplayCoin}`}
            />
            <PerpsMetric
              label="entry"
              value={`$${formatPerpsPrice(closeEntryPrice)}`}
            />
            <PerpsMetric
              label="exit"
              value={`$${formatPerpsPrice(closeMarkPrice)}`}
              tone="text-[#3fe08f]"
            />
            <PerpsMetric
              label="margin"
              value={formatCompactUsd(closeCollateralUsd)}
            />
            <PerpsMetric
              label="notional"
              value={formatCompactUsd(closeNotionalUsd)}
            />
            <PerpsMetric
              label="fee · close"
              value={formatCompactUsd(openFee)}
            />
          </div>
        ) : isPositionTpsl ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <PerpsMetric
              label="position"
              value={`${orderSize} ${ticketDisplayCoin}`}
            />
            <PerpsMetric
              label="entry"
              value={`$${formatPerpsPrice(entryPrice)}`}
            />
            <PerpsMetric
              label="margin"
              value={formatCompactUsd(
                toFiniteNumber(
                  firstTicketValue(params, ['collateralUsd', 'marginUsed'])
                )
              )}
            />
          </div>
        ) : (
          <div className="mt-4">
            <label className="block">
              <span className={TICKET_LABEL_CLASS}>collateral</span>
              <div className="mt-1.5 flex h-11 items-center rounded-[9px] border border-white/[0.07] bg-black px-3">
                <span className="dm-mono mr-1 text-[18px] text-[#6f7380]">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={collateralUsd}
                  onChange={(event) => setCollateralUsd(event.target.value)}
                  disabled={!canTradeInChat || isTicketActionBusy}
                  className="dm-mono min-w-0 flex-1 bg-transparent text-[18px] font-bold text-[#eceef2] outline-none disabled:opacity-60"
                />
                <span className="dm-mono text-[9px] font-bold uppercase text-[#6f7380]">
                  usdc
                </span>
              </div>
            </label>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[500, 1000, 2000, 5000].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setCollateralUsd(formatPerpsInputAmount(value))
                  }
                  disabled={!canTradeInChat || isTicketActionBusy}
                  className={`h-8 rounded-[7px] border text-[10px] font-bold ${
                    collateralUsdValue === value
                      ? 'border-[#3fe08f]/45 bg-[#3fe08f]/10 text-[#3fe08f]'
                      : 'border-white/[0.07] bg-black/20 text-[#6f7380] hover:text-[#eceef2]'
                  } disabled:opacity-50`}
                >
                  {value >= 1000 ? `$${value / 1000}k` : `$${value}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isClosePosition &&
          !isPositionTpsl &&
          (orderMode === 'limit' || orderMode === 'tpsl') && (
          <label className="mt-3 block">
            <span className={TICKET_LABEL_CLASS}>
              {orderMode === 'tpsl' ? 'entry price' : 'limit price'}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={!canTradeInChat || isTicketActionBusy}
              placeholder={String(markPrice.toFixed(2))}
              className={`${TICKET_MONO_FIELD_CLASS} mt-1.5 w-full`}
            />
          </label>
        )}

        {showTriggerControls && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-[10px] border border-white/[0.07] bg-black/20 p-2">
            <label className="block">
              <span className={TICKET_LABEL_CLASS}>take profit</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={takeProfit}
                onChange={(event) => setTakeProfit(event.target.value)}
                disabled={!canTradeInChat || isTicketActionBusy}
                placeholder={String(
                  (markPrice * (activeSide === 'long' ? 1.1 : 0.9)).toFixed(2)
                )}
                className={`${TICKET_MONO_FIELD_CLASS} mt-1.5 w-full border-[#3fe08f]/20 focus:border-[#3fe08f]/70`}
              />
            </label>
            <label className="block">
              <span className={TICKET_LABEL_CLASS}>stop loss</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={stopLoss}
                onChange={(event) => setStopLoss(event.target.value)}
                disabled={!canTradeInChat || isTicketActionBusy}
                placeholder={String(
                  (markPrice * (activeSide === 'long' ? 0.95 : 1.05)).toFixed(2)
                )}
                className={`${TICKET_MONO_FIELD_CLASS} mt-1.5 w-full border-[#ff5d63]/20 focus:border-[#ff5d63]/70`}
              />
            </label>
          </div>
        )}

        {!isClosePosition && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <PerpsMetric
              label={isPositionTpsl ? 'protected size' : 'position size'}
              value={`${formatCompactUsd(notionalUsd)} · ${orderSize} ${coin}`}
            />
            <PerpsMetric
              label={isPositionTpsl ? 'liq. price' : 'est. liquidation'}
              value={`$${formatPerpsPrice(liquidationPrice)}`}
              tone="text-[#ff5d63]"
            />
            <PerpsMetric
              label={isPositionTpsl ? 'fee · trigger' : 'fee · open'}
              value={isPositionTpsl ? '$0.00' : formatCompactUsd(openFee)}
            />
          </div>
        )}

        {(astroConsoleData.isPerpsLoading ||
          isBelowMinimumNotional ||
          closePositionUnavailable ||
          needsEntryPrice ||
          tpslNeedsPrices ||
          riskPriceError ||
          needsPerpsFunds ||
          localError ||
          astroConsoleData.perpsTradingError ||
          astroConsoleData.perpsAgentError) && (
          <div
            className={`mt-3 rounded-[10px] border px-3 py-2 text-[11px] ${
              isBelowMinimumNotional ||
              closePositionUnavailable ||
              needsEntryPrice ||
              tpslNeedsPrices ||
              riskPriceError ||
              needsPerpsFunds ||
              localError
                ? 'border-[#e8920f]/25 bg-[#e8920f]/10 text-[#ffd08a]'
                : 'border-white/[0.07] bg-black/25 text-[#9396a0]'
            }`}
          >
            {astroConsoleData.isPerpsLoading ? (
              'Checking Hyperliquid margin...'
            ) : localError ||
              astroConsoleData.perpsTradingError ||
              astroConsoleData.perpsAgentError ? (
              localError ||
              astroConsoleData.perpsTradingError ||
              astroConsoleData.perpsAgentError
            ) : closePositionUnavailable ? (
              'No matching open perps position was found to close.'
            ) : needsEntryPrice ? (
              orderMode === 'limit'
                ? 'Add a limit price before placing this order.'
                : 'Add an entry price before placing this TP/SL order.'
            ) : tpslNeedsPrices ? (
              isPositionTpsl
                ? 'Add a take profit or stop loss trigger price.'
                : 'Add a take profit or stop loss trigger price.'
            ) : riskPriceError ? (
              riskPriceError
            ) : isBelowMinimumNotional ? (
              <>
                Hyperliquid minimum order size is{' '}
                <span className="font-semibold text-[#eceef2]">
                  {formatCompactUsd(HYPERLIQUID_MIN_ORDER_USD)}
                </span>
                . At {leverageValue}x, minimum collateral is about{' '}
                <span className="font-semibold text-[#eceef2]">
                  {formatCompactUsd(minimumCollateralRequired)}
                </span>
                .
              </>
            ) : needsPerpsFunds ? (
              <>
                Deposit to Hyperliquid first. Hyperliquid margin is{' '}
                <span className="font-semibold text-[#eceef2]">
                  {formatCompactUsd(availableMargin)}
                </span>
                {fundingShortfall > 0
                  ? `, about ${formatCompactUsd(fundingShortfall)} short.`
                  : '.'}
              </>
            ) : null}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={isClosePosition ? handleClosePosition : handleOpenPosition}
            disabled={
              isAgentBusy ||
              (!canSubmit &&
                !canDepositForOrder &&
                astroConsoleData.isPerpsAgentInitialized)
            }
            className={TICKET_PRIMARY_BUTTON_CLASS}
          >
            {isTicketActionBusy || astroConsoleData.isPerpsAgentInitializing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : canDepositForOrder ? (
              <Plus className="h-3.5 w-3.5" />
            ) : (
              <Activity className="h-3.5 w-3.5" />
            )}
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={() => onReject(proposalId)}
            disabled={!canAct || isAgentBusy || status !== 'pending'}
            className={TICKET_REJECT_BUTTON_CLASS}
          >
            <Ban className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>

        <div className="dm-mono mt-2 text-center text-[9px] font-semibold text-[#5a5e69]">
          self-custodial · {marginModeLabel} · settles on-chain
        </div>

        {!canAct && canTradeInChat && (
          <p className="mt-2 text-[11px] text-[#ffd08a]">
            Only the user who asked Astro to prepare this order can approve it.
          </p>
        )}
      </div>
    </div>
  );
}

function PerpsMetric({
  label,
  value,
  tone = 'text-[#eceef2]',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 rounded-[9px] border border-white/[0.07] bg-black/20 px-2.5 py-2">
      <div className={TICKET_LABEL_CLASS}>{label}</div>
      <div className={`dm-mono mt-1 truncate text-[11px] font-bold ${tone}`}>
        {value}
      </div>
    </div>
  );
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
function HyperliquidProposalTicket({
  proposal,
  proposalId,
  canAct,
  isOpen,
  isPending,
  onApprove,
  onReject,
  onAddFunds,
  perpsAccount,
  isPerpsLoading,
}: {
  proposal?: AgentActionProposal | null;
  proposalId: string;
  canAct: boolean;
  isOpen: boolean;
  isPending: boolean;
  onApprove: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => void;
  onReject: (proposalId: string) => void;
  onAddFunds: () => void;
  perpsAccount?: PerpsAccountSummary;
  isPerpsLoading: boolean;
}) {
  const params = proposal?.normalizedParams;
  const [coin, setCoin] = useState(
    initialPerpsCoin(params) || 'ETH'
  );
  const [side, setSide] = useState(initialTicketSide(params));
  const [orderMode, setOrderMode] = useState(initialTicketMode(params));
  const [price, setPrice] = useState(
    firstTicketValue(params, ['price', 'limitPrice', 'p'])
  );
  const [sizeUsd, setSizeUsd] = useState(initialPerpsSizeUsd(params) || '');
  const [leverage, setLeverage] = useState(
    firstTicketValue(params, ['leverage']) || '5'
  );
  const [isCross, setIsCross] = useState(
    initialTicketBool(params, ['isCross', 'cross'], true)
  );
  const [reduceOnly, setReduceOnly] = useState(
    initialTicketBool(params, ['reduceOnly'], false)
  );

  useEffect(() => {
    setCoin(initialPerpsCoin(params) || 'ETH');
    setSide(initialTicketSide(params));
    setOrderMode(initialTicketMode(params));
    setPrice(firstTicketValue(params, ['price', 'limitPrice', 'p']));
    setSizeUsd(initialPerpsSizeUsd(params) || '');
    setLeverage(firstTicketValue(params, ['leverage']) || '5');
    setIsCross(initialTicketBool(params, ['isCross', 'cross'], true));
    setReduceOnly(initialTicketBool(params, ['reduceOnly'], false));
  }, [params, proposalId]);

  const availableMargin = toFiniteNumber(perpsAccount?.withdrawable);
  const accountValue = toFiniteNumber(perpsAccount?.accountValue);
  const sizeUsdValue = toFiniteNumber(sizeUsd);
  const leverageValue = toFiniteNumber(leverage);
  const isBelowMinimumNotional =
    positiveInput(sizeUsd) && sizeUsdValue < HYPERLIQUID_MIN_ORDER_USD;
  const estimatedMarginRequired =
    reduceOnly || !positiveInput(sizeUsd) || !positiveInput(leverage)
      ? 0
      : sizeUsdValue / Math.max(1, leverageValue);
  const minimumMarginRequired =
    HYPERLIQUID_MIN_ORDER_USD / Math.max(1, leverageValue || 1);
  const needsPerpsFunds =
    isOpen &&
    canAct &&
    !isBelowMinimumNotional &&
    !reduceOnly &&
    !isPerpsLoading &&
    (accountValue <= 0 || estimatedMarginRequired > availableMargin);
  const canDepositForOrder = needsPerpsFunds && !isBelowMinimumNotional;
  const fundingShortfall = Math.max(
    0,
    estimatedMarginRequired - availableMargin
  );

  const canSubmit = Boolean(
    isOpen &&
    canAct &&
    !needsPerpsFunds &&
    coin.trim() &&
    side &&
    positiveInput(sizeUsd) &&
    !isBelowMinimumNotional &&
    positiveInput(leverage) &&
    (orderMode !== 'limit' || positiveInput(price))
  );

  const submitLabel = isBelowMinimumNotional
    ? `Minimum ${formatCompactUsd(HYPERLIQUID_MIN_ORDER_USD)}`
    : needsPerpsFunds
    ? 'Deposit to Hyperliquid'
    : `Approve ${side || 'trade'} ${coin || 'perp'}`;
  const sideLabel = side === 'short' ? 'Short' : side === 'long' ? 'Long' : 'Select side';
  const sideTone =
    side === 'short'
      ? 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ffb2b6]'
      : 'border-[#3fe08f]/30 bg-[#3fe08f]/10 text-[#a9f7cc]';
  const sizeLabel = positiveInput(sizeUsd) ? formatCompactUsd(sizeUsd) : 'Set size';
  const marginLabel =
    estimatedMarginRequired > 0 ? formatCompactUsd(estimatedMarginRequired) : '--';
  const marginModeLabel = `${isCross ? 'Cross' : 'Isolated'} margin${
    reduceOnly ? ' · reduce only' : ''
  }`;

  const handleApprove = () => {
    if (canDepositForOrder) {
      onAddFunds();
      return;
    }
    if (!canSubmit) return;
    onApprove(proposalId, {
      coin,
      side,
      orderMode,
      price: orderMode === 'limit' ? price : undefined,
      sizeUsd,
      leverage,
      isCross,
      reduceOnly,
    });
  };

  return (
    <div className="mt-3 border-t border-white/[0.07] px-3.5 pb-3 pt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="dm-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
            review order
          </div>
          <div className="mt-1 truncate text-[16px] font-semibold text-[#eceef2]">
            {coin || 'Perp'}-PERP
          </div>
          <div className="dm-mono mt-0.5 text-[10.5px] text-[#5a5e69]">
            {orderMode} order · {marginModeLabel}
          </div>
        </div>
        <span
          className={`dm-mono shrink-0 rounded-[8px] border px-2.5 py-1 text-[11px] font-bold uppercase ${sideTone}`}
        >
          {sideLabel} · {leverage || '0'}x
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-y border-white/[0.07] py-3">
        <div className="min-w-0">
          <div className={TICKET_LABEL_CLASS}>notional</div>
          <div className="dm-mono mt-1 truncate text-[13px] font-bold text-[#eceef2]">
            {sizeLabel}
          </div>
          {isBelowMinimumNotional && (
            <div className="dm-mono mt-0.5 truncate text-[10px] text-[#e8920f]">
              min {formatCompactUsd(HYPERLIQUID_MIN_ORDER_USD)}
            </div>
          )}
        </div>
        <div className="min-w-0 text-right">
          <div className={TICKET_LABEL_CLASS}>initial margin</div>
          <div className="dm-mono mt-1 truncate text-[13px] font-bold text-[#eceef2]">
            {isBelowMinimumNotional
              ? `min ${formatCompactUsd(minimumMarginRequired)}`
              : marginLabel}
          </div>
        </div>
        <div className="min-w-0">
          <div className={TICKET_LABEL_CLASS}>direction</div>
          <div className="mt-1 truncate text-[13px] font-semibold text-[#eceef2]">
            {sideLabel}
          </div>
        </div>
        <div className="min-w-0 text-right">
          <div className={TICKET_LABEL_CLASS}>order</div>
          <div className="mt-1 truncate text-[13px] font-semibold capitalize text-[#eceef2]">
            {orderMode}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className={TICKET_LABEL_CLASS}>Market</span>
          <select
            value={coin}
            onChange={(event) => setCoin(event.target.value)}
            disabled={!isOpen}
            className={TICKET_FIELD_CLASS}
          >
            {HYPERLIQUID_TICKET_COINS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className={TICKET_LABEL_CLASS}>Order</span>
          <select
            value={orderMode}
            onChange={(event) => setOrderMode(event.target.value)}
            disabled={!isOpen}
            className={TICKET_FIELD_CLASS}
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </label>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide('long')}
          disabled={!isOpen}
          className={`h-9 rounded-md text-xs font-semibold ${
            side === 'long'
              ? 'bg-[#3fe08f] text-[#031008]'
              : TICKET_IDLE_BUTTON_CLASS
          } disabled:opacity-60`}
        >
          Long
        </button>
        <button
          type="button"
          onClick={() => setSide('short')}
          disabled={!isOpen}
          className={`h-9 rounded-md text-xs font-semibold ${
            side === 'short'
              ? 'bg-[#ff5d63] text-white'
              : TICKET_IDLE_BUTTON_CLASS
          } disabled:opacity-60`}
        >
          Short
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {orderMode === 'limit' && (
          <label className="grid gap-1">
            <span className={TICKET_LABEL_CLASS}>Limit price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={!isOpen}
              placeholder="1900"
              className={TICKET_MONO_FIELD_CLASS}
            />
          </label>
        )}

        <label className="grid gap-1">
          <span className={TICKET_LABEL_CLASS}>Size USD</span>
          <input
            type="number"
            min="0"
            step="1"
            value={sizeUsd}
            onChange={(event) => setSizeUsd(event.target.value)}
            disabled={!isOpen}
            placeholder="10"
            className={TICKET_MONO_FIELD_CLASS}
          />
        </label>

        <label className="grid gap-1">
          <span className={TICKET_LABEL_CLASS}>Leverage</span>
          <input
            type="number"
            min="1"
            max="50"
            step="1"
            value={leverage}
            onChange={(event) => setLeverage(event.target.value)}
            disabled={!isOpen}
            className={TICKET_MONO_FIELD_CLASS}
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <label className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-white/[0.07] bg-black/25 px-2 text-[11px] font-medium text-[#eceef2]">
          <input
            type="checkbox"
            checked={isCross}
            onChange={(event) => setIsCross(event.target.checked)}
            disabled={!isOpen}
            className="h-3.5 w-3.5"
          />
          Cross margin
        </label>
        <label className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-white/[0.07] bg-black/25 px-2 text-[11px] font-medium text-[#eceef2]">
          <input
            type="checkbox"
            checked={reduceOnly}
            onChange={(event) => setReduceOnly(event.target.checked)}
            disabled={!isOpen}
            className="h-3.5 w-3.5"
          />
          Reduce only
        </label>
      </div>

      {isOpen && (
        <div
          className={`mt-3 rounded-[10px] border px-3 py-2 text-[11px] ${
            isBelowMinimumNotional || needsPerpsFunds
              ? 'border-[#e8920f]/25 bg-[#e8920f]/10 text-[#ffd08a]'
              : 'border-white/[0.07] bg-black/25 text-[#9396a0]'
          }`}
        >
          {isPerpsLoading ? (
            'Checking Hyperliquid balance...'
          ) : isBelowMinimumNotional ? (
            <>
              Hyperliquid minimum order size is{' '}
              <span className="font-semibold text-[#eceef2]">
                {formatCompactUsd(HYPERLIQUID_MIN_ORDER_USD)}
              </span>
              . At {leverage || '1'}x, minimum initial margin is about{' '}
              <span className="font-semibold text-[#eceef2]">
                {formatCompactUsd(minimumMarginRequired)}
              </span>
              .
            </>
          ) : needsPerpsFunds ? (
            <>
              Deposit to Hyperliquid first. Hyperliquid margin is{' '}
              <span className="font-semibold text-[#eceef2]">
                {formatCompactUsd(availableMargin)}
              </span>
              {fundingShortfall > 0
                ? `, about ${formatCompactUsd(fundingShortfall)} short.`
                : '.'}
            </>
          ) : (
            <>
              Hyperliquid margin{' '}
              <span className="font-semibold text-[#eceef2]">
                {formatCompactUsd(availableMargin)}
              </span>
              .
            </>
          )}
        </div>
      )}

      {isOpen && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={(!canSubmit && !canDepositForOrder) || isPending}
            className={TICKET_PRIMARY_BUTTON_CLASS}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : canDepositForOrder ? (
              <Plus className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {submitLabel}
          </button>
          <button
            type="button"
            onClick={() => onReject(proposalId)}
            disabled={!canAct || isPending}
            className={TICKET_REJECT_BUTTON_CLASS}
          >
            <Ban className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}

      {!canAct && isOpen && (
        <p className="mt-2 text-[11px] text-[#ffd08a]">
          Only the user who asked Astro to prepare this order can approve it.
        </p>
      )}
    </div>
  );
}

function initialPredictionOutcome(params?: Record<string, unknown>) {
  const value = params?.outcome ?? params?.outcomeIndex;
  if (value === 0 || value === '0') return 'yes';
  if (value === 1 || value === '1') return 'no';
  const normalized = String(value || '').toLowerCase();
  if (['yes', 'y', 'up', 'true'].includes(normalized)) return 'yes';
  if (['no', 'n', 'down', 'false'].includes(normalized)) return 'no';
  return 'yes';
}

function initialPredictionSide(params?: Record<string, unknown>) {
  const normalized = String(
    params?.side ?? params?.direction ?? 'BUY'
  ).toLowerCase();
  return ['sell', 's', 'short'].includes(normalized) ? 'SELL' : 'BUY';
}

function initialPredictionOrderType(params?: Record<string, unknown>) {
  const normalized = firstTicketValue(params, [
    'orderType',
    'type',
    'timeInForce',
  ]).toLowerCase();
  if (['limit', 'gtc', 'gtd', 'post_only', 'post-only'].includes(normalized)) {
    return 'limit';
  }
  return 'market';
}

function initialPredictionLimitPrice(params?: Record<string, unknown>) {
  const value = firstTicketValue(params, ['price', 'limitPrice']);
  if (!value) return '';
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return value;
  return String(Math.round((number <= 1 ? number * 100 : number) * 100) / 100);
}

function decimalPriceFromCents(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  return String(number > 1 ? number / 100 : number);
}

function PolymarketProposalTicket({
  proposal,
  proposalId,
  canAct,
  isOpen,
  isPending,
  onApprove,
  onReject,
  onAddFunds,
  availableUsdc,
  isBalanceLoading,
  positions,
}: {
  proposal?: AgentActionProposal | null;
  proposalId: string;
  canAct: boolean;
  isOpen: boolean;
  isPending: boolean;
  onApprove: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => void;
  onReject: (proposalId: string) => void;
  onAddFunds: () => void;
  availableUsdc: number;
  isBalanceLoading: boolean;
  positions: PolymarketPosition[];
}) {
  const params = proposal?.normalizedParams;
  const [marketId, setMarketId] = useState(
    firstTicketValue(params, ['marketId', 'market_id', 'id'])
  );
  const [conditionId, setConditionId] = useState(
    firstTicketValue(params, ['conditionId', 'condition_id'])
  );
  const [slug, setSlug] = useState(
    firstTicketValue(params, ['slug', 'marketSlug'])
  );
  const [tokenId] = useState(
    firstTicketValue(params, ['tokenId', 'token_id', 'asset'])
  );
  const [outcome, setOutcome] = useState(initialPredictionOutcome(params));
  const [side, setSide] = useState(initialPredictionSide(params));
  const [orderType, setOrderType] = useState(
    initialPredictionOrderType(params)
  );
  const [amount, setAmount] = useState(
    firstTicketValue(params, [
      'amount',
      'amountUsd',
      'usdcAmount',
      'cost',
      'size',
      'shares',
    ]) || '10'
  );
  const [limitPrice, setLimitPrice] = useState(
    initialPredictionLimitPrice(params)
  );
  const initialOutcome = initialPredictionOutcome(params);
  const selectedOutcomeLabel = firstTicketValue(params, [
    'outcomeLabel',
    'outcome_label',
  ]);
  const yesLabel =
    selectedOutcomeLabel && initialOutcome === 'yes'
      ? selectedOutcomeLabel
      : 'Yes';
  const noLabel =
    selectedOutcomeLabel && initialOutcome === 'no'
      ? selectedOutcomeLabel
      : 'No';
  const approvalOutcomeLabel = outcome === 'yes' ? yesLabel : noLabel;
  const marketLabel =
    firstTicketValue(params, [
      'question',
      'marketQuestion',
      'marketTitle',
      'title',
      'description',
    ]) ||
    slug ||
    conditionId ||
    marketId ||
    'Selected market';

  const hasMarket = Boolean(marketId.trim() || conditionId.trim() || slug.trim());
  const amountNumber = toFiniteNumber(amount);
  const availableShares = tokenId
    ? positions
        .filter((position) => String(position.asset) === String(tokenId))
        .reduce((sum, position) => sum + toFiniteNumber(position.size), 0)
    : 0;
  const needsPredictionFunds =
    isOpen &&
    canAct &&
    side === 'BUY' &&
    !isBalanceLoading &&
    amountNumber > availableUsdc;
  const hasInsufficientShares =
    isOpen &&
    canAct &&
    side === 'SELL' &&
    tokenId &&
    amountNumber > availableShares;
  const predictionShortfall = Math.max(0, amountNumber - availableUsdc);

  const canSubmit = Boolean(
    isOpen &&
      canAct &&
      !needsPredictionFunds &&
      !hasInsufficientShares &&
      hasMarket &&
      outcome &&
      side &&
      positiveInput(amount) &&
      (orderType !== 'limit' || positiveInput(limitPrice))
  );

  const handleApprove = () => {
    if (needsPredictionFunds) {
      onAddFunds();
      return;
    }
    if (!canSubmit) return;
    onApprove(proposalId, {
      marketId: marketId || undefined,
      conditionId: conditionId || undefined,
      slug: slug || undefined,
      tokenId: tokenId || undefined,
      outcome,
      side,
      amount,
      orderType,
      price:
        orderType === 'limit'
          ? decimalPriceFromCents(limitPrice)
          : undefined,
    });
  };

  return (
    <div className="mt-3 space-y-3 border-t border-white/[0.07] px-3.5 pb-3 pt-3">
      <div className="rounded-[12px] border border-white/[0.07] bg-black p-3">
        <div className="dm-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
          prediction ticket
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[14px] font-semibold text-[#eceef2]">
            {approvalOutcomeLabel}
          </span>
          <span className="dm-mono shrink-0 text-[11px] text-[#9396a0]">
            {side} {orderType}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-[6px] bg-[#3fe08f]/10">
          <div
            className="h-full rounded-[6px] bg-[#3fe08f]"
            style={{
              width: `${Math.round(
                parsePolymarketProbability(
                  orderType === 'limit' ? limitPrice : undefined,
                  outcome === 'yes' ? 0.54 : 0.46
                ) * 100
              )}%`,
            }}
          />
        </div>
      </div>
      {hasMarket ? (
        <div className="rounded-[11px] border border-white/[0.07] bg-[#101217] px-3 py-2.5">
          <div className={TICKET_LABEL_CLASS}>market</div>
          <div className="mt-1 truncate text-[13px] font-semibold leading-tight text-[#eceef2]">
            {marketLabel}
          </div>
          {(marketId || conditionId || slug || tokenId) && (
            <div className="dm-mono mt-1 truncate text-[10px] text-[#5a5e69]">
              {marketId || conditionId || slug}
              {tokenId ? ` · token ${tokenId.slice(0, 18)}...` : ''}
            </div>
          )}
        </div>
      ) : (
        <label className="grid gap-1">
          <span className={TICKET_LABEL_CLASS}>
            Market id, condition, or slug
          </span>
          <input
            value={marketId || conditionId || slug}
            onChange={(event) => {
              setMarketId(event.target.value);
              setConditionId('');
              setSlug('');
            }}
            disabled={!isOpen}
            placeholder="Paste market id"
            className={TICKET_FIELD_CLASS}
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOutcome('yes')}
          disabled={!isOpen}
          className={`h-9 rounded-[9px] text-[12.5px] font-semibold ${
            outcome === 'yes'
              ? 'bg-[#3fe08f] text-[#031008]'
              : TICKET_IDLE_BUTTON_CLASS
          } disabled:opacity-60`}
        >
          <span className="truncate px-1">{yesLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => setOutcome('no')}
          disabled={!isOpen}
          className={`h-9 rounded-[9px] text-[12.5px] font-semibold ${
            outcome === 'no'
              ? 'bg-[#1b1e25] text-[#eceef2]'
              : TICKET_IDLE_BUTTON_CLASS
          } disabled:opacity-60`}
        >
          <span className="truncate px-1">{noLabel}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide('BUY')}
          disabled={!isOpen}
          className={`h-9 rounded-[9px] text-[12.5px] font-semibold ${
            side === 'BUY'
              ? 'bg-[#3fe08f] text-[#031008]'
              : TICKET_IDLE_BUTTON_CLASS
          } disabled:opacity-60`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          disabled={!isOpen}
          className={`h-9 rounded-[9px] text-[12.5px] font-semibold ${
            side === 'SELL'
              ? 'bg-[#1b1e25] text-[#eceef2]'
              : TICKET_IDLE_BUTTON_CLASS
          } disabled:opacity-60`}
        >
          Sell
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className={TICKET_LABEL_CLASS}>Order</span>
          <select
            value={orderType}
            onChange={(event) => setOrderType(event.target.value)}
            disabled={!isOpen}
            className={TICKET_FIELD_CLASS}
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className={TICKET_LABEL_CLASS}>
            {side === 'BUY' ? 'Amount USDC' : 'Shares'}
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={!isOpen}
            className={TICKET_MONO_FIELD_CLASS}
          />
        </label>
        {orderType === 'limit' && (
          <label className="grid gap-1">
            <span className={TICKET_LABEL_CLASS}>
              Limit price, cents
            </span>
            <input
              type="number"
              min="1"
              max="99"
              step="1"
              value={limitPrice}
              onChange={(event) => setLimitPrice(event.target.value)}
              disabled={!isOpen}
              placeholder="42"
              className={TICKET_MONO_FIELD_CLASS}
            />
          </label>
        )}
      </div>

      {isOpen && (
        <div
          className={`rounded-[10px] border px-3 py-2 text-[11px] ${
            needsPredictionFunds || hasInsufficientShares
              ? 'border-[#e8920f]/25 bg-[#e8920f]/10 text-[#ffd08a]'
              : 'border-white/[0.07] bg-black/25 text-[#9396a0]'
          }`}
        >
          {isBalanceLoading ? (
            'Checking Polymarket balance...'
          ) : side === 'BUY' ? (
            needsPredictionFunds ? (
              <>
                Add funds first. Available pUSD is{' '}
                <span className="font-semibold text-[#eceef2]">
                  {formatCompactUsd(availableUsdc)}
                </span>
                {predictionShortfall > 0
                  ? `, ${formatCompactUsd(predictionShortfall)} short.`
                  : '.'}
              </>
            ) : (
              <>
                Available pUSD{' '}
                <span className="font-semibold text-[#eceef2]">
                  {formatCompactUsd(availableUsdc)}
                </span>
                .
              </>
            )
          ) : hasInsufficientShares ? (
            <>
              Not enough shares to sell. Available shares:{' '}
              <span className="font-semibold text-[#eceef2]">
                {availableShares.toFixed(2)}
              </span>
              .
            </>
          ) : (
            <>
              Available shares{' '}
              <span className="font-semibold text-[#eceef2]">
                {availableShares.toFixed(2)}
              </span>
              .
            </>
          )}
        </div>
      )}

      {isOpen && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={
              (!canSubmit && !needsPredictionFunds) ||
              isPending ||
              Boolean(hasInsufficientShares)
            }
            className={TICKET_PRIMARY_BUTTON_CLASS}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : needsPredictionFunds ? (
              <Plus className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span className="truncate">
              {needsPredictionFunds
                ? 'Add funds'
                : `Approve ${side.toLowerCase()} ${approvalOutcomeLabel}`}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onReject(proposalId)}
            disabled={!canAct || isPending}
            className={TICKET_REJECT_BUTTON_CLASS}
          >
            <Ban className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}

      {!hasMarket && isOpen && (
        <p className="text-[11px] text-[#ffd08a]">
          Pick a fetched market first or paste a market id, condition id, or
          slug.
        </p>
      )}
      {!canAct && isOpen && (
        <p className="text-[11px] text-[#ffd08a]">
          Only the user who asked Astro to prepare this bet can approve it.
        </p>
      )}
    </div>
  );
}

function formatActionLabel(action?: string) {
  if (!action) return 'Action proposal';
  return action
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .join(' · ');
}

function proposalStatusClass(status: string) {
  if (status === 'approved' || status === 'executed') {
    return 'bg-[#3fe08f]/15 text-[#dfffee]';
  }
  if (status === 'rejected' || status === 'failed' || status === 'expired') {
    return 'bg-[#ff5d63]/15 text-[#ffb2b6]';
  }
  return 'bg-[#e8920f]/15 text-[#ffd08a]';
}

function formatParamValue(value: unknown) {
  if (value === null || value === undefined) return 'n/a';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}

function getApprovalNextStep(result: unknown) {
  if (!result || typeof result !== 'object') return null;
  const nextStep = (result as { nextStep?: string }).nextStep;
  if (
    nextStep === 'frontend_signing_required' ||
    nextStep === 'hyperliquid_frontend_signing_required' ||
    nextStep === 'polymarket_frontend_signing_required' ||
    nextStep === 'swap_frontend_signing_required'
  ) {
    return 'Ready for wallet signing';
  }
  if (nextStep === 'hyperliquid_order_form_required') {
    return 'Open Perps to review the missing trade details before signing.';
  }
  return nextStep || null;
}
