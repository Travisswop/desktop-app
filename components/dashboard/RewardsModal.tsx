"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock3,
  ExternalLink,
  Gift,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import CustomModal from "@/components/modal/CustomModal";
import { useToast } from "@/hooks/use-toast";
import {
  claimRewardWallet,
  fetchCopyTradeRewards,
} from "@/lib/wallet/rewardsApi";

const muted = "#6e6e76";
const hair = "rgba(0,0,0,0.06)";
const positive = "#2fa66f";
const positiveSoft = "rgba(47,166,111,0.12)";
const amber = "#b8662f";
const amberSoft = "rgba(184,102,47,0.11)";
const graySoft = "rgba(0,0,0,0.05)";

type RewardToken = {
  symbol?: string;
  mint?: string;
  chain?: string;
  decimals?: number;
  amount?: number;
  priceUsd?: number;
  tokenImg?: string;
};

type RewardWalletData = {
  token?: RewardToken;
  claimableAmount?: number;
  claimableUsd?: number;
  pendingAmount?: number;
  pendingUsd?: number;
  claimedAmount?: number;
  claimedUsd?: number;
  lifetimeEarnedAmount?: number;
  lifetimeEarnedUsd?: number;
  lastCreditAt?: string | null;
  lastClaimAt?: string | null;
};

type RewardClaimData = {
  _id?: string;
  amount?: number;
  estimatedUsd?: number;
  destinationWallet?: string;
  status?: string;
  payoutTransactionHash?: string;
  createdAt?: string;
  requestedAt?: string;
  paidAt?: string;
};

type CopyTradeReward = {
  _id?: string;
  sourcePostId?: string;
  copyPostId?: string;
  copierUserId?: string;
  transactionHash?: string;
  sourceChainId?: string;
  destinationChainId?: string;
  status?: string;
  buybackStatus?: string;
  rewardCreditStatus?: string;
  payoutMode?: string;
  collectedVia?: string;
  grossInputAmount?: number;
  estimatedFeeUsd?: number;
  feeBps?: number;
  rewardBps?: number;
  rewardUsd?: number;
  estimatedSwopAmount?: number;
  actualSwopAmount?: number;
  totalSwopBoughtAmount?: number;
  feeToken?: RewardToken;
  outputToken?: RewardToken;
  rewardToken?: RewardToken;
  payoutToken?: RewardToken;
  createdAt?: string;
  buybackCompletedAt?: string | null;
  rewardCreditedAt?: string | null;
};

type RewardsResponse = {
  rewardWallet?: RewardWalletData | null;
  pendingClaimCount?: number;
  claimCount?: number;
  paidClaimCount?: number;
  recentClaims?: RewardClaimData[];
  rewards?: CopyTradeReward[];
};

type TradeGroup = {
  key: string;
  label: string;
  sub: string;
  copiers: number;
  volumeUsd: number;
  earnedSwop: number;
  status: "active" | "pending" | "confirmed" | "failed";
  color: string;
};

