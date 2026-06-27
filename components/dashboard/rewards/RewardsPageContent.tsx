"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Gift,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/UserContext";
import {
  claimRewardWallet,
  fetchCopyTradeRewards,
} from "@/lib/wallet/rewardsApi";
import {
  useWalletAddresses,
  useWalletData,
} from "@/components/wallet/hooks/useWalletData";
import { Toaster } from "@/components/ui/toaster";

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
  token?: RewardToken;
  amount?: number;
  estimatedUsd?: number;
  destinationWallet?: string;
  status?: string;
  requestedAt?: string;
  createdAt?: string;
  paidAt?: string;
  payoutTransactionHash?: string;
};

type CopyTradeRewardData = {
  _id?: string;
  copiedTraderName?: string;
  copierUserId?: string;
  transactionHash?: string;
  sourceChainId?: string;
  destinationChainId?: string;
  status?: string;
  grossInputAmount?: number;
  estimatedFeeUsd?: number;
  rewardUsd?: number;
  estimatedSwopAmount?: number;
  actualSwopAmount?: number;
  feeToken?: RewardToken;
  payoutToken?: RewardToken;
  rewardToken?: RewardToken;
  outputToken?: RewardToken;
  createdAt?: string;
  rewardCreditedAt?: string;
  buybackCompletedAt?: string;
  paidAt?: string;
  claimedAt?: string;
};

type CopyTradeSummary = {
  pendingCreditCount?: number;
  claimableCount?: number;
  claimedCount?: number;
  pendingCreditSwop?: number;
  claimableSwop?: number;
  claimedSwop?: number;
  pendingCreditUsd?: number;
  claimableUsd?: number;
  claimedUsd?: number;
};

type RewardsResponse = {
  rewardWallet?: RewardWalletData | null;
  pendingClaimCount?: number;
  recentClaims?: RewardClaimData[];
  rewards?: CopyTradeRewardData[];
  summary?: CopyTradeSummary;
  message?: string;
  error?: string;
};

type RewardsState = {
  rewardWallet: RewardWalletData | null;
  pendingClaimCount: number;
  recentClaims: RewardClaimData[];
  rewards: CopyTradeRewardData[];
  summary: CopyTradeSummary | null;
};

