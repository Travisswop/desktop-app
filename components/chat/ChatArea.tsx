// app/components/ChatArea.tsx
'use client';
import type {
  MouseEvent as ReactMouseEvent,
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
import { QRCodeSVG } from 'qrcode.react';
import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  http,
} from 'viem';
import { arbitrum, base, bsc, mainnet, polygon } from 'viem/chains';
import GroupMenu from './GroupMenu';
import ChatAttachmentMenu, {
  type ChatAttachmentGif,
} from './ChatAttachmentMenu';
import { resolveActiveChatData } from './chatSelection';
import { sendCloudinaryFile } from '@/lib/SendCloudinaryAnyFile';
import Image from 'next/image';
import isUrl from '@/lib/isUrl';
import CoinbaseOnrampFunding from '@/components/wallet/CoinbaseOnrampFunding';
import { useAavePositions } from '@/components/wallet/defi/hooks/useAaveData';
import {
  CryptoChartCard,
  parseCoinGeckoChartIntent,
} from '@/components/chat/CryptoChartCard';
import {
  findFundingOnrampIntent,
  normalizeFundingOnrampSourceText,
  type FundingOnrampPrefill,
} from '@/lib/chat/fundingOnrampIntent';
import {
  looksLikePublicEnsName,
  resolvePublicEnsName,
} from '@/lib/api/publicEnsResolver';
import { buildSwopApiUrl } from '@/lib/api/apiBaseUrl';
import { apiFetch } from '@/lib/api/apiFetch';
import toast from 'react-hot-toast';
import {
  Activity,
  ArrowRight,
  ArrowRightLeft,
  Ban,
  BarChart3,
  Bot,
  ChevronDown,
  ChevronLeft,
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Grid2X2,
  Loader2,
  Menu,
  Plus,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Square,
  UserRound,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { AgentActionReceiptCard } from '@/components/chat/tickets/AgentActionReceiptCard';
import {
  AgentLoadingCard,
  MarketplaceItemCards,
  SportsResearchBriefCard,
  SportsResearchSourceCards,
  WalletPortfolioCard,
  WalletReceiveQrCard,
} from '@/components/chat/cards/AgentInfoCards';
import { ChatChartCommandCard } from '@/components/chat/cards/ChatChartCommandCard';
import {
  PnlOverviewCard,
  PolymarketMarketCards,
  PolymarketPositionsCard,
} from '@/components/chat/cards/PolymarketCards';
import type {
  AstroConsoleData,
  ChartCommandIntent,
  ChartTimeRange,
  MarketplaceItemPreview,
  PnlOverviewPreview,
  PolymarketMarketPreview,
  PolymarketOrderPrefill,
  PolymarketRealtimePrice,
  ResearchSourcePreview,
  SportsResearchBrief,
  User,
  WalletPortfolioSnapshot,
  WalletReceiveQrDetails,
} from '@/lib/chat/agentCardTypes';
import { getReceiptId } from '@/lib/chat/receiptShare';
import {
  buildPolymarketBetKey,
  compactPerpsMarketKey,
  displayPerpsCoin,
  formatCompactUsd,
  formatPerpsPrice,
  formatPolymarketMarketLabel,
  formatPolymarketPrice,
  formatSignedUsd,
  formatSwapAmount,
  formatWalletAddress,
  getAgentFeedIdentity,
  getPerpsMarkPrice,
  getPolymarketOutcomeLabels,
  getReceiptIdentityKeys,
  isOpenPredictionConsolePosition,
  isProposalNoLongerPendingError,
  normalizePredictionConsolePositions,
  normalizeIntentText,
  normalizePerpsMarketQuery,
  parseLivePolymarketPrice,
  parsePolymarketProbability,
  perpsAliasTargets,
  perpsCoinMatches,
  perpsMarketForCoin,
  toAgentFeedNumber,
  toFiniteNumber,
  triggerAgentFeedRefresh,
} from '@/lib/chat/ticketFormat';
import {
  AGENT_PANEL_CLASS,
  TICKET_FIELD_CLASS,
  TICKET_IDLE_BUTTON_CLASS,
  TICKET_LABEL_CLASS,
  TICKET_MONO_FIELD_CLASS,
  TICKET_PRIMARY_BUTTON_CLASS,
  TICKET_REJECT_BUTTON_CLASS,
} from '@/lib/chat/ticketStyles';
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
import { queueAgentActionClientEvent } from '@/lib/chat/agentActionTelemetry';
import { postFeed } from '@/actions/postFeed';
import {
  usePolymarketWallet,
  useTrading,
} from '@/providers/polymarket';
import {
  getPortfolioEvmWalletInput,
  useWalletAddresses,
  useWalletData,
} from '@/components/wallet/hooks/useWalletData';
import { SUPPORTED_CHAINS } from '@/components/wallet/constants';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { useUser } from '@/lib/UserContext';
import { getWalletInfo } from '@/lib/polymarket/backend-session';
import { usePolygonBalances } from '@/hooks/polymarket/usePolygonBalances';
import {
  useUserPositions,
  type PolymarketPosition,
} from '@/hooks/polymarket/useUserPositions';
import { useActiveOrders } from '@/hooks/polymarket/useActiveOrders';

const LOCAL_HYPERLIQUID_PROPOSAL_PREFIX = 'local-perps-order-';
const LOCAL_SWAP_PROPOSAL_PREFIX = 'local-wallet-swap-';
import {
  type PerpsAccountSummary,
} from '@/components/wallet/perps/hooks/useHyperliquidPositions';
import { useHyperliquidPortfolio } from '@/components/wallet/perps/hooks/useHyperliquidPortfolio';
import { useHyperliquidAgent } from '@/components/wallet/perps/hooks/useHyperliquidAgent';
import { useHyperliquidMarkets } from '@/components/wallet/perps/hooks/useHyperliquidMarkets';
import { useHyperliquidTrading } from '@/components/wallet/perps/hooks/useHyperliquidTrading';
import type { HLMarket, HLPosition } from '@/services/hyperliquid/types';
import {
  buildPerpsPositionKey,
  qualifyPerpsPositionCoin,
  resolvePerpsFeedSmartsiteId,
  upsertPerpsPositionFeed,
  type PerpsPositionFeedEvent,
  type PerpsPositionFeedStatus,
} from '@/lib/perps/perpsFeed';
import {
  getHyperliquidPositionDex,
  getHyperliquidMarketDex,
  hyperliquidMarketForPosition,
  hyperliquidMarketMatchesPosition,
  normalizeHyperliquidDex,
} from '@/lib/perps/hyperliquidMarketIdentity';
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
import { copyTextToClipboard } from '@/lib/clipboard';
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
    | 'video'
    | 'file'
    | 'bot_command'
    | 'bot_response'
    | 'system'
    | 'agent_response'
    | 'agent_action_proposal';
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
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
      responseType?: string | null;
      riskSummary?: AgentActionProposal['riskSummary'];
      normalizedParams?: AgentActionProposal['normalizedParams'];
        toolExecution?: {
          provider?: string | null;
          action?: string | null;
          markets?: PolymarketMarketPreview[];
          positions?: PolymarketPosition[];
          perpsPositions?: HyperliquidPositionsPreview | null;
          pnlOverview?: PnlOverviewPreview | null;
          portfolioSnapshot?: WalletPortfolioSnapshot | null;
          items?: MarketplaceItemPreview[];
          walletReceive?: WalletReceiveQrDetails | null;
          sources?: ResearchSourcePreview[];
          sportsResearch?: SportsResearchBrief | null;
          query?: string | null;
          checkedAt?: string | null;
        } | null;
      polymarketOrderPrefill?: PolymarketOrderPrefill | null;
      walletSendNetworkPrompt?: WalletSendNetworkPrompt | null;
      walletSendDraftPrompt?: WalletSendDraftPrompt | null;
      perpsPositionPrompt?: PerpsPositionPrompt | null;
      strategyRuntime?: GoldmanStrategyRuntimeCardPayload | null;
      receipt?: AgentActionCompletion | null;
      fundingOnramp?: FundingOnrampPrefill | null;
    };
  };
}

const MESSAGE_DEDUPE_WINDOW_MS = 15_000;

function normalizeMessageForDedupe(value?: string | null) {
  return (value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/^@?astro\b[\s,:-]*/i, '')
    .trim();
}

function isTempMessage(message: Message) {
  return Boolean(
    message._id && message._id.toString().startsWith('temp-')
  );
}

const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;
const GIF_ATTACHMENT_NAME = 'GIF';

function formatAttachmentSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentMessageType(fileType: string): 'image' | 'video' | 'file' {
  if (fileType.startsWith('image')) return 'image';
  if (fileType.startsWith('video')) return 'video';
  return 'file';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
  if (
    a._id &&
    b._id &&
    a._id !== b._id &&
    !isTempMessage(a) &&
    !isTempMessage(b)
  ) {
    return false;
  }

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

interface WalletSendDraftPrompt {
  token: string;
  amount: string;
  amountType: string;
  recipient: string;
  chain: string;
  recipientCandidates?: WalletSendDraftCandidate[];
}

interface WalletSendDraftCandidate {
  userId?: string | null;
  displayName?: string | null;
  swopId?: string | null;
  capabilities?: string[];
  avatar?: string | null;
}

interface PerpsPositionPromptOption {
  coin: string;
  dex?: string | null;
  dexName?: string | null;
  assetIndex?: number | null;
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
  dex?: string | null;
  dexName?: string | null;
  assetIndex?: number | null;
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

interface PolymarketOrderIntent {
  market: PolymarketMarketPreview;
  prefill: PolymarketOrderPrefill;
}

type AstroConsolePositionSelection =
  | {
      kind: 'perps';
      position: HLPosition;
    }
  | {
      kind: 'prediction';
      position: PolymarketPosition;
    };

const AGENT_TERMINAL_BUBBLE_CLASS =
  'dm-mono rounded-[14px] border border-white/[0.07] bg-[#15171d] px-4 py-2.5 text-[13.5px] font-semibold leading-[1.7] text-[#a9adb8] shadow-[0_18px_50px_rgba(0,0,0,0.35)]';
const CHAT_COMMAND_SUGGESTIONS = [
  {
    command: '/search',
    label: 'Internet search',
    hint: 'Research live web results with Astro',
    seed: '/search ',
  },
  {
    command: '/chart',
    label: 'Market chart',
    hint: 'Open a live Hyperliquid candle chart',
    seed: '/chart ',
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
  {
    command: '/portfolio',
    label: 'Portfolio graph',
    hint: 'Show wallet token allocation',
    seed: '/portfolio ',
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
  isThreadListCollapsed?: boolean;
  initialComposerSeed?: {
    command: string;
    nonce: number;
  } | null;
  onComposerSeedConsumed?: () => void;
  onChatUpdate?: () => void; // ADD THIS
  onBackToList?: () => void;
  onLeaveGroup?: () => void;
  onOpenAgentThread?: (agentId: string) => void | Promise<void>;
}

interface SocketResponse {
  success: boolean;
  messages?: Message[];
  message?: Message;
  clientGeneratedAgentMessages?: Message[];
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

function normalizeAgentIdentity(value?: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9]+/g, '');
}

function isActiveAstroAgent(agent?: Partial<GroupAgent> | null) {
  if (!agent || agent.isActive === false) return false;

  const identityValues = [
    agent.agentId,
    agent.displayName,
    ...((agent.mentionAliases || []) as string[]),
  ];

  return identityValues.some((value) =>
    ['astro', 'astroswop', 'swopagent'].includes(
      normalizeAgentIdentity(value)
    )
  );
}

function isAstroTradingDeskChat(
  chat: SelectedChat | null,
  isGroup: boolean
) {
  const name = String(chat?.name || '').trim().toLowerCase();

  return isGroup && name === 'astro trading desk';
}

function isGoldmanSacksChat(
  chat: SelectedChat | null,
  isGroup: boolean
) {
  const name = String(chat?.name || '').trim().toLowerCase();

  return isGroup && name === 'goldman sacks';
}

type DedicatedAgentThreadId = 'astro' | 'goldman-sacks';

function getAgentDedicatedThreadId(
  agentId?: string | null
): DedicatedAgentThreadId | null {
  if (agentId === 'astro' || agentId === 'goldman-sacks') {
    return agentId;
  }

  return null;
}

function getDedicatedAgentThreadId(
  chat: SelectedChat | null,
  isGroup: boolean
): DedicatedAgentThreadId | null {
  if (isAstroTradingDeskChat(chat, isGroup)) return 'astro';
  if (isGoldmanSacksChat(chat, isGroup)) return 'goldman-sacks';
  return null;
}

function toAstroDeskDisplayMessage(
  message: Message,
  _currentUser: string,
  isAstroDesk: boolean
) {
  if (
    !isAstroDesk ||
    isAgentLikeMessage(message) ||
    message.messageType !== 'text'
  ) {
    return message;
  }

  const displayText = stripLeadingAstroMention(message.message);
  if (!displayText || displayText === message.message) return message;

  return { ...message, message: displayText };
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
    params.set('market_set', 'moneyline');
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
  const match =
    text.match(
      /\b(?:take\s*profit|take-profit|tp)\b\s*(?:at|@|to|for|=|:)?\s*\$?([0-9]+(?:\.[0-9]+)?)/i
    ) ||
    text.match(
      /\b(?:take\s*profit|take-profit|tp)\b[\s\S]{0,80}\b(?:at|@|to|for|=|:)\s*\$?([0-9]+(?:\.[0-9]+)?)/i
    );
  return match?.[1] || '';
}

function parseHyperliquidStopLossPrice(text: string) {
  const match =
    text.match(
      /\b(?:stop\s*loss|stop-loss|sl)\b\s*(?:at|@|to|for|=|:)?\s*\$?([0-9]+(?:\.[0-9]+)?)/i
    ) ||
    text.match(
      /\b(?:stop\s*loss|stop-loss|sl)\b[\s\S]{0,80}\b(?:at|@|to|for|=|:)\s*\$?([0-9]+(?:\.[0-9]+)?)/i
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

function isChatWalletSendCommand(text?: string | null) {
  const commandText = stripLeadingAstroMention(String(text || ''));
  return /^\/send(?:\s|$)/i.test(commandText);
}

function parseChatWalletSendDraft(text?: string | null): WalletSendDraftPrompt {
  const commandText = stripLeadingAstroMention(String(text || '')).replace(
    /^\/send\b/i,
    'send'
  );
  const amount = parseWalletSendAmount(commandText);
  const amountType = parseWalletSendAmountType(commandText);
  let token = parseWalletSendToken(commandText);
  if (!token) {
    // "/send usdc to bob" — token directly after the command, before "to"
    const directToken = commandText.match(
      /^send\s+([a-zA-Z][a-zA-Z0-9]{1,10})\s+(?:to\b|$)/i
    )?.[1];
    if (directToken && !/^(to|me|my|some|all|the|a|an)$/i.test(directToken)) {
      token = directToken.toUpperCase();
    }
  }
  const recipient = parseWalletSendRecipient(commandText);
  const chain = inferWalletSendChain(commandText);
  return {
    token: token || '',
    amount: amount || '',
    amountType: amountType || 'token',
    recipient: recipient || '',
    chain: chain || '',
  };
}

function buildSyntheticWalletSendDraftPromptMessage(
  draft: WalletSendDraftPrompt,
  sourceMessageId?: string,
  agentSender: NonNullable<Message['agentSender']> = {
    agentId: 'astro',
    provider: 'elizaos',
    displayName: 'Astro',
    avatarUrl: null,
  },
  message = 'Let’s build your send. Pick a token, amount, and recipient.'
): Message {
  return {
    _id: sourceMessageId
      ? `local-wallet-send-draft-${sourceMessageId}`
      : `local-wallet-send-draft-${Date.now()}`,
    message,
    senderKind: 'agent',
    agentSender,
    messageType: 'agent_response',
    createdAt: new Date().toISOString(),
    agentData: {
      metadata: {
        walletSendDraftPrompt: draft,
      },
    },
  };
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
  // Function words after the amount ("send 5 to bob") are not token symbols.
  if (/^(TO|ON|VIA|FOR|FROM|AND|THE|MY|ME)$/.test(raw)) return '';

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

function getWalletSendFundingTokens(consoleData: AstroConsoleData) {
  return Array.isArray(consoleData.walletFundingTokens)
    ? consoleData.walletFundingTokens
    : consoleData.walletPortfolioTokens;
}

function isWalletSendFundingBalanceLoading(consoleData: AstroConsoleData) {
  return Boolean(
    consoleData.isWalletFundingBalanceLoading ??
      consoleData.isWalletPortfolioBalanceLoading
  );
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

function hasChatSwapIntent(text?: string | null) {
  const commandText = stripLeadingAstroMention(String(text || ''));
  if (!commandText) return false;
  if (/^\//.test(commandText) && !/^\/swap(?:\s|$)/i.test(commandText)) {
    return false;
  }
  if (/^\/swap(?:\s|$)/i.test(commandText)) return true;

  const normalizedText = normalizeIntentText(commandText);
  if (!/\b(swap|convert|trade|quote)\b/.test(normalizedText)) return false;

  const intent = parseSwapPromptIntent(commandText);
  return Boolean(
    intent.amount ||
      intent.fromSymbol ||
      intent.toSymbol ||
      intent.quoteOnly
  );
}

function isExplicitChatSwapCommand(text?: string | null) {
  return /^\/swap(?:\s|$)/i.test(
    stripLeadingAstroMention(String(text || ''))
  );
}

function findChatSwapIntent(text: string) {
  if (!hasChatSwapIntent(text)) return null;

  const commandText = stripLeadingAstroMention(text);
  const intent = parseSwapPromptIntent(commandText);
  const params: Record<string, unknown> = {};

  if (intent.fromSymbol) {
    params.fromTokenSymbol = intent.fromSymbol;
    params.inputTokenSymbol = intent.fromSymbol;
    params.fromToken = intent.fromSymbol;
  }
  if (intent.toSymbol) {
    params.toTokenSymbol = intent.toSymbol;
    params.outputTokenSymbol = intent.toSymbol;
    params.toToken = intent.toSymbol;
  }
  if (intent.amount) {
    params.amount = intent.amount;
    params.fromAmount = intent.amount;
    params.inputAmount = intent.amount;
    params.amountType = intent.amountType || 'token';
  }
  if (intent.fromChainId) {
    params.fromChainId = intent.fromChainId;
    params.inputChainId = intent.fromChainId;
  }
  if (intent.toChainId) {
    params.toChainId = intent.toChainId;
    params.outputChainId = intent.toChainId;
  }
  if (intent.quoteOnly) {
    params.quoteOnly = true;
  }

  return { params };
}

function buildSyntheticSwapMessage(
  intent: { params: Record<string, unknown> },
  sourceMessageId?: string
): Message {
  const proposalId = sourceMessageId
    ? `${LOCAL_SWAP_PROPOSAL_PREFIX}${sourceMessageId}`
    : `${LOCAL_SWAP_PROPOSAL_PREFIX}${Date.now()}`;
  const params = intent.params;
  const fromToken = firstTicketValue(params, [
    'fromTokenSymbol',
    'inputTokenSymbol',
    'fromToken',
  ]);
  const toToken = firstTicketValue(params, [
    'toTokenSymbol',
    'outputTokenSymbol',
    'toToken',
  ]);
  const routeText =
    fromToken || toToken
      ? ` from ${fromToken || 'your wallet'} to ${toToken || 'a token'}`
      : '';

  return {
    _id: `${proposalId}-message`,
    message: `Opened a swap ticket${routeText}. Sign and approve below.`,
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
      action: 'wallet.swap',
      proposalIds: [proposalId],
      proposalId,
      toolType: 'wallet.write',
      metadata: {
        riskSummary: {
          riskLevel: 'high',
          toolType: 'wallet.write',
          action: 'wallet.swap',
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
  const market = hyperliquidMarketForPosition(markets, position);
  const markPrice = getPerpsMarkPrice(position.coin, market);
  return {
    coin: position.coin,
    dex: getHyperliquidPositionDex(position) || undefined,
    dexName: market?.dexName,
    assetIndex: market?.index,
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
    ...(option.assetIndex !== null && option.assetIndex !== undefined
      ? {
          assetIndex: option.assetIndex,
          assetId: option.assetIndex,
          a: option.assetIndex,
        }
      : {}),
    ...(option.dex ? { dex: option.dex, marketDex: option.dex } : {}),
    ...(option.dexName ? { dexName: option.dexName } : {}),
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

function isLocalHyperliquidCloseProposalId(proposalId?: string | null) {
  return Boolean(
    proposalId &&
      proposalId.startsWith(`${LOCAL_HYPERLIQUID_PROPOSAL_PREFIX}close-`)
  );
}

function isLocalSwapProposalId(proposalId?: string | null) {
  return Boolean(
    proposalId && proposalId.startsWith(LOCAL_SWAP_PROPOSAL_PREFIX)
  );
}

function isLocalWalletSendProposalId(proposalId?: string | null) {
  return Boolean(proposalId && proposalId.startsWith('local-wallet-send-'));
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

function hasWalletSendApprovalParams(params?: Record<string, unknown>) {
  if (!params) return false;
  const token = firstTicketValue(params, [
    'token',
    'tokenSymbol',
    'asset',
    'currency',
  ]);
  const amount = firstTicketValue(params, ['amount', 'amountUsd']);
  const recipient = firstTicketValue(params, [
    'recipient',
    'recipientAddress',
    'recipientEns',
    'recipientName',
    'to',
  ]);
  return Boolean(token && amount && recipient);
}

function buildWalletSendPromptFromApprovalParams(
  params?: Record<string, unknown>
) {
  const token =
    firstTicketValue(params, ['token', 'tokenSymbol', 'asset', 'currency']) ||
    'TOKEN';
  const amount = firstTicketValue(params, ['amount', 'amountUsd']) || '0';
  const amountType =
    firstTicketValue(params, ['amountType']) ||
    (initialTicketBool(params, ['isUSD'], false) ? 'usd' : 'token');
  const recipient =
    firstTicketValue(params, [
      'recipient',
      'recipientEns',
      'recipientName',
      'recipientAddress',
      'to',
    ]) || 'recipient';
  const rawNetwork = firstTicketValue(params, ['chain', 'network']);
  const network = rawNetwork ? normalizeWalletSendChainValue(rawNetwork) : '';
  const amountLabel =
    amountType === 'usd' ? `$${amount} in ${token}` : `${amount} ${token}`;
  const parts = ['@astro send', amountLabel, 'to', recipient];

  if (network) parts.push('on', network);

  return parts.join(' ');
}

function buildLocalWalletSendApprovalHandoff(
  proposalId: string,
  params?: Record<string, unknown>
): AgentApprovalHandoff {
  return {
    status: 'approved',
    nextStep: 'wallet_send_inline_signing_required',
    payload: {
      proposalId,
      action: 'wallet.send',
      toolType: 'wallet.write',
      provider: 'swop',
      route: '/dashboard/chat',
      panel: 'send',
      normalizedParams: params || {},
      prefill: params || {},
    },
  };
}

function buildLocalHyperliquidCloseApprovalHandoff(
  proposalId: string,
  params?: Record<string, unknown>
): AgentApprovalHandoff {
  return {
    status: 'approved',
    nextStep: 'perps_inline_signing_required',
    payload: {
      proposalId,
      action: 'perps.close_position',
      toolType: 'perps.write',
      provider: 'hyperliquid',
      route: '/dashboard/chat',
      panel: 'perps',
      normalizedParams: params || {},
      prefill: params || {},
    },
  };
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

function isWalletSwapMessage(message: Message) {
  return (
    message.agentData?.toolType === 'wallet.write' &&
    (message.agentData?.action === 'wallet.swap' ||
      message.agentData?.action === 'swap_tokens')
  );
}

function isWalletSwapProposalMessage(message: Message) {
  return (
    isWalletSwapMessage(message) &&
    (message.messageType === 'agent_action_proposal' ||
      Boolean(getMessageProposalId(message)))
  );
}

function isWalletSwapClarificationMessage(message: Message) {
  const responseType = String(
    message.agentData?.metadata?.responseType || ''
  );
  return (
    isWalletSwapMessage(message) &&
    message.messageType !== 'agent_action_proposal' &&
    (responseType === 'write_parameter_clarification' ||
      /before preparing that swap/i.test(String(message.message || '')))
  );
}

function shouldHideWalletSwapClarification(
  messages: Message[],
  currentIndex: number
) {
  const message = messages[currentIndex];
  if (!message || !isWalletSwapClarificationMessage(message)) return false;

  const currentTime = messageTime(message);
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    const candidateTime = messageTime(candidate);
    if (
      currentTime &&
      candidateTime &&
      currentTime - candidateTime > 10 * 60 * 1000
    ) {
      break;
    }
    if (isAgentLikeMessage(candidate)) continue;
    if (
      candidate.messageType === 'text' &&
      isExplicitChatSwapCommand(candidate.message)
    ) {
      return true;
    }
  }

  return false;
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

function hasMatchingWalletSwapProposal(
  messages: Message[],
  sourceMessage: Message,
  intent: { params: Record<string, unknown> } | null
) {
  if (!intent) return false;
  const sourceTime = messageTime(sourceMessage);
  const fromToken = String(
    intent.params.fromTokenSymbol ||
      intent.params.inputTokenSymbol ||
      intent.params.fromToken ||
      ''
  ).toUpperCase();
  const toToken = String(
    intent.params.toTokenSymbol ||
      intent.params.outputTokenSymbol ||
      intent.params.toToken ||
      ''
  ).toUpperCase();

  return messages.some((message) => {
    if (!isWalletSwapProposalMessage(message)) return false;
    const params = message.agentData?.metadata?.normalizedParams || {};
    const messageFromToken = String(
      params.fromTokenSymbol ||
        params.inputTokenSymbol ||
        params.fromToken ||
        ''
    ).toUpperCase();
    const messageToToken = String(
      params.toTokenSymbol ||
        params.outputTokenSymbol ||
        params.toToken ||
        ''
    ).toUpperCase();
    if (fromToken && messageFromToken && fromToken !== messageFromToken) {
      return false;
    }
    if (toToken && messageToToken && toToken !== messageToToken) {
      return false;
    }

    const currentTime = messageTime(message);
    if (!sourceTime || !currentTime) return true;
    return Math.abs(currentTime - sourceTime) <= 10 * 60 * 1000;
  });
}

function hasFollowingAgentActionMessage(
  messages: Message[],
  sourceIndex: number,
  action: string
) {
  for (let index = sourceIndex + 1; index < messages.length; index += 1) {
    const candidate = messages[index];
    if (!candidate) continue;

    if (
      !isAgentLikeMessage(candidate) &&
      candidate.messageType === 'text' &&
      candidate.message?.trim()
    ) {
      return false;
    }

    if (
      candidate.agentData?.action === action ||
      candidate.agentData?.metadata?.toolExecution?.action === action
    ) {
      return true;
    }
  }

  return false;
}

function hasLaterMeaningfulChatMessage(messages: Message[], currentIndex: number) {
  for (let index = currentIndex + 1; index < messages.length; index += 1) {
    const candidate = messages[index];
    if (!candidate) continue;
    if (
      isAgentLikeMessage(candidate) &&
      isGenericAstroOnlineText(candidate.message)
    ) {
      continue;
    }
    return true;
  }

  return false;
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
  isThreadListCollapsed = false,
  initialComposerSeed,
  onComposerSeedConsumed,
  onChatUpdate,
  onBackToList,
  onLeaveGroup,
  onOpenAgentThread,
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
    updateGroupAgentAccessStation,
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
  const activeChatData = resolveActiveChatData(
    selectedChat,
    currentGroupData,
    isGroup
  );
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
  const activeConsoleChat = activeChatData;
  const isAstroConsoleChat = isAstroTradingDeskChat(
    activeConsoleChat,
    isGroup
  );
  const hasAstroConsoleAgent =
    isGroup && Boolean(activeConsoleChat?.botUsers?.some(isActiveAstroAgent));
  const isGoldmanConsoleChat = isGoldmanSacksChat(activeConsoleChat, isGroup);
  const shouldLoadAstroConsoleData =
    isAstroConsoleChat || hasAstroConsoleAgent || isGoldmanConsoleChat;
  const { eoaAddress } = usePolymarketWallet();
  const { accessToken, user } = useUser();
  const queryClient = useQueryClient();
  const currentChatUser = useMemo(() => {
    const chat = activeChatData;
    return chat?.participants?.find(
      (participant) => getObjectId(participant.userId?._id) === currentUser
    )?.userId;
  }, [activeChatData, currentUser]);
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
    privyUser,
    user
  );
  const { solWalletAddress, evmWalletAddress, evmWalletAddresses } =
    useWalletAddresses(walletData);
  const portfolioEvmWalletInput = useMemo(
    () => getPortfolioEvmWalletInput(evmWalletAddress, evmWalletAddresses),
    [evmWalletAddress, evmWalletAddresses]
  );
  const primaryEvmWalletAddress = useMemo(() => {
    if (Array.isArray(portfolioEvmWalletInput)) {
      return portfolioEvmWalletInput[0];
    }
    return portfolioEvmWalletInput || undefined;
  }, [portfolioEvmWalletInput]);
  const predictionOwnerAddress = eoaAddress || primaryEvmWalletAddress;
  const goldmanGroupId = isGoldmanConsoleChat ? activeConsoleChat?._id || '' : '';
  const goldmanStrategyVaultQueryKey = useMemo(
    () => ['goldmanStrategyVault', goldmanGroupId] as const,
    [goldmanGroupId]
  );
  const {
    data: goldmanStrategyVault = null,
    isLoading: isGoldmanStrategyVaultLoading,
    error: goldmanStrategyVaultQueryError,
  } = useQuery({
    queryKey: goldmanStrategyVaultQueryKey,
    queryFn: () =>
      readGoldmanStrategyVault({
        groupId: goldmanGroupId,
        accessToken: accessToken!,
        method: 'POST',
      }),
    enabled: isGoldmanConsoleChat && Boolean(goldmanGroupId && accessToken),
    retry: false,
    staleTime: 30_000,
  });
  const [isActivatingGoldmanVault, setIsActivatingGoldmanVault] =
    useState(false);
  const [isTogglingGoldmanStrategy, setIsTogglingGoldmanStrategy] =
    useState(false);
  const goldmanStrategyVaultError =
    goldmanStrategyVaultQueryError instanceof Error
      ? goldmanStrategyVaultQueryError.message
      : null;
  const goldmanVaultWalletAddress = isGoldmanConsoleChat
    ? goldmanStrategyVault?.walletAddress || undefined
    : undefined;
  const consolePredictionOwnerAddress =
    isGoldmanConsoleChat && goldmanVaultWalletAddress
      ? goldmanVaultWalletAddress
      : predictionOwnerAddress;
  const activeGoldmanStrategy = useMemo(
    () => getRunnableGoldmanStrategy(goldmanStrategyVault),
    [goldmanStrategyVault]
  );
  const isGoldmanStrategyRunning =
    activeGoldmanStrategy?.runtime?.state === 'running' ||
    activeGoldmanStrategy?.status === 'active';
  const ensureGoldmanStrategyVault = useCallback(async () => {
    if (goldmanStrategyVault?.walletAddress) return goldmanStrategyVault;
    if (!goldmanGroupId || !accessToken) {
      throw new Error('Goldman Sacks group or auth session is not ready.');
    }

    setIsActivatingGoldmanVault(true);
    try {
      const vault = await readGoldmanStrategyVault({
        groupId: goldmanGroupId,
        accessToken,
        method: 'POST',
      });
      queryClient.setQueryData(goldmanStrategyVaultQueryKey, vault);
      return vault;
    } finally {
      setIsActivatingGoldmanVault(false);
    }
  }, [
    accessToken,
    goldmanGroupId,
    goldmanStrategyVault,
    goldmanStrategyVaultQueryKey,
    queryClient,
  ]);
  const handleToggleGoldmanStrategy = useCallback(
    async (action: 'run' | 'stop') => {
      if (!goldmanGroupId || !accessToken) {
        toast.error('Goldman Sacks group or auth session is not ready.');
        return;
      }

      let vault = goldmanStrategyVault;
      if (!vault?.walletAddress) {
        try {
          vault = await ensureGoldmanStrategyVault();
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Could not activate Goldman Sacks vault.'
          );
          return;
        }
      }

      const strategy = getRunnableGoldmanStrategy(vault);
      if (!strategy?.id) {
        toast.error('Approve a Goldman strategy before pressing Run.');
        return;
      }

      setIsTogglingGoldmanStrategy(true);
      try {
        const result = await updateGoldmanStrategyRuntime({
          groupId: goldmanGroupId,
          strategyId: strategy.id,
          accessToken,
          action,
        });
        queryClient.setQueryData<GoldmanStrategyVault | null>(
          goldmanStrategyVaultQueryKey,
          (current) =>
            mergeGoldmanStrategyIntoVault(
              result.vault ? { ...result.vault, strategies: current?.strategies || [] } : current || vault,
              result.strategy
            )
        );
        toast.success(
          action === 'run'
            ? 'Goldman strategy is running.'
            : 'Goldman strategy stopped.'
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Could not ${action} Goldman strategy.`
        );
      } finally {
        setIsTogglingGoldmanStrategy(false);
      }
    },
    [
      accessToken,
      ensureGoldmanStrategyVault,
      goldmanGroupId,
      goldmanStrategyVault,
      goldmanStrategyVaultQueryKey,
      queryClient,
    ]
  );
  const handleRunGoldmanStrategy = useCallback(
    () => handleToggleGoldmanStrategy('run'),
    [handleToggleGoldmanStrategy]
  );
  const handleStopGoldmanStrategy = useCallback(
    () => handleToggleGoldmanStrategy('stop'),
    [handleToggleGoldmanStrategy]
  );
  const handleSaveGoldmanStrategyFile = useCallback(
    async (fileName: string, content: string) => {
      if (!goldmanGroupId || !accessToken) {
        throw new Error('Goldman Sacks group or auth session is not ready.');
      }

      let vault = goldmanStrategyVault;
      if (!vault?.walletAddress) {
        vault = await ensureGoldmanStrategyVault();
      }

      const result = await updateGoldmanStrategyFile({
        groupId: goldmanGroupId,
        fileName,
        content,
        accessToken,
      });
      const savedFile = result.file || null;
      queryClient.setQueryData<GoldmanStrategyVault | null>(
        goldmanStrategyVaultQueryKey,
        (current) => {
          const nextVault = result.vault
            ? {
                ...result.vault,
                strategies: current?.strategies || vault?.strategies || [],
              }
            : current || vault;
          if (!nextVault || !savedFile) return nextVault || null;
          const existingFiles = hydrateGoldmanStrategyFiles(
            nextVault.strategyFiles
          );
          return {
            ...nextVault,
            strategyFiles: existingFiles.map((file) =>
              file.file === savedFile.file
                ? { ...file, ...savedFile }
                : file
            ),
          };
        }
      );
      return savedFile;
    },
    [
      accessToken,
      ensureGoldmanStrategyVault,
      goldmanGroupId,
      goldmanStrategyVault,
      goldmanStrategyVaultQueryKey,
      queryClient,
    ]
  );
  const goldmanAaveAddress = shouldLoadAstroConsoleData && isGoldmanConsoleChat
    ? goldmanStrategyVault?.walletAddress || null
    : null;
  const {
    data: goldmanAavePositions,
    isLoading: isGoldmanAavePositionsLoading,
  } = useAavePositions('polygon', goldmanAaveAddress, accessToken || '', {
    enabled: shouldLoadAstroConsoleData && isGoldmanConsoleChat,
    refetchInterval: false,
  });
  const {
    tokens: walletPortfolioTokens,
    loading: isWalletPortfolioBalanceLoading,
  } = useMultiChainTokenData(
    shouldLoadAstroConsoleData && !isGoldmanConsoleChat
      ? solWalletAddress
      : '',
    shouldLoadAstroConsoleData
      ? isGoldmanConsoleChat
        ? goldmanStrategyVault?.walletAddress || ''
        : portfolioEvmWalletInput
      : '',
    SUPPORTED_CHAINS
  );
  const {
    tokens: mainWalletFundingTokens,
    loading: isMainWalletFundingBalanceLoading,
  } = useMultiChainTokenData(
    shouldLoadAstroConsoleData && isGoldmanConsoleChat
      ? solWalletAddress
      : '',
    shouldLoadAstroConsoleData && isGoldmanConsoleChat
      ? portfolioEvmWalletInput
      : '',
    SUPPORTED_CHAINS
  );
  const walletFundingTokens = isGoldmanConsoleChat
    ? mainWalletFundingTokens
    : walletPortfolioTokens;
  const isWalletFundingBalanceLoading = isGoldmanConsoleChat
    ? isMainWalletFundingBalanceLoading
    : isWalletPortfolioBalanceLoading;

  const walletPortfolioBalance = useMemo(() => {
    return walletPortfolioTokens.reduce((sum, token) => {
      const value = getTokenDataUsdValue(token);
      return Number.isFinite(value) && value > 0 ? sum + value : sum;
    }, 0);
  }, [walletPortfolioTokens]);
  const requestedPerpsMasterAddress = shouldLoadAstroConsoleData
    ? isGoldmanConsoleChat
      ? goldmanVaultWalletAddress || null
      : primaryEvmWalletAddress || eoaAddress || null
    : null;
  const perpsAgent = useHyperliquidAgent({
    enabled: shouldLoadAstroConsoleData,
    masterAddress: isGoldmanConsoleChat ? null : requestedPerpsMasterAddress,
  });
  const {
    data: perpsMarkets = [],
    isLoading: isPerpsMarketsLoading,
    isFetching: isPerpsMarketsFetching,
    error: perpsMarketsError,
  } = useHyperliquidMarkets({
    enabled: shouldLoadAstroConsoleData,
    includeBuilderDexes: true,
  });
  const perpsTrading = useHyperliquidTrading(
    perpsAgent.agentClient,
    perpsAgent.resetAgent
  );

  const { data: predictionWalletInfo, isLoading: isPredictionWalletInfoLoading } =
    useQuery({
      queryKey: ['polymarketWalletInfo', consolePredictionOwnerAddress],
      queryFn: () => getWalletInfo(consolePredictionOwnerAddress!, accessToken!),
      enabled:
        shouldLoadAstroConsoleData &&
        Boolean(consolePredictionOwnerAddress && accessToken),
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    });

  const predictionActiveWalletAddress = useMemo(() => {
    if (!shouldLoadAstroConsoleData) return undefined;
    if (isGoldmanConsoleChat) {
      if (predictionWalletInfo?.recommendedWalletType === 'safe') {
        return predictionWalletInfo.safeAddress;
      }
      if (predictionWalletInfo?.depositWalletAddress) {
        return predictionWalletInfo.depositWalletAddress;
      }
      if (predictionWalletInfo?.safeAddress) return predictionWalletInfo.safeAddress;
      return consolePredictionOwnerAddress;
    }
    if (trading.tradingWalletAddress) return trading.tradingWalletAddress;
    if (predictionWalletInfo?.recommendedWalletType === 'safe') {
      return predictionWalletInfo.safeAddress;
    }
    if (predictionWalletInfo?.depositWalletAddress) {
      return predictionWalletInfo.depositWalletAddress;
    }
    if (predictionWalletInfo?.safeAddress) return predictionWalletInfo.safeAddress;
    return predictionOwnerAddress;
  }, [
    predictionWalletInfo?.depositWalletAddress,
    predictionWalletInfo?.recommendedWalletType,
    predictionWalletInfo?.safeAddress,
    consolePredictionOwnerAddress,
    isGoldmanConsoleChat,
    predictionOwnerAddress,
    shouldLoadAstroConsoleData,
    trading.tradingWalletAddress,
  ]);

  const predictionWalletAddresses = useMemo(() => {
    if (!shouldLoadAstroConsoleData) return [];

    const addresses = (
      isGoldmanConsoleChat
        ? [
            predictionWalletInfo?.depositWalletAddress,
            predictionWalletInfo?.safeAddress,
            predictionActiveWalletAddress,
            consolePredictionOwnerAddress,
          ]
        : [
            ...trading.portfolioAddresses,
            trading.tradingWalletAddress,
            trading.depositWalletAddress,
            predictionWalletInfo?.depositWalletAddress,
            predictionWalletInfo?.safeAddress,
            predictionActiveWalletAddress,
            predictionOwnerAddress,
          ]
    ).filter((address): address is string => Boolean(address));
    return Array.from(
      new Map(addresses.map((address) => [address.toLowerCase(), address])).values()
    );
  }, [
    consolePredictionOwnerAddress,
    isGoldmanConsoleChat,
    predictionActiveWalletAddress,
    predictionWalletInfo?.depositWalletAddress,
    predictionWalletInfo?.safeAddress,
    predictionOwnerAddress,
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
  const predictionConsolePositions = useMemo(
    () => normalizePredictionConsolePositions(predictionPositions),
    [predictionPositions]
  );
  const { data: predictionOpenOrders = [] } = useActiveOrders(
    trading.tradingSession,
    trading.tradingWalletAddress,
    { enabled: shouldLoadAstroConsoleData && !isGoldmanConsoleChat }
  );
  const perpsBuilderDexes = useMemo(() => {
    const set = new Set<string>();
    for (const m of perpsMarkets) {
      const d = (m as { dex?: string }).dex?.trim();
      if (d) set.add(d);
    }
    return Array.from(set);
  }, [perpsMarkets]);
  const perpsMasterAddress = shouldLoadAstroConsoleData
    ? isGoldmanConsoleChat
      ? goldmanVaultWalletAddress || null
      : requestedPerpsMasterAddress || perpsAgent.masterAddress || null
    : null;
  // Aggregate across the main DEX + every builder (HIP-3) DEX so Astro sees ALL
  // positions and the combined balance — one perps wallet.
  const {
    data: perpsAccount,
    isLoading: isPerpsLoading,
  } = useHyperliquidPortfolio(perpsMasterAddress, perpsBuilderDexes);

  const astroConsoleData = useMemo<AstroConsoleData>(
    () => ({
      eoaAddress,
      solWalletAddress,
      evmWalletAddress,
      evmWalletAddresses,
      walletIdentityLabel,
      walletPortfolioBalance,
      walletPortfolioTokens,
      walletFundingTokens,
      predictionWalletAddress:
        predictionActiveWalletAddress || predictionWalletAddresses[0],
      predictionWalletAddresses,
      predictionUsdcBalance: activePredictionUsdcBalance,
      predictionPortfolioUsdcBalance,
      predictionLegacyUsdcBalance,
      predictionPositions: predictionConsolePositions,
      predictionOpenOrders,
      isWalletPortfolioBalanceLoading,
      isWalletFundingBalanceLoading,
      isPredictionBalanceLoading:
        isPredictionWalletInfoLoading ||
        isActivePredictionBalanceLoading ||
        isPredictionPortfolioBalanceLoading,
      aavePositions: goldmanAavePositions || null,
      isAavePositionsLoading: isGoldmanAavePositionsLoading,
      perpsAccount,
      perpsMasterAddress,
      isPerpsLoading,
      perpsMarkets,
      isPerpsMarketsLoading:
        shouldLoadAstroConsoleData &&
        (isPerpsMarketsLoading ||
          (isPerpsMarketsFetching && perpsMarkets.length === 0)),
      perpsMarketsError:
        perpsMarketsError instanceof Error
          ? perpsMarketsError.message
          : perpsMarketsError
          ? 'Hyperliquid markets unavailable.'
          : null,
      isPerpsAgentInitialized: perpsAgent.isInitialized,
      isPerpsAgentInitializing: perpsAgent.isInitializing,
      isPerpsAgentHydrating: perpsAgent.isHydrating,
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
      isPerpsMarketsFetching,
      isPerpsMarketsLoading,
      isActivePredictionBalanceLoading,
      isPredictionPortfolioBalanceLoading,
      isPredictionWalletInfoLoading,
      shouldLoadAstroConsoleData,
      goldmanAavePositions,
      isGoldmanAavePositionsLoading,
      perpsAccount,
      perpsAgent.error,
      perpsAgent.isHydrating,
      perpsAgent.initializeAgent,
      perpsAgent.isInitialized,
      perpsAgent.isInitializing,
      perpsAgent.isReconnecting,
      perpsMasterAddress,
      perpsMarkets,
      perpsMarketsError,
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
      predictionConsolePositions,
      activePredictionUsdcBalance,
      evmWalletAddress,
      evmWalletAddresses,
      isWalletFundingBalanceLoading,
      predictionPortfolioUsdcBalance,
      predictionWalletAddresses,
      solWalletAddress,
      walletFundingTokens,
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
          const shouldUseAstroDeskDisplay = isAstroTradingDeskChat(
            latestChat || activeChat,
            isGroup
          );
          const newMessages = dedupeMessages(
            (response.messages || []).filter(
              (message) => !isSyntheticPolymarketPrepareMessage(message)
            ).map((message) =>
              toAstroDeskDisplayMessage(
                message,
                currentUser,
                shouldUseAstroDeskDisplay
              )
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
    [socket, isGroup, chatType, prepareBottomAnchoredLoad, currentUser]
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
        // Apply the fresh participant list from the event payload
        if (Array.isArray(data.participants) && data.participants.length) {
          setCurrentGroupData((prev) =>
            prev ? { ...prev, participants: data.participants } : prev
          );
        }
        // member_added / member_removed events carry the system message
        if (data.message) {
          appendMessageIfNew(data.message);
        }
      }
    };

    const handleGroupDeleted = (data: any) => {
      if (data.groupId === selectedChat?._id) {
        if (getObjectId(data.deletedBy) !== currentUser) {
          toast('This group has been deleted', {
            id: `group_deleted_${data.groupId}`,
            position: 'top-right',
          });
        }
        // Clear the selection; ChatContainer refreshes the group list
        onLeaveGroup?.();
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

    const handleGoldmanStrategyUpdated = (data: {
      groupId?: string;
      agentId?: string;
      strategy?: GoldmanTradingStrategy;
    }) => {
      if (
        data.groupId !== selectedChat?._id ||
        data.agentId !== 'goldman-sacks' ||
        !data.strategy
      ) {
        return;
      }

      queryClient.setQueryData<GoldmanStrategyVault | null>(
        goldmanStrategyVaultQueryKey,
        (current) => mergeGoldmanStrategyIntoVault(current, data.strategy)
      );
    };

    const handleGoldmanStrategyVaultReady = (data: {
      groupId?: string;
      agentId?: string;
      vault?: GoldmanStrategyVault | null;
      strategies?: GoldmanTradingStrategy[];
    }) => {
      if (
        data.groupId !== selectedChat?._id ||
        data.agentId !== 'goldman-sacks' ||
        !data.vault?.walletAddress
      ) {
        return;
      }

      queryClient.setQueryData<GoldmanStrategyVault | null>(
        goldmanStrategyVaultQueryKey,
        (current) => ({
          ...data.vault!,
          strategies: Array.isArray(data.strategies)
            ? data.strategies
            : current?.strategies || [],
        })
      );
      void queryClient.invalidateQueries({
        queryKey: goldmanStrategyVaultQueryKey,
      });
    };

    const handleGoldmanStrategyFileUpdated = (data: {
      groupId?: string;
      agentId?: string;
      vault?: GoldmanStrategyVault | null;
      file?: GoldmanStrategyFile | null;
    }) => {
      if (
        data.groupId !== selectedChat?._id ||
        data.agentId !== 'goldman-sacks' ||
        !data.vault?.walletAddress
      ) {
        return;
      }

      queryClient.setQueryData<GoldmanStrategyVault | null>(
        goldmanStrategyVaultQueryKey,
        (current) => ({
          ...data.vault!,
          strategies: current?.strategies || [],
        })
      );
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
    socket.on('group_agent_updated', handleGroupAgentAdded);
    socket.on('group_agent_removed', handleGroupAgentRemoved);
    socket.on(
      'group_agent_strategy_vault_ready',
      handleGoldmanStrategyVaultReady
    );
    socket.on(
      'group_agent_strategy_file_updated',
      handleGoldmanStrategyFileUpdated
    );
    socket.on('group_agent_strategy_updated', handleGoldmanStrategyUpdated);

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
      socket.off('group_agent_updated', handleGroupAgentAdded);
      socket.off('group_agent_removed', handleGroupAgentRemoved);
      socket.off(
        'group_agent_strategy_vault_ready',
        handleGoldmanStrategyVaultReady
      );
      socket.off(
        'group_agent_strategy_file_updated',
        handleGoldmanStrategyFileUpdated
      );
      socket.off('group_agent_strategy_updated', handleGoldmanStrategyUpdated);
    };
  }, [
    socket,
    selectedChat,
    chatType,
    currentUser,
    appendMessageIfNew,
    markGroupAgentRemoved,
    onChatUpdate,
    onLeaveGroup,
    queryClient,
    goldmanStrategyVaultQueryKey,
    upsertGroupAgent,
  ]);
  // UPDATE: Sync currentGroupData when selectedChat changes
  useEffect(() => {
    setCurrentGroupData(selectedChat);
  }, [selectedChat]);

  useEffect(() => {
    currentGroupDataRef.current = activeChatData;
  }, [activeChatData]);

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

      const msg = toAstroDeskDisplayMessage(
        data.message,
        currentUser,
        isAstroTradingDeskChat(activeChat, isGroup)
      );
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
      error?: AgentGroupError;
    }) => {
      if (!isGroup || data.groupId !== activeChat._id) return;
      setAgentStatusText(null);

      if (data.error?.message) {
        pendingPolymarketBetKeyRef.current = null;
        setPendingPolymarketBetKey(null);
        if (isSwopAccessError(data.error)) {
          showSwopAccessToast(data.error, () => {
            router.push('/wallet?outputToken=SWOP');
          });
          return;
        }
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
    router,
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
    const isLocalChartCommand = isChartCommand(outgoingMessage);
    const activeChat = activeChatData;
    const shouldAutoMentionAstro =
      isAstroTradingDeskChat(activeChat, isGroup) &&
      !hasAstroMention &&
      !isLocalChartCommand;
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

    const activePredictionWalletAddress =
      predictionActiveWalletAddress || predictionWalletAddresses[0];
    const socketEvmWalletAddress =
      isGoldmanConsoleChat && goldmanVaultWalletAddress
        ? goldmanVaultWalletAddress
        : evmWalletAddress;
    const socketEvmWalletAddresses =
      isGoldmanConsoleChat && goldmanVaultWalletAddress
        ? [goldmanVaultWalletAddress]
        : evmWalletAddresses;
    const socketTradingWalletAddress = isGoldmanConsoleChat
      ? activePredictionWalletAddress
      : trading.tradingWalletAddress;
    const socketDepositWalletAddress = isGoldmanConsoleChat
      ? predictionWalletInfo?.depositWalletAddress
      : trading.depositWalletAddress ||
        predictionWalletInfo?.depositWalletAddress;

    const messageData = isGroup
      ? {
          groupId: selectedChat._id,
          message: messageForTransport,
          messageType: 'text' as const,
          clientWalletContext: {
            evmWalletAddress: socketEvmWalletAddress,
            evmWalletAddresses: socketEvmWalletAddresses,
            solWalletAddress,
            predictionWalletAddress: activePredictionWalletAddress,
            predictionWalletAddresses,
            tradingWalletAddress: socketTradingWalletAddress,
            depositWalletAddress: socketDepositWalletAddress,
            safeAddress: predictionWalletInfo?.safeAddress,
            agentId: isGoldmanConsoleChat ? 'goldman-sacks' : undefined,
            agentWalletAddress: isGoldmanConsoleChat
              ? goldmanVaultWalletAddress || null
              : undefined,
            strategyVaultWalletAddress: isGoldmanConsoleChat
              ? goldmanVaultWalletAddress || null
              : undefined,
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

    const localPnlResponseMessage =
      shouldLoadAstroConsoleData &&
      canUseAstroLocalActions &&
      isPnlCommand(outgoingMessage)
        ? buildLocalPnlResponseMessage({
            consoleData: astroConsoleData,
            groupId: isGroup ? selectedChat._id : null,
            sourceMessageId: optimisticMessage._id,
          })
        : null;
    const localPortfolioResponseMessage =
      shouldLoadAstroConsoleData &&
      canUseAstroLocalActions &&
      isPortfolioCommand(outgoingMessage)
        ? buildLocalPortfolioResponseMessage({
            consoleData: astroConsoleData,
            groupId: isGroup ? selectedChat._id : null,
            sourceMessageId: optimisticMessage._id,
          })
        : null;

    const localAgentResponseMessages = [
      localPnlResponseMessage,
      localPortfolioResponseMessage,
    ].filter((message): message is Message => Boolean(message));

    if (isGroup && localAgentResponseMessages.length > 0) {
      (messageData as any).clientGeneratedAgentMessages =
        localAgentResponseMessages.map(toClientGeneratedAgentMessagePayload);
    }

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
        ...localAgentResponseMessages,
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
          if (response.clientGeneratedAgentMessages?.length) {
            setMessages((prev) =>
              response.clientGeneratedAgentMessages!.reduce(
                (next, agentMessage) =>
                  reconcileIncomingMessage(next, agentMessage),
                prev
              )
            );
          }
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
    activeChatData,
    evmWalletAddress,
    evmWalletAddresses,
    getPolymarketIntentMarkets,
    goldmanVaultWalletAddress,
    isGoldmanConsoleChat,
    isGroup,
    messages,
    newMessage,
    predictionActiveWalletAddress,
    predictionWalletAddresses,
    predictionWalletInfo?.depositWalletAddress,
    predictionWalletInfo?.safeAddress,
    selectedChat,
    shouldLoadAstroConsoleData,
    solWalletAddress,
    socket,
    astroConsoleData,
    trading.depositWalletAddress,
    trading.tradingWalletAddress,
  ]);

  const emitAttachmentMessage = useCallback(
    ({
      tempId,
      messageType,
      fileUrl,
      fileName,
      fileSize,
      localPreviewUrl,
    }: {
      tempId: string;
      messageType: 'image' | 'video' | 'file';
      fileUrl: string;
      fileName: string;
      fileSize?: number;
      localPreviewUrl?: string;
    }) => {
      if (!socket || !selectedChat) return;

      const receiverId = isGroup
        ? selectedChat._id
        : getDirectReceiverId(selectedChat);
      if (!receiverId) return;

      const messageData = isGroup
        ? {
            groupId: selectedChat._id,
            message: fileName,
            messageType,
            fileUrl,
            fileName,
            fileSize,
          }
        : {
            receiverId,
            message: fileName,
            messageType,
            fileUrl,
            fileName,
            fileSize,
          };

      socket.emit(
        isGroup ? 'send_group_message' : EVENTS.SEND_MESSAGE,
        messageData,
        (response: SocketResponse) => {
          if (localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
          }
          if (response?.success && response.message) {
            const acknowledgedMessage = response.message;
            setMessages((prev) =>
              dedupeMessages(
                prev.map((msg) =>
                  msg._id === tempId ? acknowledgedMessage : msg
                )
              )
            );
          } else {
            setMessages((prev) =>
              prev.map((msg) =>
                msg._id === tempId
                  ? { ...msg, status: 'failed' as const }
                  : msg
              )
            );
            toast.error(response?.error || 'Failed to send attachment');
          }
        }
      );
    },
    [isGroup, selectedChat, socket]
  );

  const buildOptimisticAttachmentMessage = useCallback(
    ({
      tempId,
      messageType,
      fileUrl,
      fileName,
      fileSize,
    }: {
      tempId: string;
      messageType: 'image' | 'video' | 'file';
      fileUrl: string;
      fileName: string;
      fileSize?: number;
    }): Message | null => {
      if (!selectedChat) return null;
      const receiverId = isGroup
        ? selectedChat._id
        : getDirectReceiverId(selectedChat);
      if (!receiverId) return null;

      return {
        _id: tempId,
        message: fileName,
        sender: { _id: currentUser, name: 'You' },
        receiver: isGroup
          ? null
          : {
              _id: receiverId,
              name: getDirectReceiverName(selectedChat),
              profilePic: getDirectReceiverAvatar(selectedChat),
            },
        groupId: isGroup ? selectedChat._id : null,
        messageType,
        fileUrl,
        fileName,
        fileSize,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
    },
    [currentUser, isGroup, selectedChat]
  );

  const handleSendAttachments = useCallback(
    async (files: File[]) => {
      if (!socket || !selectedChat) return;

      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          toast.error(
            `${file.name} is larger than the 50 MB attachment limit`
          );
          continue;
        }

        const messageType = attachmentMessageType(file.type);
        const fileName = file.name || 'Attachment';
        const tempId = `temp-attachment-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const localPreviewUrl = URL.createObjectURL(file);

        const optimisticMessage = buildOptimisticAttachmentMessage({
          tempId,
          messageType,
          fileUrl: localPreviewUrl,
          fileName,
          fileSize: file.size,
        });
        if (!optimisticMessage) {
          URL.revokeObjectURL(localPreviewUrl);
          return;
        }

        forceScrollToBottomRef.current = true;
        isPinnedToBottomRef.current = true;
        setMessages((prev) => dedupeMessages([...prev, optimisticMessage]));

        try {
          const base64File = await readFileAsDataUrl(file);
          const uploadedUrl = await sendCloudinaryFile(
            base64File,
            file.type,
            fileName
          );
          emitAttachmentMessage({
            tempId,
            messageType,
            fileUrl: uploadedUrl,
            fileName,
            fileSize: file.size,
            localPreviewUrl,
          });
        } catch (error) {
          console.error('Attachment upload failed:', error);
          URL.revokeObjectURL(localPreviewUrl);
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === tempId
                ? { ...msg, status: 'failed' as const }
                : msg
            )
          );
          toast.error(`Failed to upload ${fileName}`);
        }
      }
    },
    [buildOptimisticAttachmentMessage, emitAttachmentMessage, selectedChat, socket]
  );

  const handleSendGif = useCallback(
    (gif: ChatAttachmentGif) => {
      if (!socket || !selectedChat || !gif.url) return;

      const tempId = `temp-attachment-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const optimisticMessage = buildOptimisticAttachmentMessage({
        tempId,
        messageType: 'image',
        fileUrl: gif.url,
        fileName: GIF_ATTACHMENT_NAME,
      });
      if (!optimisticMessage) return;

      forceScrollToBottomRef.current = true;
      isPinnedToBottomRef.current = true;
      setMessages((prev) => dedupeMessages([...prev, optimisticMessage]));

      emitAttachmentMessage({
        tempId,
        messageType: 'image',
        fileUrl: gif.url,
        fileName: GIF_ATTACHMENT_NAME,
      });
    },
    [buildOptimisticAttachmentMessage, emitAttachmentMessage, selectedChat, socket]
  );

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
    const agentThreadId = getAgentDedicatedThreadId(agent.agentId);
    const activeThreadId = getDedicatedAgentThreadId(
      chatType === 'group' ? currentGroupData : selectedChat,
      chatType === 'group'
    );

    if (agentThreadId && agentThreadId !== activeThreadId && onOpenAgentThread) {
      void onOpenAgentThread(agentThreadId);
      return;
    }

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

  useEffect(() => {
    const command = initialComposerSeed?.command;
    if (selectedChatKey === 'none' || !command) return;

    setNewMessage(command);
    focusComposer();
    onComposerSeedConsumed?.();
  }, [
    focusComposer,
    initialComposerSeed?.command,
    initialComposerSeed?.nonce,
    onComposerSeedConsumed,
    selectedChatKey,
  ]);

  const handleAstroConsolePositionClick = useCallback(
    (selection: AstroConsolePositionSelection) => {
      if (!selectedChat || !shouldLoadAstroConsoleData) return;

      const sourceMessageId = `sidebar-${Date.now()}`;
      const positionMessage = buildLocalPositionResponseMessage({
        selection,
        consoleData: astroConsoleData,
        groupId: isGroup ? selectedChat._id : null,
        sourceMessageId,
      });

      forceScrollToBottomRef.current = true;
      isPinnedToBottomRef.current = true;
      setMessages((prev) => dedupeMessages([...prev, positionMessage]));
    },
    [astroConsoleData, isGroup, selectedChat, shouldLoadAstroConsoleData]
  );

  const handleOpenGoldmanWalletTransfer = useCallback(async () => {
    if (!selectedChat || !shouldLoadAstroConsoleData) return;

    let vault: GoldmanStrategyVault | null = null;
    try {
      vault = await ensureGoldmanStrategyVault();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not activate Goldman Sacks vault.'
      );
      return;
    }

    const fundingAddress = getGoldmanFundingAddress(vault);
    if (!fundingAddress?.address) {
      toast.error('Goldman Sacks vault is not ready yet.');
      return;
    }

    const draftMessage = buildSyntheticWalletSendDraftPromptMessage(
      {
        token: 'USDC',
        amount: '',
        amountType: 'token',
        recipient: fundingAddress.address,
        chain: normalizeWalletSendChainValue(fundingAddress.network),
      },
      `goldman-transfer-${Date.now()}`,
      {
        agentId: 'goldman-sacks',
        provider: 'elizaos',
        displayName: 'Goldman Sacks',
        avatarUrl: null,
      },
      'Fund Goldman Sacks. Pick a token and amount; the destination is prefilled.'
    );

    forceScrollToBottomRef.current = true;
    isPinnedToBottomRef.current = true;
    setMessages((prev) => dedupeMessages([...prev, draftMessage]));
    toast.success('Goldman Sacks send card ready.');
  }, [
    ensureGoldmanStrategyVault,
    selectedChat,
    shouldLoadAstroConsoleData,
  ]);

  const handleComposerCommandButton = useCallback(() => {
    setNewMessage((prev) => (prev.trim() ? prev : '/'));
    focusComposer();
  }, [focusComposer]);

  const handleComposerTip = useCallback(() => {
    applyComposerCommand('/send ');
  }, [applyComposerCommand]);

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

      if (provider === 'strategy') {
        toast.success('Strategy approved. Opening Goldman Sacks funding card.');
        void handleOpenGoldmanWalletTransfer();
        return;
      }

      if (route === '/products/create' && provider === 'marketplace') {
        toast.success('Opening Products to review the marketplace item.');
        router.push('/products/create?agentAction=approved');
      }
    },
    [handleOpenGoldmanWalletTransfer, router]
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

        const prepareFreshWalletSendProposal = async () => {
          if (!selectedChat || !isGroup) {
            throw new Error('Open this send action from the Astro group chat.');
          }

          setAgentStatusText('Preparing send ticket');
          const prepareResponse: any = await invokeGroupAgent({
            groupId: selectedChat._id,
            agentId: 'astro',
            message: buildWalletSendPromptFromApprovalParams(approvalParams),
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
              'Astro did not return a send approval ticket. Try sending the transfer again.'
            );
          }
        };

        if (isLocalHyperliquidCloseProposalId(proposalId)) {
          const localApprovalResult =
            buildLocalHyperliquidCloseApprovalHandoff(
              proposalId,
              approvalParams
            );
          setActionResultsByProposalId((prev) => ({
            ...prev,
            [proposalId]: {
              proposalId,
              status: 'approved',
              result: localApprovalResult,
            },
          }));
          return localApprovalResult;
        }

        if (isLocalHyperliquidProposalId(proposalId)) {
          approvalProposalId = await prepareFreshHyperliquidProposal();
        }

        if (isLocalWalletSendProposalId(proposalId)) {
          if (isGroup) {
            approvalProposalId = await prepareFreshWalletSendProposal();
          } else {
            const localApprovalResult = buildLocalWalletSendApprovalHandoff(
              proposalId,
              approvalParams
            );
            setActionResultsByProposalId((prev) => ({
              ...prev,
              [proposalId]: {
                proposalId,
                status: 'approved',
                result: localApprovalResult,
              },
            }));
            return localApprovalResult;
          }
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
          } else if (
            !isLocalWalletSendProposalId(proposalId) &&
            isGroup &&
            isRecoverableHyperliquidProposalError(error) &&
            hasWalletSendApprovalParams(approvalParams)
          ) {
            approvalProposalId = await prepareFreshWalletSendProposal();
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

      if (isLocalSwapProposalId(proposalId)) {
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

  const handleUpdateGoldmanAccessStation = useCallback(
    async (accessStation: GoldmanAccessStationInput) => {
      const groupId = activeChatData?._id;
      if (!groupId) {
        throw new Error('Select the Goldman Sacks group before saving access.');
      }

      const agent = await updateGroupAgentAccessStation({
        groupId,
        agentId: 'goldman-sacks',
        accessStation,
      });
      upsertGroupAgent(agent);
      onChatUpdate?.();
    },
    [
      activeChatData,
      onChatUpdate,
      updateGroupAgentAccessStation,
      upsertGroupAgent,
    ]
  );

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

  // Prefer fresh group metadata only when it belongs to the selected thread.
  const displayChat = activeChatData;
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
  const hasDisplayedAstroAgent = activeGroupAgents.some(isActiveAstroAgent);
  const isSecureAstroDesk =
    isAstroTradingDeskChat(displayChat, isGroup);
  const isGoldmanSacksDesk = isGoldmanSacksChat(displayChat, isGroup);
  const currentAgentThreadId = getDedicatedAgentThreadId(displayChat, isGroup);
  const contextPanelMode = isSecureAstroDesk || hasDisplayedAstroAgent
    ? 'astro'
    : isGoldmanSacksDesk
    ? 'goldman'
    : isGroup
    ? 'group'
    : 'contact';
  const applyContextPanelCommand = (commandSeed: string) => {
    const shouldMentionAstro =
      isGroup &&
      contextPanelMode === 'astro' &&
      !isSecureAstroDesk &&
      !/(?:^|\s)@?astro\b/i.test(commandSeed);
    applyComposerCommand(
      shouldMentionAstro ? `@astro ${commandSeed.trimStart()}` : commandSeed
    );
  };
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
    <div className="flex min-w-0 flex-1 overflow-hidden bg-[#08090b] max-md:bg-[#f4f4f2]">
      <div className="flex min-w-0 flex-1 flex-col bg-[#08090b] max-md:bg-[#f4f4f2]">
        <div className="flex h-[80px] flex-shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] bg-[#0b0d10] px-5 max-md:h-[64px] max-md:border-[#e6e5df] max-md:bg-[#f4f4f2] max-md:px-3 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            {onBackToList && (
              <button
                type="button"
                aria-label="Back to messages"
                onClick={onBackToList}
                className="dm-btn -ml-1 grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] border border-transparent bg-transparent text-[#0a0a0c] md:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
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
                    className="min-w-0 truncate text-left text-[19px] font-semibold leading-none text-[#eceef2] hover:text-[#3fe08f] max-md:text-[15.5px] max-md:text-[#0a0a0c]"
                    title="Open SmartSite"
                  >
                    {headerTitle}
                  </a>
                ) : (
                  <h3 className="min-w-0 truncate text-left text-[19px] font-semibold leading-none text-[#eceef2] max-md:text-[15.5px] max-md:text-[#0a0a0c]">
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
                  className="dm-mono mt-2 block max-w-full truncate text-left text-[12px] font-semibold text-[#5a5e69] hover:text-[#3fe08f] max-md:mt-1 max-md:text-[10.5px] max-md:text-[#77746f]"
                  title="Open SmartSite"
                >
                  {headerSubtitle}
                </a>
              ) : (
                <p className="dm-mono mt-2 truncate text-[12px] font-semibold text-[#5a5e69] max-md:mt-1 max-md:text-[10.5px] max-md:text-[#77746f]">
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
                  onGroupUpdate={(updatedGroup?: any) => {
                    if (updatedGroup) {
                      // Merge the fresh group data from the socket ack;
                      // system messages arrive via group room events
                      setCurrentGroupData((prev) =>
                        prev
                          ? {
                              ...prev,
                              name: updatedGroup.name ?? prev.name,
                              description:
                                updatedGroup.description ??
                                prev.description,
                              participants:
                                updatedGroup.participants ??
                                prev.participants,
                              botUsers:
                                updatedGroup.botUsers ?? prev.botUsers,
                              settings:
                                updatedGroup.settings ?? prev.settings,
                            }
                          : updatedGroup
                      );
                    }
                    onChatUpdate?.();
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
                className="dm-btn hidden h-11 w-11 place-items-center rounded-[13px] border border-white/[0.07] bg-[#101217] text-[#9396a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:grid"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            )}
            <button
              type="button"
              title="PnL command"
              onClick={() => applyComposerCommand('/pnl ')}
              className="dm-btn hidden h-11 w-11 place-items-center rounded-[13px] border border-white/[0.07] bg-[#101217] text-[#9396a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:grid"
            >
              <Clock3 className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              title="Chart command"
              onClick={() => applyComposerCommand('/chart ')}
              className="dm-btn hidden h-11 w-11 place-items-center rounded-[13px] border border-white/[0.07] bg-[#101217] text-[#9396a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:grid"
            >
              <BarChart3 className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              title="Internet search command"
              onClick={() => applyComposerCommand('/search ')}
              className="dm-btn hidden h-11 w-11 place-items-center rounded-[13px] border border-white/[0.07] bg-[#101217] text-[#9396a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:grid"
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
            onOpenAgentThread={onOpenAgentThread}
            onMentionAgent={handleMentionAgent}
            onRemoveAgent={handleRemoveAgent}
            currentAgentThreadId={currentAgentThreadId}
          />
        )}

        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="dm-scroll min-h-0 flex-1 overflow-y-auto px-[22px] py-[14px] max-md:bg-[#f4f4f2] max-md:px-3 max-md:py-3"
        >
          <div
            ref={messagesContentRef}
            className="mx-auto max-w-[760px] space-y-2 max-md:max-w-none"
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
              if (shouldHideWalletSwapClarification(messages, index)) {
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
              const renderedMessage = toAstroDeskDisplayMessage(
                message,
                currentUser,
                isSecureAstroDesk
              );
              const renderedMessageText = renderedMessage.message || '';
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
                normalizePolymarketOrderSourceText(renderedMessageText);
              const normalizedFundingSource =
                normalizeFundingOnrampSourceText(renderedMessageText);
              const hasAstroMention = /(?:^|\s)@?astro\b/i.test(
                message.message || ''
              );
              const walletNetworkReply = isOwnOrLocalText
                ? parseWalletSendNetworkReply(renderedMessageText)
                : '';
              const canRenderLocalWalletSendCards = !isGroup;
              const pendingWalletSendNetworkIntent =
                canRenderLocalWalletSendCards &&
                walletNetworkReply &&
                message.messageType === 'text'
                  ? findPendingWalletSendNetworkIntent(messages, index)
                  : null;
              const canRenderLocalWalletSend =
                canRenderLocalWalletSendCards &&
                typeof renderedMessageText === 'string' &&
                isOwnOrLocalText &&
                !isAgentMessage &&
                renderedMessageText.trim().length > 0 &&
                message.messageType === 'text' &&
                hasWalletSendIntent(renderedMessageText) &&
                !renderedSyntheticOrderSourceTexts.has(normalizedOrderSource);
              const rawLocalWalletSendIntent = canRenderLocalWalletSend
                ? findWalletSendIntent(renderedMessageText)
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
                  walletFundingTokens
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
              const localWalletSendDraftMessage =
                canRenderLocalWalletSendCards &&
                typeof renderedMessageText === 'string' &&
                isOwnOrLocalText &&
                !isAgentMessage &&
                renderedMessageText.trim().length > 0 &&
                message.messageType === 'text' &&
                isChatWalletSendCommand(renderedMessageText) &&
                !rawLocalWalletSendIntent &&
                !localWalletSendNetworkPromptMessage &&
                !localWalletSendMessage
                  ? buildSyntheticWalletSendDraftPromptMessage(
                      parseChatWalletSendDraft(renderedMessageText),
                      message._id || `message-${index}`
                    )
                  : null;
              const canRenderLocalSwap =
                typeof renderedMessageText === 'string' &&
                isOwnOrLocalText &&
                !isAgentMessage &&
                renderedMessageText.trim().length > 0 &&
                message.messageType === 'text' &&
                hasChatSwapIntent(renderedMessageText) &&
                (!isGroup || hasAstroMention || isSecureAstroDesk) &&
                !localWalletSendNetworkPromptMessage &&
                !localWalletSendMessage &&
                !localWalletSendDraftMessage;
              const localSwapIntent = canRenderLocalSwap
                ? findChatSwapIntent(renderedMessageText)
                : null;
              const localSwapMessage =
                localSwapIntent &&
                !hasMatchingWalletSwapProposal(
                  messages,
                  message,
                  localSwapIntent
                )
                  ? buildSyntheticSwapMessage(
                      localSwapIntent,
                      message._id || `message-${index}`
                    )
                  : null;
              if (localSwapMessage) {
                renderedSyntheticOrderSourceTexts.add(normalizedOrderSource);
              }
              const localSwapProposalId = localSwapMessage
                ? getMessageProposalId(localSwapMessage)
                : null;
              const autoFetchSwapQuote = !hasLaterMeaningfulChatMessage(
                messages,
                index
              );
              const canRenderLocalFundingOnramp =
                typeof renderedMessageText === 'string' &&
                isOwnOrLocalText &&
                !isAgentMessage &&
                renderedMessageText.trim().length > 0 &&
                message.messageType === 'text' &&
                (!isGroup || hasAstroMention || isSecureAstroDesk) &&
                !localWalletSendNetworkPromptMessage &&
                !localWalletSendMessage &&
                !localWalletSendDraftMessage &&
                !localSwapMessage &&
                !renderedSyntheticFundingSourceTexts.has(normalizedFundingSource);
              const localFundingOnrampIntent = canRenderLocalFundingOnramp
                ? findFundingOnrampIntent(renderedMessageText)
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
                typeof renderedMessageText === 'string' &&
                isOwnOrLocalText &&
                !isAgentMessage &&
                renderedMessageText.trim().length > 0 &&
                message.messageType === 'text' &&
                (!isGroup || hasAstroMention || isSecureAstroDesk) &&
                !localWalletSendNetworkPromptMessage &&
                !localWalletSendMessage &&
                !localWalletSendDraftMessage &&
                !localSwapMessage &&
                !renderedSyntheticOrderSourceTexts.has(normalizedOrderSource);
              const hyperliquidPositionReplyCoin = isOwnOrLocalText
                ? parseHyperliquidCoin(renderedMessageText)
                : '';
              const pendingHyperliquidPositionIntent =
                hyperliquidPositionReplyCoin && message.messageType === 'text'
                  ? findPendingHyperliquidPositionTpSlIntent(messages, index)
                  : null;
              const rawLocalHyperliquidPositionIntent =
                canRenderLocalHyperliquidOrder &&
                hasHyperliquidOrderIntent(renderedMessageText)
                  ? findHyperliquidPositionTpSlIntent(renderedMessageText)
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
                hasHyperliquidOrderIntent(renderedMessageText)
                  ? findHyperliquidOrderIntent(renderedMessageText)
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
                typeof renderedMessageText === 'string' &&
                isOwnOrLocalText &&
                !isAgentMessage &&
                renderedMessageText.trim().length > 0 &&
                message.messageType === 'text' &&
                hasPolymarketWriteIntent(renderedMessageText) &&
                (!isGroup || hasAstroMention || isSecureAstroDesk) &&
                !localWalletSendMessage &&
                !localWalletSendDraftMessage &&
                !localSwapMessage &&
                !localHyperliquidPositionPromptMessage &&
                !localHyperliquidOrderMessage &&
                !renderedSyntheticOrderSourceTexts.has(normalizedOrderSource);
              const localPolymarketOrderIntent = canRenderLocalPolymarketOrder
                ? findPolymarketOrderIntent(
                    renderedMessageText,
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
              const localChartIntent =
                typeof renderedMessageText === 'string' &&
                message.messageType === 'text' &&
                !isAgentMessage &&
                isChartCommand(renderedMessageText)
                  ? parseChartCommand(
                      renderedMessageText,
                      astroConsoleData.perpsMarkets || []
                    )
                  : null;
              const localCoinGeckoChartIntent =
                typeof renderedMessageText === 'string' &&
                message.messageType === 'text' &&
                !isAgentMessage &&
                !isChartCommand(renderedMessageText)
                  ? parseCoinGeckoChartIntent(renderedMessageText)
                  : null;
              const canRenderLocalConsoleReadCard =
                shouldLoadAstroConsoleData &&
                isOwn &&
                !isAgentMessage &&
                message.messageType === 'text' &&
                renderedMessageText.trim().length > 0 &&
                (!isGroup || hasAstroMention || isSecureAstroDesk);
              const localConsoleReadMessage =
                canRenderLocalConsoleReadCard &&
                isPnlCommand(renderedMessageText) &&
                !hasFollowingAgentActionMessage(
                  messages,
                  index,
                  'portfolio.pnl'
                )
                  ? buildLocalPnlResponseMessage({
                      consoleData: astroConsoleData,
                      groupId: isGroup ? selectedChat?._id : null,
                      sourceMessageId: message._id || `message-${index}`,
                    })
                  : canRenderLocalConsoleReadCard &&
                    isPortfolioCommand(renderedMessageText) &&
                    !hasFollowingAgentActionMessage(
                      messages,
                      index,
                      'wallet.portfolio'
                    )
                  ? buildLocalPortfolioResponseMessage({
                      consoleData: astroConsoleData,
                      groupId: isGroup ? selectedChat?._id : null,
                      sourceMessageId: message._id || `message-${index}`,
                    })
                  : null;

              return (
                <Fragment key={message._id || index}>
                  <Message
                    message={renderedMessage}
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
                    autoFetchSwapQuote={autoFetchSwapQuote}
                  />
                  {localConsoleReadMessage && (
                    <Message
                      message={localConsoleReadMessage}
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
                      autoFetchSwapQuote={autoFetchSwapQuote}
                    />
                  )}
                  {localChartIntent && (
                    <ChatChartCommandCard
                      intent={localChartIntent}
                      markets={astroConsoleData.perpsMarkets || []}
                    />
                  )}
                  {localCoinGeckoChartIntent && (
                    <CryptoChartCard intent={localCoinGeckoChartIntent} />
                  )}
                  {localWalletSendDraftMessage && (
                    <Message
                      message={localWalletSendDraftMessage}
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
                      autoFetchSwapQuote={autoFetchSwapQuote}
                    />
                  )}
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
                  {localSwapMessage && (
                    <Message
                      message={localSwapMessage}
                      isOwn={false}
                      isGroup={isGroup}
                      currentUser={currentUser}
                      proposal={proposalFromMessage(localSwapMessage)}
                      proposalSourceText={renderedMessageText}
                      actionResult={
                        localSwapProposalId
                          ? actionResultsByProposalId[localSwapProposalId]
                          : undefined
                      }
                      isProposalPending={
                        Boolean(localSwapProposalId) &&
                        pendingProposalId === localSwapProposalId
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

        <div className="flex-shrink-0 border-t border-white/[0.07] bg-[#0b0d10] px-[22px] pb-[18px] pt-[12px] max-md:border-[#e6e5df] max-md:bg-[#f4f4f2] max-md:px-3 max-md:pb-[calc(16px+env(safe-area-inset-bottom))]">
          <div className="relative mx-auto max-w-[980px]">
            <div className="dm-mono mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-bold text-[#5a5e69] max-md:hidden">
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
              <button
                type="button"
                onClick={() => applyComposerCommand('/chart ')}
                className="dm-btn inline-flex items-center gap-2"
              >
                <span className="text-[#3fe08f]">/chart</span>
                <span>market</span>
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

            <div className="relative flex min-h-[64px] items-center gap-3 rounded-[18px] border border-white/[0.06] bg-black px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)] focus-within:border-[#3fe08f]/45 focus-within:shadow-[0_0_0_1px_rgba(63,224,143,0.16),0_18px_50px_rgba(0,0,0,0.28)] max-md:min-h-[52px] max-md:rounded-[18px] max-md:border-[#e6e5df] max-md:bg-white max-md:px-2.5 max-md:py-2 max-md:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
              <ChatAttachmentMenu
                disabled={!selectedChat}
                onSendFiles={handleSendAttachments}
                onSendGif={handleSendGif}
                onTip={handleComposerTip}
              />

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
                placeholder="ask anything - try /search, /chart, /send, /swap, /portfolio"
                className="dm-mono max-h-28 min-h-[30px] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent pt-[3px] text-[15px] font-semibold leading-[1.65] text-[#eceef2] outline-none placeholder:text-[#4d515b] max-md:text-[#0a0a0c] max-md:placeholder:text-[#77746f]"
              />

              <button
                type="button"
                onClick={() =>
                  newMessage.trim()
                    ? handleSendMessage()
                    : handleComposerCommandButton()
                }
                className="dm-btn dm-mono inline-flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-[12px] border border-white/[0.07] bg-[#050607] px-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#9396a0] hover:text-[#eceef2] max-md:h-9 max-md:rounded-full max-md:border-[#3fe08f] max-md:bg-[#3fe08f] max-md:px-3 max-md:text-[#031008]"
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
        key={`${displayChat?._id || 'empty'}-${contextPanelMode}`}
        mode={contextPanelMode}
        displayChat={displayChat}
        activeAgents={activeGroupAgents}
        consoleData={astroConsoleData}
        smartsiteHref={smartsiteHref}
        showOnTablet={isThreadListCollapsed}
        onSmartsiteClick={handleSmartsiteClick}
        onQuickCommand={applyContextPanelCommand}
        onUpdateGoldmanAccessStation={handleUpdateGoldmanAccessStation}
        goldmanStrategyVault={goldmanStrategyVault}
        isGoldmanStrategyVaultLoading={isGoldmanStrategyVaultLoading}
        isActivatingGoldmanVault={isActivatingGoldmanVault}
        goldmanStrategyVaultError={goldmanStrategyVaultError}
        onEnsureGoldmanStrategyVault={ensureGoldmanStrategyVault}
        onOpenGoldmanWalletTransfer={handleOpenGoldmanWalletTransfer}
        onSaveGoldmanStrategyFile={handleSaveGoldmanStrategyFile}
        activeGoldmanStrategy={activeGoldmanStrategy}
        isGoldmanStrategyRunning={isGoldmanStrategyRunning}
        isTogglingGoldmanStrategy={isTogglingGoldmanStrategy}
        onRunGoldmanStrategy={handleRunGoldmanStrategy}
        onStopGoldmanStrategy={handleStopGoldmanStrategy}
        onPositionClick={handleAstroConsolePositionClick}
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
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#08090b] bg-[#3ddc97] max-md:border-[#f4f4f2]" />
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
                className="absolute grid h-[23px] w-[23px] place-items-center rounded-full border-2 border-[#08090b] text-[9px] font-bold text-[#eceef2] max-md:border-[#f4f4f2]"
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
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#08090b] bg-[#3ddc97] max-md:border-[#f4f4f2]" />
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

function stripLeadingAstroMention(text: string) {
  return text.trim().replace(/^@?astro\b[\s,:-]*/i, '').trim();
}

function isPnlCommand(text: string) {
  const commandText = stripLeadingAstroMention(text).toLowerCase();
  return (
    /^\/pnl(?:\s|$)/i.test(commandText) ||
    /^(?:show|check|review|get|open|pull up|what'?s|what is|how is)?\s*(?:me\s+)?(?:my\s+)?(?:pnl|p&l|profit\s+and\s+loss|performance)(?:\s|$)/i.test(
      commandText
    )
  );
}

function normalizeAstroSlashCommand(text: string) {
  return stripLeadingAstroMention(text).replace(/^\/\s+/, '/').trim();
}

function isPortfolioCommand(text: string) {
  const commandText = normalizeAstroSlashCommand(text).toLowerCase();
  return (
    /^\/portfolio(?:\s|$)/i.test(commandText) ||
    /^(?:show|check|review|get|open|pull up|what'?s|what is)?\s*(?:me\s+)?(?:my\s+)?(?:wallet\s+)?(?:portfolio|token allocation|wallet allocation|holdings)(?:\s|$)/i.test(
      commandText
    )
  );
}

function isChartCommand(text: string) {
  return /^\/chart(?:\s|$)/i.test(stripLeadingAstroMention(text));
}

function normalizeChartRangeToken(value: string): ChartTimeRange | '' {
  const token = value.trim().toLowerCase();
  const rangeMap: Record<string, ChartTimeRange> = {
    '1d': '1D',
    d: '1D',
    day: '1D',
    today: '1D',
    '1day': '1D',
    '1w': '1W',
    w: '1W',
    week: '1W',
    '1week': '1W',
    '1m': '1M',
    '1mo': '1M',
    mo: '1M',
    month: '1M',
    '1month': '1M',
    '1y': '1Y',
    y: '1Y',
    year: '1Y',
    '1year': '1Y',
    all: 'ALL',
    max: 'ALL',
  };
  return rangeMap[token] || '';
}

function isLegacyChartIntervalToken(value: string) {
  return /^(?:3m|5m|15m|30m|1h|2h|4h|8h|12h|1w|1M)$/i.test(
    value.trim()
  );
}

function parseChartCommand(text: string, markets: HLMarket[] = []): ChartCommandIntent | null {
  const commandText = stripLeadingAstroMention(text);
  if (!/^\/chart(?:\s|$)/i.test(commandText)) return null;

  const rawQuery = commandText.replace(/^\/chart\b/i, '').trim();
  if (!rawQuery) {
    return {
      query: '',
      coin: null,
      displayCoin: '',
      range: '1D',
      empty: true,
    };
  }

  const parts = rawQuery.split(/\s+/).filter(Boolean);
  let range: ChartTimeRange = '1D';
  const queryParts = parts.filter((part) => {
    const normalizedRange = normalizeChartRangeToken(part);
    if (normalizedRange) {
      range = normalizedRange;
      return false;
    }
    if (isLegacyChartIntervalToken(part)) return false;
    return true;
  });
  const query = queryParts.join(' ').replace(/\b(?:chart|candles?)\b/gi, ' ').trim();
  const resolved = resolveChartCommandMarket(query, markets);

  if (!resolved.coin) {
    return {
      query: query || rawQuery,
      coin: null,
      displayCoin: query || rawQuery,
      range,
      unsupported: true,
    };
  }

  return {
    query,
    coin: resolved.coin,
    displayCoin: resolved.displayCoin,
    range,
    market: resolved.market,
  };
}

function resolveChartCommandMarket(query: string, markets: HLMarket[] = []) {
  const cleanedQuery = normalizePerpsMarketQuery(query.replace(/[$]/g, ' '));
  const parsedCoin = parseHyperliquidCoin(cleanedQuery);
  const candidates = [
    cleanedQuery,
    parsedCoin,
    ...perpsAliasTargets(cleanedQuery),
    ...cleanedQuery.split(/\s+/),
  ]
    .map((candidate) => candidate.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const market = perpsMarketForCoin(markets, candidate);
    if (market) {
      return {
        coin: market.coin,
        displayCoin: market.displayCoin || displayPerpsCoin(market.coin),
        market,
      };
    }
  }

  const fallbackCoin = candidates.find((candidate) =>
    HYPERLIQUID_TICKET_COINS.some((coin) => perpsCoinMatches(coin, candidate))
  );
  if (fallbackCoin) {
    const fallbackAlias = perpsAliasTargets(fallbackCoin)[0];
    const coin = fallbackAlias || (fallbackCoin.includes(':') ? fallbackCoin : fallbackCoin.toUpperCase());
    const displayCoin = displayPerpsCoin(coin);
    return {
      coin,
      displayCoin,
      market: null,
    };
  }

  return { coin: '', displayCoin: '', market: null };
}

function buildPnlOverview(consoleData: AstroConsoleData): PnlOverviewPreview {
  const openPredictionPositions = (consoleData.predictionPositions || []).filter(
    isOpenPredictionConsolePosition
  );
  const predictionPositionsValue = openPredictionPositions.reduce(
    (sum, position) => sum + toFiniteNumber(position.currentValue),
    0
  );
  const predictionUnrealizedPnl = openPredictionPositions.reduce(
    (sum, position) => sum + toFiniteNumber(position.cashPnl),
    0
  );

  return {
    walletPortfolioValue: toFiniteNumber(consoleData.walletPortfolioBalance),
    perpsAccountValue: toFiniteNumber(consoleData.perpsAccount?.accountValue),
    perpsUnrealizedPnl: toFiniteNumber(consoleData.perpsAccount?.unrealizedPnl),
    perpsPositionCount: consoleData.perpsAccount?.positions?.length || 0,
    predictionPortfolioValue:
      toFiniteNumber(consoleData.predictionPortfolioUsdcBalance) +
      toFiniteNumber(consoleData.predictionLegacyUsdcBalance) +
      predictionPositionsValue,
    predictionUnrealizedPnl,
    predictionPositionCount: openPredictionPositions.length,
    pendingOrderCount:
      (consoleData.perpsAccount?.openOrders?.length || 0) +
      (consoleData.predictionOpenOrders?.length || 0),
    isLoading:
      consoleData.isWalletPortfolioBalanceLoading ||
      consoleData.isPredictionBalanceLoading ||
      consoleData.isPerpsLoading,
    checkedAt: new Date().toISOString(),
  };
}

function buildPnlPerpsPreview(
  perpsAccount?: PerpsAccountSummary,
  markets: HLMarket[] = []
): HyperliquidPositionsPreview {
  return {
    accountValue: perpsAccount?.accountValue || '0',
    withdrawable: perpsAccount?.withdrawable || '0',
    positions: (perpsAccount?.positions || []).map((position) =>
      buildPerpsPositionPreview(position, markets)
    ),
  };
}

function buildPerpsPositionPreview(
  position: HLPosition,
  markets: HLMarket[] = []
): HyperliquidPositionPreview {
  const market = hyperliquidMarketForPosition(markets, position);
  const markPrice = getPerpsMarkPrice(position.coin, market);

  return {
    coin: position.coin,
    dex: getHyperliquidPositionDex(position) || undefined,
    dexName: market?.dexName,
    assetIndex: market?.index,
    displayCoin: displayPerpsCoin(position.coin),
    side: toFiniteNumber(position.szi) < 0 ? 'short' : 'long',
    szi: position.szi,
    entryPx: position.entryPx,
    markPx: markPrice > 0 ? String(markPrice) : null,
    unrealizedPnl: position.unrealizedPnl,
    returnOnEquity: position.returnOnEquity,
    liquidationPx: position.liquidationPx,
    marginUsed: position.marginUsed,
    positionValue: position.positionValue,
    leverage: position.leverage,
  };
}

function buildLocalPnlResponseMessage({
  consoleData,
  groupId,
  sourceMessageId,
}: {
  consoleData: AstroConsoleData;
  groupId?: string | null;
  sourceMessageId: string;
}): Message {
  const pnlOverview = buildPnlOverview(consoleData);
  const tradingPnl =
    pnlOverview.perpsUnrealizedPnl + pnlOverview.predictionUnrealizedPnl;
  const openPredictionPositions = (consoleData.predictionPositions || []).filter(
    isOpenPredictionConsolePosition
  );

  return {
    _id: `temp-local-pnl-${sourceMessageId}`,
    message: `PnL snapshot ready: ${formatSignedUsd(tradingPnl)} across trading positions.`,
    groupId: groupId || null,
    messageType: 'agent_response',
    createdAt: pnlOverview.checkedAt,
    senderKind: 'agent',
    agentSender: {
      agentId: 'astro',
      provider: 'local',
      displayName: 'Astro',
      avatarUrl: null,
    },
    agentData: {
      invocationId: `local-pnl-${sourceMessageId}`,
      action: 'portfolio.pnl',
      metadata: {
        toolExecution: {
          provider: 'swop',
          action: 'portfolio.pnl',
          positions: openPredictionPositions,
          perpsPositions: buildPnlPerpsPreview(
            consoleData.perpsAccount,
            consoleData.perpsMarkets
          ),
          pnlOverview,
          checkedAt: pnlOverview.checkedAt,
          query: '/pnl',
        },
      },
    },
  };
}

function buildLocalPortfolioResponseMessage({
  consoleData,
  groupId,
  sourceMessageId,
}: {
  consoleData: AstroConsoleData;
  groupId?: string | null;
  sourceMessageId: string;
}): Message {
  const checkedAt = new Date().toISOString();

  return {
    _id: `temp-local-portfolio-${sourceMessageId}`,
    message: `Portfolio allocation ready: ${formatCompactUsd(
      consoleData.walletPortfolioBalance
    )} across ${consoleData.walletPortfolioTokens.length} tokens.`,
    groupId: groupId || null,
    messageType: 'agent_response',
    createdAt: checkedAt,
    senderKind: 'agent',
    agentSender: {
      agentId: 'astro',
      provider: 'local',
      displayName: 'Astro',
      avatarUrl: null,
    },
    agentData: {
      invocationId: `local-portfolio-${sourceMessageId}`,
      action: 'wallet.portfolio',
      toolType: 'wallet.read',
      metadata: {
        responseType: 'portfolio_snapshot',
        toolExecution: {
          provider: 'swop',
          action: 'wallet.portfolio',
          portfolioSnapshot: {
            checkedAt,
            query: '/portfolio',
            source: 'client_session',
          },
          checkedAt,
          query: '/portfolio',
        },
      },
    },
  };
}

function buildLocalPositionResponseMessage({
  selection,
  consoleData,
  groupId,
  sourceMessageId,
}: {
  selection: AstroConsolePositionSelection;
  consoleData: AstroConsoleData;
  groupId?: string | null;
  sourceMessageId: string;
}): Message {
  const checkedAt = new Date().toISOString();
  const isPerps = selection.kind === 'perps';
  const title = isPerps
    ? `${displayPerpsCoin(selection.position.coin)}-PERP`
    : selection.position.title || selection.position.slug || 'Prediction market';

  return {
    _id: `temp-local-position-card-${sourceMessageId}`,
    message: `Position snapshot ready for ${title}.`,
    groupId: groupId || null,
    messageType: 'agent_response',
    createdAt: checkedAt,
    senderKind: 'agent',
    agentSender: {
      agentId: 'astro',
      provider: 'local',
      displayName: 'Astro',
      avatarUrl: null,
    },
    agentData: {
      invocationId: `local-position-card-${sourceMessageId}`,
      action: isPerps ? 'perps.positions' : 'prediction.positions',
      metadata: {
        toolExecution: {
          provider: isPerps ? 'hyperliquid' : 'polymarket',
          action: isPerps ? 'perps.positions' : 'prediction.positions',
          ...(isPerps
            ? {
                perpsPositions: {
                  accountValue: consoleData.perpsAccount?.accountValue || '0',
                  withdrawable: consoleData.perpsAccount?.withdrawable || '0',
                  positions: [
                    buildPerpsPositionPreview(
                      selection.position,
                      consoleData.perpsMarkets
                    ),
                  ],
                },
              }
            : {
                positions: [selection.position],
              }),
          checkedAt,
          query: `sidebar-position:${selection.kind}:${sourceMessageId}`,
        },
      },
    },
  };
}

function toClientGeneratedAgentMessagePayload(message: Message) {
  return {
    clientMessageId: message._id,
    message: message.message,
    messageType: message.messageType,
    createdAt: message.createdAt,
    agentData: message.agentData,
  };
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

function formatUsdCents(value: unknown) {
  const number = Math.abs(toFiniteNumber(value));
  return `.${Math.round((number % 1) * 100)
    .toString()
    .padStart(2, '0')}`;
}

type AgentGroupError = {
  code?: string;
  message?: string;
  details?: {
    requiredSwop?: unknown;
    currentSwop?: unknown;
    deficitSwop?: unknown;
    buyMoreSwop?: unknown;
  };
};

function isSwopAccessError(error?: AgentGroupError | null) {
  return (
    error?.code === 'AGENT_SWOP_BALANCE_REQUIRED' ||
    error?.code === 'AGENT_SWOP_BALANCE_CHECK_TIMEOUT' ||
    error?.code === 'AGENT_SWOP_BALANCE_CHECK_FAILED' ||
    Boolean(error?.details?.buyMoreSwop)
  );
}

function swopAccessValue(value: unknown, fallback: string) {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function showSwopAccessToast(
  error: AgentGroupError,
  onOpenWallet: () => void
) {
  const requiredSwop = swopAccessValue(error.details?.requiredSwop, '1000');
  const currentSwop = swopAccessValue(error.details?.currentSwop, '0');
  const deficitSwop = swopAccessValue(error.details?.deficitSwop, requiredSwop);
  const needsMoreSwop =
    error.code === 'AGENT_SWOP_BALANCE_REQUIRED' ||
    Boolean(error.details?.buyMoreSwop);
  const title = needsMoreSwop ? 'Astro locked' : 'Balance check delayed';
  const summary = needsMoreSwop
    ? `Hold ${requiredSwop} SWOP to use the agent.`
    : error.message || 'We could not verify your SWOP balance yet.';

  toast.custom(
    (t) => (
      <div
        className={`w-[calc(100vw-32px)] max-w-[390px] overflow-hidden rounded-lg border border-[#3fe08f]/25 bg-[#08090b] text-[#f4f6f8] shadow-[0_20px_55px_rgba(0,0,0,0.32)] transition-all duration-200 ${
          t.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#3fe08f]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#3fe08f]">
                  {title}
                </p>
                <p className="mt-1 text-[14px] font-semibold leading-snug text-white">
                  {summary}
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => toast.dismiss(t.id)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#8e939e] transition hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-white/[0.08] bg-white/[0.035] p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8e939e]">
                  {needsMoreSwop ? 'Current' : 'Required'}
                </p>
                <p className="mt-1 font-mono text-[13px] font-semibold text-white">
                  {needsMoreSwop ? currentSwop : requiredSwop} SWOP
                </p>
              </div>
              <div className="rounded-md border border-[#ffcc66]/20 bg-[#ffcc66]/[0.08] p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b8a16a]">
                  {needsMoreSwop ? 'Needed' : 'Status'}
                </p>
                <p className="mt-1 font-mono text-[13px] font-semibold text-[#ffde8a]">
                  {needsMoreSwop ? `${deficitSwop} SWOP` : 'Retry'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-[#b3b7c0]">
              This notice is private to you. The group does not see your SWOP
              balance or access status.
            </p>
            {needsMoreSwop && (
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t.id);
                  onOpenWallet();
                }}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-[#3fe08f] px-3 text-[13px] font-semibold text-[#06110b] transition hover:bg-[#55efa2]"
              >
                <ShoppingBag className="h-4 w-4" />
                Open wallet
              </button>
            )}
          </div>
        </div>
      </div>
    ),
    {
      duration: 8000,
      position: 'top-right',
    }
  );
}

type GoldmanAccessKey =
  | 'perps'
  | 'predictions'
  | 'swaps'
  | 'sends'
  | 'aave'
  | 'vault'
  | 'balances'
  | 'strategy';

type GoldmanAccessControl = {
  enabled: boolean;
  approvalRequired: boolean;
};

type GoldmanAccessState = Record<GoldmanAccessKey, GoldmanAccessControl>;

type GoldmanLimitKey =
  | 'maxSendUsd'
  | 'dailyCapUsd'
  | 'maxLeverage'
  | 'predictionExposureUsd'
  | 'reserveUsd';

type GoldmanLimits = Record<GoldmanLimitKey, string>;

const DEFAULT_GOLDMAN_ACCESS: GoldmanAccessState = {
  perps: { enabled: false, approvalRequired: true },
  predictions: { enabled: false, approvalRequired: true },
  swaps: { enabled: false, approvalRequired: true },
  sends: { enabled: false, approvalRequired: true },
  aave: { enabled: false, approvalRequired: true },
  vault: { enabled: true, approvalRequired: true },
  balances: { enabled: true, approvalRequired: false },
  strategy: { enabled: true, approvalRequired: true },
};

const DEFAULT_GOLDMAN_LIMITS: GoldmanLimits = {
  maxSendUsd: '250',
  dailyCapUsd: '750',
  maxLeverage: '2',
  predictionExposureUsd: '500',
  reserveUsd: '100',
};

const GOLDMAN_ACCESS_ROWS: Array<{
  key: GoldmanAccessKey;
  label: string;
  shortLabel: string;
  detail: string;
  icon: typeof Activity;
  iconClassName: string;
}> = [
  {
    key: 'perps',
    label: 'Perps',
    shortLabel: 'perps',
    detail: 'Open, close, and manage leveraged positions',
    icon: Activity,
    iconClassName: 'bg-[#173329] text-[#3fe08f]',
  },
  {
    key: 'predictions',
    label: 'Predictions',
    shortLabel: 'predictions',
    detail: 'Buy and sell prediction market outcomes',
    icon: BarChart3,
    iconClassName: 'bg-[#18243f] text-[#6b9bff]',
  },
  {
    key: 'swaps',
    label: 'Swapping',
    shortLabel: 'swaps',
    detail: 'Route token swaps from connected wallets',
    icon: ArrowRightLeft,
    iconClassName: 'bg-[#2b2441] text-[#b893ff]',
  },
  {
    key: 'sends',
    label: 'Sending',
    shortLabel: 'sends',
    detail: 'Send tokens or stablecoins to recipients',
    icon: Send,
    iconClassName: 'bg-[#402525] text-[#ff8585]',
  },
  {
    key: 'aave',
    label: 'Aave',
    shortLabel: 'aave',
    detail: 'Supply, withdraw, borrow, and repay on Aave',
    icon: ShieldCheck,
    iconClassName: 'bg-[#14342f] text-[#68e0c8]',
  },
  {
    key: 'vault',
    label: 'Sack vault',
    shortLabel: 'vault',
    detail: 'Move money in or out of the Goldman sack',
    icon: Download,
    iconClassName: 'bg-[#3b3116] text-[#f4c95d]',
  },
  {
    key: 'balances',
    label: 'Balance reads',
    shortLabel: 'balances',
    detail: 'Inspect wallet, perps, and vault balances',
    icon: Radio,
    iconClassName: 'bg-[#14323a] text-[#67d9ff]',
  },
  {
    key: 'strategy',
    label: 'Strategy files',
    shortLabel: 'strategy',
    detail: 'Read, draft, and publish agent markdown',
    icon: FileText,
    iconClassName: 'bg-[#262b34] text-[#cfd6e6]',
  },
];

const GOLDMAN_WRITE_ACCESS_KEYS: GoldmanAccessKey[] = [
  'perps',
  'predictions',
  'swaps',
  'sends',
  'aave',
  'vault',
];

const GOLDMAN_LIMIT_ROWS: Array<{
  key: GoldmanLimitKey;
  label: string;
  prefix?: string;
  suffix?: string;
  min: string;
  step: string;
}> = [
  {
    key: 'maxSendUsd',
    label: 'Max send',
    prefix: '$',
    min: '0',
    step: '10',
  },
  {
    key: 'dailyCapUsd',
    label: 'Daily cap',
    prefix: '$',
    min: '0',
    step: '25',
  },
  {
    key: 'maxLeverage',
    label: 'Perps max',
    suffix: 'x',
    min: '1',
    step: '0.5',
  },
  {
    key: 'predictionExposureUsd',
    label: 'Prediction cap',
    prefix: '$',
    min: '0',
    step: '25',
  },
];

const GOLDMAN_STRATEGY_FILES = [
  {
    file: 'strategy.md',
    detail: 'active thesis',
    status: 'ACTIVE',
    command: '@goldman edit strategy.md ',
    defaultContent: [
      '# Strategy',
      '',
      'Describe the thesis Goldman should communicate and evaluate before using vault funds.',
      '',
      '## Objective',
      '- Target:',
      '- Venues:',
      '- Assets:',
      '',
      '## Entry Rules',
      '-',
      '',
      '## Exit Rules',
      '-',
    ].join('\n'),
  },
  {
    file: 'risk.md',
    detail: 'limits and stop rules',
    status: 'GATED',
    command: '@goldman edit risk.md ',
    defaultContent: [
      '# Risk Rules',
      '',
      'Define hard limits Goldman must respect before any autonomous action.',
      '',
      '## Caps',
      '- Max order:',
      '- Daily deployment cap:',
      '- Daily loss cap:',
      '- Reserve:',
      '',
      '## Stop Conditions',
      '-',
    ].join('\n'),
  },
  {
    file: 'execution-rules.md',
    detail: 'order and approval policy',
    status: 'DRAFT',
    command: '@goldman edit execution-rules.md ',
    defaultContent: [
      '# Execution Rules',
      '',
      'Explain when Goldman should propose, monitor, or execute.',
      '',
      '## Approval Policy',
      '-',
      '',
      '## Autonomous DeFi',
      '- Use Aave only when Aave access is enabled and approval is set to live.',
      '- Keep the configured vault reserve untouched.',
    ].join('\n'),
  },
  {
    file: 'allowed-markets.md',
    detail: 'market and token whitelist',
    status: 'DRAFT',
    command: '@goldman edit allowed-markets.md ',
    defaultContent: [
      '# Allowed Markets',
      '',
      'List the venues, tokens, and market types Goldman may consider.',
      '',
      '## Venues',
      '- Polymarket',
      '- Aave on Polygon',
      '',
      '## Assets',
      '- USDC',
    ].join('\n'),
  },
];

function hydrateGoldmanStrategyFiles(
  strategyFiles?: GoldmanStrategyFile[] | null
): GoldmanStrategyFile[] {
  return GOLDMAN_STRATEGY_FILES.map((spec) => {
    const saved = strategyFiles?.find((file) => file.file === spec.file);
    return {
      file: spec.file,
      detail: saved?.detail || spec.detail,
      status: saved?.status || spec.status,
      content:
        typeof saved?.content === 'string'
          ? saved.content
          : spec.defaultContent,
      updatedAt: saved?.updatedAt || null,
      updatedBy: saved?.updatedBy || null,
    };
  });
}

function buildGoldmanStrategyFilesPrompt(files: GoldmanStrategyFile[]) {
  const body = files
    .map(
      (file) =>
        `## ${file.file}\n\n${(file.content || '').trim() || '(empty)'}`
    )
    .join('\n\n');

  return [
    '@goldman publish these saved strategy markdown files for approval.',
    'Explain the strategy back to me, call out the autonomous DeFi permissions you need, then draft the approval card.',
    '',
    body,
  ].join('\n');
}

type GoldmanFundingMode = 'transfer' | 'qr';

type GoldmanStrategyRuntimeState =
  | 'idle'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';

type GoldmanStrategyRuntime = {
  state?: GoldmanStrategyRuntimeState;
  runId?: string | null;
  executionMode?: 'monitor' | 'proposal' | 'execute' | string;
  startedAt?: string | null;
  stoppedAt?: string | null;
  lastHeartbeatAt?: string | null;
  lastActivity?: string | null;
  lastError?: string | null;
  cycleCount?: number | null;
};

type GoldmanTradingStrategy = {
  id: string;
  title?: string | null;
  prompt?: string | null;
  venues?: string[];
  assets?: string[];
  status?: 'draft' | 'pending_authorization' | 'active' | 'paused' | 'revoked' | 'expired' | string;
  rules?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  runtime?: GoldmanStrategyRuntime;
  metadata?: Record<string, unknown>;
  lastEvaluatedAt?: string | null;
  lastExecutedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type GoldmanStrategyFile = {
  file: string;
  detail?: string | null;
  status?: string | null;
  content: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

type GoldmanStrategyVault = {
  id: string;
  userId?: string | null;
  groupId?: string | null;
  agentId: string;
  walletAddress: string;
  walletChain?: string | null;
  walletRole?: string | null;
  privyWalletId?: string | null;
  status?: string | null;
  network?: string | null;
  networkLabel?: string | null;
  chainType?: string | null;
  chainId?: number | null;
  assetHint?: string | null;
  warning?: string | null;
  source?: string | null;
  activatedAt?: string | null;
  limits?: Record<string, unknown>;
  strategyFiles?: GoldmanStrategyFile[];
  strategies?: GoldmanTradingStrategy[];
};

type GoldmanStrategyRuntimeCardPayload = {
  runId?: string | null;
  phase?: string | null;
  status?: string | null;
  title?: string | null;
  detail?: string | null;
  executionMode?: string | null;
  executionReady?: boolean | null;
  walletAddress?: string | null;
  strategy?: GoldmanTradingStrategy | null;
  checks?: Array<{ label?: string; status?: string; detail?: string }>;
  actions?: Array<{ label?: string; status?: string; detail?: string }>;
  markets?: PolymarketMarketPreview[];
  positions?: PolymarketPosition[];
  swaps?: Array<{
    fromToken?: string;
    toToken?: string;
    amount?: string;
    status?: string;
    detail?: string;
  }>;
  updatedAt?: string | null;
};

async function readGoldmanStrategyVault({
  groupId,
  accessToken,
  method = 'GET',
}: {
  groupId: string;
  accessToken: string;
  method?: 'GET' | 'POST';
}): Promise<GoldmanStrategyVault | null> {
  const response = await apiFetch(
    buildSwopApiUrl(
      `/api/v5/messages/groups/${encodeURIComponent(
        groupId
      )}/agents/goldman-sacks/strategy-vault`
    ),
    {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const body = await response.json().catch(() => null);
  if (response.status === 404 && method === 'GET') return null;
  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error?.message ||
        `Goldman strategy vault request failed (${response.status})`
    );
  }

  const vault = body?.data?.vault || null;
  if (!vault) return null;

  return {
    ...vault,
    strategies: Array.isArray(body?.data?.strategies)
      ? body.data.strategies
      : [],
  };
}

async function updateGoldmanStrategyRuntime({
  groupId,
  strategyId,
  accessToken,
  action,
}: {
  groupId: string;
  strategyId: string;
  accessToken: string;
  action: 'run' | 'stop';
}): Promise<{
  strategy?: GoldmanTradingStrategy;
  vault?: GoldmanStrategyVault;
}> {
  const response = await apiFetch(
    buildSwopApiUrl(
      `/api/v5/messages/groups/${encodeURIComponent(
        groupId
      )}/agents/goldman-sacks/strategies/${encodeURIComponent(
        strategyId
      )}/${action}`
    ),
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error?.message ||
        `Goldman strategy ${action} failed (${response.status})`
    );
  }

  return body?.data || {};
}

async function updateGoldmanStrategyFile({
  groupId,
  fileName,
  content,
  accessToken,
}: {
  groupId: string;
  fileName: string;
  content: string;
  accessToken: string;
}): Promise<{
  file?: GoldmanStrategyFile | null;
  vault?: GoldmanStrategyVault;
}> {
  const response = await apiFetch(
    buildSwopApiUrl(
      `/api/v5/messages/groups/${encodeURIComponent(
        groupId
      )}/agents/goldman-sacks/strategy-vault/files/${encodeURIComponent(
        fileName
      )}`
    ),
    {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ content }),
    }
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error?.message ||
        `Goldman strategy file save failed (${response.status})`
    );
  }

  return body?.data || {};
}

function goldmanVaultToFundingDetails(
  vault?: GoldmanStrategyVault | null
): WalletReceiveQrDetails | null {
  if (!vault?.walletAddress) return null;

  return {
    address: vault.walletAddress,
    network: vault.network || vault.walletChain || 'polygon',
    networkLabel: vault.networkLabel || 'Polygon / EVM',
    chainType: vault.chainType || 'evm',
    chainId: vault.chainId || 137,
    assetHint: vault.assetHint || 'USDC and supported EVM assets',
    warning: vault.warning || 'Use the same network you pick in the sending wallet.',
    source: vault.source || 'agent_strategy_vault',
  };
}

function getGoldmanFundingAddress(
  vault?: GoldmanStrategyVault | null
): WalletReceiveQrDetails | null {
  return goldmanVaultToFundingDetails(vault);
}

function sortGoldmanStrategies(strategies: GoldmanTradingStrategy[] = []) {
  const rank = (strategy: GoldmanTradingStrategy) => {
    if (strategy.runtime?.state === 'running') return 0;
    if (strategy.status === 'active') return 1;
    if (strategy.status === 'pending_authorization') return 2;
    if (strategy.status === 'paused') return 3;
    return 4;
  };

  return [...strategies].sort((left, right) => {
    const rankDiff = rank(left) - rank(right);
    if (rankDiff !== 0) return rankDiff;
    return (
      new Date(right.updatedAt || right.createdAt || 0).getTime() -
      new Date(left.updatedAt || left.createdAt || 0).getTime()
    );
  });
}

function getRunnableGoldmanStrategy(vault?: GoldmanStrategyVault | null) {
  return sortGoldmanStrategies(vault?.strategies || [])[0] || null;
}

function mergeGoldmanStrategyIntoVault(
  vault: GoldmanStrategyVault | null | undefined,
  strategy?: GoldmanTradingStrategy | null
): GoldmanStrategyVault | null {
  if (!vault || !strategy?.id) return vault || null;
  const existing = vault.strategies || [];
  const nextStrategies = existing.some((item) => item.id === strategy.id)
    ? existing.map((item) => (item.id === strategy.id ? { ...item, ...strategy } : item))
    : [strategy, ...existing];

  return {
    ...vault,
    strategies: sortGoldmanStrategies(nextStrategies),
  };
}

function buildGoldmanFundingQrValue(walletReceive: WalletReceiveQrDetails) {
  if (
    walletReceive.chainType === 'evm' &&
    walletReceive.chainId &&
    walletReceive.address
  ) {
    return `ethereum:${walletReceive.address}@${walletReceive.chainId}`;
  }

  return walletReceive.address;
}

type GoldmanMetricTone = 'positive' | 'negative' | 'neutral';

type GoldmanConsoleMetric = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: GoldmanMetricTone;
  icon: typeof Activity;
};

function goldmanMetricTone(value: number): GoldmanMetricTone {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function buildGoldmanConsoleMetrics(
  consoleData?: AstroConsoleData
): GoldmanConsoleMetric[] {
  const perpsPositions = consoleData?.perpsAccount?.positions || [];
  const perpsPnl = toFiniteNumber(consoleData?.perpsAccount?.unrealizedPnl);

  const openPredictionPositions = (consoleData?.predictionPositions || []).filter(
    isOpenPredictionConsolePosition
  );
  const predictionPnl = openPredictionPositions.reduce(
    (sum, position) => sum + toFiniteNumber(position.cashPnl),
    0
  );

  const aaveSupplies = consoleData?.aavePositions?.supplies || [];
  const aaveSuppliedUsd =
    toFiniteNumber(consoleData?.aavePositions?.account?.totalCollateralUsd) ||
    aaveSupplies.reduce(
      (sum, position) => sum + toFiniteNumber(position.usdValue),
      0
    );
  const annualizedAaveYieldUsd = aaveSupplies.reduce(
    (sum, position) =>
      sum +
      toFiniteNumber(position.usdValue) *
        Math.max(0, toFiniteNumber(position.supplyApy)),
    0
  );
  const aaveDetail = consoleData?.isAavePositionsLoading
    ? 'loading Aave'
    : `${formatCompactUsd(aaveSuppliedUsd)} supplied`;

  return [
    {
      key: 'swaps',
      label: 'Swaps',
      value: formatSignedUsd(0),
      detail: 'realized P/L pending',
      tone: 'neutral',
      icon: ArrowRightLeft,
    },
    {
      key: 'perps',
      label: 'Perps',
      value: formatSignedUsd(perpsPnl),
      detail: `${perpsPositions.length} open positions`,
      tone: goldmanMetricTone(perpsPnl),
      icon: Activity,
    },
    {
      key: 'predictions',
      label: 'Predictions',
      value: formatSignedUsd(predictionPnl),
      detail: `${openPredictionPositions.length} open markets`,
      tone: goldmanMetricTone(predictionPnl),
      icon: BarChart3,
    },
    {
      key: 'sends',
      label: 'Sends',
      value: formatSignedUsd(0),
      detail: 'net transfer P/L pending',
      tone: 'neutral',
      icon: Send,
    },
    {
      key: 'yield',
      label: 'Interest / yield',
      value: formatSignedUsd(annualizedAaveYieldUsd),
      detail: aaveDetail,
      tone: goldmanMetricTone(annualizedAaveYieldUsd),
      icon: ShieldCheck,
    },
  ];
}

function normalizeStoredGoldmanAccess(
  stored?: Partial<Record<GoldmanAccessKey, Partial<GoldmanAccessControl>>>
): GoldmanAccessState {
  return (Object.keys(DEFAULT_GOLDMAN_ACCESS) as GoldmanAccessKey[]).reduce(
    (next, key) => {
      const storedControl = stored?.[key];
      const defaultControl = DEFAULT_GOLDMAN_ACCESS[key];
      next[key] = {
        enabled:
          typeof storedControl?.enabled === 'boolean'
            ? storedControl.enabled
            : defaultControl.enabled,
        approvalRequired:
          typeof storedControl?.approvalRequired === 'boolean'
            ? storedControl.approvalRequired
            : defaultControl.approvalRequired,
      };
      return next;
    },
    {} as GoldmanAccessState
  );
}

function normalizeStoredGoldmanLimits(
  stored?: Partial<Record<GoldmanLimitKey, string | number>>
): GoldmanLimits {
  return (Object.keys(DEFAULT_GOLDMAN_LIMITS) as GoldmanLimitKey[]).reduce(
    (next, key) => {
      const value = stored?.[key];
      next[key] =
        typeof value === 'string' || typeof value === 'number'
          ? String(value) || DEFAULT_GOLDMAN_LIMITS[key]
          : DEFAULT_GOLDMAN_LIMITS[key];
      return next;
    },
    {} as GoldmanLimits
  );
}

type GoldmanAccessStationInput = {
  version?: string;
  access?: Partial<Record<GoldmanAccessKey, Partial<GoldmanAccessControl>>>;
  limits?: Partial<Record<GoldmanLimitKey, string | number>>;
};

function normalizeGoldmanAccessStationState(
  station?: GoldmanAccessStationInput | null
): {
  access: GoldmanAccessState;
  limits: GoldmanLimits;
} {
  return {
    access: normalizeStoredGoldmanAccess(station?.access),
    limits: normalizeStoredGoldmanLimits(station?.limits),
  };
}

function GoldmanAccessStation({
  panelVisibilityClass,
  panelWidthClass,
  accessStation,
  consoleData,
  strategyVault,
  isStrategyVaultLoading = false,
  isActivatingStrategyVault = false,
  strategyVaultError,
  activeStrategy,
  isStrategyRunning = false,
  isTogglingStrategy = false,
  groupId,
  onQuickCommand,
  onUpdateAccessStation,
  onEnsureStrategyVault,
  onOpenWalletTransfer,
  onSaveStrategyFile,
  onRunStrategy,
  onStopStrategy,
}: {
  panelVisibilityClass: string;
  panelWidthClass: string;
  accessStation?: GoldmanAccessStationInput | null;
  consoleData?: AstroConsoleData;
  strategyVault?: GoldmanStrategyVault | null;
  isStrategyVaultLoading?: boolean;
  isActivatingStrategyVault?: boolean;
  strategyVaultError?: string | null;
  activeStrategy?: GoldmanTradingStrategy | null;
  isStrategyRunning?: boolean;
  isTogglingStrategy?: boolean;
  groupId?: string;
  onQuickCommand?: (command: string) => void;
  onUpdateAccessStation?: (
    accessStation: GoldmanAccessStationInput
  ) => Promise<void>;
  onEnsureStrategyVault?: () => Promise<GoldmanStrategyVault | null>;
  onOpenWalletTransfer?: () => void;
  onSaveStrategyFile?: (
    fileName: string,
    content: string
  ) => Promise<GoldmanStrategyFile | null>;
  onRunStrategy?: () => void;
  onStopStrategy?: () => void;
}) {
  const accessStationKey = JSON.stringify(accessStation || {});
  const [{ access, limits }, setStationState] = useState(
    () => normalizeGoldmanAccessStationState(accessStation)
  );
  const [isSavingAccessStation, setIsSavingAccessStation] = useState(false);
  const [accessStationError, setAccessStationError] = useState<string | null>(
    null
  );
  const [fundingMode, setFundingMode] = useState<GoldmanFundingMode | null>(
    null
  );
  const strategyFiles = useMemo(
    () => hydrateGoldmanStrategyFiles(strategyVault?.strategyFiles),
    [strategyVault?.strategyFiles]
  );
  const [editingStrategyFile, setEditingStrategyFile] =
    useState<GoldmanStrategyFile | null>(null);
  const [strategyFileDraft, setStrategyFileDraft] = useState('');
  const [isSavingStrategyFile, setIsSavingStrategyFile] = useState(false);
  const fundingAddress = getGoldmanFundingAddress(strategyVault);
  const isVaultBusy = isStrategyVaultLoading || isActivatingStrategyVault;

  useEffect(() => {
    setStationState(normalizeGoldmanAccessStationState(accessStation));
  }, [accessStationKey, accessStation]);

  const persistAccessStation = useCallback(
    (nextState: { access: GoldmanAccessState; limits: GoldmanLimits }) => {
      if (!groupId || !onUpdateAccessStation) {
        return;
      }

      setIsSavingAccessStation(true);
      setAccessStationError(null);
      onUpdateAccessStation(nextState)
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to update Access Station.';
          setAccessStationError(message);
          toast.error(message);
        })
        .finally(() => {
          setIsSavingAccessStation(false);
        });
    },
    [groupId, onUpdateAccessStation]
  );

  const setAccessControl = useCallback(
    (key: GoldmanAccessKey, patch: Partial<GoldmanAccessControl>) => {
      setStationState((current) => {
        const next = {
          ...current,
          access: {
            ...current.access,
            [key]: {
              ...current.access[key],
              ...patch,
            },
          },
        };
        persistAccessStation(next);
        return next;
      });
    },
    [persistAccessStation]
  );

  const setLimitValue = useCallback(
    (key: GoldmanLimitKey, value: string) => {
      setStationState((current) => {
        const next = {
          ...current,
          limits: {
            ...current.limits,
            [key]: value,
          },
        };
        persistAccessStation(next);
        return next;
      });
    },
    [persistAccessStation]
  );

  const handleCopyFundingAddress = useCallback(async () => {
    if (!fundingAddress?.address) {
      toast.error('Activate the Goldman vault before copying its address.');
      return;
    }

    const didCopy = await copyTextToClipboard(fundingAddress.address);
    if (didCopy) {
      toast.success('Goldman funding address copied.');
    } else {
      toast.error('Could not copy funding address.');
    }
  }, [fundingAddress?.address]);

  const handleActivateFunding = useCallback(
    async (mode: GoldmanFundingMode = 'transfer') => {
      setFundingMode(mode);
      if (fundingAddress?.address || !onEnsureStrategyVault) return;

      try {
        await onEnsureStrategyVault();
        toast.success('Goldman Sacks vault activated.');
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Could not activate Goldman Sacks vault.'
        );
      }
    },
    [fundingAddress?.address, onEnsureStrategyVault]
  );

  const handleOpenWalletTransfer = useCallback(async () => {
    if (!fundingAddress?.address && onEnsureStrategyVault) {
      try {
        await onEnsureStrategyVault();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Could not activate Goldman Sacks vault.'
        );
        return;
      }
    }

    if (onOpenWalletTransfer) {
      onOpenWalletTransfer();
      return;
    }
    toast.error('Wallet transfer is not available from this panel.');
  }, [
    fundingAddress?.address,
    onEnsureStrategyVault,
    onOpenWalletTransfer,
  ]);

  const openStrategyFileEditor = useCallback((file: GoldmanStrategyFile) => {
    setEditingStrategyFile(file);
    setStrategyFileDraft(file.content || '');
  }, []);

  const closeStrategyFileEditor = useCallback(() => {
    if (isSavingStrategyFile) return;
    setEditingStrategyFile(null);
    setStrategyFileDraft('');
  }, [isSavingStrategyFile]);

  const handleSaveStrategyFile = useCallback(async () => {
    if (!editingStrategyFile) return;
    if (!onSaveStrategyFile) {
      toast.error('Strategy file saving is not available yet.');
      return;
    }

    setIsSavingStrategyFile(true);
    try {
      const saved = await onSaveStrategyFile(
        editingStrategyFile.file,
        strategyFileDraft
      );
      const nextFile = saved
        ? { ...editingStrategyFile, ...saved }
        : { ...editingStrategyFile, content: strategyFileDraft };
      setEditingStrategyFile(nextFile);
      setStrategyFileDraft(nextFile.content || '');
      toast.success(`${editingStrategyFile.file} saved.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Could not save ${editingStrategyFile.file}.`
      );
    } finally {
      setIsSavingStrategyFile(false);
    }
  }, [editingStrategyFile, onSaveStrategyFile, strategyFileDraft]);

  const handleAskStrategyIdeas = useCallback(() => {
    onQuickCommand?.(
      '@goldman suggest three strategy ideas for this vault, including one autonomous DeFi idea using Aave with clear risk limits'
    );
  }, [onQuickCommand]);

  const handleExplainStrategy = useCallback(() => {
    if (activeStrategy?.title) {
      onQuickCommand?.(
        `@goldman explain the active strategy "${activeStrategy.title}", what it will do with vault funds, and which actions are autonomous versus approval-gated`
      );
      return;
    }
    handleAskStrategyIdeas();
  }, [activeStrategy?.title, handleAskStrategyIdeas, onQuickCommand]);

  const handlePublishStrategyFiles = useCallback(() => {
    if (!onQuickCommand) return;
    onQuickCommand(buildGoldmanStrategyFilesPrompt(strategyFiles));
  }, [onQuickCommand, strategyFiles]);

  const disabledWriteCount = GOLDMAN_WRITE_ACCESS_KEYS.filter(
    (key) => !access[key].enabled
  ).length;
  const enabledCount = GOLDMAN_ACCESS_ROWS.filter(
    (row) => access[row.key].enabled
  ).length;
  const approvalCount = GOLDMAN_ACCESS_ROWS.filter(
    (row) => access[row.key].enabled && access[row.key].approvalRequired
  ).length;
  const stationStatus =
    disabledWriteCount === GOLDMAN_WRITE_ACCESS_KEYS.length
      ? 'LOCKED'
      : disabledWriteCount > 0
      ? 'LIMITED'
      : 'ACTIVE';
  const statusClassName =
    stationStatus === 'ACTIVE'
      ? 'border-[#3fe08f]/30 bg-[#3fe08f]/10 text-[#3fe08f]'
      : stationStatus === 'LOCKED'
      ? 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]'
      : 'border-[#f4c95d]/35 bg-[#f4c95d]/10 text-[#f4c95d]';
  const disabledTools =
    GOLDMAN_ACCESS_ROWS.filter((row) => !access[row.key].enabled)
      .map((row) => row.shortLabel)
      .join(', ') || 'none';
  const gatedTools =
    GOLDMAN_ACCESS_ROWS.filter(
      (row) => access[row.key].enabled && access[row.key].approvalRequired
    )
      .map((row) => row.shortLabel)
      .join(', ') || 'none';
  const goldmanMetrics = buildGoldmanConsoleMetrics(consoleData);
  const vaultAddressLabel = fundingAddress?.address
    ? formatWalletAddress(fundingAddress.address)
    : isVaultBusy
    ? 'Activating vault...'
    : strategyVaultError
    ? 'Vault unavailable'
    : 'Vault inactive';
  const goldmanWalletCard = (
    <>
      <SectionLabel>strategy vault</SectionLabel>
      <ConsoleCard padClass="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="dm-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737783]">
              available
            </div>
            <div className="dm-mono mt-2 text-[24px] font-semibold leading-none tracking-[-0.04em] text-[#eceef2]">
              {formatCompactUsd(consoleData?.walletPortfolioBalance || 0)}
            </div>
          </div>
          <div className="text-right">
            <label className="dm-mono block text-[9px] font-bold uppercase tracking-[0.12em] text-[#737783]">
              reserve
            </label>
            <span className="mt-1 flex items-center gap-1">
              <span className="dm-mono text-[11px] font-bold text-[#5a5e69]">
                $
              </span>
              <input
                type="number"
                min="0"
                step="25"
                value={limits.reserveUsd}
                onChange={(event) =>
                  setLimitValue('reserveUsd', event.target.value)
                }
                className="dm-mono h-8 w-[74px] rounded-[7px] border border-white/[0.07] bg-[#0e1014] px-2 text-right text-[12px] font-semibold text-[#eceef2] outline-none focus:border-[#f4c95d]/45"
              />
            </span>
          </div>
        </div>

        <div className="mt-3 rounded-[9px] border border-white/[0.06] bg-black/20 px-3 py-2">
          <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
            vault address
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="dm-mono min-w-0 flex-1 truncate text-[11px] font-semibold text-[#eceef2]">
              {vaultAddressLabel}
            </span>
            {isVaultBusy && !fundingAddress?.address && (
              <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-[#f4c95d]" />
            )}
            {fundingAddress?.address && (
              <button
                type="button"
                title="Copy Goldman vault"
                onClick={handleCopyFundingAddress}
                className="dm-btn grid h-7 w-7 flex-shrink-0 place-items-center rounded-[7px] border border-white/[0.07] bg-black/20 text-[#eceef2]"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {strategyVaultError && !fundingAddress?.address && (
            <div className="mt-1 text-[10px] font-semibold leading-snug text-[#ff8585]">
              {strategyVaultError}
            </div>
          )}
        </div>

        <div className="mt-3 rounded-[9px] border border-[#f4c95d]/20 bg-[#f4c95d]/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="dm-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#8f7c47]">
                active strategy
              </div>
              <div className="mt-1 truncate text-[12px] font-semibold text-[#eceef2]">
                {activeStrategy?.title || 'No approved strategy'}
              </div>
              <div className="dm-mono mt-0.5 truncate text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#a99761]">
                {activeStrategy
                  ? `${activeStrategy.runtime?.state || activeStrategy.status || 'idle'} · ${
                      activeStrategy.runtime?.executionMode || 'proposal'
                    }`
                  : 'approve a strategy to run'}
              </div>
            </div>
            <button
              type="button"
              data-testid="goldman-run-stop-button"
              disabled={
                isTogglingStrategy ||
                isVaultBusy ||
                (!activeStrategy && !onQuickCommand) ||
                (!isStrategyRunning && Boolean(activeStrategy) && !onRunStrategy) ||
                (isStrategyRunning && !onStopStrategy)
              }
              onClick={() => {
                if (!activeStrategy) {
                  toast.error('Ask Goldman for ideas or approve a strategy before running.');
                  handleAskStrategyIdeas();
                  return;
                }
                if (isStrategyRunning) {
                  onStopStrategy?.();
                } else {
                  onRunStrategy?.();
                }
              }}
              className={`dm-btn dm-mono flex h-9 min-w-[82px] items-center justify-center gap-1.5 rounded-[8px] border px-3 text-[10px] font-bold uppercase tracking-[0.08em] disabled:cursor-default disabled:opacity-50 ${
                isStrategyRunning
                  ? 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]'
                  : 'border-[#3fe08f]/30 bg-[#3fe08f]/10 text-[#3fe08f]'
              }`}
            >
              {isTogglingStrategy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isStrategyRunning ? (
                <Square className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {isStrategyRunning ? 'Stop' : 'Run'}
            </button>
          </div>
          {activeStrategy?.runtime?.lastActivity && (
            <div className="mt-2 line-clamp-2 text-[10.5px] font-semibold leading-snug text-[#d7c987]">
              {activeStrategy.runtime.lastActivity}
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!onQuickCommand}
              onClick={activeStrategy ? handleExplainStrategy : handleAskStrategyIdeas}
              className="dm-btn dm-mono flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-white/[0.07] bg-black/20 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#eceef2] disabled:cursor-default disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5 text-[#f4c95d]" />
              {activeStrategy ? 'Explain' : 'Ideas'}
            </button>
            <button
              type="button"
              disabled={!onQuickCommand}
              onClick={handlePublishStrategyFiles}
              className="dm-btn dm-mono flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#f4c95d]/25 bg-[#f4c95d]/10 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#f4c95d] disabled:cursor-default disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Publish
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            {
              label: 'Fund',
              icon: ArrowRight,
              onClick: () => {
                if (fundingMode === 'transfer') {
                  setFundingMode(null);
                  return;
                }
                void handleActivateFunding('transfer');
              },
            },
            {
              label: 'Withdraw',
              command: '@goldman withdraw from the sack ',
              icon: Download,
            },
            {
              label: 'Audit',
              command: '@goldman reconcile sack vault balances',
              icon: RefreshCw,
            },
          ].map((action) => {
            const ActionIcon = action.icon;
            const isFundingAction = action.label === 'Fund';
            return (
              <button
                key={action.label}
                type="button"
                disabled={
                  isFundingAction
                    ? isVaultBusy && !fundingAddress?.address
                    : !onQuickCommand
                }
                data-testid={isFundingAction ? 'goldman-fund-button' : undefined}
                onClick={() => {
                  if (action.onClick) {
                    action.onClick();
                    return;
                  }
                  if (action.command) onQuickCommand?.(action.command);
                }}
                className={`dm-btn flex h-9 items-center justify-center gap-1.5 rounded-[8px] border text-[10.5px] font-semibold disabled:cursor-default ${
                  isFundingAction && fundingMode
                    ? 'border-[#f4c95d]/35 bg-[#f4c95d]/15 text-[#f4c95d]'
                    : 'border-white/[0.07] bg-black/20 text-[#eceef2]'
                }`}
              >
                {isFundingAction && isVaultBusy && !fundingAddress?.address ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f4c95d]" />
                ) : (
                  <ActionIcon className="h-3.5 w-3.5 text-[#f4c95d]" />
                )}
                {isFundingAction && isVaultBusy && !fundingAddress?.address
                  ? 'Activating'
                  : action.label}
              </button>
            );
          })}
        </div>
        {fundingMode && (
          <div
            data-testid="goldman-funding-drawer"
            className="mt-3 border-t border-white/[0.06] pt-3"
          >
            <div className="mb-3 grid grid-cols-2 gap-2">
              {[
                { mode: 'transfer' as const, label: 'Transfer', icon: Wallet },
                { mode: 'qr' as const, label: 'QR code', icon: QrCode },
              ].map((option) => {
                const OptionIcon = option.icon;
                const selected = fundingMode === option.mode;
                return (
                  <button
                    key={option.mode}
                    type="button"
                    data-testid={`goldman-funding-${option.mode}-tab`}
                    aria-pressed={selected}
                    onClick={() => void handleActivateFunding(option.mode)}
                    className={`dm-btn dm-mono flex h-8 items-center justify-center gap-1.5 rounded-[8px] border text-[9.5px] font-bold uppercase tracking-[0.08em] ${
                      selected
                        ? 'border-[#3fe08f]/30 bg-[#3fe08f]/10 text-[#3fe08f]'
                        : 'border-white/[0.07] bg-black/20 text-[#9396a0]'
                    }`}
                  >
                    <OptionIcon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            {!fundingAddress?.address ? (
              <div className="flex items-start gap-2 rounded-[9px] border border-[#f4c95d]/20 bg-[#f4c95d]/10 px-3 py-2 text-[11px] font-semibold leading-relaxed text-[#f4c95d]">
                {isVaultBusy && (
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin" />
                )}
                <span>
                  {isVaultBusy
                    ? 'Activating Goldman Sacks strategy vault...'
                    : strategyVaultError ||
                      'Activate the Goldman Sacks strategy vault to fund it.'}
                </span>
              </div>
            ) : fundingMode === 'qr' ? (
              <div className="grid gap-3" data-testid="goldman-funding-qr">
                <div className="mx-auto rounded-[12px] bg-white p-3">
                  <QRCodeSVG
                    value={buildGoldmanFundingQrValue(fundingAddress)}
                    size={168}
                    level="H"
                    includeMargin
                  />
                </div>
                <div className="min-w-0">
                  <div className="dm-mono mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                    {fundingAddress.networkLabel}
                  </div>
                  <div className="dm-mono break-all text-[10.5px] font-semibold leading-relaxed text-[#eceef2]">
                    {fundingAddress.address}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyFundingAddress}
                  className="dm-btn dm-mono flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-white/[0.07] bg-black/20 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#eceef2]"
                >
                  <Copy className="h-3.5 w-3.5 text-[#f4c95d]" />
                  Copy address
                </button>
              </div>
            ) : (
              <div className="grid gap-3" data-testid="goldman-funding-transfer">
                <div>
                  <div className="dm-mono mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                    Destination
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="dm-mono min-w-0 flex-1 truncate text-[11px] font-semibold text-[#eceef2]">
                      {formatWalletAddress(fundingAddress.address)}
                    </span>
                    <button
                      type="button"
                      title="Copy address"
                      onClick={handleCopyFundingAddress}
                      className="dm-btn grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] border border-white/[0.07] bg-black/20 text-[#eceef2]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="goldman-open-wallet-transfer"
                  onClick={handleOpenWalletTransfer}
                  className="dm-btn dm-mono flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[10px] font-bold uppercase tracking-[0.08em] text-[#f4c95d]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open wallet transfer
                </button>
              </div>
            )}
          </div>
        )}
      </ConsoleCard>
    </>
  );

  return (
    <aside
      data-testid="goldman-access-station"
      className={`dm-scroll ${panelVisibilityClass} ${panelWidthClass} flex-shrink-0 overflow-y-auto border-l border-white/[0.07] bg-[#0e1014] px-4 py-5`}
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[10px] border border-[#f4c95d]/45 bg-[#f4c95d]/15 text-[13px] font-bold text-[#f4c95d]">
          GS
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-tight tracking-[-0.02em] text-[#eceef2]">
            Access station
          </div>
          <div className="dm-mono mt-1.5 inline-flex items-center gap-2 text-[10.5px] font-bold text-[#f4c95d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f4c95d]" />
            Goldman Sacks
          </div>
        </div>
        <span
          className={`dm-mono rounded-[6px] border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${statusClassName}`}
        >
          {stationStatus}
        </span>
      </div>

      {goldmanWalletCard}

      <SectionLabel>metrics</SectionLabel>
      <ConsoleCard padClass="p-3">
        <div className="grid grid-cols-2 gap-2">
          {goldmanMetrics.map((metric) => {
            const MetricIcon = metric.icon;
            const toneClassName =
              metric.tone === 'positive'
                ? 'border-[#3fe08f]/20 bg-[#3fe08f]/10 text-[#3fe08f]'
                : metric.tone === 'negative'
                ? 'border-[#ff5d63]/20 bg-[#ff5d63]/10 text-[#ff8585]'
                : 'border-white/[0.06] bg-black/20 text-[#9396a0]';
            return (
              <div
                key={metric.key}
                className="rounded-[9px] border border-white/[0.06] bg-black/20 p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="dm-mono truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[#737783]">
                    {metric.label}
                  </span>
                  <span
                    className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-[7px] border ${toneClassName}`}
                  >
                    <MetricIcon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div
                  className={`dm-mono mt-2 text-[15px] font-bold leading-none ${
                    metric.tone === 'positive'
                      ? 'text-[#3fe08f]'
                      : metric.tone === 'negative'
                      ? 'text-[#ff8585]'
                      : 'text-[#eceef2]'
                  }`}
                >
                  {metric.value}
                </div>
                <div className="dm-mono mt-1 truncate text-[9.5px] font-semibold text-[#5a5e69]">
                  {metric.detail}
                </div>
              </div>
            );
          })}
        </div>
      </ConsoleCard>

      <ConsoleCard padClass="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="dm-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737783]">
              agent access
            </div>
            <div className="mt-2 text-[18px] font-semibold leading-none text-[#eceef2]">
              {enabledCount}/{GOLDMAN_ACCESS_ROWS.length} on
            </div>
          </div>
          <ShieldCheck className="h-5 w-5 text-[#f4c95d]" />
        </div>
        <div className="dm-mono mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold">
          <div className="rounded-[8px] border border-white/[0.06] bg-black/20 px-2 py-2 text-[#9396a0]">
            <span className="block text-[#3fe08f]">{approvalCount}</span>
            approval gates
          </div>
          <div className="rounded-[8px] border border-white/[0.06] bg-black/20 px-2 py-2 text-[#9396a0]">
            <span className="block text-[#ff8585]">
              {disabledWriteCount}
            </span>
            writes off
          </div>
        </div>
      </ConsoleCard>

      <SectionLabel>access controls</SectionLabel>
      <ConsoleCard padClass="p-0">
        {GOLDMAN_ACCESS_ROWS.map((row) => {
          const control = access[row.key];
          const AccessIcon = row.icon;
          return (
            <div
              key={row.key}
              className="border-t border-white/[0.045] px-3 py-3 first:border-t-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] ${row.iconClassName}`}
                >
                  <AccessIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold leading-tight text-[#eceef2]">
                    {row.label}
                  </span>
                  <span className="dm-mono mt-1 block truncate text-[10px] font-semibold text-[#5a5e69]">
                    {row.detail}
                  </span>
                </span>
                <button
                  type="button"
                  aria-pressed={control.enabled}
                  aria-label={`${row.label} access`}
                  data-testid={`goldman-access-toggle-${row.key}`}
                  title={`${control.enabled ? 'Turn off' : 'Turn on'} ${
                    row.label
                  } access`}
                  onClick={() =>
                    setAccessControl(row.key, {
                      enabled: !control.enabled,
                    })
                  }
                  className={`dm-btn relative h-6 w-11 flex-shrink-0 rounded-full border transition ${
                    control.enabled
                      ? 'border-[#3fe08f]/35 bg-[#3fe08f]/20'
                      : 'border-white/[0.08] bg-black/45'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
                      control.enabled
                        ? 'left-[19px] bg-[#3fe08f]'
                        : 'left-0.5 bg-[#5a5e69]'
                    }`}
                  />
                </button>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!control.enabled}
                  onClick={() =>
                    setAccessControl(row.key, {
                      approvalRequired: !control.approvalRequired,
                    })
                  }
                  className={`dm-btn dm-mono h-6 rounded-[7px] border px-2 text-[9px] font-bold uppercase tracking-[0.08em] disabled:cursor-default disabled:opacity-45 ${
                    control.approvalRequired
                      ? 'border-[#f4c95d]/25 bg-[#f4c95d]/10 text-[#f4c95d]'
                      : 'border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#3fe08f]'
                  }`}
                >
                  {control.approvalRequired ? 'approval' : 'live'}
                </button>
              </div>
            </div>
          );
        })}
      </ConsoleCard>

      <SectionLabel>risk limits</SectionLabel>
      <ConsoleCard padClass="p-3">
        <div className="grid grid-cols-2 gap-2">
          {GOLDMAN_LIMIT_ROWS.map((item) => (
            <label
              key={item.key}
              className="block rounded-[8px] border border-white/[0.06] bg-black/20 p-2"
            >
              <span className="dm-mono block truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[#737783]">
                {item.label}
              </span>
              <span className="mt-1 flex items-center gap-1">
                {item.prefix && (
                  <span className="dm-mono text-[11px] font-bold text-[#5a5e69]">
                    {item.prefix}
                  </span>
                )}
                <input
                  type="number"
                  min={item.min}
                  step={item.step}
                  value={limits[item.key]}
                  onChange={(event) =>
                    setLimitValue(item.key, event.target.value)
                  }
                  className="dm-mono h-7 min-w-0 flex-1 rounded-[7px] border border-white/[0.07] bg-[#0e1014] px-2 text-[12px] font-semibold text-[#eceef2] outline-none focus:border-[#f4c95d]/45"
                />
                {item.suffix && (
                  <span className="dm-mono text-[11px] font-bold text-[#5a5e69]">
                    {item.suffix}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </ConsoleCard>

      <SectionLabel>strategy md files</SectionLabel>
      <ConsoleCard padClass="p-0">
        {strategyFiles.map((file) => (
          <button
            key={file.file}
            type="button"
            onClick={() => openStrategyFileEditor(file)}
            className="dm-btn flex w-full items-center gap-3 border-t border-white/[0.045] px-3 py-3 text-left first:border-t-0 disabled:cursor-default"
          >
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] bg-[#262b34] text-[#cfd6e6]">
              <FileText className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="dm-mono block truncate text-[12px] font-semibold text-[#eceef2]">
                {file.file}
              </span>
              <span className="dm-mono mt-1 block truncate text-[10px] font-semibold text-[#5a5e69]">
                {file.updatedAt ? 'saved markdown file' : file.detail}
              </span>
            </span>
            <span className="dm-mono rounded-[6px] border border-white/[0.07] bg-black/20 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#9396a0]">
              {file.status}
            </span>
          </button>
        ))}
        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.045] p-3">
          <button
            type="button"
            disabled={!onQuickCommand}
            onClick={handlePublishStrategyFiles}
            className="dm-btn dm-mono flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#f4c95d]/25 bg-[#f4c95d]/10 text-[10px] font-bold uppercase tracking-[0.08em] text-[#f4c95d] disabled:cursor-default"
          >
            <Check className="h-3.5 w-3.5" />
            Publish
          </button>
          <button
            type="button"
            disabled={!onQuickCommand}
            onClick={handleAskStrategyIdeas}
            className="dm-btn dm-mono flex h-9 items-center justify-center gap-2 rounded-[8px] border border-white/[0.07] bg-black/20 text-[10px] font-bold uppercase tracking-[0.08em] text-[#eceef2] disabled:cursor-default"
          >
            <Plus className="h-3.5 w-3.5 text-[#3fe08f]" />
            Ideas
          </button>
        </div>
      </ConsoleCard>

      <SectionLabel>audit</SectionLabel>
      <ConsoleCard padClass="p-0">
        {[
          {
            title: 'Disabled',
            detail: disabledTools,
            status: disabledTools === 'none' ? 'CLEAR' : 'OFF',
            statusClassName:
              disabledTools === 'none'
                ? 'text-[#3fe08f] bg-[#3fe08f]/10 border-[#3fe08f]/20'
                : 'text-[#ff8585] bg-[#ff5d63]/10 border-[#ff5d63]/20',
          },
          {
            title: 'Approvals',
            detail: gatedTools,
            status: gatedTools === 'none' ? 'LIVE' : 'GATED',
            statusClassName:
              gatedTools === 'none'
                ? 'text-[#3fe08f] bg-[#3fe08f]/10 border-[#3fe08f]/20'
                : 'text-[#f4c95d] bg-[#f4c95d]/10 border-[#f4c95d]/20',
          },
          {
            title: 'Policy',
            detail: accessStationError
              ? accessStationError
              : `send $${limits.maxSendUsd || '0'} · day $${
                  limits.dailyCapUsd || '0'
                }`,
            status: accessStationError
              ? 'ERROR'
              : isSavingAccessStation
              ? 'SAVING'
              : 'SAVED',
            statusClassName:
              accessStationError
                ? 'text-[#ff8585] bg-[#ff5d63]/10 border-[#ff5d63]/20'
                : isSavingAccessStation
                ? 'text-[#f4c95d] bg-[#f4c95d]/10 border-[#f4c95d]/20'
                : 'text-[#9396a0] bg-black/20 border-white/[0.07]',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between gap-3 border-t border-white/[0.045] px-3 py-3 first:border-t-0"
          >
            <span className="min-w-0">
              <span className="dm-mono block text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#9396a0]">
                {item.title}
              </span>
              <span className="dm-mono mt-1 block truncate text-[11px] font-semibold text-[#eceef2]">
                {item.detail}
              </span>
            </span>
            <span
              className={`dm-mono shrink-0 rounded-[6px] border px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.08em] ${item.statusClassName}`}
            >
              {item.status}
            </span>
          </div>
        ))}
      </ConsoleCard>

      {editingStrategyFile && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="goldman-strategy-file-editor-title"
          data-testid="goldman-strategy-file-editor"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeStrategyFileEditor();
            }
          }}
        >
          <div className="flex max-h-[86vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#101217] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
              <div className="min-w-0">
                <div
                  id="goldman-strategy-file-editor-title"
                  className="dm-mono truncate text-[12px] font-bold uppercase tracking-[0.12em] text-[#eceef2]"
                >
                  {editingStrategyFile.file}
                </div>
                <div className="dm-mono mt-1 truncate text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#737783]">
                  {editingStrategyFile.updatedAt
                    ? 'saved'
                    : editingStrategyFile.status || 'draft'}
                </div>
              </div>
              <button
                type="button"
                title="Close editor"
                onClick={closeStrategyFileEditor}
                disabled={isSavingStrategyFile}
                className="dm-btn grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] border border-white/[0.07] bg-black/20 text-[#eceef2] disabled:cursor-default disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={strategyFileDraft}
              onChange={(event) => setStrategyFileDraft(event.target.value)}
              spellCheck={false}
              data-testid="goldman-strategy-file-textarea"
              className="dm-scroll min-h-[360px] flex-1 resize-none border-0 bg-[#0b0d11] px-4 py-4 font-mono text-[12.5px] leading-relaxed text-[#eceef2] outline-none placeholder:text-[#5a5e69]"
              placeholder="# Strategy"
            />

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3">
              <div className="dm-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#5a5e69]">
                {strategyFileDraft.length.toLocaleString()} chars
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeStrategyFileEditor}
                  disabled={isSavingStrategyFile}
                  className="dm-btn dm-mono flex h-9 items-center justify-center rounded-[8px] border border-white/[0.07] bg-black/20 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9396a0] disabled:cursor-default disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveStrategyFile()}
                  disabled={isSavingStrategyFile}
                  className="dm-btn dm-mono flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#3fe08f]/30 bg-[#3fe08f]/10 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#3fe08f] disabled:cursor-default disabled:opacity-50"
                >
                  {isSavingStrategyFile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function DmContextPanel({
  mode,
  displayChat,
  activeAgents,
  consoleData,
  smartsiteHref,
  showOnTablet = false,
  onSmartsiteClick,
  onQuickCommand,
  onUpdateGoldmanAccessStation,
  goldmanStrategyVault,
  isGoldmanStrategyVaultLoading,
  isActivatingGoldmanVault,
  goldmanStrategyVaultError,
  onEnsureGoldmanStrategyVault,
  onOpenGoldmanWalletTransfer,
  onSaveGoldmanStrategyFile,
  activeGoldmanStrategy,
  isGoldmanStrategyRunning,
  isTogglingGoldmanStrategy,
  onRunGoldmanStrategy,
  onStopGoldmanStrategy,
  onPositionClick,
}: {
  mode: 'astro' | 'goldman' | 'group' | 'contact';
  displayChat?: SelectedChat | null;
  activeAgents?: GroupAgent[];
  consoleData?: AstroConsoleData;
  smartsiteHref?: string | null;
  showOnTablet?: boolean;
  onSmartsiteClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  onQuickCommand?: (command: string) => void;
  onUpdateGoldmanAccessStation?: (
    accessStation: GoldmanAccessStationInput
  ) => Promise<void>;
  goldmanStrategyVault?: GoldmanStrategyVault | null;
  isGoldmanStrategyVaultLoading?: boolean;
  isActivatingGoldmanVault?: boolean;
  goldmanStrategyVaultError?: string | null;
  onEnsureGoldmanStrategyVault?: () => Promise<GoldmanStrategyVault | null>;
  onOpenGoldmanWalletTransfer?: () => void;
  onSaveGoldmanStrategyFile?: (
    fileName: string,
    content: string
  ) => Promise<GoldmanStrategyFile | null>;
  activeGoldmanStrategy?: GoldmanTradingStrategy | null;
  isGoldmanStrategyRunning?: boolean;
  isTogglingGoldmanStrategy?: boolean;
  onRunGoldmanStrategy?: () => void;
  onStopGoldmanStrategy?: () => void;
  onPositionClick?: (selection: AstroConsolePositionSelection) => void;
}) {
  const shouldShowAgentPanelOnDesktop =
    showOnTablet || mode === 'astro' || mode === 'goldman';
  const panelVisibilityClass = shouldShowAgentPanelOnDesktop
    ? 'hidden md:block'
    : 'hidden xl:block';
  const panelWidthClass = shouldShowAgentPanelOnDesktop
    ? 'w-[280px] lg:w-[300px]'
    : 'w-[300px]';

  if (mode === 'goldman') {
    const goldmanAgent = activeAgents?.find(
      (agent) => agent.agentId === 'goldman-sacks'
    );
    return (
      <GoldmanAccessStation
        panelVisibilityClass={panelVisibilityClass}
        panelWidthClass={panelWidthClass}
        accessStation={goldmanAgent?.config?.accessStation || null}
        consoleData={consoleData}
        strategyVault={goldmanStrategyVault}
        isStrategyVaultLoading={isGoldmanStrategyVaultLoading}
        isActivatingStrategyVault={isActivatingGoldmanVault}
        strategyVaultError={goldmanStrategyVaultError}
        activeStrategy={activeGoldmanStrategy}
        isStrategyRunning={Boolean(isGoldmanStrategyRunning)}
        isTogglingStrategy={Boolean(isTogglingGoldmanStrategy)}
        groupId={displayChat?._id}
        onQuickCommand={onQuickCommand}
        onUpdateAccessStation={onUpdateGoldmanAccessStation}
        onEnsureStrategyVault={onEnsureGoldmanStrategyVault}
        onOpenWalletTransfer={onOpenGoldmanWalletTransfer}
        onSaveStrategyFile={onSaveGoldmanStrategyFile}
        onRunStrategy={onRunGoldmanStrategy}
        onStopStrategy={onStopGoldmanStrategy}
      />
    );
  }

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
    const maxVisibleConsolePositions = 4;
    const perpsConsolePositions = perpsPositions.map((position) => {
      const size = toFiniteNumber(position.szi);
      const displayCoin = displayPerpsCoin(position.coin);
      return {
        key: `perps:${position.dex || 'main'}:${position.coin}:${position.szi}:${position.entryPx}`,
        symbol: `${displayCoin}-PERP`,
        tag: `${size >= 0 ? 'LONG' : 'SHORT'} ${
          position.leverage?.value || 1
        }x`,
        pnl: formatSignedUsd(toFiniteNumber(position.unrealizedPnl)),
        positive: toFiniteNumber(position.unrealizedPnl) >= 0,
        selection: {
          kind: 'perps',
          position: position as HLPosition,
        } as AstroConsolePositionSelection,
      };
    });
    const predictionConsolePositions = openPredictionPositions.map((position) => ({
      key: `prediction:${position.conditionId || position.slug || 'market'}:${
        position.asset || position.outcome || ''
      }`,
      symbol: position.title || position.slug || 'Prediction',
      tag: position.outcome || 'YES',
      pnl: formatSignedUsd(toFiniteNumber(position.cashPnl)),
      positive: toFiniteNumber(position.cashPnl) >= 0,
      selection: {
        kind: 'prediction',
        position,
      } as AstroConsolePositionSelection,
    }));
    const positions = [
      ...perpsConsolePositions,
      ...predictionConsolePositions,
    ].slice(0, maxVisibleConsolePositions);
    const openTradingPositionCount =
      perpsPositions.length + openPredictionPositions.length;
    const hiddenPositionCount = Math.max(
      0,
      openTradingPositionCount - positions.length
    );
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
      { label: '/chart', command: '/chart ' },
      { label: '/send', command: '/send ' },
      { label: '/swap', command: '/swap ' },
      { label: '/pnl', command: '/pnl ' },
      { label: '/portfolio', command: '/portfolio ' },
    ];

    return (
      <>
      <aside className={`dm-scroll ${panelVisibilityClass} ${panelWidthClass} flex-shrink-0 overflow-y-auto border-l border-white/[0.07] bg-[#0e1014] px-4 py-5`}>
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

        <SectionLabel>open positions · {openTradingPositionCount}</SectionLabel>
        <ConsoleCard padClass="p-0">
          {positions.length ? (
            <>
              {positions.map((position) => (
                <div
                  key={position.key}
                  className="border-t border-white/[0.045] first:border-t-0"
                >
                  <button
                    type="button"
                    disabled={!onPositionClick}
                    onClick={() => onPositionClick?.(position.selection)}
                    title="Show position card in chat"
                    aria-label={`Show ${position.symbol} position card in chat`}
                    className="dm-btn flex w-full items-center justify-between gap-3 px-3 py-3 text-left disabled:cursor-default"
                  >
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
                  </button>
                </div>
              ))}
              {hiddenPositionCount > 0 && (
                <div className="border-t border-white/[0.045] px-3 py-2.5 text-[11px] font-semibold text-[#737783]">
                  {hiddenPositionCount} more position
                  {hiddenPositionCount === 1 ? '' : 's'} available.
                </div>
              )}
            </>
          ) : (
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
    <aside className={`dm-scroll ${panelVisibilityClass} ${panelWidthClass} flex-shrink-0 overflow-y-auto border-l border-white/[0.07] bg-[#0e1014] p-4`}>
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
  autoFetchSwapQuote?: boolean;
}

function strategyRuntimeTone(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (['running', 'started', 'ok', 'ready', 'active'].includes(normalized)) {
    return 'border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#9af7c4]';
  }
  if (['error', 'blocked', 'failed'].includes(normalized)) {
    return 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]';
  }
  if (['stopped', 'paused', 'hold', 'empty'].includes(normalized)) {
    return 'border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[#f4c95d]';
  }
  return 'border-white/[0.08] bg-black/25 text-[#cfd3dd]';
}

function GoldmanStrategyRuntimeCard({
  runtime,
}: {
  runtime: GoldmanStrategyRuntimeCardPayload;
}) {
  const status = strategyString(runtime.status || runtime.phase, 'running');
  const strategy = runtime.strategy;
  const checks = Array.isArray(runtime.checks) ? runtime.checks : [];
  const actions = Array.isArray(runtime.actions) ? runtime.actions : [];
  const swaps = Array.isArray(runtime.swaps) ? runtime.swaps : [];
  const updatedAt = runtime.updatedAt
    ? new Date(runtime.updatedAt)
    : null;

  return (
    <div className={`mt-2 w-full max-w-[500px] overflow-hidden text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-[#eceef2]">
            <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] bg-[#f4c95d]/15">
              <Radio className="h-3.5 w-3.5 text-[#f4c95d]" />
            </span>
            <span className="truncate">
              {runtime.title || strategy?.title || 'Goldman strategy'}
            </span>
          </div>
          <div className="dm-mono mt-1 truncate text-[10px] text-[#5a5e69]">
            run {runtime.runId || '--'} · {runtime.executionMode || 'proposal'}
          </div>
        </div>
        <span
          className={`dm-mono shrink-0 rounded-[5px] border px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] ${strategyRuntimeTone(
            status
          )}`}
        >
          {status}
        </span>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        {runtime.detail && (
          <p className="text-[12.5px] font-medium leading-relaxed text-[#d7dae2]">
            {runtime.detail}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
            <div className={TICKET_LABEL_CLASS}>mode</div>
            <div className="dm-mono mt-1 truncate text-[11px] font-bold uppercase text-[#eceef2]">
              {runtime.executionMode || 'proposal'}
            </div>
          </div>
          <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
            <div className={TICKET_LABEL_CLASS}>markets</div>
            <div className="dm-mono mt-1 text-[11px] font-bold text-[#eceef2]">
              {runtime.markets?.length || 0}
            </div>
          </div>
          <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
            <div className={TICKET_LABEL_CLASS}>positions</div>
            <div className="dm-mono mt-1 text-[11px] font-bold text-[#eceef2]">
              {runtime.positions?.length || 0}
            </div>
          </div>
        </div>

        {runtime.walletAddress && (
          <div className="rounded-[9px] border border-white/[0.07] bg-[#101217] px-3 py-2">
            <div className={TICKET_LABEL_CLASS}>wallet</div>
            <div className="dm-mono mt-1 truncate text-[11px] font-semibold text-[#eceef2]">
              {formatWalletAddress(runtime.walletAddress)}
            </div>
          </div>
        )}

        {(checks.length > 0 || actions.length > 0 || swaps.length > 0) && (
          <div className="grid gap-2">
            {checks.map((check, index) => (
              <div
                key={`runtime-check-${index}-${check.label}`}
                className="rounded-[9px] border border-white/[0.07] bg-black/25 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={TICKET_LABEL_CLASS}>{check.label || 'check'}</span>
                  <span
                    className={`dm-mono rounded-[5px] border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] ${strategyRuntimeTone(
                      check.status
                    )}`}
                  >
                    {check.status || 'info'}
                  </span>
                </div>
                {check.detail && (
                  <div className="mt-1 text-[11.5px] leading-snug text-[#cfd3dd]">
                    {check.detail}
                  </div>
                )}
              </div>
            ))}

            {actions.map((action, index) => (
              <div
                key={`runtime-action-${index}-${action.label}`}
                className="rounded-[9px] border border-[#3fe08f]/15 bg-[#3fe08f]/10 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={TICKET_LABEL_CLASS}>{action.label || 'action'}</span>
                  <span
                    className={`dm-mono rounded-[5px] border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] ${strategyRuntimeTone(
                      action.status
                    )}`}
                  >
                    {action.status || 'info'}
                  </span>
                </div>
                {action.detail && (
                  <div className="mt-1 text-[11.5px] leading-snug text-[#dfffee]">
                    {action.detail}
                  </div>
                )}
              </div>
            ))}

            {swaps.map((swap, index) => (
              <div
                key={`runtime-swap-${index}-${swap.fromToken}-${swap.toToken}`}
                className="rounded-[9px] border border-[#6b9bff]/20 bg-[#6b9bff]/10 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={TICKET_LABEL_CLASS}>swap</span>
                  <span className="dm-mono text-[10px] font-bold uppercase text-[#b8c8ff]">
                    {swap.fromToken || '--'} -&gt; {swap.toToken || '--'}
                  </span>
                </div>
                <div className="mt-1 text-[11.5px] leading-snug text-[#dce5ff]">
                  {swap.amount ? `${swap.amount} · ` : ''}
                  {swap.detail || swap.status || 'queued'}
                </div>
              </div>
            ))}
          </div>
        )}

        {updatedAt && Number.isFinite(updatedAt.getTime()) && (
          <div className="dm-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#5a5e69]">
            updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
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
  autoFetchSwapQuote = true,
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
  const pnlOverview =
    message.agentData?.metadata?.toolExecution?.pnlOverview || null;
  const portfolioSnapshot =
    message.agentData?.metadata?.toolExecution?.portfolioSnapshot || null;
  const walletReceive =
    message.agentData?.metadata?.toolExecution?.walletReceive || null;
  const perpsPositions =
    message.agentData?.metadata?.toolExecution?.perpsPositions || null;
  const walletSendNetworkPrompt =
    message.agentData?.metadata?.walletSendNetworkPrompt || null;
  const walletSendDraftPrompt =
    message.agentData?.metadata?.walletSendDraftPrompt || null;
  const perpsPositionPrompt =
    message.agentData?.metadata?.perpsPositionPrompt || null;
  const strategyRuntime =
    message.agentData?.metadata?.strategyRuntime || null;
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
  const hasAgentPnlOverview = isAgent && Boolean(pnlOverview);
  const hasAgentWalletPortfolio =
    isAgent &&
    (Boolean(portfolioSnapshot) ||
      message.agentData?.action === 'wallet.portfolio' ||
      message.agentData?.metadata?.toolExecution?.action === 'wallet.portfolio' ||
      message.agentData?.metadata?.responseType === 'portfolio_snapshot');
  const hasAgentFundingOnramp = isAgent && Boolean(fundingOnramp);
  const hasAgentWalletReceive = isAgent && Boolean(walletReceive?.address);
  const hasAgentPerpsPositions = isAgent && Boolean(perpsPositions);
  const hasAgentWalletSendNetworkPrompt =
    isAgent && Boolean(walletSendNetworkPrompt);
  const hasAgentWalletSendDraftPrompt =
    isAgent && Boolean(walletSendDraftPrompt);
  const hasAgentPerpsPositionPrompt =
    isAgent && Boolean(perpsPositionPrompt);
  const hasAgentStrategyRuntime =
    isAgent && Boolean(strategyRuntime);
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
      hasAgentPnlOverview ||
      hasAgentWalletPortfolio ||
      hasAgentFundingOnramp ||
      hasAgentMarketplaceItems ||
      hasAgentWalletReceive ||
      hasAgentPerpsPositions ||
      hasAgentWalletSendNetworkPrompt ||
      hasAgentWalletSendDraftPrompt ||
      hasAgentPerpsPositionPrompt ||
      hasAgentStrategyRuntime ||
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

  const attachmentUrl = message.fileUrl || '';
  const isImageAttachment =
    message.messageType === 'image' && Boolean(attachmentUrl);
  const isVideoAttachment =
    message.messageType === 'video' && Boolean(attachmentUrl);
  const isFileAttachment =
    message.messageType === 'file' && Boolean(attachmentUrl);
  const hasAttachment =
    isImageAttachment || isVideoAttachment || isFileAttachment;
  const attachmentCaption =
    hasAttachment &&
    message.message &&
    message.message !== message.fileName &&
    message.message !== GIF_ATTACHMENT_NAME
      ? message.message
      : '';

  const showMessageText =
    !hasAttachment &&
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
                    ? 'dm-mono rounded-[14px] rounded-tr-[6px] border border-[#43e58f] bg-[#43e58f] text-[#06120b] shadow-[0_18px_45px_rgba(63,224,143,0.16)] max-md:rounded-[18px] max-md:rounded-tr-[6px] max-md:shadow-none'
                    : isAgent
                    ? `${AGENT_TERMINAL_BUBBLE_CLASS} rounded-tl-md max-md:border-[#0a0a0c]`
                    : 'dm-mono rounded-[14px] rounded-tl-[6px] border border-white/[0.07] bg-[#15171d] text-[#eceef2] max-md:rounded-[18px] max-md:rounded-tl-[6px] max-md:border-[#e6e5df] max-md:bg-white max-md:text-[#0a0a0c]'
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
          {isImageAttachment && (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachmentUrl}
                alt={message.fileName || 'Image attachment'}
                loading="lazy"
                className="max-h-[280px] w-auto max-w-full rounded-[10px] object-cover"
              />
            </a>
          )}
          {isVideoAttachment && (
            <video
              src={attachmentUrl}
              controls
              preload="metadata"
              className="max-h-[280px] w-auto max-w-full rounded-[10px]"
            />
          )}
          {isFileAttachment && (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={message.fileName || true}
              className={`dm-mono flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 ${
                isOwn
                  ? 'border-[#06120b]/20 bg-[#06120b]/10 text-[#06120b]'
                  : 'border-white/[0.08] bg-black/40 text-[#eceef2]'
              }`}
            >
              <span
                className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] border ${
                  isOwn
                    ? 'border-[#06120b]/20'
                    : 'border-[#3fe08f]/20 bg-black text-[#3fe08f]'
                }`}
              >
                <FileText className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold">
                  {message.fileName || 'File'}
                </span>
                {formatAttachmentSize(message.fileSize) && (
                  <span
                    className={`block text-[11px] font-semibold ${
                      isOwn ? 'text-[#06120b]/70' : 'text-[#737783]'
                    }`}
                  >
                    {formatAttachmentSize(message.fileSize)}
                  </span>
                )}
              </span>
              <Download className="h-4 w-4 flex-shrink-0 opacity-70" />
            </a>
          )}
          {attachmentCaption && (
            <div
              className={`mt-1.5 ${
                isOwn
                  ? 'dm-mono break-words text-[13.5px] font-semibold leading-[1.6]'
                  : 'dm-mono break-words text-[14px] font-semibold leading-[1.65]'
              }`}
            >
              {attachmentCaption}
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
          {isAgent && pnlOverview && (
            <PnlOverviewCard overview={pnlOverview} />
          )}
          {hasAgentWalletPortfolio && (
            <WalletPortfolioCard
              consoleData={astroConsoleData}
              snapshot={portfolioSnapshot}
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
              canAct={canAct}
              isPending={isProposalPending}
              onApproveInline={onApproveInlineProposal}
              onInlineActionComplete={onInlineActionComplete}
              onAddFunds={onAddPerpsFunds}
            />
          )}
          {isAgent && walletSendNetworkPrompt && !proposalId && (
            <WalletSendNetworkPromptCard
              prompt={walletSendNetworkPrompt}
              proposal={proposal}
              proposalId={proposalId || undefined}
              status={status}
              canAct={canAct}
              isPending={isProposalPending}
              onApproveInline={onApproveInlineProposal}
              onInlineActionComplete={onInlineActionComplete}
              onReject={onRejectProposal}
              astroConsoleData={astroConsoleData}
            />
          )}
          {isAgent && walletSendDraftPrompt && !proposalId && (
            <WalletSendDraftCard
              prompt={walletSendDraftPrompt}
              onApproveInline={onApproveInlineProposal}
              onInlineActionComplete={onInlineActionComplete}
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
          {isAgent && strategyRuntime && (
            <GoldmanStrategyRuntimeCard
              runtime={strategyRuntime as GoldmanStrategyRuntimeCardPayload}
            />
          )}
          {isAgent &&
            strategyRuntime?.markets &&
            strategyRuntime.markets.length > 0 && (
              <PolymarketMarketCards
                markets={strategyRuntime.markets as PolymarketMarketPreview[]}
                onPrepareBet={onPreparePolymarketBet}
                pendingBetKey={pendingPolymarketBetKey}
                inlineProposalsByBetKey={inlinePolymarketProposalsByBetKey}
                actionResultsByProposalId={actionResultsByProposalId}
                pendingProposalId={pendingProposalId}
                canAct={canAct}
                onApproveInlineProposal={onApproveInlineProposal}
                onInlineActionComplete={onInlineActionComplete}
                onRejectProposal={onRejectProposal}
                onAddPredictionFunds={onAddPredictionFunds}
                astroConsoleData={astroConsoleData}
                renderedReceiptIdentityKeys={renderedReceiptIdentityKeys}
              />
            )}
          {isAgent &&
            strategyRuntime?.positions &&
            strategyRuntime.positions.length > 0 && (
              <PolymarketPositionsCard
                positions={strategyRuntime.positions as PolymarketPosition[]}
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
              autoFetchSwapQuote={autoFetchSwapQuote}
            />
          )}
        </div>
        <p
          className={`dm-mono mt-1 px-1 text-[10px] font-semibold ${
            isOwn ? 'text-[#5a5e69]' : 'text-[#5a5e69]'
          } max-md:text-[#9a9690]`}
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

function normalizePolymarketRealtimePrices(
  value: unknown
): Record<string, PolymarketRealtimePrice> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const prices: Record<string, PolymarketRealtimePrice> = {};

  for (const [tokenId, rawQuote] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (!tokenId || !rawQuote || typeof rawQuote !== 'object') continue;
    const quote = rawQuote as Record<string, unknown>;
    const bidPrice = parseLivePolymarketPrice(
      quote.bidPrice ?? quote.bid
    );
    const askPrice = parseLivePolymarketPrice(
      quote.askPrice ?? quote.ask
    );
    const midPrice = parseLivePolymarketPrice(
      quote.midPrice ?? quote.mid
    );
    const spreadNumber = Number(quote.spread);
    const spread =
      Number.isFinite(spreadNumber) && spreadNumber >= 0
        ? spreadNumber
        : undefined;

    if (
      bidPrice == null &&
      askPrice == null &&
      midPrice == null &&
      spread == null
    ) {
      continue;
    }

    prices[tokenId] = {
      ...(bidPrice != null ? { bidPrice } : {}),
      ...(askPrice != null ? { askPrice } : {}),
      ...(midPrice != null ? { midPrice } : {}),
      ...(spread != null ? { spread } : {}),
    };
  }

  return Object.keys(prices).length > 0 ? prices : undefined;
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
    realtimePrices: normalizePolymarketRealtimePrices(raw.realtimePrices),
  };
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

function GroupAgentControls({
  activeAgents,
  agentError,
  availableAgents,
  currentAgentThreadId,
  isLoadingAgents,
  mutationAgentId,
  onAddAgent,
  onMentionAgent,
  onOpenAgentThread,
  onRemoveAgent,
}: {
  activeAgents: GroupAgent[];
  agentError: string | null;
  availableAgents: GroupAgentDescriptor[];
  currentAgentThreadId?: string | null;
  isLoadingAgents: boolean;
  mutationAgentId: string | null;
  onAddAgent: (agent: GroupAgentDescriptor) => void;
  onMentionAgent: (agent: GroupAgent) => void;
  onOpenAgentThread?: (agentId: string) => void | Promise<void>;
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
      {activeAgents.map((agent) => {
        const dedicatedThreadId = getAgentDedicatedThreadId(agent.agentId);
        const opensDedicatedThread = Boolean(
          dedicatedThreadId &&
            dedicatedThreadId !== currentAgentThreadId &&
            onOpenAgentThread
        );

        return (
          <div
            key={agent.agentId}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#3fe08f]/35 bg-[#3fe08f]/10 pl-2.5 pr-1 text-[12px] font-semibold text-[#3fe08f]"
          >
            <Bot className="h-3 w-3" />
            <button
              type="button"
              title={`${opensDedicatedThread ? 'Open' : 'Mention'} ${
                agent.displayName
              }`}
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
        );
      })}

      {addableAgents.map((agent) => {
        const dedicatedThreadId = getAgentDedicatedThreadId(agent.agentId);
        const opensDedicatedThread = Boolean(
          currentAgentThreadId && dedicatedThreadId && onOpenAgentThread
        );

        return (
          <button
            key={agent.agentId}
            type="button"
            title={`${opensDedicatedThread ? 'Open' : 'Add'} ${
              agent.displayName
            }`}
            onClick={() => {
              if (opensDedicatedThread && dedicatedThreadId) {
                void onOpenAgentThread?.(dedicatedThreadId);
                return;
              }

              onAddAgent(agent);
            }}
            disabled={mutationAgentId === agent.agentId}
            className="dm-btn inline-flex h-7 items-center gap-1.5 rounded-full border border-white/[0.07] bg-[#15171d] px-2.5 text-[12px] font-semibold text-[#eceef2] hover:bg-white/[0.05] disabled:opacity-50"
          >
            {mutationAgentId === agent.agentId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : opensDedicatedThread ? (
              <Bot className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span className="max-w-28 truncate">{agent.displayName}</span>
          </button>
        );
      })}

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
    ...(option.assetIndex !== null && option.assetIndex !== undefined
      ? {
          assetIndex: option.assetIndex,
          assetId: option.assetIndex,
          a: option.assetIndex,
        }
      : {}),
    ...(option.dex ? { dex: option.dex, marketDex: option.dex } : {}),
    ...(option.dexName ? { dexName: option.dexName } : {}),
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

function buildHyperliquidClosePositionProposal(
  position: HyperliquidPositionPreview,
  market?: HLMarket
): AgentActionProposal {
  const side = getHyperliquidPreviewSide(position);
  const sizeCoins = Math.abs(toFiniteNumber(position.szi));
  const closeSize = formatPerpsOrderSize(sizeCoins, market?.szDecimals ?? 4);
  const positionDex = String(position.dex || market?.dex || '').trim();
  const proposalSeed = [
    positionDex || 'main',
    displayPerpsCoin(position.coin),
    side,
    closeSize,
  ]
    .join('-')
    .replace(/[^a-zA-Z0-9_-]/g, '-');
  const isCross = position.leverage?.type !== 'isolated';
  const marketIndex =
    typeof market?.index === 'number' && Number.isFinite(market.index)
      ? market.index
      : null;
  // markPrice is intentionally omitted so the ticket uses the live market mark.
  const params = {
    coin: position.coin,
    asset: position.coin,
    ...(marketIndex !== null
      ? { assetIndex: marketIndex, assetId: marketIndex, a: marketIndex }
      : {}),
    ...(positionDex ? { dex: positionDex, marketDex: positionDex } : {}),
    ...(position.dexName || market?.dexName
      ? { dexName: position.dexName || market?.dexName }
      : {}),
    side,
    direction: side,
    isLong: side === 'long',
    size: closeSize,
    sz: closeSize,
    sizeCoins: closeSize,
    entryPrice: position.entryPx || undefined,
    collateralUsd: position.marginUsed || undefined,
    marginUsed: position.marginUsed || undefined,
    notionalUsd: position.positionValue || undefined,
    positionValue: position.positionValue || undefined,
    leverage: String(position.leverage?.value || 1),
    isCross,
    cross: isCross,
    liquidationPrice: position.liquidationPx || undefined,
    reduceOnly: true,
    orderMode: 'market',
    orderType: 'market',
  };

  return {
    proposalId: `${LOCAL_HYPERLIQUID_PROPOSAL_PREFIX}close-${proposalSeed}`,
    toolType: 'perps.write',
    action: 'perps.close_position',
    status: 'pending',
    normalizedParams: params,
    riskSummary: {
      riskLevel: 'high',
      toolType: 'perps.write',
      action: 'perps.close_position',
      mode: 'proposal',
      requiresProposal: true,
      paramKeys: Object.keys(params).sort(),
    },
  };
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
  canAct = false,
  isPending = false,
  onApproveInline,
  onInlineActionComplete,
  onAddFunds,
}: {
  summary: HyperliquidPositionsPreview;
  astroConsoleData: AstroConsoleData;
  canAct?: boolean;
  isPending?: boolean;
  onApproveInline?: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete?: (completion: AgentActionCompletion) => void;
  onAddFunds?: () => void;
}) {
  const positions = (summary.positions || []).filter((position) =>
    Boolean(position.coin)
  );
  const accountValue = toFiniteNumber(summary.accountValue);
  const withdrawable = toFiniteNumber(summary.withdrawable);
  // Proposal is built once at click time so in-flight ticket state never
  // resets when live market data refreshes.
  const [closeTicket, setCloseTicket] = useState<{
    positionKey: string;
    proposal: AgentActionProposal;
  } | null>(null);
  const canClosePositions = Boolean(onApproveInline && onInlineActionComplete);

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
            const positionDex = String(position.dex || '').trim();
            const positionKey = `${positionDex || 'main'}-${position.coin}-${
              position.szi || index
            }`;
            const side = getHyperliquidPreviewSide(position);
            const displayCoin =
              position.displayCoin || displayPerpsCoin(position.coin);
            const market = hyperliquidMarketForPosition(
              astroConsoleData.perpsMarkets,
              position
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

            const isCloseTicketOpen =
              closeTicket?.positionKey === positionKey;

            return (
              <div
                key={positionKey}
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

                {canClosePositions && size > 0 && (
                  isCloseTicketOpen && closeTicket ? (
                    <HyperliquidProposalFlowTicket
                      proposal={closeTicket.proposal}
                      proposalId={closeTicket.proposal.proposalId}
                      status={closeTicket.proposal.status || 'pending'}
                      canAct={canAct}
                      isPending={isPending}
                      onApproveInline={onApproveInline!}
                      onInlineActionComplete={onInlineActionComplete!}
                      onReject={() => setCloseTicket(null)}
                      onAddFunds={onAddFunds || (() => {})}
                      astroConsoleData={astroConsoleData}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setCloseTicket({
                          positionKey,
                          proposal: buildHyperliquidClosePositionProposal(
                            position,
                            market
                          ),
                        })
                      }
                      className="dm-btn mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#ff5d63]/25 bg-[#ff5d63]/10 text-[12px] font-semibold text-[#ffb2b6] hover:bg-[#ff5d63]/20"
                    >
                      <X className="h-3.5 w-3.5" />
                      Close position
                    </button>
                  )
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
  autoFetchSwapQuote = true,
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
  autoFetchSwapQuote?: boolean;
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
  const isStrategyAction = proposal?.toolType === 'strategy.write';

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
        autoFetchQuote={autoFetchSwapQuote}
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
              getWalletSendFundingTokens(astroConsoleData)
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

  if (isStrategyAction) {
    return (
      <StrategyProposalTicket
        proposal={proposal}
        proposalId={proposalId}
        status={status}
        actionResult={actionResult}
        canAct={canAct}
        isOpen={isOpen}
        isPending={isPending}
        onApprove={onApprove}
        onReject={onReject}
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

function strategyString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function strategyList(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
}

function strategyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function strategyUsd(value: unknown) {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number) || number <= 0) return '--';
  return formatCompactUsd(number);
}

function strategyPercent(value: unknown) {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number) || number <= 0) return '--';
  return `${number.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}%`;
}

function strategyDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function StrategyProposalTicket({
  proposal,
  proposalId,
  status,
  actionResult,
  canAct,
  isOpen,
  isPending,
  onApprove,
  onReject,
}: {
  proposal?: AgentActionProposal | null;
  proposalId: string;
  status: string;
  actionResult?: AgentActionResultPayload;
  canAct: boolean;
  isOpen: boolean;
  isPending: boolean;
  onApprove: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => void;
  onReject: (proposalId: string) => void;
}) {
  const params = proposal?.normalizedParams || {};
  const venues = strategyList(params.venues, ['polymarket']);
  const assets = strategyList(params.assets, ['USDC']);
  const executionPlan = strategyList(params.executionPlan).slice(0, 4);
  const riskControls = strategyList(params.riskControls).slice(0, 4);
  const idleDeployment = strategyRecord(params.idleDeployment);
  const nextStep = getApprovalNextStep(actionResult?.result);
  const title = strategyString(params.title, 'Strategy draft');
  const brief = strategyString(
    params.strategyBrief,
    'Goldman Sacks prepared a concrete strategy for review.'
  );
  const expiry = strategyDate(params.expiry || proposal?.expiresAt);
  const idleVenue = strategyString(idleDeployment.venue, '');
  const idleAsset = strategyString(idleDeployment.asset, assets[0] || 'USDC');
  const idleChain = strategyString(idleDeployment.chain, 'polygon');
  const canSubmit = isOpen && canAct && !isPending;

  return (
    <div className={`mt-2 w-full max-w-[500px] overflow-hidden text-xs ${AGENT_PANEL_CLASS}`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] bg-[#111318] px-3.5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-[#eceef2]">
            <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] bg-[#3fe08f]/15">
              <ShieldCheck className="h-3.5 w-3.5 text-[#3fe08f]" />
            </span>
            <span className="truncate">{title}</span>
          </div>
          <div className="dm-mono mt-1 truncate text-[10px] text-[#5a5e69]">
            strategy.write · {proposalId}
          </div>
        </div>
        <span
          className={`dm-mono shrink-0 rounded-[5px] px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] ${proposalStatusClass(
            status
          )}`}
        >
          {status}
        </span>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        <div>
          <div className={TICKET_LABEL_CLASS}>strategy brief</div>
          <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-[#d7dae2]">
            {brief}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
            <div className={TICKET_LABEL_CLASS}>target</div>
            <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
              {strategyUsd(params.targetProfitUsd)}
            </div>
            <div className="dm-mono mt-0.5 text-[10px] text-[#5a5e69]">
              {strategyPercent(params.targetProfitPct)}
            </div>
          </div>
          <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
            <div className={TICKET_LABEL_CLASS}>max order</div>
            <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
              {strategyUsd(params.maxOrderUsd)}
            </div>
            <div className="dm-mono mt-0.5 text-[10px] text-[#5a5e69]">
              est {strategyUsd(params.estimatedOrderUsd)}
            </div>
          </div>
          <div className="rounded-[9px] border border-white/[0.07] bg-black/25 p-2">
            <div className={TICKET_LABEL_CLASS}>daily loss</div>
            <div className="dm-mono mt-1 text-[12px] font-bold text-[#eceef2]">
              {strategyUsd(params.maxDailyLossUsd)}
            </div>
            <div className="dm-mono mt-0.5 text-[10px] text-[#5a5e69]">
              cap {strategyUsd(params.maxDailySpendUsd)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {venues.map((venue) => (
            <span
              key={`venue-${venue}`}
              className="dm-mono rounded-[7px] border border-[#3fe08f]/20 bg-[#3fe08f]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9af7c4]"
            >
              {venue}
            </span>
          ))}
          {assets.map((asset) => (
            <span
              key={`asset-${asset}`}
              className="dm-mono rounded-[7px] border border-white/[0.07] bg-black/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#cfd3dd]"
            >
              {asset}
            </span>
          ))}
          {expiry && (
            <span className="dm-mono rounded-[7px] border border-white/[0.07] bg-black/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9396a0]">
              expires {expiry}
            </span>
          )}
        </div>

        <div className="grid gap-2">
          <div className="rounded-[10px] border border-white/[0.07] bg-[#101217] px-3 py-2.5">
            <div className={TICKET_LABEL_CLASS}>entry</div>
            <p className="mt-1 text-[12px] leading-relaxed text-[#d7dae2]">
              {strategyString(params.entryCondition, 'Wait for a qualified market entry.')}
            </p>
          </div>
          <div className="rounded-[10px] border border-white/[0.07] bg-[#101217] px-3 py-2.5">
            <div className={TICKET_LABEL_CLASS}>exit</div>
            <p className="mt-1 text-[12px] leading-relaxed text-[#d7dae2]">
              {strategyString(params.exitCondition, 'Exit at the approved target or risk limit.')}
            </p>
          </div>
        </div>

        {idleVenue && (
          <div className="rounded-[10px] border border-[#6b9bff]/20 bg-[#6b9bff]/10 px-3 py-2.5">
            <div className={TICKET_LABEL_CLASS}>idle deployment</div>
            <div className="mt-1 text-[12px] font-semibold text-[#eceef2]">
              {idleAsset} to {idleVenue} on {idleChain}
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#b8c8ff]">
              {strategyString(
                idleDeployment.condition,
                'Use idle funds only when no qualifying live market is available.'
              )}
            </p>
          </div>
        )}

        {(executionPlan.length > 0 || riskControls.length > 0) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {executionPlan.length > 0 && (
              <div className="rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2.5">
                <div className={TICKET_LABEL_CLASS}>execution</div>
                <div className="mt-2 space-y-1.5">
                  {executionPlan.map((item, index) => (
                    <div
                      key={`execution-${index}-${item}`}
                      className="text-[11.5px] leading-snug text-[#d7dae2]"
                    >
                      {index + 1}. {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {riskControls.length > 0 && (
              <div className="rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2.5">
                <div className={TICKET_LABEL_CLASS}>risk controls</div>
                <div className="mt-2 space-y-1.5">
                  {riskControls.map((item, index) => (
                    <div
                      key={`risk-${index}-${item}`}
                      className="text-[11.5px] leading-snug text-[#d7dae2]"
                    >
                      {index + 1}. {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {nextStep && (
          <div className="rounded-[9px] border border-[#3fe08f]/15 bg-[#3fe08f]/10 px-3 py-2 text-[11.5px] text-[#dfffee]">
            {nextStep}
          </div>
        )}

        {isOpen && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onApprove(proposalId)}
              disabled={!canSubmit}
              className={TICKET_PRIMARY_BUTTON_CLASS}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Approve strategy
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

        {!canAct && isOpen && (
          <p className="text-[11px] text-[#ffd08a]">
            Only the user who asked Goldman Sacks to draft this strategy can approve it.
          </p>
        )}
      </div>
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

  if (tokenChain !== 'SOLANA' && looksLikePublicEnsName(trimmed)) {
    const resolved = await resolvePublicEnsName(trimmed, token.chain);
    if (resolved) {
      return {
        address: resolved.address,
        ensName: resolved.ensName,
        isEns: true,
      };
    }
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
  const isLocalProposal = isLocalWalletSendProposalId(proposalId);
  const sendAmountLabel =
    amountType === 'usd'
      ? `${formatCompactUsd(amount)} in ${token}`
      : `${formatSwapAmount(amount)} ${token}`;
  const selectedNetwork = chain ? normalizeWalletSendChainValue(chain) : null;
  const walletSendTokens = useMemo(
    () => getWalletSendFundingTokens(astroConsoleData),
    [astroConsoleData]
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
    tokens: walletSendTokens,
    evmSignerAddresses,
    solanaSignerAddresses,
  });
  const hasUnsignableMatchingToken = useMemo(() => {
    const chainName = chain ? normalizeWalletSendChainValue(chain) : '';
    const chainId = chain ? String(getWalletSendChainId(chain) || '') : '';
    return walletSendTokens.some((walletToken) => {
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
    chain,
    evmSignerAddresses,
    solanaSignerAddresses,
    token,
    walletSendTokens,
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
    let executionProposalId = proposalId;

    try {
      const approvalResult =
        proposal?.approvalResult?.payload?.proposalId === proposalId
          ? proposal.approvalResult
          : await onApproveInline(proposalId, approvalParams);
      if (!approvalResult?.payload?.proposalId) {
        throw new Error('Swop approval was not returned by the backend.');
      }
      executionProposalId = String(approvalResult.payload.proposalId);
      persistAgentActionHandoff(approvalResult);

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
        proposalId: executionProposalId,
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
          kind: 'send',
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
        proposalId: executionProposalId,
      } as AgentActionCompletion;
      if (!isLocalWalletSendProposalId(executionProposalId)) {
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
      } else {
        clearAgentActionHandoff();
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
        if (!isLocalWalletSendProposalId(executionProposalId)) {
          const failedCompletion = await completeAgentActionFromHandoff(
            {
              proposalId: executionProposalId,
              status: 'failed',
              provider: 'swop',
              title: `Send ${token}`,
              subtitle: chain || 'wallet send',
              subject: token,
              error: message,
              executionResult: {
                kind: 'send',
                token,
                amount,
                amountType,
                network: chain || undefined,
                recipientName: recipient,
              },
            },
            accessToken
          );
          if (failedCompletion) {
            onInlineActionComplete(failedCompletion);
          } else {
            clearAgentActionHandoff();
          }
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
  const walletSendTokens = useMemo(
    () => getWalletSendFundingTokens(astroConsoleData),
    [astroConsoleData]
  );
  const isFundingBalanceLoading =
    isWalletSendFundingBalanceLoading(astroConsoleData);
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
        walletSendTokens,
        evmSignerAddresses,
        solanaSignerAddresses
      ),
    [
      evmSignerAddresses,
      promptIntent,
      solanaSignerAddresses,
      walletSendTokens,
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
          <div className={TICKET_LABEL_CLASS}>
            pay from · main wallet {prompt.token} balances
          </div>
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
            ) : isFundingBalanceLoading ? (
              <div className="rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2 text-[11px] font-semibold text-[#a9adb8]">
                Loading main wallet balances...
              </div>
            ) : (
              <div className="rounded-[10px] border border-[#ffcc66]/25 bg-[#ffcc66]/10 px-3 py-2 text-[11px] font-semibold text-[#ffd17a]">
                <div>
                  No {prompt.token} balance was found in your main wallet.
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

function formatWalletSendDraftSwopId(value?: string | null) {
  const raw = String(value || '').trim().replace(/^@/, '');
  if (!raw) return '';
  return raw.includes('.') ? raw : `${raw}.swop.id`;
}

type WalletSendDraftSearchResult = {
  parentId?: string;
  userId?: string;
  name?: string;
  displayName?: string;
  username?: string;
  ens?: string;
  profilePic?: string;
  avatar?: string;
  ensData?: {
    evmAddress?: string;
    solanaAddress?: string;
  };
  ethAddress?: string;
  ethereumWallet?: string;
  solanaAddress?: string;
};

function walletSendDraftCandidateFromSearchResult(
  result: WalletSendDraftSearchResult
): WalletSendDraftCandidate | null {
  const swopId = formatWalletSendDraftSwopId(result.ens || result.username);
  if (!swopId) return null;

  const capabilities = [
    result.ensData?.evmAddress || result.ethAddress || result.ethereumWallet
      ? 'EVM'
      : '',
    result.ensData?.solanaAddress || result.solanaAddress ? 'Solana' : '',
  ].filter(Boolean);

  return {
    userId: result.parentId || result.userId || null,
    displayName:
      result.name ||
      result.displayName ||
      result.username ||
      result.ens ||
      null,
    swopId,
    capabilities,
    avatar: result.profilePic || result.avatar || null,
  };
}

function dedupeWalletSendDraftCandidates(
  candidates: WalletSendDraftCandidate[]
) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = formatWalletSendDraftSwopId(candidate.swopId).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function WalletSendDraftCard({
  prompt,
  onApproveInline,
  onInlineActionComplete,
  astroConsoleData,
}: {
  prompt: WalletSendDraftPrompt;
  onApproveInline: (
    proposalId: string,
    approvalParams?: Record<string, unknown>
  ) => Promise<AgentApprovalHandoff | null>;
  onInlineActionComplete: (completion: AgentActionCompletion) => void;
  astroConsoleData: AstroConsoleData;
}) {
  const { accessToken, user } = useUser();
  const { wallets: evmWallets } = useEvmWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { connectWallet } = useConnectWallet();
  const walletSendTokens = useMemo(
    () => getWalletSendFundingTokens(astroConsoleData),
    [astroConsoleData]
  );
  const isFundingBalanceLoading =
    isWalletSendFundingBalanceLoading(astroConsoleData);
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
  const tokenOptions = useMemo(
    () =>
      getWalletSwapTokenOptions(walletSendTokens).filter(
        (option) =>
          isChatSwapTokenOwnedBySigner(
            option,
            evmSignerAddresses,
            solanaSignerAddresses
          )
      ),
    [
      evmSignerAddresses,
      solanaSignerAddresses,
      walletSendTokens,
    ]
  );
  const promptChain = prompt.chain
    ? normalizeWalletSendChainValue(prompt.chain)
    : '';
  const initialToken = useMemo(() => {
    const symbolMatch = findSwapSelectableToken(
      tokenOptions,
      prompt.token,
      undefined,
      true
    );
    if (!symbolMatch) return null;
    if (!promptChain) return symbolMatch;
    return (
      tokenOptions.find(
        (option) =>
          normalizeSwapSymbol(option.symbol) ===
            normalizeSwapSymbol(symbolMatch.symbol) &&
          normalizeWalletSendChainValue(
            option.chainId === SOLANA_CHAIN_ID ? 'solana' : option.chainName
          ) === promptChain
      ) || symbolMatch
    );
  }, [prompt.token, promptChain, tokenOptions]);
  const [selectedTokenKey, setSelectedTokenKey] = useState('');
  const [isTokenListOpen, setIsTokenListOpen] = useState(false);
  const [hasTouchedToken, setHasTouchedToken] = useState(false);
  const [amountInput, setAmountInput] = useState(prompt.amount || '');
  const [amountType, setAmountType] = useState<'token' | 'usd'>(
    prompt.amountType === 'usd' ? 'usd' : 'token'
  );
  const [recipientInput, setRecipientInput] = useState(prompt.recipient || '');
  const [recipientResults, setRecipientResults] = useState<
    WalletSendDraftCandidate[]
  >(prompt.recipientCandidates || []);
  const [isSearchingRecipient, setIsSearchingRecipient] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const normalizedRecipientSearch = recipientInput.trim().replace(/^@/, '');

  const selectedToken =
    tokenOptions.find((option) => option.key === selectedTokenKey) ||
    (!hasTouchedToken ? initialToken : null);
  const chain = selectedToken
    ? normalizeWalletSendChainValue(
        selectedToken.chainId === SOLANA_CHAIN_ID
          ? 'solana'
          : selectedToken.chainName
      )
    : '';
  const trimmedAmount = amountInput.trim().replace(/^\$/, '');
  const amountNumber = Number(trimmedAmount);
  const hasValidAmount = Number.isFinite(amountNumber) && amountNumber > 0;
  const tokenBalance = Number(selectedToken?.balance || 0);
  const priceUsd = Number(selectedToken?.priceUsd || 0);
  const requiredTokenAmount =
    amountType === 'usd'
      ? priceUsd > 0
        ? amountNumber / priceUsd
        : null
      : amountNumber;
  const hasEnoughBalance =
    !selectedToken ||
    !hasValidAmount ||
    requiredTokenAmount === null ||
    !Number.isFinite(tokenBalance) ||
    tokenBalance + 0.00000001 >= requiredTokenAmount;
  const trimmedRecipient = recipientInput.trim().replace(/^@/, '');
  const canReview =
    Boolean(selectedToken) &&
    hasValidAmount &&
    hasEnoughBalance &&
    trimmedRecipient.length > 1;

  useEffect(() => {
    const baseCandidates = prompt.recipientCandidates || [];
    const query = normalizedRecipientSearch;
    const isAddressQuery =
      /^0x[a-fA-F0-9]{40}$/.test(query) ||
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);

    if (!query || query.length < 2 || isAddressQuery) {
      setRecipientResults(dedupeWalletSendDraftCandidates(baseCandidates));
      setIsSearchingRecipient(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl || !accessToken) {
      setRecipientResults(dedupeWalletSendDraftCandidates(baseCandidates));
      setIsSearchingRecipient(false);
      return;
    }

    let isCancelled = false;
    setIsSearchingRecipient(true);
    const timer = window.setTimeout(async () => {
      try {
        const url = `${apiUrl}/api/v1/user/search?q=${encodeURIComponent(
          query
        )}&userId=${user?._id || ''}&filter=all&page=1&limit=6`;
        const data = await getConnectionsUserData(url, accessToken);
        const results = Array.isArray(data?.data?.results)
          ? data.data.results
          : [];
        const searchedCandidates = results
          .map((result: WalletSendDraftSearchResult) =>
            walletSendDraftCandidateFromSearchResult(result)
          )
          .filter(
            (candidate: WalletSendDraftCandidate | null): candidate is WalletSendDraftCandidate =>
              Boolean(candidate)
          );

        if (!isCancelled) {
          setRecipientResults(
            dedupeWalletSendDraftCandidates([
              ...searchedCandidates,
              ...baseCandidates,
            ])
          );
        }
      } catch (error) {
        console.error('Failed to search Swop IDs for send draft:', error);
        if (!isCancelled) {
          setRecipientResults(dedupeWalletSendDraftCandidates(baseCandidates));
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingRecipient(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    accessToken,
    normalizedRecipientSearch,
    prompt.recipientCandidates,
    user?._id,
  ]);

  if (isDismissed) return null;

  if (isReviewing && selectedToken && canReview) {
    const recipientIsAddress =
      /^0x[a-fA-F0-9]{40}$/.test(trimmedRecipient) ||
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmedRecipient);
    const activeProposalId = `local-wallet-send-${selectedToken.symbol}-${trimmedRecipient}-${chain}`;
    const normalizedParams = {
      token: selectedToken.symbol,
      tokenSymbol: selectedToken.symbol,
      asset: selectedToken.symbol,
      amount: trimmedAmount,
      amountType,
      isUSD: amountType === 'usd',
      recipient: trimmedRecipient,
      recipientAddress: recipientIsAddress ? trimmedRecipient : undefined,
      recipientEns: recipientIsAddress ? undefined : trimmedRecipient,
      chain,
      network: chain,
    };
    const localProposal: AgentActionProposal = {
      proposalId: activeProposalId,
      action: 'wallet.send',
      toolType: 'wallet.write',
      status: 'pending',
      normalizedParams,
      riskSummary: {
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
        proposalId={activeProposalId}
        status="pending"
        canAct
        isOpen
        isPending={false}
        onApproveInline={onApproveInline}
        onInlineActionComplete={onInlineActionComplete}
        onReject={() => setIsReviewing(false)}
        onChangeNetwork={() => setIsReviewing(false)}
        astroConsoleData={astroConsoleData}
      />
    );
  }

  const showTokenList = isTokenListOpen || !selectedToken;
  return (
    <div className="mt-2 w-full max-w-[520px] border-l-2 border-[#3fe08f] pl-2 text-xs">
      <div className={`${AGENT_PANEL_CLASS} overflow-hidden rounded-[14px]`}>
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-3 py-2.5">
          <div className="min-w-0">
            <div className="dm-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#3fe08f]">
              wallet send
            </div>
            <div className="mt-1 truncate text-[15px] font-bold text-[#eceef2]">
              Set up your transfer
            </div>
          </div>
          <div className="dm-mono flex shrink-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
            <span className="rounded-full bg-[#3fe08f] px-1.5 py-0.5 text-[#031008]">
              1 token
            </span>
            <span>—</span>
            <span>2 details</span>
            <span>—</span>
            <span>3 confirm</span>
          </div>
        </div>
        <div className="grid gap-2.5 p-3">
          <div className={TICKET_LABEL_CLASS}>pay with · main wallet</div>
          {!showTokenList && selectedToken ? (
            <button
              type="button"
              onClick={() => setIsTokenListOpen(true)}
              className="dm-btn flex items-center justify-between gap-3 rounded-[10px] border border-[#3fe08f]/30 bg-[#3fe08f]/10 px-3 py-2 text-left hover:bg-[#3fe08f]/15"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="dm-mono flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[12px] font-bold text-[#3fe08f]">
                  {selectedToken.symbol.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-[#eceef2]">
                    {selectedToken.symbol} · {selectedToken.chainName}
                  </div>
                  <div className="dm-mono mt-0.5 truncate text-[10px] text-[#5a5e69]">
                    {selectedToken.balance
                      ? `${formatSwapAmount(selectedToken.balance)} ${
                          selectedToken.symbol
                        }`
                      : 'balance unavailable'}
                    {selectedToken.usdValue
                      ? ` · ${formatCompactUsd(selectedToken.usdValue)}`
                      : ''}
                  </div>
                </div>
              </div>
              <span className="dm-mono shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
                change
              </span>
            </button>
          ) : tokenOptions.length ? (
            <div className="grid max-h-60 gap-2 overflow-y-auto pr-0.5">
              {tokenOptions.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  onClick={() => {
                    setSelectedTokenKey(option.key);
                    setHasTouchedToken(true);
                    setIsTokenListOpen(false);
                  }}
                  className="dm-btn flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2 text-left hover:border-[#3fe08f]/35 hover:bg-[#3fe08f]/10"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="dm-mono flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.1] bg-black/40 text-[12px] font-bold text-[#eceef2]">
                      {option.symbol.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-bold text-[#eceef2]">
                        {option.symbol}
                      </div>
                      <div className="dm-mono mt-0.5 truncate text-[10px] text-[#5a5e69]">
                        {option.chainName}
                      </div>
                    </div>
                  </div>
                  <div className="dm-mono shrink-0 text-right text-[11px] font-semibold text-[#9396a0]">
                    {option.balance
                      ? `${formatSwapAmount(option.balance)} ${option.symbol}`
                      : '—'}
                    {(option.usdValue || 0) > 0 && (
                      <div className="text-[#3fe08f]">
                        {formatCompactUsd(option.usdValue || 0)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : isFundingBalanceLoading ? (
            <div className="rounded-[10px] border border-white/[0.07] bg-black/25 px-3 py-2 text-[11px] font-semibold text-[#a9adb8]">
              Loading main wallet balances...
            </div>
          ) : (
            <div className="rounded-[10px] border border-[#ffcc66]/25 bg-[#ffcc66]/10 px-3 py-2 text-[11px] font-semibold text-[#ffd17a]">
              <div>
                No token balances were found in your main wallet.
              </div>
              <button
                type="button"
                onClick={() => connectWallet()}
                className="dm-btn mt-2 inline-flex h-8 items-center justify-center rounded-[9px] border border-[#ffd17a]/30 bg-[#ffd17a]/10 px-3 text-[11px] font-bold text-[#ffe2a5] hover:bg-[#ffd17a]/15"
              >
                Connect wallet
              </button>
            </div>
          )}
          <div className={TICKET_LABEL_CLASS}>amount</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder={
                amountType === 'usd'
                  ? 'amount in USD'
                  : `amount in ${selectedToken?.symbol || 'tokens'}`
              }
              className={`${TICKET_MONO_FIELD_CLASS} w-full flex-1`}
            />
            <button
              type="button"
              onClick={() =>
                setAmountType((current) =>
                  current === 'usd' ? 'token' : 'usd'
                )
              }
              className="dm-btn dm-mono inline-flex h-9 shrink-0 items-center justify-center rounded-[9px] border border-white/[0.07] bg-black/25 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a9adb8] hover:bg-white/[0.05]"
            >
              {amountType === 'usd' ? 'USD' : selectedToken?.symbol || 'TOKEN'}
            </button>
            {selectedToken?.balance && (
              <button
                type="button"
                onClick={() => {
                  setAmountType('token');
                  setAmountInput(String(selectedToken.balance));
                }}
                className="dm-btn dm-mono inline-flex h-9 shrink-0 items-center justify-center rounded-[9px] border border-[#3fe08f]/25 bg-[#3fe08f]/10 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#3fe08f] hover:bg-[#3fe08f]/15"
              >
                max
              </button>
            )}
          </div>
          {selectedToken && hasValidAmount && !hasEnoughBalance && (
            <div className="rounded-[9px] border border-[#ffcc66]/25 bg-[#ffcc66]/10 px-3 py-2 text-[11px] font-semibold text-[#ffd17a]">
              Not enough {selectedToken.symbol} on {selectedToken.chainName} —
              you have {formatSwapAmount(String(tokenBalance))}{' '}
              {selectedToken.symbol}.
            </div>
          )}
          <div className={TICKET_LABEL_CLASS}>recipient</div>
          <div className="rounded-[10px] border border-white/[0.07] bg-black/25">
            <div className="flex items-center gap-2 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#5a5e69]" />
              <input
                type="text"
                value={recipientInput}
                onChange={(event) => setRecipientInput(event.target.value)}
                placeholder="search swop.id or paste wallet address"
                className="dm-mono min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#eceef2] outline-none placeholder:text-[#5a5e69]"
              />
              {isSearchingRecipient && (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#3fe08f]" />
              )}
            </div>
            {recipientResults.length > 0 && (
              <div className="grid gap-1 border-t border-white/[0.06] p-1.5">
                {recipientResults.slice(0, 5).map((candidate) => {
                  const swopId = formatWalletSendDraftSwopId(candidate.swopId);
                  return (
                    <button
                      type="button"
                      key={swopId}
                      onClick={() => setRecipientInput(swopId)}
                      className="dm-btn flex items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-left hover:bg-[#3fe08f]/10"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-bold text-[#eceef2]">
                          {candidate.displayName || swopId}
                        </div>
                        <div className="dm-mono mt-0.5 truncate text-[10px] font-semibold text-[#3fe08f]">
                          {swopId}
                        </div>
                      </div>
                      {Boolean(candidate.capabilities?.length) && (
                        <div className="dm-mono shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5a5e69]">
                          {candidate.capabilities?.join(' + ')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className={TICKET_REJECT_BUTTON_CLASS}
            >
              Dismiss
            </button>
            <button
              type="button"
              disabled={!canReview}
              onClick={() => setIsReviewing(true)}
              className={TICKET_PRIMARY_BUTTON_CLASS}
            >
              Review send
            </button>
          </div>
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
  POLYGON: '137',
  SEPOLIA: '11155111',
  SOLANA: SOLANA_CHAIN_ID,
};

const CHAT_SWAP_CHAIN_NAMES: Record<string, string> = {
  '1': 'Ethereum',
  '8453': 'Base',
  '42161': 'Arbitrum',
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

function getTokenUnitPriceUsd(token?: Partial<TokenData> | null) {
  const price = Number(token?.marketData?.price || token?.nativeTokenPrice || 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
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
  autoFetchQuote = true,
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
  autoFetchQuote?: boolean;
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
  const reverseFromOption = selectedToOption
    ? walletFromOptions.find((option) => option.key === selectedToOption.key) ||
      walletFromOptions.find(
        (option) =>
          option.chainId === selectedToOption.chainId &&
          normalizeSwapSymbol(option.symbol) ===
            normalizeSwapSymbol(selectedToOption.symbol)
      ) ||
      null
    : null;
  const reverseToOption = selectedFromOption
    ? quoteTokenOptions.find((option) => option.key === selectedFromOption.key) ||
      quoteTokenOptions.find(
        (option) =>
          option.chainId === selectedFromOption.chainId &&
          normalizeSwapSymbol(option.symbol) ===
            normalizeSwapSymbol(selectedFromOption.symbol)
      ) ||
      null
    : null;
  const handleReverseSwapTokens = () => {
    if (!selectedFromOption || !selectedToOption) {
      const missingSide = !selectedFromOption ? 'from' : 'to';
      setOpenTokenSelector(missingSide);
      setSwapError(
        !selectedFromOption && !selectedToOption
          ? 'Pick the tokens for both sides before reversing this swap.'
          : !selectedFromOption
          ? 'Pick a token to pay with before reversing this swap.'
          : 'Pick a token to receive before reversing this swap.'
      );
      return;
    }

    if (!reverseFromOption || !reverseToOption) {
      setSwapError(
        `You need a spendable ${selectedToOption.symbol} balance to swap from ${selectedToOption.symbol}.`
      );
      return;
    }

    quoteRequestIdRef.current += 1;
    setOpenTokenSelector(null);
    setSwapError(null);
    setQuoteState({ status: 'idle' });
    setSelectedFromKey(reverseFromOption.key);
    setSelectedToKey(reverseToOption.key);

    if (
      amountType !== 'usd' &&
      quoteState.status === 'success' &&
      quoteState.outputAmount
    ) {
      const outputAmount = Number(quoteState.outputAmount);
      if (Number.isFinite(outputAmount) && outputAmount > 0) {
        setAmountInput(formatSwapAmountInputValue(outputAmount));
      }
    }
  };

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
    if (!autoFetchQuote) {
      quoteRequestIdRef.current += 1;
      setQuoteState((previous) =>
        previous.status === 'loading' ? { status: 'idle' } : previous
      );
      return;
    }

    const quoteDelayMs = payAmount ? 450 : 0;
    const timeoutId = window.setTimeout(() => {
      void fetchSwapQuote();
    }, quoteDelayMs);
    return () => window.clearTimeout(timeoutId);
  }, [autoFetchQuote, fetchSwapQuote, payAmount]);

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
  const swapHeaderMeta = `${fromToken} to ${toToken} · ${displayRouteLabel}`;
  const fromSelectorEmptyMessage =
    astroConsoleData.isWalletPortfolioBalanceLoading
      ? 'Loading wallet tokens...'
      : 'No spendable wallet tokens found. Fund or connect a wallet before swapping.';
  const toSelectorEmptyMessage = 'No quote tokens available.';
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
    : 'Sign & approve';
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
        error instanceof Error ? error.message : 'Failed to approve swap.';
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
    emphasized = false,
    emptyMessage = 'No tokens available.'
  ) => {
    const isOpenSelector = openTokenSelector === kind;
    const optionList = options.slice(0, 42);
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setSwapError(null);
            setOpenTokenSelector(isOpenSelector ? null : kind);
          }}
          aria-expanded={isOpenSelector}
          aria-haspopup="listbox"
          className={`dm-btn flex h-10 max-w-[190px] items-center gap-2 rounded-full border py-0 pl-2 pr-3 text-left transition ${
            emphasized
              ? 'border-[#3fe08f]/30 bg-[#3fe08f]/12 text-[#3fe08f]'
              : 'border-white/[0.07] bg-black/30 text-[#eceef2]'
          }`}
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
                {emptyMessage}
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
            {swapHeaderMeta}
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
              setSelectedFromKey,
              false,
              fromSelectorEmptyMessage
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
          <button
            type="button"
            onClick={handleReverseSwapTokens}
            disabled={!isOpen || isSwapBusy}
            aria-label="Swap buy and sell tokens"
            title="Swap buy and sell tokens"
            className="dm-btn grid h-8 w-8 place-items-center rounded-[10px] border border-white/[0.07] bg-black/40 text-[#3fe08f] transition hover:border-[#3fe08f]/35 hover:bg-[#3fe08f]/10 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 rotate-90" />
          </button>
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
              true,
              toSelectorEmptyMessage
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

function optionalTicketNumber(value: unknown) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
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

function hasHydratedHyperliquidPositionParams(params: Record<string, unknown>) {
  return Boolean(
    firstTicketValue(params, [
      'positionSizeCoins',
      'sizeCoins',
      'coinSize',
      'sz',
      'totalSize',
      'size',
    ]) &&
      firstTicketValue(params, ['entryPrice', 'price', 'markPrice']) &&
      firstTicketValue(params, ['assetIndex', 'assetId', 'a'])
  );
}

function hydrateHyperliquidPositionTpSlParams(
  params: Record<string, unknown>,
  positions: HLPosition[] | undefined,
  markets: HLMarket[]
) {
  const isPositionTpsl = initialTicketBool(params, ['positionTpsl'], false);
  const orderMode = initialTicketMode(params);
  const hasRiskPrice = Boolean(
    firstTicketValue(params, ['takeProfitPrice', 'takeProfit', 'tpPrice', 'tp']) ||
      firstTicketValue(params, ['stopLossPrice', 'stopLoss', 'slPrice', 'sl'])
  );

  if (!isPositionTpsl || orderMode !== 'tpsl' || !hasRiskPrice) return params;
  if (hasHydratedHyperliquidPositionParams(params)) return params;

  const options = getPerpsPositionPromptOptions({ params }, positions, markets);
  if (options.length !== 1) return params;

  return getPerpsPositionIntentWithOption({ params }, options[0]).params;
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
  const feedSmartsiteId = resolvePerpsFeedSmartsiteId(user, primaryMicrosite);
  const queryClient = useQueryClient();
  const params = useMemo(
    () => {
      const mergedParams = mergeMissingHyperliquidPromptParams(
        proposal?.normalizedParams,
        sourceText
      );
      return hydrateHyperliquidPositionTpSlParams(
        mergedParams,
        astroConsoleData.perpsAccount?.positions,
        astroConsoleData.perpsMarkets
      );
    },
    [
      proposal?.normalizedParams,
      sourceText,
      astroConsoleData.perpsAccount?.positions,
      astroConsoleData.perpsMarkets,
    ]
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
  const [closeAfterSignerReady, setCloseAfterSignerReady] = useState(false);
  const closeAfterSignerSubmittedRef = useRef(false);
  const closePositionHandlerRef = useRef<(() => Promise<void>) | null>(null);

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
    setCloseAfterSignerReady(false);
    closeAfterSignerSubmittedRef.current = false;
  }, [params, proposalId, isClosePosition]);

  const requestedAssetIndex = optionalTicketNumber(
    firstTicketValue(params, ['assetIndex', 'assetId', 'a'])
  );
  const requestedDex = firstTicketValue(params, ['dex', 'marketDex']);
  const requestedIndexMarket =
    requestedAssetIndex !== null
      ? astroConsoleData.perpsMarkets.find(
          (market) => market.index === requestedAssetIndex
        )
      : undefined;
  const requestedDexMarket = requestedDex
    ? astroConsoleData.perpsMarkets.find(
        (market) =>
          normalizeHyperliquidDex(getHyperliquidMarketDex(market)) ===
            normalizeHyperliquidDex(requestedDex) &&
          perpsCoinMatches(market.coin, coin)
      )
    : undefined;
  const candidateSelectedMarket =
    requestedIndexMarket ||
    requestedDexMarket ||
    perpsMarketForCoin(astroConsoleData.perpsMarkets, coin);
  const requestedCloseSide = initialTicketSide(params);
  const closeHasExactMarketIdentity =
    Boolean(requestedDex) || requestedAssetIndex !== null;
  const matchingClosePosition = isClosePosition
    ? astroConsoleData.perpsAccount?.positions.find((position) => {
        if (Math.abs(toFiniteNumber(position.szi)) <= 0) return false;
        if (
          closeHasExactMarketIdentity &&
          candidateSelectedMarket &&
          !hyperliquidMarketMatchesPosition(candidateSelectedMarket, position)
        ) {
          return false;
        }
        if (
          !perpsCoinMatches(
            position.coin,
            candidateSelectedMarket?.coin || coin
          )
        ) {
          return false;
        }
        if (requestedCloseSide !== 'long' && requestedCloseSide !== 'short') {
          return true;
        }
        return getPerpsPositionSide(position) === requestedCloseSide;
      }) || null
    : null;
  const matchingClosePositionDex = matchingClosePosition
    ? getHyperliquidPositionDex(matchingClosePosition)
    : '';
  const matchingCloseMarket = matchingClosePosition
    ? hyperliquidMarketForPosition(astroConsoleData.perpsMarkets, {
        coin: matchingClosePosition.coin,
        dex: matchingClosePositionDex || undefined,
        assetIndex:
          requestedAssetIndex !== null ? requestedAssetIndex : undefined,
      })
    : undefined;
  const selectedMarket =
    isClosePosition && matchingClosePosition
      ? matchingCloseMarket ||
        (matchingClosePositionDex || requestedAssetIndex !== null
          ? undefined
          : candidateSelectedMarket)
      : candidateSelectedMarket;
  const closeAssetIndex =
    selectedMarket?.index ?? (isClosePosition ? requestedAssetIndex : null);
  const hasCloseAssetIndex =
    closeAssetIndex !== null && Number.isFinite(closeAssetIndex);
  const markPrice = getPerpsMarkPrice(coin, selectedMarket);
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
  const isPerpsSignerRestoring = Boolean(
    astroConsoleData.isPerpsAgentHydrating ||
      astroConsoleData.isPerpsAgentReconnecting
  );
  const marketIsLoading =
    !selectedMarket && Boolean(astroConsoleData.isPerpsMarketsLoading);
  const marketUnavailable =
    !selectedMarket &&
    !marketIsLoading &&
    (astroConsoleData.perpsMarkets.length > 0 ||
      Boolean(astroConsoleData.perpsMarketsError));
  const actionMarketIsLoading =
    isClosePosition && hasCloseAssetIndex ? false : marketIsLoading;
  const actionMarketUnavailable =
    isClosePosition && hasCloseAssetIndex ? false : marketUnavailable;
  const isTicketActionBusy =
    flow === 'authorizing' || flow === 'opening' || closeAfterSignerReady;
  const isAuthorizingSigner =
    flow === 'authorizing' || astroConsoleData.isPerpsAgentInitializing;
  const isAgentBusy =
    isAuthorizingSigner ||
    isPerpsSignerRestoring ||
    astroConsoleData.isPerpsSubmitting ||
    isTicketActionBusy;
  const closePositionUnavailable =
    isClosePosition &&
    !astroConsoleData.isPerpsLoading &&
    closeSizeCoinsValue <= 0;
  const closeSubmitBlockReason = !isClosePosition
    ? null
    : !canTradeInChat
    ? 'This close ticket is no longer pending.'
    : !canAct
    ? 'Only the user who asked Astro to prepare this close can approve it.'
    : !hasCloseAssetIndex
    ? `No Hyperliquid market data found for ${displayPerpsCoin(
        selectedMarket?.coin || coin
      )}-PERP. Try refreshing positions.`
    : closeSizeCoinsValue <= 0
    ? 'No matching open perps position was found to close.'
    : closeMarkPrice <= 0
    ? 'Mark price unavailable. Wait for market data to refresh.'
    : null;
  const closeCanSubmit = Boolean(isClosePosition && !closeSubmitBlockReason);
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
  const primaryActionDisabled =
    isAgentBusy ||
    actionMarketUnavailable ||
    (isClosePosition
      ? Boolean(closeSubmitBlockReason)
      : !canSubmit &&
        !canDepositForOrder &&
        astroConsoleData.isPerpsAgentInitialized);
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
    isPerpsSignerRestoring
      ? 'Restoring perps signer...'
      : isAuthorizingSigner
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
      : actionMarketIsLoading
      ? 'Loading market'
      : actionMarketUnavailable
      ? 'Market unavailable'
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
    queueAgentActionClientEvent(
      {
        proposalId,
        stage: 'button_clicked',
        action: 'perps.close_position',
        toolType: 'perps.write',
        provider: 'hyperliquid',
        uiSurface: 'astro_inline_close_position',
        context: {
          coin,
          closeAssetIndex,
          closeCanSubmit,
          closeSubmitBlockReason,
          localProposalId: isLocalHyperliquidCloseProposalId(proposalId),
        },
      },
      accessToken,
    );

    if (
      closeSubmitBlockReason ||
      closeAssetIndex === null ||
      !Number.isFinite(closeAssetIndex)
    ) {
      queueAgentActionClientEvent(
        {
          proposalId,
          stage: 'blocked',
          action: 'perps.close_position',
          toolType: 'perps.write',
          provider: 'hyperliquid',
          uiSurface: 'astro_inline_close_position',
          status: 'blocked',
          reason:
            closeSubmitBlockReason ||
            'This close ticket is missing Hyperliquid market data.',
          context: {
            coin,
            closeAssetIndex,
          },
        },
        accessToken,
      );
      setLocalError(
        closeSubmitBlockReason ||
          'This close ticket is missing Hyperliquid market data.'
      );
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
        closeAfterSignerSubmittedRef.current = false;
        setCloseAfterSignerReady(true);
        setFlow('order');
      } catch (error) {
        queueAgentActionClientEvent(
          {
            proposalId,
            stage: 'execution_failed',
            action: 'perps.close_position',
            toolType: 'perps.write',
            provider: 'hyperliquid',
            uiSurface: 'astro_inline_close_position',
            status: 'failed',
            reason: 'Could not enable Perps trading before close.',
            error,
            context: { coin },
          },
          accessToken,
        );
        setFlow('order');
        setCloseAfterSignerReady(false);
        closeAfterSignerSubmittedRef.current = false;
        setLocalError(
          error instanceof Error
            ? error.message
            : 'Could not enable Perps trading.'
        );
      }
      return;
    }

    if (!closeCanSubmit) {
      queueAgentActionClientEvent(
        {
          proposalId,
          stage: 'blocked',
          action: 'perps.close_position',
          toolType: 'perps.write',
          provider: 'hyperliquid',
          uiSurface: 'astro_inline_close_position',
          status: 'blocked',
          reason: 'Close ticket is not currently submittable.',
          context: {
            coin,
            closeCanSubmit,
            closeSubmitBlockReason,
            closeAfterSignerReady,
          },
        },
        accessToken,
      );
      return;
    }
    const executableCloseAssetIndex = closeAssetIndex;
    const closeCoin = selectedMarket?.coin || matchingClosePosition?.coin || coin;
    let telemetryExecutionProposalId = proposalId;

    setLocalError(null);
    astroConsoleData.clearPerpsTradingError();
    setFlow('opening');

    try {
      const approvalParams = {
        coin: closeCoin,
        asset: closeCoin,
        assetIndex: executableCloseAssetIndex,
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
      telemetryExecutionProposalId = executionProposalId;
      const shouldReportCompletion =
        !isLocalHyperliquidCloseProposalId(executionProposalId);
      if (shouldReportCompletion) {
        persistAgentActionHandoff(approvalResult);
      } else {
        queueAgentActionClientEvent(
          {
            proposalId: executionProposalId,
            stage: 'completion_skipped',
            action: 'perps.close_position',
            toolType: 'perps.write',
            provider: 'hyperliquid',
            uiSurface: 'astro_inline_close_position',
            status: 'blocked',
            reason: 'Local close proposal executes on the client without backend completion.',
            context: { sourceProposalId: proposalId, coin: closeCoin },
          },
          accessToken,
        );
      }

      queueAgentActionClientEvent(
        {
          proposalId: executionProposalId,
          stage: 'execution_started',
          action: 'perps.close_position',
          toolType: 'perps.write',
          provider: 'hyperliquid',
          uiSurface: 'astro_inline_close_position',
          context: {
            coin: closeCoin,
            assetIndex: executableCloseAssetIndex,
            sizeCoins: closeSize,
            side: closePositionSide,
          },
        },
        accessToken,
      );
      const orderResult = await astroConsoleData.closePerpsPosition(
        executableCloseAssetIndex,
        closeSize,
        closePositionSide === 'long',
        String(closeMarkPrice)
      );

      const orderId = extractInlineHyperliquidOrderId(orderResult);
      const closed = buildCloseReceipt(orderId);
      const closeFeedDex =
        getHyperliquidMarketDex(selectedMarket) || matchingClosePositionDex;
      const closeFeedCoin = qualifyPerpsPositionCoin({
        coin: closeCoin,
        dex: closeFeedDex,
      });
      await upsertPerpsPositionFeed({
        token: accessToken,
        userId: user?._id,
        smartsiteId: feedSmartsiteId,
        content: {
          provider: 'hyperliquid',
          positionKey: buildPerpsPositionKey({
            userId: user?._id,
            masterAddress: astroConsoleData.perpsMasterAddress,
            coin: closeCoin,
            dex: closeFeedDex,
          }),
          coin: closeFeedCoin,
          dex: closeFeedDex || null,
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
          assetIndex: executableCloseAssetIndex,
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
      if (shouldReportCompletion) {
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
      }

      await queryClient.invalidateQueries({ queryKey: ['hl-positions'] });
      queueAgentActionClientEvent(
        {
          proposalId: executionProposalId,
          stage: 'execution_succeeded',
          action: 'perps.close_position',
          toolType: 'perps.write',
          provider: 'hyperliquid',
          uiSurface: 'astro_inline_close_position',
          context: {
            coin: closeCoin,
            orderId,
            localProposalId: isLocalHyperliquidCloseProposalId(executionProposalId),
          },
        },
        accessToken,
      );
      setReceipt(closed);
      setFlow('opened');
      onInlineActionComplete(completion);
      toast.success('Perps close order sent.');
    } catch (error) {
      queueAgentActionClientEvent(
        {
          proposalId: telemetryExecutionProposalId,
          stage: 'execution_failed',
          action: 'perps.close_position',
          toolType: 'perps.write',
          provider: 'hyperliquid',
          uiSurface: 'astro_inline_close_position',
          status: 'failed',
          error,
          context: { coin },
        },
        accessToken,
      );
      const message =
        error instanceof Error ? error.message : 'Failed to close position.';
      setLocalError(message);
      setFlow('order');
      toast.error(message);
    }
  };

  useEffect(() => {
    closePositionHandlerRef.current = handleClosePosition;
  });

  useEffect(() => {
    if (!isClosePosition || !closeAfterSignerReady) return;

    if (astroConsoleData.perpsAgentError) {
      setCloseAfterSignerReady(false);
      closeAfterSignerSubmittedRef.current = false;
      setFlow('order');
      return;
    }

    if (
      closeAfterSignerSubmittedRef.current ||
      !astroConsoleData.isPerpsAgentInitialized ||
      astroConsoleData.isPerpsAgentInitializing ||
      astroConsoleData.isPerpsAgentHydrating ||
      astroConsoleData.isPerpsAgentReconnecting ||
      !closeCanSubmit
    ) {
      return;
    }

    closeAfterSignerSubmittedRef.current = true;
    setCloseAfterSignerReady(false);
    void closePositionHandlerRef.current?.();
  }, [
    astroConsoleData.isPerpsAgentHydrating,
    astroConsoleData.isPerpsAgentInitialized,
    astroConsoleData.isPerpsAgentInitializing,
    astroConsoleData.isPerpsAgentReconnecting,
    astroConsoleData.perpsAgentError,
    closeAfterSignerReady,
    closeCanSubmit,
    isClosePosition,
  ]);

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
      const isPendingLimitFeed =
        !isPositionTpsl && (orderMode === 'limit' || orderMode === 'tpsl');
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
        isPositionTpsl
          ? 'open'
          : isPendingLimitFeed
          ? 'limit'
          : existingSide && existingSide === side
          ? 'add'
          : isReducingExistingPosition && nextSizeCoins <= 0
          ? 'close'
          : isReducingExistingPosition
          ? 'reduce'
          : 'open';
      const feedStatus: PerpsPositionFeedStatus =
        feedEvent === 'limit'
          ? 'limit'
          : feedEvent === 'close'
          ? 'closed'
          : 'open';
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
        isPositionTpsl
          ? existingSizeCoins
          : feedStatus === 'closed'
          ? existingSizeCoins
          : nextSizeCoins;
      const feedCollateralUsd =
        isPositionTpsl
          ? existingMarginUsd
          : feedStatus === 'closed'
          ? existingMarginUsd
          : feedEvent === 'add'
          ? existingMarginUsd + opened.collateralUsd
          : isReducingExistingPosition
          ? existingMarginUsd * remainingRatio
          : opened.collateralUsd;
      const feedNotionalUsd =
        isPositionTpsl
          ? existingNotionalUsd
          : feedStatus === 'closed'
          ? existingNotionalUsd
          : feedEvent === 'add'
          ? existingNotionalUsd + opened.notionalUsd
          : isReducingExistingPosition
          ? nextSizeCoins * opened.entryPrice
          : opened.notionalUsd;

      if (!isPositionTpsl || existingPosition) {
        const feedDex = getHyperliquidMarketDex(selectedMarket);
        const feedCoin = qualifyPerpsPositionCoin({ coin, dex: feedDex });
        await upsertPerpsPositionFeed({
          token: accessToken,
          userId: user?._id,
          smartsiteId: feedSmartsiteId,
          content: {
            provider: 'hyperliquid',
            positionKey: buildPerpsPositionKey({
              userId: user?._id,
              masterAddress: astroConsoleData.perpsMasterAddress,
              coin,
              dex: feedDex,
            }),
            coin: feedCoin,
            dex: feedDex || null,
            side: feedSide,
            status: feedStatus,
            event: feedEvent,
            leverage: leverageValue,
            marginMode: isCross ? 'cross' : 'isolated',
            entryPrice: feedEntryPrice,
            limitPrice: feedStatus === 'limit' ? opened.entryPrice : undefined,
            markPrice: opened.entryPrice,
            exitPrice: feedStatus === 'closed' ? opened.entryPrice : undefined,
            liquidationPrice,
            collateralUsd: feedCollateralUsd,
            notionalUsd: feedNotionalUsd,
            sizeCoins: feedSizeCoins,
            returnPct: toFiniteNumber(existingPosition?.returnOnEquity) * 100,
            unrealizedPnl: toFiniteNumber(existingPosition?.unrealizedPnl),
            feeUsd: opened.feeUsd,
            takeProfitPrice:
              showTriggerControls && hasTakeProfit
                ? takeProfitValue
                : undefined,
            stopLossPrice:
              showTriggerControls && hasStopLoss ? stopLossValue : undefined,
            orderId: orderId ? String(orderId) : undefined,
            masterAddress: astroConsoleData.perpsMasterAddress,
            limitPlacedAt: feedStatus === 'limit' ? opened.placedAt : undefined,
            updatedAt: opened.placedAt,
            openedAt:
              existingPosition || feedStatus === 'limit'
                ? undefined
                : opened.placedAt,
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
          marketIsLoading ||
          marketUnavailable ||
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
            ) : actionMarketIsLoading ? (
              'Loading Hyperliquid market data...'
            ) : actionMarketUnavailable ? (
              astroConsoleData.perpsMarketsError ||
              `No Hyperliquid market data found for ${ticketDisplayCoin}-PERP. Try another market.`
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
            disabled={primaryActionDisabled}
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
            disabled={!canAct || isAgentBusy || isPending || status !== 'pending'}
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
  const labels: Record<string, string> = {
    'strategy.setup': 'Strategy setup',
    'strategy.draft': 'Strategy draft',
    'strategy.pause': 'Pause strategy',
    'strategy.revoke': 'Revoke strategy access',
    'strategy.status': 'Strategy status',
  };
  if (labels[action]) return labels[action];
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
  if (nextStep === 'strategy_funding_required') {
    return 'Strategy approved. Fund the Goldman Sacks vault to activate it.';
  }
  if (nextStep === 'strategy_review_required') {
    return 'Review the missing strategy fields before activating.';
  }
  return nextStep || null;
}
