"use client";

import { FC, useEffect, useState } from "react";
import { Bot, Copy } from "lucide-react";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface VaultCardConfig {
  ensName?: string;
  headline?: string;
}

interface Props {
  config: VaultCardConfig;
  /**
   * builder: shows a placeholder when the vault is unpinned (owner needs a
   * clickable card to edit/remove); public: renders nothing on 404.
   */
  mode: "builder" | "public";
}

type VaultCardData = {
  ensName: string;
  walletAddress: string;
  agentName: string;
  status: string;
  activatedAt?: string | null;
  realizedPnlUsd: number;
  tradeCount: number;
  lastTradeAt?: string | null;
};

const truncateAddress = (address: string) =>
  address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;

const VaultCard: FC<Props> = ({ config, mode }) => {
  const ensName = config?.ensName || "";
  const [vault, setVault] = useState<VaultCardData | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    if (!ensName) {
      setIsMissing(true);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/v5/microsite/public/vault-card/${encodeURIComponent(ensName)}`,
        );
        if (!response.ok) {
          if (!cancelled) setIsMissing(true);
          return;
        }
        const data = await response.json().catch(() => null);
        if (!cancelled && data?.data?.walletAddress) {
          setVault(data.data as VaultCardData);
          setIsMissing(false);
        } else if (!cancelled) {
          setIsMissing(true);
        }
      } catch (error) {
        console.warn("Vault card fetch failed:", error);
        if (!cancelled) setIsMissing(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [ensName]);

  // Owner unpinned / opted out — render nothing on the public page.
  if (isMissing) {
    if (mode !== "builder") return null;
    return (
      <div className="w-full my-2 rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-center">
        <p className="text-[13px] font-semibold text-gray-500">
          Agent Vault unavailable
        </p>
        <p className="mt-0.5 text-[11px] text-gray-400">
          {ensName || "No vault"} isn&apos;t pinned — this card is hidden on
          your public page. Click to edit.
        </p>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="w-full my-2 rounded-2xl border border-black/[0.06] bg-white p-4">
        <div className="h-16 w-full animate-pulse rounded-xl bg-black/[0.04]" />
      </div>
    );
  }

  const pnl = Number(vault.realizedPnlUsd) || 0;
  const pnlPositive = pnl >= 0;
  const activatedDate = vault.activatedAt
    ? new Date(vault.activatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const handleCopy = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(vault.walletAddress)
        .then(() => toast.success("Vault address copied"))
        .catch(() => toast.error("Couldn't copy address"));
    }
  };

  return (
    <div className="w-full my-2 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Bot size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-gray-950">
            {vault.agentName || "Trading agent"}
          </p>
          <p className="truncate text-[12px] font-medium text-gray-500">
            {vault.ensName}
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            vault.status === "active"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-black/[0.06] text-gray-500"
          }`}
        >
          {vault.status}
        </span>
      </div>

      {config?.headline && (
        <p className="mt-2 text-[13px] text-gray-500">{config.headline}</p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-black/[0.03] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Realized PnL
          </p>
          <p
            className={`text-[14px] font-semibold ${
              pnlPositive ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {pnlPositive ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl bg-black/[0.03] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Trades
          </p>
          <p className="text-[14px] font-semibold text-gray-950">
            {vault.tradeCount}
          </p>
        </div>
        <div className="rounded-xl bg-black/[0.03] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Active since
          </p>
          <p className="text-[14px] font-semibold text-gray-950">
            {activatedDate || "—"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-gray-950 py-2.5 text-[13px] font-semibold text-white transition hover:bg-gray-800"
      >
        <Copy size={13} /> Copy vault address
      </button>
      <p className="mt-1.5 text-center font-mono text-[11px] text-gray-400">
        {truncateAddress(vault.walletAddress)}
      </p>
    </div>
  );
};

export default VaultCard;