const emptyRewardsState: RewardsState = {
  rewardWallet: null,
  pendingClaimCount: 0,
  recentClaims: [],
  rewards: [],
  summary: null,
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const statusTone: Record<string, string> = {
  claimable: "bg-emerald-50 text-emerald-600",
  credited: "bg-emerald-50 text-emerald-600",
  paid: "bg-emerald-50 text-emerald-600",
  active: "bg-emerald-50 text-emerald-600",
  requested: "bg-amber-50 text-amber-700",
  processing: "bg-amber-50 text-amber-700",
  pending_buyback: "bg-amber-50 text-amber-700",
  pending_credit: "bg-amber-50 text-amber-700",
  queued: "bg-amber-50 text-amber-700",
  claimed: "bg-gray-100 text-gray-500",
  failed: "bg-red-50 text-red-600",
  cancelled: "bg-gray-100 text-gray-500",
};

function rewardNumber(value?: number | string | null) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function formatRewardAmount(value?: number | string | null) {
  const amount = rewardNumber(value);
  return numberFormatter.format(amount);
}

function formatCompactAmount(value?: number | string | null) {
  const amount = rewardNumber(value);
  return amount >= 10000 ? compactFormatter.format(amount) : formatRewardAmount(amount);
}

function formatRewardUsd(value?: number | string | null) {
  const amount = rewardNumber(value);
  if (amount > 0 && amount < 0.01) return "< $0.01";
  return usdFormatter.format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return dateFormatter.format(date);
}

function shortenWallet(address?: string | null) {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function normalizeStatus(status?: string | null) {
  return (status || "active").toLowerCase();
}

function formatStatus(status?: string | null) {
  return normalizeStatus(status)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClassName(status?: string | null) {
  return statusTone[normalizeStatus(status)] || "bg-gray-100 text-gray-500";
}

function rewardSwopAmount(reward: CopyTradeRewardData) {
  return (
    rewardNumber(reward.actualSwopAmount) ||
    rewardNumber(reward.estimatedSwopAmount) ||
    rewardNumber(reward.rewardToken?.amount)
  );
}

function rewardUsdAmount(reward: CopyTradeRewardData) {
  return rewardNumber(reward.rewardUsd) || rewardNumber(reward.estimatedFeeUsd);
}

function rewardTradeName(reward: CopyTradeRewardData) {
  const base =
    reward.outputToken?.symbol ||
    reward.payoutToken?.symbol ||
    reward.feeToken?.symbol ||
    "Trade";
  const quote =
    reward.feeToken?.symbol ||
    reward.payoutToken?.symbol ||
    reward.rewardToken?.symbol ||
    "SWOP";

  if (base === quote) return base;
  return `${base} / ${quote}`;
}

function rewardTradeDescription(reward: CopyTradeRewardData) {
  const mode = reward.sourceChainId ? `${reward.sourceChainId}` : "Copy trade";
  const creditedAt =
    reward.rewardCreditedAt ||
    reward.buybackCompletedAt ||
    reward.paidAt ||
    reward.claimedAt;
  return creditedAt ? `${mode} - ${formatDate(creditedAt)}` : mode;
}

function uniqueCopierCount(rewards: CopyTradeRewardData[]) {
  const copiers = new Set(
    rewards
      .map((reward) => reward.copierUserId)
      .filter((copierId): copierId is string => Boolean(copierId)),
  );
  return copiers.size || rewards.length;
}

function countRecentRewards(rewards: CopyTradeRewardData[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return rewards.filter((reward) => {
    const createdAt = reward.createdAt ? new Date(reward.createdAt).getTime() : 0;
    return Number.isFinite(createdAt) && createdAt >= weekAgo;
  }).length;
}

function getSolscanUrl(signature?: string | null) {
  return signature ? `https://solscan.io/tx/${signature}` : "";
}

export default function RewardsPageContent() {
  const { user, accessToken, loading: userLoading } = useUser();
  const {
    user: privyUser,
    ready: privyReady,
    authenticated,
  } = usePrivy();
  const walletData = useWalletData(
    authenticated,
    privyReady,
    privyUser,
    user,
  );
  const { solWalletAddress } = useWalletAddresses(walletData);
  const { toast } = useToast();
  const requestRef = useRef(0);
  const [rewardsState, setRewardsState] =
    useState<RewardsState>(emptyRewardsState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const destinationWallet = useMemo(
    () =>
      solWalletAddress ||
      user?.solanaWallet ||
      user?.solanaAddress ||
      "",
    [solWalletAddress, user],
  );

  const fetchRewards = useCallback(async () => {
    if (!authenticated || !accessToken) {
      setRewardsState(emptyRewardsState);
      setLoading(false);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const isCurrentRequest = () => requestRef.current === requestId;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchCopyTradeRewards(accessToken, {
        limit: 100,
      });
      const data = (await response.json().catch(() => ({}))) as RewardsResponse;

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Could not load rewards.",
        );
      }

      if (!isCurrentRequest()) return;

      setRewardsState({
        rewardWallet: data.rewardWallet || null,
        pendingClaimCount: Number(data.pendingClaimCount || 0),
        recentClaims: Array.isArray(data.recentClaims)
          ? data.recentClaims
          : [],
        rewards: Array.isArray(data.rewards) ? data.rewards : [],
        summary: data.summary || null,
      });
    } catch (fetchError) {
      if (!isCurrentRequest()) return;
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Could not load rewards.",
      );
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [accessToken, authenticated]);

  useEffect(() => {
    if (userLoading || !privyReady) return;
    void fetchRewards();
  }, [fetchRewards, privyReady, userLoading]);

  const handleClaimRewards = useCallback(async () => {
    if (!accessToken) {
      toast({
        variant: "destructive",
        title: "Rewards unavailable",
        description: "Please log in again to claim SWOP rewards.",
      });
      return;
    }

    if (!destinationWallet) {
      toast({
        variant: "destructive",
        title: "Solana wallet required",
        description:
          "Connect a Solana wallet before claiming SWOP rewards.",
      });
      return;
    }

    setClaiming(true);

    try {
      const response = await claimRewardWallet(accessToken, destinationWallet);
      const data = (await response.json().catch(() => ({}))) as {
        claim?: RewardClaimData;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Could not request reward claim.",
        );
      }

      await fetchRewards();
      const paid = data?.claim?.status === "paid";
      toast({
        title: paid ? "SWOP claimed" : "Claim requested",
        description: paid
          ? "Your SWOP rewards were sent from the rewards vault."
          : "Your SWOP reward claim is queued for vault payout.",
      });
    } catch (claimError) {
      toast({
        variant: "destructive",
        title: "Claim failed",
        description:
          claimError instanceof Error
            ? claimError.message
            : "Could not request reward claim.",
      });
    } finally {
      setClaiming(false);
    }
  }, [accessToken, destinationWallet, fetchRewards, toast]);

  const rewardWallet = rewardsState.rewardWallet;
  const rewards = rewardsState.rewards;
  const summary = rewardsState.summary;
  const tokenSymbol = rewardWallet?.token?.symbol || "SWOP";
  const claimableAmount = rewardNumber(rewardWallet?.claimableAmount);
  const claimableUsd = rewardNumber(rewardWallet?.claimableUsd);
  const pendingAmount =
    rewardNumber(rewardWallet?.pendingAmount) ||
    rewardNumber(summary?.pendingCreditSwop);
  const pendingUsd =
    rewardNumber(rewardWallet?.pendingUsd) ||
    rewardNumber(summary?.pendingCreditUsd);
  const claimedAmount =
    rewardNumber(rewardWallet?.claimedAmount) ||
    rewardNumber(summary?.claimedSwop);
  const claimedUsd =
    rewardNumber(rewardWallet?.claimedUsd) ||
    rewardNumber(summary?.claimedUsd);
  const lifetimeAmount =
    rewardNumber(rewardWallet?.lifetimeEarnedAmount) ||
    claimableAmount + pendingAmount + claimedAmount;
  const totalEarnedUsd =
    rewardNumber(rewardWallet?.lifetimeEarnedUsd) ||
    claimableUsd + pendingUsd + claimedUsd;
  const activeCopiers = uniqueCopierCount(rewards);
  const recentRewardCount = countRecentRewards(rewards);
  const canClaim = claimableAmount > 0 && Boolean(destinationWallet) && !claiming;
  const statusLabel =
    rewardsState.pendingClaimCount > 0
      ? "Claim pending"
      : claimableAmount > 0
        ? "Ready"
        : pendingAmount > 0
          ? "Processing"
          : "Active";

  return (
    <div className="-m-6 min-h-[calc(100vh-6rem)] bg-[#f4f4f2] px-4 pb-24 pt-6 font-inter text-[#0a0a0c] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-semibold leading-none tracking-[-0.04em] text-[#0a0a0c] sm:text-[40px]">
              Rewards
            </h1>
            <p className="mt-2 text-[15px] font-medium tracking-tight text-[#6e6e76]">
              SWOP from copy-trade fee buybacks
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchRewards()}
            disabled={loading}
            aria-label="Refresh rewards"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-black/[0.06] bg-white text-[#6e6e76] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-14px_rgba(10,10,12,0.18)] transition hover:border-black/[0.14] hover:text-[#0a0a0c] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </header>

        {error && (
          <div className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_12px_34px_-16px_rgba(10,10,12,0.20)]">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a0a0a8]">
                  Claimable
                </p>
                <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <p className="text-[44px] font-semibold leading-none tracking-[-0.05em] text-[#0a0a0c] sm:text-[52px]">
                    {loading ? "--" : formatRewardAmount(claimableAmount)}
                  </p>
                  <p className="pb-1 text-[21px] font-semibold tracking-[-0.03em] text-[#0a0a0c]">
                    {tokenSymbol}
                  </p>
                </div>
                <p className="mt-2 text-[15px] font-medium tracking-tight text-[#7a7a82]">
                  {loading
                    ? "Loading confirmed SWOP buybacks."
                    : `${formatRewardUsd(
                        claimableUsd,
                      )} ready after confirmed SWOP buybacks.`}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:min-w-[190px]">
              <button
                type="button"
                onClick={handleClaimRewards}
                disabled={!canClaim}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0a0a0c] px-5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-16px_rgba(0,0,0,0.6)] transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                <Gift className="h-4 w-4" />
                {claiming ? "Claiming" : `Claim ${tokenSymbol}`}
              </button>
              <p className="text-center text-[11px] font-semibold text-[#a0a0a8]">
                {destinationWallet
                  ? `To ${shortenWallet(destinationWallet)}`
                  : "Connect a Solana wallet"}
              </p>
            </div>
          </div>

          <div className="grid border-t border-black/[0.06] sm:grid-cols-3">
            <MetricCell label="Status" value={statusLabel} badge />
            <MetricCell
              label="Pending"
              value={`${formatRewardAmount(pendingAmount)} ${tokenSymbol}`}
              caption={formatRewardUsd(pendingUsd)}
            />
            <MetricCell
              label="Earned"
              value={`${formatRewardAmount(lifetimeAmount)} ${tokenSymbol}`}
              caption={formatRewardUsd(totalEarnedUsd)}
            />
          </div>
        </section>

        <section className="grid overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_10px_30px_-18px_rgba(10,10,12,0.18)] md:grid-cols-4">
          <StatBlock
            label="Total earned"
            value={formatCompactAmount(lifetimeAmount)}
            suffix={tokenSymbol}
            caption={`${formatRewardUsd(totalEarnedUsd)} all time`}
          />
          <StatBlock
            label="Active copiers"
            value={activeCopiers.toLocaleString()}
            delta={recentRewardCount ? `+${recentRewardCount} wk` : undefined}
            caption={`across ${rewards.length.toLocaleString()} trades`}
          />
          <StatBlock
            label="Trades copied"
            value={rewards.length.toLocaleString()}
            caption={`${rewardNumber(summary?.claimableCount).toLocaleString()} active - ${rewardNumber(
              summary?.claimedCount,
            ).toLocaleString()} confirmed`}
          />
          <StatBlock
            label="SWOP claimed"
            value={formatCompactAmount(claimedAmount)}
            caption={`${rewardsState.recentClaims.length.toLocaleString()} claims - ${formatRewardUsd(
              claimedUsd,
            )} total`}
          />
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.45fr_0.95fr]">
          <section className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_10px_30px_-18px_rgba(10,10,12,0.18)]">
            <CardHeader
              title="Copied Trades"
              detail={`${rewards.length.toLocaleString()} trades - ${activeCopiers.toLocaleString()} copiers`}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-y border-black/[0.06] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a0a0a8]">
                    <th className="px-5 py-3">Trade</th>
                    <th className="px-5 py-3">Copiers</th>
                    <th className="px-5 py-3">Vol. copied</th>
                    <th className="px-5 py-3">SWOP earned</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton rows={5} />
                  ) : rewards.length ? (
                    rewards.slice(0, 8).map((reward) => (
                      <tr
                        key={reward._id || reward.transactionHash}
                        className="border-b border-black/[0.04] last:border-b-0"
                      >
                        <td className="px-5 py-4">
                          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#0a0a0c]">
                            {rewardTradeName(reward)}
                          </p>
                          <p className="mt-0.5 text-[12px] font-medium text-[#7a7a82]">
                            {rewardTradeDescription(reward)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[18px] font-semibold leading-none tracking-[-0.04em]">
                              1
                            </span>
                            <MiniBars value={rewardUsdAmount(reward)} />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[14px] font-semibold text-[#6e6e76]">
                          {formatRewardUsd(reward.grossInputAmount)}
                        </td>
                        <td className="px-5 py-4 text-[14px] font-semibold text-emerald-600">
                          {formatRewardAmount(rewardSwopAmount(reward))} {tokenSymbol}
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill status={reward.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        className="px-5 py-10 text-center text-[14px] font-medium text-[#7a7a82]"
                        colSpan={5}
                      >
                        No copied trades have generated SWOP rewards yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_10px_30px_-18px_rgba(10,10,12,0.18)]">
            <CardHeader
              title="Claim History"
              detail={`${rewardsState.recentClaims.length.toLocaleString()} claims`}
            />
            <div className="divide-y divide-black/[0.04]">
              {loading ? (
                <ClaimSkeleton rows={4} />
              ) : rewardsState.recentClaims.length ? (
                rewardsState.recentClaims.slice(0, 6).map((claim) => (
                  <div
                    key={claim._id || claim.payoutTransactionHash || claim.createdAt}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-emerald-100 bg-emerald-50 text-emerald-600">
                      <Check className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[#0a0a0c]">
                        {formatRewardAmount(claim.amount)} {claim.token?.symbol || tokenSymbol}
                      </p>
                      <p className="mt-0.5 text-[12px] font-medium text-[#8a8a92]">
                        {formatDate(claim.paidAt || claim.requestedAt || claim.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-[#6e6e76]">
                        {formatRewardUsd(claim.estimatedUsd)}
                      </p>
                      {claim.payoutTransactionHash ? (
                        <a
                          href={getSolscanUrl(claim.payoutTransactionHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600"
                        >
                          {shortenWallet(claim.payoutTransactionHash)}
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a0a0a8]">
                          {formatStatus(claim.status)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-[14px] font-medium text-[#7a7a82]">
                  No reward claims yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="grid overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,10,12,0.04),0_10px_30px_-18px_rgba(10,10,12,0.18)] md:grid-cols-4">
          <HowItWorksStep
            number="01"
            title="Make a trade"
            body="Execute any swap, spot buy, or perp on Swop."
          />
          <HowItWorksStep
            number="02"
            title="Others copy it"
            body="Followers copy your trade and fees from their volume accrue."
          />
          <HowItWorksStep
            number="03"
            title="SWOP buyback"
            body="Accrued fees are used to buy back SWOP tokens on-chain."
          />
          <HowItWorksStep
            number="04"
            title="Claim earnings"
            body="Bought-back SWOP is credited to you. Claim anytime."
          />
        </section>
      </div>
      <Toaster />
    </div>
  );
}

function MetricCell({
  label,
  value,
  caption,
  badge = false,
}: {
  label: string;
  value: string;
  caption?: string;
  badge?: boolean;
}) {
  return (
    <div className="border-b border-black/[0.06] px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a0a0a8]">
        {label}
      </p>
      {badge ? (
        <span className="mt-2 inline-flex rounded-[7px] bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
          {value}
        </span>
      ) : (
        <>
          <p className="mt-2 truncate text-[17px] font-semibold tracking-[-0.03em] text-[#0a0a0c]">
            {value}
          </p>
          {caption && (
            <p className="mt-1 truncate text-[12px] font-medium text-[#7a7a82]">
              {caption}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  suffix,
  delta,
  caption,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta?: string;
  caption: string;
}) {
  return (
    <div className="border-b border-black/[0.06] px-5 py-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a0a0a8]">
        {label}
      </p>
      <div className="mt-3 flex min-w-0 flex-wrap items-end gap-2">
        <p className="text-[29px] font-semibold leading-none tracking-[-0.05em] text-[#0a0a0c]">
          {value}
        </p>
        {suffix && (
          <p className="pb-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e76]">
            {suffix}
          </p>
        )}
        {delta && (
          <span className="mb-0.5 rounded-[7px] bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600">
            {delta}
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] font-medium tracking-tight text-[#7a7a82]">
        {caption}
      </p>
    </div>
  );
}

function CardHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-[#0a0a0c]">
        {title}
      </h2>
      <p className="text-[12px] font-semibold tracking-[-0.01em] text-[#a0a0a8]">
        {detail}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex rounded-[7px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusClassName(
        status,
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function MiniBars({ value }: { value: number }) {
  const safeValue = Math.max(value, 0.1);
  const heights = [0.34, 0.48, 0.58, 0.73, 0.64, 0.86].map((height, index) => {
    const scale = Math.min(1, safeValue / 20 + 0.35);
    return `${Math.max(18, Math.round(32 * height * scale + index))}px`;
  });

  return (
    <div className="flex h-8 w-16 items-end gap-0.5" aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="w-2 rounded-t-sm bg-emerald-100"
          style={{ height }}
        />
      ))}
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="border-b border-black/[0.04] last:border-b-0">
          {Array.from({ length: 5 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-5 py-4">
              <div className="h-4 w-full max-w-[120px] animate-pulse rounded-full bg-gray-100" />
              {cellIndex === 0 && (
                <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-gray-100" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function ClaimSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-5 py-4">
          <div className="h-9 w-9 animate-pulse rounded-[10px] bg-gray-100" />
          <div className="flex-1">
            <div className="h-4 w-28 animate-pulse rounded-full bg-gray-100" />
            <div className="mt-2 h-3 w-16 animate-pulse rounded-full bg-gray-100" />
          </div>
          <div className="h-4 w-14 animate-pulse rounded-full bg-gray-100" />
        </div>
      ))}
    </>
  );
}

function HowItWorksStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="border-b border-black/[0.06] px-5 py-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a0a0a8]">
        <Clock3 className="h-3.5 w-3.5" />
        {number}
      </div>
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#f4f4f2] text-[#0a0a0c]">
          {number === "02" ? (
            <Users className="h-4 w-4" />
          ) : number === "04" ? (
            <Gift className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </span>
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[#0a0a0c]">
            {title}
          </h3>
          <p className="mt-2 text-[14px] font-medium leading-6 tracking-tight text-[#7a7a82]">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}