export default function RewardsModal({
  accessToken,
  destinationWallet,
  onOpenChange,
  open,
}: {
  accessToken?: string | null;
  destinationWallet: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { toast } = useToast();
  const [rewardWallet, setRewardWallet] =
    useState<RewardWalletData | null>(null);
  const [pendingClaimCount, setPendingClaimCount] = useState(0);
  const [claimCount, setClaimCount] = useState(0);
  const [paidClaimCount, setPaidClaimCount] = useState(0);
  const [recentClaims, setRecentClaims] = useState<RewardClaimData[]>([]);
  const [rewards, setRewards] = useState<CopyTradeReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadRewards = useCallback(async () => {
    if (!open || !accessToken) return;

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const isCurrent = () => requestRef.current === requestId;

    setLoading(true);
    setError(null);

    const sleep = (ms: number) =>
      new Promise((resolve) => window.setTimeout(resolve, ms));

    try {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        if (!isCurrent()) return;

        try {
          const response = await fetchCopyTradeRewards(accessToken, {
            limit: 500,
          });
          const data = (await response.json().catch(() => ({}))) as
            | RewardsResponse
            | { message?: string; error?: string };

          if (!response.ok) {
            if (response.status >= 500 && attempt < 3) {
              await sleep(1200 * attempt);
              continue;
            }
            throw new Error(
              "message" in data
                ? data.message || data.error || "Could not load rewards."
                : "Could not load rewards.",
            );
          }

          if (isCurrent()) {
            const payload = data as RewardsResponse;
            setRewardWallet(payload.rewardWallet || null);
            setPendingClaimCount(Number(payload.pendingClaimCount || 0));
            setClaimCount(Number(payload.claimCount || 0));
            setPaidClaimCount(Number(payload.paidClaimCount || 0));
            setRecentClaims(
              Array.isArray(payload.recentClaims)
                ? payload.recentClaims
                : [],
            );
            setRewards(Array.isArray(payload.rewards) ? payload.rewards : []);
          }
          return;
        } catch (err) {
          if (err instanceof TypeError && attempt < 3) {
            await sleep(1200 * attempt);
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      if (isCurrent()) {
        setError(err instanceof Error ? err.message : "Could not load rewards.");
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [accessToken, open]);

  useEffect(() => {
    if (open) {
      void loadRewards();
    }
  }, [loadRewards, open]);

  const handleClaim = useCallback(async () => {
    if (!accessToken) {
      toast({
        description: "Please log in again to claim SWOP rewards.",
        title: "Rewards unavailable",
        variant: "destructive",
      });
      return;
    }

    if (!destinationWallet) {
      toast({
        description: "Connect a Solana wallet before claiming SWOP rewards.",
        title: "Solana wallet required",
        variant: "destructive",
      });
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const response = await claimRewardWallet(
        accessToken,
        destinationWallet,
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Could not request reward claim.",
        );
      }

      setRewardWallet(data.rewardWallet || null);
      await loadRewards();

      const paid = data?.claim?.status === "paid";
      toast({
        description: paid
          ? "Your SWOP rewards were sent from the rewards vault."
          : "Your SWOP reward claim is queued for vault payout.",
        title: paid ? "SWOP claimed" : "Claim requested",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not request reward claim.";
      setError(message);
      toast({
        description: message,
        title: "Claim failed",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  }, [accessToken, destinationWallet, loadRewards, toast]);

  const stats = useMemo(
    () =>
      buildRewardStats({
        claimCount,
        paidClaimCount,
        pendingClaimCount,
        rewardWallet,
        rewards,
      }),
    [claimCount, paidClaimCount, pendingClaimCount, rewardWallet, rewards],
  );
  const tokenSymbol = rewardWallet?.token?.symbol || "SWOP";
  const canClaim =
    stats.claimableSwop > 0 && Boolean(destinationWallet) && !claiming;

  return (
    <CustomModal
      ariaLabel="SWOP rewards"
      contentClassName="max-h-[88vh] overflow-y-auto"
      isOpen={open}
      onCloseModal={() => onOpenChange(false)}
      panelClassName="rounded-[24px] bg-[#f4f4f2] shadow-[0_20px_90px_rgba(0,0,0,0.24)]"
      removeCloseButton
      width="max-w-6xl"
    >
      <div className="px-4 py-4 font-inter text-[#0a0a0c] sm:px-7 sm:py-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.05em] sm:text-[38px]">
              Rewards
            </h2>
            <p className="mt-1 text-[15px] font-medium text-[#7b7b84]">
              SWOP from copy-trade fee buybacks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Refresh rewards"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#8c8c94] shadow-[0_1px_2px_rgba(10,10,12,0.05),0_8px_24px_-16px_rgba(10,10,12,0.20)] transition hover:text-[#0a0a0c] disabled:opacity-50"
              disabled={loading}
              onClick={loadRewards}
              type="button"
            >
              <RefreshCw
                className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              aria-label="Close rewards"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#8c8c94] shadow-[0_1px_2px_rgba(10,10,12,0.05),0_8px_24px_-16px_rgba(10,10,12,0.20)] transition hover:text-[#0a0a0c]"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-[rgba(229,72,77,0.16)] bg-[rgba(229,72,77,0.06)] px-4 py-3 text-[13px] font-semibold text-[#b4232a]">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[22px] border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_18px_44px_-28px_rgba(10,10,12,0.28)]">
          <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
            <div className="flex min-w-0 items-center gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[rgba(47,166,111,0.20)] bg-[rgba(47,166,111,0.10)] text-[#2fa66f]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <RewardLabel>Claimable</RewardLabel>
                <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-2">
                  <RewardNumber className="text-[40px] sm:text-[50px]">
                    {formatRewardAmount(stats.claimableSwop)}
                  </RewardNumber>
                  <span className="text-[22px] font-semibold tracking-[-0.04em]">
                    {tokenSymbol}
                  </span>
                </div>
                <p className="mt-1 text-[15px] font-medium text-[#7b7b84]">
                  {formatRewardUsd(stats.claimableUsd)} ready after confirmed
                  SWOP buybacks.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:min-w-[210px]">
              <button
                aria-busy={claiming}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#f0efed] px-5 text-[15px] font-semibold text-[#0a0a0c] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_24px_-18px_rgba(10,10,12,0.35)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canClaim}
                onClick={handleClaim}
                type="button"
              >
                <Gift className="h-4 w-4" />
                {claiming ? "Claiming" : "Claim SWOP"}
              </button>
              <p className="text-center font-mono text-[11px] font-semibold text-[#a3a3aa]">
                {destinationWallet
                  ? `To ${shortAddress(destinationWallet)}`
                  : "Connect Solana wallet"}
              </p>
            </div>
          </div>

          <div className="grid border-t border-[rgba(0,0,0,0.06)] sm:grid-cols-3">
            <SummaryCell label="Status">
              <StatusPill status={stats.statusLabel} />
            </SummaryCell>
            <SummaryCell
              detail={formatRewardUsd(stats.pendingBuybackUsd)}
              label="Pending"
              value={`${formatRewardAmount(stats.pendingBuybackSwop)} ${tokenSymbol}`}
            />
            <SummaryCell
              label="Earned"
              value={`${formatRewardAmount(stats.totalEarnedSwop)} ${tokenSymbol}`}
            />
          </div>
        </section>

        <section className="mt-4 grid overflow-hidden rounded-[22px] border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_14px_36px_-26px_rgba(10,10,12,0.22)] sm:grid-cols-2 lg:grid-cols-4">
          <MetricBlock
            detail="all time"
            label="Total earned"
            suffix={tokenSymbol}
            value={formatRewardAmount(stats.totalEarnedSwop)}
          />
          <MetricBlock
            detail={`${stats.activeTradeCount} active trades`}
            label="Active copiers"
            trend={stats.activeCopierCount > 0 ? "live" : undefined}
            value={stats.activeCopierCount.toLocaleString()}
          />
          <MetricBlock
            detail={`${stats.activeTradeCount} active - ${stats.confirmedTradeCount} confirmed`}
            label="Trades copied"
            value={stats.tradeGroups.length.toLocaleString()}
          />
          <MetricBlock
            detail={`${stats.displayClaimCount.toLocaleString()} claims - ${formatRewardUsd(stats.claimedUsd)} total`}
            label="SWOP claimed"
            value={formatRewardAmount(stats.claimedSwop)}
          />
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <section className="overflow-hidden rounded-[22px] border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_14px_36px_-26px_rgba(10,10,12,0.22)]">
            <TableHeader
              label={`${stats.tradeGroups.length.toLocaleString()} trades - ${stats.activeCopierCount.toLocaleString()} copiers`}
              title="Copied Trades"
            />
            <div className="overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-[1.25fr_0.6fr_0.85fr_0.9fr_0.75fr] border-b border-[rgba(0,0,0,0.05)] bg-[#fafaf8] px-5 py-3">
                  {["Trade", "Copiers", "Vol. copied", "SWOP earned", "Status"].map(
                    (header) => (
                      <RewardLabel key={header}>{header}</RewardLabel>
                    ),
                  )}
                </div>
                {loading && !stats.tradeGroups.length ? (
                  <LoadingRows count={5} />
                ) : stats.tradeGroups.length ? (
                  stats.tradeGroups.slice(0, 8).map((trade, index) => (
                    <TradeRow
                      key={trade.key}
                      trade={trade}
                      withBorder={index < Math.min(stats.tradeGroups.length, 8) - 1}
                    />
                  ))
                ) : (
                  <EmptyPanel title="No copied trades yet" />
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[22px] border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_14px_36px_-26px_rgba(10,10,12,0.22)]">
            <TableHeader
              label={`${stats.displayClaimCount.toLocaleString()} claims`}
              title="Claim History"
            />
            {loading && !recentClaims.length ? (
              <ClaimLoadingRows count={4} />
            ) : recentClaims.length ? (
              recentClaims.slice(0, 6).map((claim, index) => (
                <ClaimRow
                  claim={claim}
                  key={claim._id || index}
                  withBorder={index < Math.min(recentClaims.length, 6) - 1}
                />
              ))
            ) : (
              <EmptyPanel title="No claims yet" />
            )}
          </section>
        </div>

        <section className="mt-4 grid overflow-hidden rounded-[22px] border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_14px_36px_-26px_rgba(10,10,12,0.22)] sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Make a trade", "Execute any swap, spot buy, or perp on Swop."],
            ["02", "Others copy it", "Followers copy your trade and fees accrue."],
            ["03", "SWOP buyback", "Accrued fees buy back SWOP tokens on-chain."],
            ["04", "Claim earnings", "Bought-back SWOP is credited to you."],
          ].map(([step, title, body]) => (
            <div
              className="border-b border-[rgba(0,0,0,0.06)] p-5 last:border-b-0 sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"
              key={step}
            >
              <RewardLabel>{step}</RewardLabel>
              <div className="mt-4 text-[17px] font-semibold tracking-[-0.02em]">
                {title}
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#7b7b84]">
                {body}
              </p>
            </div>
          ))}
        </section>
      </div>
    </CustomModal>
  );
}

function buildRewardStats({
  claimCount,
  paidClaimCount,
  pendingClaimCount,
  rewardWallet,
  rewards,
}: {
  claimCount: number;
  paidClaimCount: number;
  pendingClaimCount: number;
  rewardWallet: RewardWalletData | null;
  rewards: CopyTradeReward[];
}) {
  const activeRewards = rewards.filter(
    (reward) => !["cancelled", "failed"].includes(String(reward.status || "")),
  );
  const tradeGroups = groupTrades(activeRewards);
  const pendingRewards = activeRewards.filter((reward) =>
    isPendingRewardStatus(reward.status),
  );
  const confirmedGroups = tradeGroups.filter(
    (trade) => trade.status === "confirmed",
  ).length;
  const activeGroups = tradeGroups.filter((trade) =>
    ["active", "pending"].includes(trade.status),
  ).length;
  const activeCopiers = new Set(
    activeRewards
      .filter((reward) => !["paid", "claimed"].includes(String(reward.status || "")))
      .map((reward) => String(reward.copierUserId || reward.copyPostId || ""))
      .filter(Boolean),
  );
  const rewardTotalSwop = activeRewards.reduce(
    (total, reward) => total + rewardSwopAmount(reward),
    0,
  );
  const rewardTotalUsd = activeRewards.reduce(
    (total, reward) => total + rewardUsdAmount(reward),
    0,
  );
  const claimableSwop = rewardNumber(rewardWallet?.claimableAmount);
  const claimableUsd = rewardNumber(rewardWallet?.claimableUsd);
  const pendingClaimSwop = rewardNumber(rewardWallet?.pendingAmount);
  const pendingClaimUsd = rewardNumber(rewardWallet?.pendingUsd);
  const pendingBuybackSwop =
    pendingRewards.reduce((total, reward) => total + rewardSwopAmount(reward), 0) +
    pendingClaimSwop;
  const pendingBuybackUsd =
    pendingRewards.reduce((total, reward) => total + rewardUsdAmount(reward), 0) +
    pendingClaimUsd;
  const claimedSwop = rewardNumber(rewardWallet?.claimedAmount);
  const claimedUsd = rewardNumber(rewardWallet?.claimedUsd);
  const lifetimeSwop = rewardNumber(rewardWallet?.lifetimeEarnedAmount);
  const lifetimeUsd = rewardNumber(rewardWallet?.lifetimeEarnedUsd);
  const totalEarnedSwop = Math.max(
    lifetimeSwop + pendingBuybackSwop,
    rewardTotalSwop,
    claimableSwop + pendingBuybackSwop + claimedSwop,
  );
  const totalEarnedUsd = Math.max(
    lifetimeUsd + pendingBuybackUsd,
    rewardTotalUsd,
    claimableUsd + pendingBuybackUsd + claimedUsd,
  );
  const statusLabel =
    claimableSwop > 0 || pendingBuybackSwop > 0
      ? "Active"
      : pendingClaimSwop > 0 || pendingClaimCount > 0
        ? "Processing"
        : claimedSwop > 0
          ? "Claimed"
          : "Empty";

  return {
    activeCopierCount: activeCopiers.size,
    activeTradeCount: activeGroups,
    claimableSwop,
    claimableUsd,
    claimedSwop,
    claimedUsd,
    confirmedTradeCount: confirmedGroups,
    displayClaimCount: claimCount || paidClaimCount,
    pendingBuybackSwop,
    pendingBuybackUsd,
    statusLabel,
    totalEarnedSwop,
    totalEarnedUsd,
    tradeGroups,
  };
}

function groupTrades(rewards: CopyTradeReward[]): TradeGroup[] {
  const grouped = new Map<string, CopyTradeReward[]>();

  for (const reward of rewards) {
    const key =
      reward.sourcePostId ||
      reward.transactionHash ||
      reward.copyPostId ||
      reward._id ||
      "reward";
    grouped.set(key, [...(grouped.get(key) || []), reward]);
  }

  return Array.from(grouped.entries())
    .map(([key, rows], index) => {
      const first = rows[0] || {};
      const inputSymbol = first.feeToken?.symbol || "SWOP";
      const outputSymbol = first.outputToken?.symbol || "USDC";
      const statuses = new Set(rows.map((row) => String(row.status || "")));
      const status = getGroupStatus(statuses);
      const copiers = new Set(
        rows
          .map((row) => String(row.copierUserId || row.copyPostId || row._id || ""))
          .filter(Boolean),
      ).size;

      return {
        color: index % 2 === 0 ? positive : amber,
        copiers,
        earnedSwop: rows.reduce((total, row) => total + rewardSwopAmount(row), 0),
        key,
        label: `${inputSymbol} / ${outputSymbol}`,
        status,
        sub: tradeSubtitle(first),
        volumeUsd: rows.reduce((total, row) => total + copiedVolumeUsd(row), 0),
      };
    })
    .sort((a, b) => b.earnedSwop - a.earnedSwop || b.volumeUsd - a.volumeUsd);
}

function getGroupStatus(statuses: Set<string>): TradeGroup["status"] {
  if (
    ["credited", "claimable", "paid", "claimed"].some((status) =>
      statuses.has(status),
    )
  ) {
    return "confirmed";
  }
  if (
    ["pending_credit", "queued", "processing", "pending_verification"].some(
      (status) => statuses.has(status),
    )
  ) {
    return "pending";
  }
  if (statuses.has("failed") || statuses.has("cancelled")) {
    return "failed";
  }
  return "active";
}

function isPendingRewardStatus(status?: string) {
  return [
    "pending_buyback",
    "pending_credit",
    "pending_verification",
    "queued",
    "processing",
  ].includes(String(status || ""));
}

function rewardSwopAmount(reward: CopyTradeReward) {
  return (
    rewardNumber(reward.actualSwopAmount) ||
    rewardNumber(reward.rewardToken?.amount) ||
    rewardNumber(reward.payoutToken?.amount) ||
    rewardNumber(reward.estimatedSwopAmount)
  );
}

function rewardUsdAmount(reward: CopyTradeReward) {
  const explicitUsd = rewardNumber(reward.rewardUsd);
  if (explicitUsd > 0) return explicitUsd;

  const swop = rewardSwopAmount(reward);
  const price =
    rewardNumber(reward.rewardToken?.priceUsd) ||
    rewardNumber(reward.payoutToken?.priceUsd);

  return swop * price;
}

function copiedVolumeUsd(reward: CopyTradeReward) {
  const gross = rewardNumber(reward.grossInputAmount);
  const inputPrice = rewardNumber(reward.feeToken?.priceUsd);
  if (gross > 0 && inputPrice > 0) return gross * inputPrice;

  const feeUsd = rewardNumber(reward.estimatedFeeUsd);
  const feeBps = rewardNumber(reward.feeBps);
  if (feeUsd > 0 && feeBps > 0) return (feeUsd * 10000) / feeBps;

  const rewardUsd = rewardUsdAmount(reward);
  const rewardBps = rewardNumber(reward.rewardBps);
  if (rewardUsd > 0 && rewardBps > 0) return (rewardUsd * 10000) / rewardBps;

  return 0;
}

function tradeSubtitle(reward: CopyTradeReward) {
  const chain = String(reward.sourceChainId || "").toLowerCase();
  if (chain === "solana" || chain === "1151111081099710") return "Spot Buy";
  if (chain === "42161") return "Perp/Swap";
  return reward.collectedVia === "lifi_integrator_fee" ? "Swap" : "Copy trade";
}

function SummaryCell({
  children,
  detail,
  label,
  value,
}: {
  children?: React.ReactNode;
  detail?: string;
  label: string;
  value?: string;
}) {
  return (
    <div className="border-b border-[rgba(0,0,0,0.06)] px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <RewardLabel>{label}</RewardLabel>
      {children || (
        <>
          <RewardNumber className="mt-2 block text-[18px]">{value}</RewardNumber>
          {detail ? (
            <div className="mt-1 text-[12px] font-medium text-[#7b7b84]">
              {detail}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function MetricBlock({
  detail,
  label,
  suffix,
  trend,
  value,
}: {
  detail: string;
  label: string;
  suffix?: string;
  trend?: string;
  value: string;
}) {
  return (
    <div className="border-b border-[rgba(0,0,0,0.06)] p-5 last:border-b-0 sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0">
      <RewardLabel>{label}</RewardLabel>
      <div className="mt-4 flex min-w-0 items-baseline gap-2">
        <RewardNumber className="text-[30px]">{value}</RewardNumber>
        {suffix ? (
          <span className="font-mono text-[13px] font-semibold text-[#6e6e76]">
            {suffix}
          </span>
        ) : null}
        {trend ? (
          <span className="font-mono text-[12px] font-semibold text-[#2fa66f]">
            {trend}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-[13px] font-medium text-[#7b7b84]">
        {detail}
      </div>
    </div>
  );
}

function TableHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[rgba(0,0,0,0.06)] px-5 py-4">
      <div className="text-[18px] font-semibold tracking-[-0.03em]">
        {title}
      </div>
      <div className="font-mono text-[12px] font-semibold text-[#a3a3aa]">
        {label}
      </div>
    </div>
  );
}

function TradeRow({
  trade,
  withBorder,
}: {
  trade: TradeGroup;
  withBorder: boolean;
}) {
  const status = tradeStatusStyle(trade.status);

  return (
    <div
      className="grid grid-cols-[1.25fr_0.6fr_0.85fr_0.9fr_0.75fr] items-center gap-3 px-5 py-3.5"
      style={{ borderBottom: withBorder ? `1px solid ${hair}` : "none" }}
    >
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold tracking-[-0.02em]">
          {trade.label}
        </div>
        <div className="mt-0.5 font-mono text-[11px] font-semibold text-[#7b7b84]">
          {trade.sub}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RewardNumber className="text-[17px]">{trade.copiers}</RewardNumber>
        <MiniSparkline color={trade.color} />
      </div>
      <div className="font-mono text-[14px] font-semibold text-[#6e6e76]">
        {formatCompactUsd(trade.volumeUsd)}
      </div>
      <div className="font-mono text-[14px] font-semibold text-[#2fa66f]">
        {formatRewardAmount(trade.earnedSwop)} SWOP
      </div>
      <span
        className="justify-self-start rounded-md px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.04em]"
        style={{ backgroundColor: status.bg, color: status.fg }}
      >
        {status.label}
      </span>
    </div>
  );
}

function ClaimRow({
  claim,
  withBorder,
}: {
  claim: RewardClaimData;
  withBorder: boolean;
}) {
  const paid = claim.status === "paid";
  const dateValue = claim.paidAt || claim.requestedAt || claim.createdAt || "";
  const tx = claim.payoutTransactionHash || "";

  return (
    <div
      className="grid grid-cols-[46px_1fr_auto] items-center gap-3 px-5 py-3.5"
      style={{ borderBottom: withBorder ? `1px solid ${hair}` : "none" }}
    >
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border"
        style={{
          backgroundColor: paid ? positiveSoft : graySoft,
          borderColor: paid ? "rgba(47,166,111,0.16)" : hair,
          color: paid ? positive : muted,
        }}
      >
        {paid ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
      </span>
      <div className="min-w-0">
        <div className="font-mono text-[16px] font-semibold tracking-[-0.03em]">
          {formatRewardAmount(rewardNumber(claim.amount))} SWOP
        </div>
        <div className="mt-0.5 text-[12px] font-medium text-[#9a9aa2]">
          {formatShortDate(dateValue)}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[13px] font-semibold text-[#6e6e76]">
          {formatRewardUsd(rewardNumber(claim.estimatedUsd))}
        </div>
        {tx ? (
          <a
            className="mt-1 inline-flex items-center justify-end gap-1 font-mono text-[11px] font-semibold text-[#5277d7]"
            href={`https://solscan.io/tx/${tx}`}
            rel="noreferrer"
            target="_blank"
          >
            {shortAddress(tx)}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <div className="mt-1 font-mono text-[11px] font-semibold uppercase text-[#a3a3aa]">
            {claim.status || "requested"}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const active = status === "Active";
  return (
    <span
      className="mt-2 inline-flex rounded-md px-2.5 py-1 font-mono text-[12px] font-bold uppercase tracking-[0.04em]"
      style={{
        backgroundColor: active ? positiveSoft : graySoft,
        color: active ? positive : muted,
      }}
    >
      {status}
    </span>
  );
}

function MiniSparkline({ color }: { color: string }) {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-16"
      preserveAspectRatio="none"
      viewBox="0 0 70 28"
    >
      <path
        d="M1 25 L12 17 L23 14 L34 8 L45 11 L56 5 L69 7 L69 28 L1 28 Z"
        fill={color}
        opacity="0.10"
      />
      <path
        d="M1 25 L12 17 L23 14 L34 8 L45 11 L56 5 L69 7"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="grid grid-cols-[1.25fr_0.6fr_0.85fr_0.9fr_0.75fr] items-center gap-3 px-5 py-4"
          key={index}
          style={{ borderBottom: index < count - 1 ? `1px solid ${hair}` : "none" }}
        >
          {Array.from({ length: 5 }).map((__, cell) => (
            <div
              className="h-3 animate-pulse rounded bg-[#eeeeeb]"
              key={cell}
              style={{ width: cell === 0 ? "78%" : "58%" }}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function ClaimLoadingRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="grid grid-cols-[46px_1fr_auto] items-center gap-3 px-5 py-3.5"
          key={index}
          style={{ borderBottom: index < count - 1 ? `1px solid ${hair}` : "none" }}
        >
          <div className="h-10 w-10 animate-pulse rounded-[10px] bg-[#eeeeeb]" />
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[#eeeeeb]" />
            <div className="h-2.5 w-14 animate-pulse rounded bg-[#eeeeeb]" />
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-[#eeeeeb]" />
        </div>
      ))}
    </>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <div className="flex min-h-[170px] items-center justify-center px-5 py-8 text-center">
      <div className="text-[13px] font-semibold text-[#7b7b84]">{title}</div>
    </div>
  );
}

function RewardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a3a3aa]">
      {children}
    </div>
  );
}

function RewardNumber({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono font-semibold leading-none tracking-[-0.05em] tabular-nums ${className}`}
    >
      {children}
    </span>
  );
}

function tradeStatusStyle(status: TradeGroup["status"]) {
  if (status === "confirmed") {
    return { bg: graySoft, fg: muted, label: "Confirmed" };
  }
  if (status === "pending") {
    return { bg: amberSoft, fg: amber, label: "Pending" };
  }
  if (status === "failed") {
    return { bg: "rgba(229,72,77,0.08)", fg: "#b4232a", label: "Failed" };
  }
  return { bg: positiveSoft, fg: positive, label: "Active" };
}

function rewardNumber(value?: number | string | null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatRewardAmount(value?: number | string | null) {
  const amount = rewardNumber(value);
  if (amount >= 1000) {
    return amount.toLocaleString(undefined, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    });
  }
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: amount >= 10 ? 1 : 3,
    minimumFractionDigits: amount > 0 && amount < 1 ? 3 : 0,
  });
}

function formatRewardUsd(value?: number | string | null) {
  const amount = rewardNumber(value);
  if (amount > 0 && amount < 0.01) return "<$0.01";
  return amount.toLocaleString(undefined, {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  });
}

function formatCompactUsd(value: number) {
  const amount = rewardNumber(value);
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}m`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return formatRewardUsd(amount);
}

function formatShortDate(value?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function shortAddress(address: string) {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
