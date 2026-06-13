"use client";

import React from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ExternalLink,
} from "lucide-react";
import { formatEns } from "@/lib/formatEnsName";

interface TokenTransferFeedCardProps {
  feed: any;
}

type ExplorerMeta = {
  label: string;
  href: string;
};

const SIMPLE_STABLECOINS = new Set(["USDC", "USDT", "DAI", "USD"]);

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sameIdentity(a: unknown, b: unknown) {
  const left = asString(a).toLowerCase();
  const right = asString(b).toLowerCase();
  return Boolean(left && right && left === right);
}

function truncateAddress(address?: string) {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatMaybeEns(value?: string) {
  if (!value) return "";
  const formatted = formatEns(value) || value;
  if (value.includes(".")) return formatted;
  if (/^[a-zA-Z0-9_-]+$/.test(value)) return `${formatted}.Swop.Id`;
  return formatted;
}

function identityName({
  name,
  ens,
  address,
  fallback,
}: {
  name?: string;
  ens?: string;
  address?: string;
  fallback: string;
}) {
  if (name) return name;
  if (ens) {
    const formatted = formatEns(ens) || ens;
    return formatted.split(".")[0] || fallback;
  }
  return truncateAddress(address) || fallback;
}

function initials(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  const camelCaps = name.match(/[A-Z]/g);
  if (camelCaps && camelCaps.length > 1) {
    return `${camelCaps[0]}${camelCaps[1]}`.toUpperCase();
  }
  const compact = clean.replace(/\s+/g, "").toLowerCase();
  for (const suffix of ["bot", "queen"]) {
    if (compact.length > suffix.length && compact.endsWith(suffix)) {
      return `${compact[0]}${suffix[0]}`.toUpperCase();
    }
  }
  return clean.slice(0, 2).toUpperCase();
}

function normalizeNetwork(value?: string) {
  const key = asString(value).toLowerCase();
  if (!key) return "solana";
  if (key.includes("arb")) return "arbitrum";
  if (key.includes("base")) return "base";
  if (key.includes("poly")) return "polygon";
  if (key.includes("sepolia")) return "sepolia";
  if (key.includes("eth")) return "ethereum";
  if (key.includes("sol")) return "solana";
  return key;
}

function networkLabel(network: string) {
  const labels: Record<string, string> = {
    arbitrum: "Arbitrum",
    base: "Base",
    ethereum: "Ethereum",
    polygon: "Polygon",
    sepolia: "Sepolia",
    solana: "Solana",
  };
  return labels[network] || network.charAt(0).toUpperCase() + network.slice(1);
}

function networkDotColor(network: string) {
  const colors: Record<string, string> = {
    arbitrum: "#2d8fe5",
    base: "#0052ff",
    ethereum: "#627eea",
    polygon: "#8247e5",
    sepolia: "#8b5cf6",
    solana: "#19df86",
  };
  return colors[network] || "#111827";
}

function explorerFor(network: string, hash?: string): ExplorerMeta | null {
  if (!hash) return null;

  const explorers: Record<string, ExplorerMeta> = {
    arbitrum: {
      label: "Arbiscan",
      href: `https://arbiscan.io/tx/${hash}`,
    },
    base: {
      label: "Basescan",
      href: `https://basescan.org/tx/${hash}`,
    },
    ethereum: {
      label: "Etherscan",
      href: `https://etherscan.io/tx/${hash}`,
    },
    polygon: {
      label: "Polygonscan",
      href: `https://polygonscan.com/tx/${hash}`,
    },
    sepolia: {
      label: "Etherscan",
      href: `https://sepolia.etherscan.io/tx/${hash}`,
    },
    solana: {
      label: "Solscan",
      href: `https://solscan.io/tx/${hash}`,
    },
  };

  return explorers[network] || null;
}

function formatUsd(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "$0.00";
  return `$${Math.abs(number).toFixed(2)}`;
}

function formatTokenAmount(value: unknown, symbol: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  const abs = Math.abs(number);
  const upperSymbol = symbol.toUpperCase();

  if (SIMPLE_STABLECOINS.has(upperSymbol)) {
    return abs.toFixed(2);
  }

  if (abs >= 1000) {
    return abs.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  }

  if (abs >= 1) {
    return abs.toFixed(4).replace(/\.?0+$/, "");
  }

  return abs.toFixed(6).replace(/\.?0+$/, "");
}

function tokenAvatarLabel(symbol: string) {
  const upperSymbol = symbol.toUpperCase();
  if (SIMPLE_STABLECOINS.has(upperSymbol)) return "$";
  return upperSymbol.slice(0, 1) || "T";
}

export default function TokenTransferFeedCard({
  feed,
}: TokenTransferFeedCardProps) {
  const content = feed?.content || {};
  const senderEns =
    asString(content.sender_ens) ||
    asString(feed?.smartsiteDetails?.ens) ||
    asString(feed?.smartsiteId?.ens) ||
    asString(feed?.smartsiteEnsName);
  const receiverEns = asString(content.receiver_ens);
  const senderAddress = asString(content.sender_wallet_address);
  const receiverAddress = asString(content.receiver_wallet_address);
  const feedEns =
    asString(feed?.smartsiteDetails?.ens) ||
    asString(feed?.smartsiteId?.ens) ||
    asString(feed?.smartsiteEnsName);
  const feedWallet =
    asString(feed?.smartsiteDetails?.walletAddress) ||
    asString(feed?.smartsiteId?.walletAddress) ||
    asString(feed?.smartsiteWalletAddress);

  const explicitDirection = asString(
    content.direction || content.transfer_direction || content.event,
  ).toLowerCase();
  const isReceived =
    explicitDirection.includes("received") ||
    explicitDirection.includes("receive") ||
    sameIdentity(feedEns, receiverEns) ||
    sameIdentity(feedWallet, receiverAddress);

  const senderName = identityName({
    name:
      !isReceived
        ? asString(feed?.smartsiteDetails?.name) ||
          asString(feed?.smartsiteId?.name) ||
          asString(feed?.smartsiteUserName)
        : "",
    ens: senderEns,
    address: senderAddress,
    fallback: "Sender",
  });
  const receiverName = identityName({
    name:
      isReceived
        ? asString(feed?.smartsiteDetails?.name) ||
          asString(feed?.smartsiteId?.name) ||
          asString(feed?.smartsiteUserName)
        : "",
    ens: receiverEns,
    address: receiverAddress,
    fallback: "Recipient",
  });

  const senderLine = formatMaybeEns(senderEns) || truncateAddress(senderAddress);
  const receiverLine =
    formatMaybeEns(receiverEns) || truncateAddress(receiverAddress);
  const symbol = asString(content.token || content.currency).toUpperCase();
  const network = normalizeNetwork(content.chain || content.network);
  const explorer = explorerFor(network, asString(content.transaction_hash));
  const amountPrefix = isReceived ? "+" : "";
  const amount = `${amountPrefix}${formatTokenAmount(content.amount, symbol)}`;
  const statusLabel = isReceived ? "RECEIVED" : "SENT";
  const statusIcon = isReceived ? ArrowDownLeft : ArrowUpRight;
  const StatusIcon = statusIcon;

  return (
    <article
      className="my-1.5 w-full max-w-xl rounded-2xl bg-white p-3 text-black sm:p-4"
      style={{
        boxShadow:
          "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <div
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-black uppercase tracking-[0.14em] ${
            isReceived
              ? "bg-emerald-50 text-emerald-600"
              : "bg-gray-100 text-gray-950"
          }`}
        >
          <StatusIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          {statusLabel}
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-extrabold shadow-sm">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: networkDotColor(network) }}
          />
          {networkLabel(network)}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black text-white shadow-sm"
          style={{ backgroundColor: isReceived ? "#2d86dd" : "#68719d" }}
        >
          {tokenAvatarLabel(symbol)}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className={`font-mono text-[28px] font-black leading-none tabular-nums sm:text-[30px] ${
                isReceived ? "text-emerald-600" : "text-gray-950"
              }`}
            >
              {amount}
            </span>
            <span className="text-[17px] font-black uppercase leading-none text-gray-950">
              {symbol || "TOKEN"}
            </span>
          </div>
          <div className="mt-1 font-mono text-[13px] font-black tabular-nums text-gray-500">
            {formatUsd(content.tokenPrice ?? content.usdValue)}
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-2.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
            style={{ backgroundColor: isReceived ? "#5b27c5" : "#d7eaf8" }}
          >
            {initials(senderName)}
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">
              From
            </div>
            <div className="truncate text-[13px] font-black leading-tight text-gray-950 sm:text-sm">
              {senderName}
            </div>
            <div className="truncate text-xs font-medium leading-tight text-gray-500">
              {senderLine}
            </div>
          </div>
        </div>

        <ArrowRight
          className="mx-auto h-5 w-5 text-gray-400"
          strokeWidth={2.5}
        />

        <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
          <div className="min-w-0">
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">
              To
            </div>
            <div className="truncate text-[13px] font-black leading-tight text-gray-950 sm:text-sm">
              {receiverName}
            </div>
            <div className="truncate text-xs font-medium leading-tight text-gray-500">
              {receiverLine}
            </div>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
            {initials(receiverName)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 text-[13px] font-black text-emerald-600">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          Confirmed
        </div>

        {explorer && (
          <a
            href={explorer.href}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1 text-[13px] font-black ${
              isReceived ? "text-purple-500" : "text-sky-600"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            {explorer.label}
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
          </a>
        )}
      </div>
    </article>
  );
}
