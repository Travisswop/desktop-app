"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpDown,
  Info,
  Settings,
  Search,
  X,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { debounce } from "lodash";
import {
  fetchTokensFromLiFi,
  getLifiQuote as fetchLifiQuote,
} from "@/actions/lifiForTokenSwap";
import {
  getJupiterQuote as fetchJupiterQuote,
  getJupiterSwapTransaction as fetchJupiterSwapTransaction,
} from "@/actions/jupiterSwap";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import {
  Connection,
  VersionedTransaction,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { saveSwapTransaction } from "@/actions/saveTransactionData";
import Cookies from "js-cookie";
import { useNewSocketChat } from "@/lib/context/NewSocketChatContext";
import {
  getWalletNotificationService,
  formatUSDValue,
} from "@/lib/utils/walletNotifications";
import { useSearchParams } from "next/navigation";
import bs58 from "bs58";
import { notifySwapFee } from "@/actions/notifySwapFee";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

const getChainIcon = (chainName: string) => {
  const chainIcons: Record<string, string> = {
    SOLANA: "/images/IconShop/solana@2x.png",
    ETHEREUM: "/images/IconShop/eTH@3x.png",
    BSC: "/images/IconShop/binance-smart-chain.png",
    POLYGON: "/images/IconShop/polygon.png",
    ARBITRUM: "/images/IconShop/arbitrum.png",
    BASE: "https://www.base.org/document/safari-pinned-tab.svg",
  };
  return chainIcons[chainName.toUpperCase()] || null;
};

const getChainId = (chainName: string) => {
  const chainIds: Record<string, string> = {
    SOLANA: "1151111081099710",
    ETHEREUM: "1",
    BSC: "56",
    POLYGON: "137",
    ARBITRUM: "42161",
    BASE: "8453",
  };
  return chainIds[chainName.toUpperCase()] || "1";
};

const getNetworkByChainId = (chainId: string): string => {
  const map: Record<string, string> = {
    "1151111081099710": "solana",
    "1": "ethereum",
    "56": "bsc",
    "137": "polygon",
    "42161": "arbitrum",
    "8453": "base",
  };
  return map[chainId] || "ethereum";
};

const getExplorerUrl = (chainId: string, txHash: string): string => {
  const explorerUrls: Record<string, string> = {
    "1151111081099710": `https://solscan.io/tx/${txHash}`,
    "1": `https://etherscan.io/tx/${txHash}`,
    "56": `https://bscscan.com/tx/${txHash}`,
    "137": `https://polygonscan.com/tx/${txHash}`,
    "42161": `https://arbiscan.io/tx/${txHash}`,
    "8453": `https://basescan.org/tx/${txHash}`,
  };
  return explorerUrls[chainId] || `https://etherscan.io/tx/${txHash}`;
};

const sanitizeImageUrl = (url: string | undefined): string => {
  if (!url) return "";
  return url.trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Category / token-set definitions (mirrors Chain.ts from RN app)
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_CATEGORIES = ["stock", "crypto", "metal", "stable"] as const;
type TokenCategory = (typeof TOKEN_CATEGORIES)[number];

const tokenCategoryAddresses: Record<TokenCategory, Set<string>> = {
  stock: new Set([
    "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
    "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ",
    "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1",
    "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
    "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ",
    "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
    "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN",
    "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
    "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu",
    "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
    "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw",
    "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg",
    "PreC1KtJ1sBPPqaeeqL6Qb15GTLCYVvyYEwxhdfTwfx",
    "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg",
    "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB",
    "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu",
    "Xs2yquAgsHByNzx68WJC55WHjHBvG9JsMB7CWjTLyPy",
    "XsqE9cRRpzxcGKDXj1BJ7Xmg4GRhZoyY1KpmGSxAWT2",
    "XszvaiXGPwvk2nwb3o9C1CX4K6zH8sez11E6uyup6fe",
    "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX",
    "Xs6B6zawENwAbWVi7w92rjazLuAr5Az59qgWKcNb45x",
    "XsaQTCgebC2KPbf27KUhdv5JFvHhQ4GDAPURwrEhAzb",
    "XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL",
    "XsjQP3iMAaQ3kQScQKthQpx9ALRbjKAjQtHg6TFomoc",
    "Xsnuv4omNoHozR6EEW5mXkw8Nrny5rB3jVfLqi6gKMH",
    "XsjFwUPiLofddX5cWFHW35GCbXcSu1BCUGfxoQAQjeL",
    "XsaBXg8dU5cPM6ehmVctMkVqoiRG2ZjMo1cyBJ3AykQ",
    "XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV",
    "XsqgsbXwWogGJsNcVZ3TyVouy2MbTkfCFhCGGGcQZ2p",
  ]),
  crypto: new Set([
    "So11111111111111111111111111111111111111112",
    "GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1",
    "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
    "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    "A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS",
    "CrAr4RRJMBVwRsZtT62pEhfA9H5utymC2mVx8e7FreP2",
    "98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g",
    "GbbesPbaYh5uiAZSYNXTc7w9jty1rpg3P9L4JeN4LkKc",
    "3ZLekZYq2qkZiSpnSvabjit34tUkjSwD1JFuW9as9wBG",
    "9gP2kCy3wA1ctvYWQk75guqXuHfrEomqydHLtcTCqiLa",
    "0x0000000000000000000000000000000000000000",
  ]),
  metal: new Set([
    "AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P",
    "GoLDppdjB1vDTPSGxyMJFqdnj134yH6Prg9eqsGDiw6A",
    "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re",
    "7C56WnJ94iEP7YeH2iKiYpvsS5zkcpP9rJBBEBoUGdzj",
    "C3VLBJB2FhEb47s1WEgroyn3BnSYXaezqtBuu5WNmUGw",
    "EtTQ2QRyf33bd6B2uk7nm1nkinrdGKza66EGdjEY4s7o",
    "AEv6xLECJ2KKmwFGX85mHb9S2c2BQE7dqE5midyrXHBb",
    "9eS6ZsnqNJGGKWq8LqZ95YJLZ219oDuJ1qjsLoKcQkmQ",
  ]),
  stable: new Set([
    "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "0xdac17f958d2ee523a2206206994597c13d831ec7",
    "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
    "0x1abaea1f7c830bd89acc67ec4af516284b1bc33c",
    "0xC08512927D12348F6620a698105e1BAac6EcD911",
    "0x70e8de73ce538da2beed35d14187f6959a8eca96",
    "0x01d33FD36ec67c6Ada32cf36b31e88EE190B1839",
    "0xF197FFC28c23E0309B5559e7a166f2c6164C80aA",
    "0xcaDC0acd4B445166f12d2C07EAc6E2544FbE2Eef",
    "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
    "0x043eB4B75d0805c43D7C834902E335621983Cf03",
    "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "Crn4x1Y2HUKko7ox2EZMT6N2t2ZyH7eKtwkBGVnhEq1g",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
    "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr",
  ]),
};

/** Bucket a flat token array into the 4 categories (same logic as RN filterTokensByCategory) */
function filterTokensByCategory(
  tokenArray: any[],
): Record<TokenCategory, any[]> {
  const result: Record<TokenCategory, any[]> = {
    stock: [],
    crypto: [],
    metal: [],
    stable: [],
  };

  tokenArray.forEach((token) => {
    const identifier = token.address || token.id;
    if (!identifier) return;

    // Derive network from chainId (same logic as RN)
    let network: string;
    if (token.chainId === 1 || token.chainId === "1") network = "ethereum";
    else if (token.chainId === 137 || token.chainId === "137")
      network = "polygon";
    else if (token.chainId === 8453 || token.chainId === "8453")
      network = "base";
    else if (
      !token.chainId ||
      token.chainId === 1151111081099710 ||
      token.chainId === "1151111081099710"
    )
      network = "solana";
    else return; // skip unknown chains

    for (const cat of TOKEN_CATEGORIES) {
      if (tokenCategoryAddresses[cat].has(identifier)) {
        result[cat].push({ ...token, network, isVerified: true });
        break;
      }
    }
  });

  return result;
}

/** Search tokens by id/address/name/symbol, optionally filtered to a chainId */
function searchTokens(
  tokens: any[],
  searchText: string,
  chainId?: string,
): any[] {
  if (!searchText && !chainId) return [];
  return tokens.filter((token) => {
    if (chainId && chainId !== "all") {
      const tokenChainId =
        token.chainId?.toString() ?? getChainId(token.chain ?? "");
      if (tokenChainId !== chainId) return false;
    }
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      (token.id ?? "").toLowerCase().includes(q) ||
      (token.address ?? "").toLowerCase().includes(q) ||
      (token.name ?? "").toLowerCase().includes(q) ||
      (token.symbol ?? "").toLowerCase().includes(q)
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Chain selector config for the receive drawer
// ─────────────────────────────────────────────────────────────────────────────

const ALL_CHAINS = [
  { id: "all", name: "All", icon: null },
  {
    id: "1151111081099710",
    name: "SOL",
    icon: "/images/IconShop/solana@2x.png",
  },
  { id: "1", name: "ETH", icon: "/images/IconShop/eTH@3x.png" },
  { id: "137", name: "POL", icon: "/images/IconShop/polygon.png" },
  {
    id: "8453",
    name: "BASE",
    icon: "https://www.base.org/document/safari-pinned-tab.svg",
  },
];

const PAY_CHAINS = [
  { id: "all", name: "All", icon: null },
  {
    id: "1151111081099710",
    name: "SOL",
    icon: "/images/IconShop/solana@2x.png",
  },
  {
    id: "1",
    name: "ETH",
    icon: "/images/IconShop/outline-icons/light/ethereum-outline@3x.png",
  },
  { id: "137", name: "POL", icon: "/images/IconShop/polygon.png" },
  {
    id: "8453",
    name: "BASE",
    icon: "https://www.base.org/document/safari-pinned-tab.svg",
  },
];

const NATIVE_TOKENS_AND_USDC: Record<string, { symbol: string }[]> = {
  "1": [{ symbol: "ETH" }, { symbol: "USDC" }],
  "1151111081099710": [{ symbol: "SOL" }, { symbol: "USDC" }],
  "137": [{ symbol: "POL" }, { symbol: "USDC" }],
  "8453": [{ symbol: "ETH" }, { symbol: "USDC" }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Error formatting (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const formatUserFriendlyError = (error: string): string => {
  const lowerError = error.toLowerCase();
  if (
    lowerError.includes("network error") ||
    lowerError.includes("fetch failed")
  )
    return "Network connection issue. Please check your internet connection and try again.";
  if (lowerError.includes("timeout"))
    return "Request timed out. Please try again in a moment.";
  if (
    lowerError.includes("user rejected") ||
    lowerError.includes("user denied")
  )
    return "Transaction was cancelled. Please try again when ready.";
  if (
    lowerError.includes("insufficient funds") ||
    lowerError.includes("insufficient balance")
  )
    return "Insufficient balance to complete this transaction.";
  if (
    lowerError.includes("route not found") ||
    lowerError.includes("no route found")
  )
    return "No swap route available for this token pair. Try selecting different tokens.";
  if (lowerError.includes("slippage") || lowerError.includes("price impact"))
    return "Price impact is too high. Try adjusting slippage settings or reducing the amount.";
  if (
    lowerError.includes("rate limit") ||
    lowerError.includes("too many requests")
  )
    return "Too many requests. Please wait a moment and try again.";
  if (
    lowerError.includes("transaction failed") ||
    lowerError.includes("tx failed")
  )
    return "Transaction failed. Please try again with adjusted settings.";
  if (error.length > 100)
    return "Transaction failed. Please try again or contact support if the issue persists.";
  return error.charAt(0).toUpperCase() + error.slice(1).replace(/[._]/g, " ");
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TokenRow({ token, onClick }: { token: any; onClick: () => void }) {
  const getTokenIcon = (t: any) => {
    if (t?.logoURI) return t.logoURI.trim();
    const initials = (t.symbol || "??").slice(0, 2).toUpperCase();
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#F9A826", "#6C5CE7"];
    const colorIndex = (t.symbol?.length ?? 0) % colors.length;
    const svg = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" fill="${colors[colorIndex]}" rx="12"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${initials}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const chainIconSrc = token.chain
    ? getChainIcon(token.chain)
    : getChainIcon(getNetworkByChainId(token.chainId?.toString() ?? ""));

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
    >
      {/* Token icon + chain badge */}
      <div className="relative flex-shrink-0 w-9 h-9">
        <Image
          src={sanitizeImageUrl(
            token?.logoURI || token?.icon || getTokenIcon(token),
          )}
          alt={token.symbol}
          width={36}
          height={36}
          className="w-9 h-9 rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getTokenIcon(token);
          }}
        />
        {chainIconSrc && (
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-gray-200 w-4 h-4 flex items-center justify-center">
            <Image
              src={sanitizeImageUrl(chainIconSrc)}
              alt="chain"
              width={12}
              height={12}
              className="w-3 h-3 rounded-full"
            />
          </div>
        )}
      </div>

      {/* Name + symbol */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900 text-sm truncate">
            {token.symbol}
          </span>
          {token.isVerified && (
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{token.name}</p>
      </div>

      {/* Price */}
      {(token.priceUSD || token.usdPrice) && (
        <span className="text-sm text-gray-500 flex-shrink-0">
          ${parseFloat(token.priceUSD || token.usdPrice).toFixed(2)}
        </span>
      )}

      {/* Balance (for user-owned tokens) */}
      {token.balance != null && Number(token.balance) > 0 && (
        <span className="text-sm font-medium text-gray-700 flex-shrink-0 ml-2">
          {parseFloat(token.balance).toFixed(4)}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function SwapTokenModal({
  tokens,
  token,
}: {
  tokens: any[];
  token?: any;
}) {
  // ── existing state ──────────────────────────────────────────────────────────
  const [payToken, setPayToken] = useState<any>(token || tokens?.[0] || null);
  const [receiveToken, setReceiveToken] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selecting, setSelecting] = useState<"pay" | "receive" | null>(null);
  const [availableTokens, setAvailableTokens] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [chainId, setChainId] = useState("1151111081099710");
  const [receiverChainId, setReceiverChainId] = useState("137");
  const [quote, setQuote] = useState<any>(null);
  const [jupiterQuote, setJupiterQuote] = useState<any>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [slippage, setSlippage] = useState(0.5);
  const [customSlippage, setCustomSlippage] = useState("");
  const [showSlippageModal, setShowSlippageModal] = useState(false);
  const [selectedPayChain, setSelectedPayChain] = useState("all");
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteCountdown, setQuoteCountdown] = useState(10);
  const [lastQuoteTime, setLastQuoteTime] = useState<number | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<string | null>(null);

  // ── NEW: receive token selection state ─────────────────────────────────────
  /** All tokens merged (Solana + cross-chain) – used for searching */
  const [tempTokens, setTempTokens] = useState<any[]>([]);
  /** Tokens bucketed by category */
  const [targetList, setTargetList] = useState<Record<TokenCategory, any[]>>({
    stock: [],
    crypto: [],
    metal: [],
    stable: [],
  });
  /** Currently highlighted category tab index */
  const [activeReceiveTab, setActiveReceiveTab] = useState<number>(0);
  /** Selected chain for the receive drawer ("all" | chainId string) */
  const [selectedReceiveChain, setSelectedReceiveChain] =
    useState<string>("all");
  /** Search results (overrides category+chain filter when non-empty) */
  const [filteredList, setFilteredList] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [receiveDrawerLoading, setReceiveDrawerLoading] = useState(false);

  // ── refs ────────────────────────────────────────────────────────────────────
  const quoteRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  // ── wallet hooks ────────────────────────────────────────────────────────────
  const { wallets } = useWallets();
  const { ready: solanaReady, wallets: directSolanaWallets } =
    useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { socket: chatSocket } = useNewSocketChat();
  const socket = chatSocket;
  const ethWallet = wallets[0]?.address;
  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;
    return (
      directSolanaWallets.find((w) => w.address?.length > 0) ??
      directSolanaWallets[0]
    );
  }, [solanaReady, directSolanaWallets]);

  const [fromWalletAddress, setFromWalletAddress] = useState(
    selectedSolanaWallet?.address || "",
  );
  const [toWalletAddress, setToWalletAddress] = useState(
    selectedSolanaWallet?.address || "",
  );
  const { user: PrivyUser, getAccessToken } = usePrivy();
  const searchParams = useSearchParams();

  // ── helpers ─────────────────────────────────────────────────────────────────

  const safeRefreshSession = useCallback(async () => {
    try {
      const timeout = new Promise((_, r) =>
        setTimeout(() => r(new Error("timeout")), 5000),
      );
      await Promise.race([getAccessToken(), timeout]);
    } catch (e) {
      console.warn("Session refresh failed, proceeding:", e);
    }
  }, [getAccessToken]);

  const formatTokenAmount = (
    amount: string | number,
    decimals: number | bigint,
  ): string => {
    const dec = typeof decimals === "bigint" ? Number(decimals) : decimals;
    const [whole, fractionRaw = ""] = amount.toString().split(".");
    const fraction = fractionRaw.toString();
    const fractionPadded = (fraction + "0".repeat(dec)).slice(0, dec);
    return BigInt(whole + fractionPadded).toString();
  };

  const validateBalance = () => {
    if (!payToken?.balance || !payAmount) return { isValid: true, error: null };
    const balance = parseFloat(payToken.balance);
    const amount = parseFloat(payAmount);
    if (amount > balance)
      return {
        isValid: false,
        error: `Insufficient balance. Available: ${balance.toFixed(6)} ${payToken.symbol}`,
      };
    if (amount <= 0)
      return { isValid: false, error: "Amount must be greater than 0" };
    return { isValid: true, error: null };
  };

  const isSolanaToSolanaSwap = useCallback(
    () =>
      payToken?.chain?.toUpperCase() === "SOLANA" &&
      (receiveToken?.chain?.toUpperCase() === "SOLANA" ||
        receiverChainId === "1151111081099710"),
    [payToken, receiveToken, receiverChainId],
  );

  // ── NEW: fetch & bucket all receive tokens on mount ─────────────────────────
  useEffect(() => {
    const loadReceiveTokens = async () => {
      setReceiveDrawerLoading(true);
      try {
        // Fetch LiFi tokens for all supported EVM chains + Solana
        const [ethTokens, polygonTokens, baseTokens, solanaTokens] =
          await Promise.all([
            fetchTokensFromLiFi("1", "").catch(() => []),
            fetchTokensFromLiFi("137", "").catch(() => []),
            fetchTokensFromLiFi("8453", "").catch(() => []),
            fetchTokensFromLiFi("1151111081099710", "").catch(() => []),
          ]);

        // Merge with user's own token list (which has balance data)
        const merged = [
          ...tokens,
          ...ethTokens,
          ...polygonTokens,
          ...baseTokens,
          ...solanaTokens,
        ];

        // Deduplicate by address (keep first occurrence which may have balance info)
        const seen = new Set<string>();
        const deduped = merged.filter((t) => {
          const key = (t.address || t.id || "").toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setTempTokens(deduped);
        setTargetList(filterTokensByCategory(deduped));
      } catch (err) {
        console.error("Failed to load receive tokens:", err);
        // Fallback: bucket only the tokens we already have
        setTempTokens(tokens);
        setTargetList(filterTokensByCategory(tokens));
      } finally {
        setReceiveDrawerLoading(false);
      }
    };

    if (tokens.length > 0) {
      loadReceiveTokens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.length]);

  // ── NEW: debounced search across tempTokens ─────────────────────────────────
  const handleReceiveSearch = useMemo(
    () =>
      debounce((query: string, chainFilter: string) => {
        const chainId = chainFilter !== "all" ? chainFilter : undefined;
        const results = searchTokens(tempTokens, query, chainId);
        setFilteredList(results);
        setIsSearching(false);
      }, 400),
    [tempTokens],
  );

  const onReceiveSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q) {
      setIsSearching(true);
      handleReceiveSearch(q, selectedReceiveChain);
    } else {
      setFilteredList([]);
      setIsSearching(false);
    }
  };

  // ── NEW: compute visible tokens for receive drawer ──────────────────────────
  const visibleReceiveTokens = useMemo(() => {
    // Priority 1 – search results
    if (filteredList.length > 0) return filteredList;

    const categoryTokens = targetList[TOKEN_CATEGORIES[activeReceiveTab]] ?? [];

    // Priority 2 – chain filter applied to category
    if (selectedReceiveChain !== "all") {
      const network = getNetworkByChainId(selectedReceiveChain);
      return categoryTokens.filter((t) => t.network === network);
    }

    // Priority 3 – full category list
    return categoryTokens;
  }, [filteredList, targetList, activeReceiveTab, selectedReceiveChain]);

  // ── URL params ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const inputTokenParam = searchParams?.get("inputToken");
    const outputTokenParam = searchParams?.get("outputToken");
    const amountParam = searchParams?.get("amount");
    if (tokens.length > 0) {
      if (inputTokenParam) {
        const found = tokens.find(
          (t) => t.symbol.toLowerCase() === inputTokenParam.toLowerCase(),
        );
        if (found) {
          setPayToken(found);
          setChainId(getChainId(found.chain));
        }
      }
      if (outputTokenParam) {
        const found = tokens.find(
          (t) => t.symbol.toLowerCase() === outputTokenParam.toLowerCase(),
        );
        if (found) {
          setReceiveToken(found);
          const rcvChainId = getChainId(found.chain);
          setReceiverChainId(rcvChainId);
        }
      }
      if (amountParam && !isNaN(parseFloat(amountParam)))
        setPayAmount(amountParam);
    }
  }, [searchParams, tokens]);

  // ── pay chain / token helpers ───────────────────────────────────────────────
  const filterTokensByPayChain = (toks: any[], cId: string) =>
    cId === "all" ? toks : toks.filter((t) => getChainId(t.chain) === cId);

  const handlePayChainSelect = (cId: string) => {
    setSelectedPayChain(cId);
    setSearchQuery("");
    setAvailableTokens(filterTokensByPayChain(tokens, cId));
  };

  const handlePayTokenSearch = (query: string) => {
    setIsLoadingTokens(true);
    try {
      const base =
        selectedPayChain !== "all"
          ? filterTokensByPayChain(tokens, selectedPayChain)
          : tokens;
      setAvailableTokens(
        base.filter(
          (t) =>
            t.symbol.toLowerCase().includes(query.toLowerCase()) ||
            t.name.toLowerCase().includes(query.toLowerCase()),
        ),
      );
    } finally {
      setIsLoadingTokens(false);
    }
  };

  useEffect(() => {
    if (openDrawer && selecting === "pay") {
      setAvailableTokens(filterTokensByPayChain(tokens, selectedPayChain));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDrawer, selecting, tokens, selectedPayChain]);

  // ── quote fetching (unchanged logic) ───────────────────────────────────────

  const getJupiterQuote = async () => {
    if (!payToken || !receiveToken || !payAmount)
      throw new Error("Missing required parameters");
    const getTokenMint = (t: any) =>
      t.symbol === "SOL"
        ? "So11111111111111111111111111111111111111112"
        : t.address;
    const inputMint = getTokenMint(payToken);
    const outputMint = getTokenMint(receiveToken);
    if (!inputMint || !outputMint) throw new Error("Invalid token addresses");
    const amountInSmallestUnit = formatTokenAmount(
      payAmount,
      payToken.decimals || 6,
    );
    const slippageBps = Math.floor(slippage * 100);
    const result = await fetchJupiterQuote({
      inputMint,
      outputMint,
      amount: amountInSmallestUnit,
      slippageBps,
      platformFeeBps: 50,
    });
    if (!result.success)
      throw new Error(result.error || "Failed to get Jupiter quote");
    return result.data;
  };

  const getJupiterSwapTransaction = async (quoteResponse: any) => {
    if (!selectedSolanaWallet?.address)
      throw new Error("Solana wallet not connected");
    const inputMint = quoteResponse.inputMint;
    let feeAccount: string | undefined;
    try {
      const feeAccountResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/tokenAccount/${inputMint}`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      );
      if (feeAccountResponse.ok) {
        const feeAccountData = await feeAccountResponse.json();
        const tokenProgramId = feeAccountData.tokenProgramId;
        if (feeAccountData.tokenAccount) {
          const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
          if (rpcUrl) {
            const connection = new Connection(rpcUrl, {
              commitment: "confirmed",
            });
            const programId =
              tokenProgramId === TOKEN_2022_PROGRAM_ID.toString()
                ? TOKEN_2022_PROGRAM_ID
                : TOKEN_PROGRAM_ID;
            const accountInfo = await getAccount(
              connection,
              new PublicKey(feeAccountData.tokenAccount),
              undefined,
              programId,
            );
            if (accountInfo) feeAccount = feeAccountData.tokenAccount;
          }
        }
      }
    } catch (e) {
      console.warn("Fee account check failed:", e);
    }
    const result = await fetchJupiterSwapTransaction({
      quoteResponse,
      userPublicKey: selectedSolanaWallet.address,
      feeAccount,
    });
    if (!result.success)
      throw new Error(result.error || "Failed to get swap transaction");
    return result.data;
  };

  const getLifiQuote = async () => {
    const fromAmount = formatTokenAmount(payAmount, payToken.decimals || 6);
    if (fromAmount === "0" || !fromAmount) throw new Error("Invalid amount");
    let fromTokenAddress: string;
    if (chainId === "1151111081099710") {
      fromTokenAddress =
        payToken.symbol === "SOL"
          ? "So11111111111111111111111111111111111111112"
          : payToken.address;
    } else {
      fromTokenAddress =
        payToken.symbol === "ETH" || payToken.symbol === "POL"
          ? "0x0000000000000000000000000000000000000000"
          : payToken.address;
    }
    let toTokenAddress: string;
    if (receiverChainId === "1151111081099710") {
      toTokenAddress =
        receiveToken.symbol === "SOL"
          ? "So11111111111111111111111111111111111111112"
          : receiveToken.address;
    } else {
      toTokenAddress =
        receiveToken.symbol === "ETH" || receiveToken.symbol === "POL"
          ? "0x0000000000000000000000000000000000000000"
          : receiveToken.address;
    }
    if (!fromWalletAddress || !toWalletAddress)
      throw new Error("Wallet addresses not available");
    const result = await fetchLifiQuote({
      fromChain: chainId,
      toChain: receiverChainId,
      fromToken: fromTokenAddress,
      toToken: toTokenAddress,
      fromAddress: fromWalletAddress,
      toAddress: toWalletAddress,
      fromAmount,
      slippage: slippage / 100,
    });
    if (!result.success)
      throw new Error(result.error || "Failed to get LiFi quote");
    return result.data;
  };

  const fetchQuote = useCallback(
    async (isAutoRefresh = false) => {
      if (
        !payAmount ||
        !payToken ||
        !receiveToken ||
        !fromWalletAddress ||
        !toWalletAddress
      ) {
        setQuote(null);
        setJupiterQuote(null);
        setLastQuoteTime(null);
        return;
      }
      try {
        setIsQuoteLoading(true);
        if (!isAutoRefresh) setIsCalculating(true);
        setSwapError(null);
        if (isSolanaToSolanaSwap()) {
          setJupiterQuote(await getJupiterQuote());
          setQuote(null);
        } else {
          setQuote(await getLifiQuote());
          setJupiterQuote(null);
        }
        setLastQuoteTime(Date.now());
      } catch (err: any) {
        setQuote(null);
        setJupiterQuote(null);
        setSwapError(formatUserFriendlyError(err.message || err.toString()));
        setLastQuoteTime(null);
      } finally {
        setIsQuoteLoading(false);
        setIsCalculating(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      chainId,
      fromWalletAddress,
      payAmount,
      payToken,
      receiveToken,
      receiverChainId,
      toWalletAddress,
      slippage,
    ],
  );

  // Auto-refresh every 10s
  useEffect(() => {
    if (quoteRefreshInterval.current)
      clearInterval(quoteRefreshInterval.current);
    if (lastQuoteTime && payAmount && payToken && receiveToken) {
      quoteRefreshInterval.current = setInterval(() => fetchQuote(true), 10000);
      return () => {
        if (quoteRefreshInterval.current)
          clearInterval(quoteRefreshInterval.current);
      };
    }
  }, [lastQuoteTime, payAmount, payToken, receiveToken, fetchQuote]);

  useEffect(() => {
    if (lastQuoteTime && payAmount && payToken && receiveToken) {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      setQuoteCountdown(10);
      countdownInterval.current = setInterval(
        () => setQuoteCountdown((p) => (p <= 1 ? 10 : p - 1)),
        1000,
      );
      return () => {
        if (countdownInterval.current) clearInterval(countdownInterval.current);
      };
    } else {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      setQuoteCountdown(10);
    }
  }, [lastQuoteTime, payAmount, payToken, receiveToken]);

  useEffect(() => {
    if (quoteRefreshInterval.current)
      clearInterval(quoteRefreshInterval.current);
    const id = setTimeout(() => fetchQuote(false), 500);
    return () => clearTimeout(id);
  }, [
    chainId,
    fromWalletAddress,
    payAmount,
    payToken,
    receiveToken,
    receiverChainId,
    toWalletAddress,
    slippage,
  ]);

  useEffect(() => {
    if ((quote || jupiterQuote) && receiveToken) {
      const toAmount = jupiterQuote
        ? jupiterQuote.outAmount
        : (quote?.estimate?.toAmount ?? quote?.toAmount);
      if (toAmount && receiveToken.decimals) {
        const readable = Number(toAmount) / Math.pow(10, receiveToken.decimals);
        setReceiveAmount(readable.toFixed(8).replace(/\.?0+$/, ""));
      } else setReceiveAmount("0");
    } else setReceiveAmount("");
  }, [quote, jupiterQuote, receiveToken]);

  useEffect(() => {
    setSwapError(null);
    setSwapStatus(null);
  }, [payAmount, payToken, receiveToken]);
  useEffect(() => {
    if (payToken?.chain) setChainId(getChainId(payToken.chain));
  }, [payToken]);
  useEffect(() => {
    setFromWalletAddress(
      payToken?.chain?.toUpperCase() === "SOLANA"
        ? selectedSolanaWallet?.address || ""
        : ethWallet || "",
    );
    if (!receiveToken) setToWalletAddress("");
    else if (
      receiveToken?.chain?.toUpperCase() === "SOLANA" ||
      receiveToken?.chainId == 1151111081099710
    )
      setToWalletAddress(selectedSolanaWallet?.address || "");
    else setToWalletAddress(ethWallet || "");
  }, [ethWallet, payToken, receiveToken, selectedSolanaWallet?.address]);

  useEffect(() => {
    const load = async () => {
      const t = Cookies.get("access-token");
      if (t) setAccessToken(t);
    };
    if (typeof window !== "undefined") load();
  }, []);

  // ── cleanup ─────────────────────────────────────────────────────────────────
  useEffect(
    () => () => {
      if (quoteRefreshInterval.current)
        clearInterval(quoteRefreshInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    },
    [],
  );

  // ── swap execution (unchanged, abbreviated) ─────────────────────────────────
  const saveSwapToDatabase = async (signature: string, q: any) => {
    try {
      const swapDetails = {
        signature,
        solanaAddress: selectedSolanaWallet?.address || "",
        inputToken: {
          symbol: payToken?.symbol || q.inputMint,
          amount: parseFloat(payAmount),
          decimals: payToken?.decimals || 6,
          mint: payToken?.address || q.inputMint,
          price: payToken?.price || "0",
          logo: payToken?.logoURI || "",
        },
        outputToken: {
          symbol: receiveToken?.symbol || q.outputMint,
          amount: parseFloat(receiveAmount),
          decimals: receiveToken?.decimals || 6,
          mint: receiveToken?.address || q.outputMint,
          price: receiveToken?.price || "0",
          logo: receiveToken?.logoURI || "",
        },
        slippageBps: Math.floor(slippage * 100),
        platformFeeBps: 50,
        timestamp: Date.now(),
      };
      await saveSwapTransaction(swapDetails, accessToken);
      if (socket?.connected) {
        getWalletNotificationService(socket).emitSwapCompleted({
          inputTokenSymbol: swapDetails.inputToken.symbol,
          inputAmount: swapDetails.inputToken.amount.toFixed(6),
          outputTokenSymbol: swapDetails.outputToken.symbol,
          outputAmount: swapDetails.outputToken.amount.toFixed(6),
          txSignature: signature,
          network: payToken?.chain || "SOLANA",
          inputTokenLogo: swapDetails.inputToken.logo,
          outputTokenLogo: swapDetails.outputToken.logo,
          inputUsdValue: formatUSDValue(
            swapDetails.inputToken.amount,
            swapDetails.inputToken.price,
          ),
          outputUsdValue: formatUSDValue(
            swapDetails.outputToken.amount,
            swapDetails.outputToken.price,
          ),
        });
      }
    } catch (e) {
      console.error("Failed to save swap:", e);
    }
  };

  const executeJupiterSwap = async () => {
    // ... (unchanged - full implementation from original)
    // Keep your existing executeJupiterSwap logic here
  };

  const executeLiFiSwap = async () => {
    // ... (unchanged - full implementation from original)
    // Keep your existing executeLiFiSwap logic here
  };

  const executeSolanaSwap = async () => {
    // ... (unchanged - full implementation from original)
    // Keep your existing executeSolanaSwap logic here
  };

  const executeCrossChainSwap = async () => {
    try {
      setIsSwapping(true);
      setSwapError(null);
      setTxHash(null);
      setSwapStatus("Preparing transaction...");
      const balanceCheck = validateBalance();
      if (!balanceCheck.isValid) {
        setSwapError(balanceCheck.error);
        setIsSwapping(false);
        return;
      }
      if (isSolanaToSolanaSwap()) await executeJupiterSwap();
      else await executeLiFiSwap();
    } catch (err: any) {
      setSwapError(
        formatUserFriendlyError(err.message || err.toString() || "Swap failed"),
      );
      setSwapStatus(null);
      setIsSwapping(false);
    }
  };

  // ── token selection handlers ────────────────────────────────────────────────

  const handleTokenSelect = (token: any, type: "pay" | "receive") => {
    if (type === "pay") {
      setPayToken(token);
    } else {
      // Derive chainId from the token and update receiver chain
      const tokenChainId =
        token.chainId?.toString() ??
        getChainId(token.chain ?? token.network ?? "");
      setReceiveToken(token);
      setReceiverChainId(tokenChainId);
    }
    setOpenDrawer(false);
    setSearchQuery("");
    setFilteredList([]);
    setIsSearching(false);
    if (
      payAmount &&
      ((type === "pay" && receiveToken) || (type === "receive" && payToken))
    ) {
      setIsQuoteLoading(true);
    }
  };

  const handleFlip = () => {
    const t = payToken;
    setPayToken(receiveToken);
    setReceiveToken(t);
    const a = payAmount;
    setPayAmount(receiveAmount);
    setReceiveAmount(a);
    if (receiveToken && t && receiveAmount) setIsQuoteLoading(true);
  };

  const handlePercentageClick = (pct: number) => {
    if (payToken?.balance) {
      setPayAmount((parseFloat(payToken.balance) * pct).toString());
      if (receiveToken) setIsQuoteLoading(true);
    }
  };

  const handlePayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPayAmount(e.target.value);
    if (e.target.value && payToken && receiveToken) setIsQuoteLoading(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (selecting === "pay") handlePayTokenSearch(q);
  };

  // ── quote info ──────────────────────────────────────────────────────────────

  const calculateExchangeRate = () => {
    const q = jupiterQuote || quote;
    if (!q || !payToken || !receiveToken) return null;
    const fromAmount = jupiterQuote
      ? jupiterQuote.inAmount
      : (quote?.estimate?.fromAmount ?? quote?.fromAmount);
    const toAmount = jupiterQuote
      ? jupiterQuote.outAmount
      : (quote?.estimate?.toAmount ?? quote?.toAmount);
    if (!fromAmount || !toAmount) return null;
    const from = Number(fromAmount) / Math.pow(10, payToken.decimals || 18);
    const to = Number(toAmount) / Math.pow(10, receiveToken.decimals || 18);
    return from > 0 ? to / from : null;
  };

  const getQuoteInfo = () => {
    const q = jupiterQuote || quote;
    if (!q || !payToken || !receiveToken) return null;
    const fromAmountUSD = quote
      ? (quote.estimate?.fromAmountUSD ?? quote.fromAmountUSD)
      : null;
    const toAmountUSD = quote
      ? (quote.estimate?.toAmountUSD ?? quote.toAmountUSD)
      : null;
    const priceImpact = jupiterQuote
      ? (Number(jupiterQuote.priceImpactPct) * 100).toFixed(2)
      : fromAmountUSD && toAmountUSD
        ? ((parseFloat(toAmountUSD) - parseFloat(fromAmountUSD)) /
            parseFloat(fromAmountUSD)) *
          100
        : null;
    return {
      exchangeRate: calculateExchangeRate(),
      fromAmountUSD: fromAmountUSD ? parseFloat(fromAmountUSD) : null,
      toAmountUSD: toAmountUSD ? parseFloat(toAmountUSD) : null,
      priceImpact,
    };
  };

  const isSwapButtonLoading = () =>
    isQuoteLoading ||
    isCalculating ||
    !!(
      payAmount &&
      payToken &&
      receiveToken &&
      !quote &&
      !jupiterQuote &&
      !swapError
    );

  const balanceValidation = validateBalance();

  const getTokenIconSVG = (token: any) => {
    const initials = (token?.symbol || "??").slice(0, 2).toUpperCase();
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#F9A826", "#6C5CE7"];
    const colorIndex = (token?.symbol?.length ?? 0) % colors.length;
    const svg = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" fill="${colors[colorIndex]}" rx="12"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${initials}</text></svg>`;
    return `data:image/svg+xml;base64,${typeof btoa !== "undefined" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
  };

  // ── render ──────────────────────────────────────────────────────────────────

  const categoryLabels: Record<TokenCategory, string> = {
    stock: "Stocks",
    crypto: "Crypto",
    metal: "Metals",
    stable: "Stables",
  };

  return (
    <div className="flex justify-center mt-10 pb-4 relative">
      <Card className="w-full max-w-md p-4 rounded-2xl shadow-lg bg-white text-black">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-center flex-1">Swaps</h2>
          <button
            onClick={() => setShowSlippageModal(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Quote countdown */}
        {lastQuoteTime &&
          payAmount &&
          payToken &&
          receiveToken &&
          !isQuoteLoading && (
            <div className="text-center mb-4">
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                Refreshing in {quoteCountdown}s
              </span>
            </div>
          )}

        {/* Swap route badge */}
        {payToken && receiveToken && (
          <div className="text-center mb-4">
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              {isSolanaToSolanaSwap() ? "Via Jupiter" : "Via Li.Fi"}
            </span>
          </div>
        )}

        <div className="space-y-4">
          {/* ── Pay section ── */}
          <div className="p-4 rounded-xl bg-gray-100">
            <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
              <span>You Pay</span>
              <span
                className={!balanceValidation.isValid ? "text-red-500" : ""}
              >
                {payToken?.balance
                  ? `${parseFloat(payToken.balance).toFixed(4)} ${payToken.symbol}`
                  : "0"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Input
                type="number"
                placeholder="0.00"
                value={payAmount}
                onChange={handlePayAmountChange}
                className="bg-transparent border-none text-2xl font-semibold w-full p-0 focus:outline-none focus:ring-0 focus:border-none"
              />
              <button
                onClick={() => {
                  setSelecting("pay");
                  setOpenDrawer(true);
                  setSearchQuery("");
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-sm hover:bg-gray-100 transition-colors"
              >
                <div className="relative min-w-max">
                  {payToken?.logoURI && (
                    <Image
                      src={sanitizeImageUrl(payToken.logoURI)}
                      alt={payToken.symbol}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  {payToken?.chain && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                      <Image
                        src={sanitizeImageUrl(
                          getChainIcon(payToken.chain) || "",
                        )}
                        alt={payToken.chain}
                        width={12}
                        height={12}
                        className="w-3 h-3 rounded-full"
                      />
                    </div>
                  )}
                </div>
                <span className="font-medium">
                  {payToken ? payToken.symbol : "Select"}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
            {payAmount && payToken && getQuoteInfo()?.fromAmountUSD && (
              <div className="text-sm text-gray-500 mt-2">
                ${getQuoteInfo()?.fromAmountUSD?.toFixed(2)}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-100 rounded-lg"
                onClick={() => handlePercentageClick(0.5)}
              >
                50%
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-100 rounded-lg"
                onClick={() => handlePercentageClick(1)}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Flip */}
          <div className="flex justify-center">
            <button
              onClick={handleFlip}
              disabled={!receiveToken}
              className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <ArrowUpDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* ── Receive section ── */}
          <div className="p-4 rounded-xl bg-gray-100">
            <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
              <span>You Receive</span>
              <span>
                {receiveToken?.balance
                  ? `${parseFloat(receiveToken.balance).toFixed(4)} ${receiveToken.symbol}`
                  : receiveToken
                    ? "0"
                    : ""}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                {isCalculating || isQuoteLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-32 rounded" />
                ) : (
                  <div className="font-base text-gray-800 font-medium">
                    {receiveAmount || "0.00"}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setSelecting("receive");
                  setOpenDrawer(true);
                  setSearchQuery("");
                  setFilteredList([]);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-sm hover:bg-gray-100 transition-colors"
              >
                {receiveToken ? (
                  <div className="flex items-center">
                    <div className="relative min-w-max">
                      <Image
                        src={sanitizeImageUrl(receiveToken.logoURI)}
                        alt={receiveToken.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                      />
                      {(() => {
                        const chainName =
                          receiverChainId === "1151111081099710"
                            ? "SOLANA"
                            : receiverChainId === "1"
                              ? "ETHEREUM"
                              : receiverChainId === "137"
                                ? "POLYGON"
                                : receiverChainId === "8453"
                                  ? "BASE"
                                  : receiveToken.chain || "SOLANA";
                        return (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                            <Image
                              src={sanitizeImageUrl(
                                getChainIcon(chainName) || "",
                              )}
                              alt={chainName}
                              width={12}
                              height={12}
                              className="w-3 h-3 rounded-full"
                            />
                          </div>
                        );
                      })()}
                    </div>
                    <span className="font-medium ml-2">
                      {receiveToken.symbol}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="font-medium">Select</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            </div>
            {receiveAmount && receiveToken && getQuoteInfo()?.toAmountUSD && (
              <div className="text-sm text-gray-500 mt-2">
                ${getQuoteInfo()?.toAmountUSD?.toFixed(2)}
              </div>
            )}
          </div>

          {/* Quote details */}
          {payToken &&
            receiveToken &&
            (quote || jupiterQuote) &&
            (() => {
              const info = getQuoteInfo();
              const rate = info?.exchangeRate;
              return rate ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-gray-600">
                      <span>Pricing</span>
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="text-right text-gray-900">
                      1 {payToken.symbol} ≈{" "}
                      {rate < 0.000001
                        ? rate.toExponential(4)
                        : rate.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 8,
                          })}{" "}
                      {receiveToken.symbol}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-gray-600">
                      <span>Slippage</span>
                      <Info className="w-4 h-4" />
                    </div>
                    <span className="text-gray-900">
                      {customSlippage ? `${customSlippage}%` : `${slippage}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-gray-600">
                      <span>Price Impact</span>
                      <Info className="w-4 h-4" />
                    </div>
                    <span className="text-gray-900">
                      {info && typeof info.priceImpact === "number" ? (
                        <span
                          className={
                            info.priceImpact < -3
                              ? "text-red-500"
                              : "text-gray-900"
                          }
                        >
                          {info.priceImpact >= 0 ? "+" : ""}
                          {info.priceImpact.toFixed(2)}%
                        </span>
                      ) : (
                        (info?.priceImpact ?? "-")
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-gray-600">
                      <span>Fees</span>
                      <Info className="w-4 h-4" />
                    </div>
                    <span className="text-gray-900">0.5%</span>
                  </div>
                  {(quote || jupiterQuote) && (
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                      Quote includes a 0.5% platform fee
                    </div>
                  )}
                </div>
              ) : null;
            })()}

          {/* Error / status */}
          {(swapError || swapStatus || !balanceValidation.isValid) && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              {!balanceValidation.isValid && (
                <div className="text-red-600 text-sm mb-2 text-center">
                  {balanceValidation.error}
                </div>
              )}
              {swapError && (
                <div className="text-red-600 text-sm mb-2 text-center flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {swapError}
                </div>
              )}
              {swapStatus && (
                <div
                  className={`text-sm text-center flex items-center justify-center gap-2 ${swapStatus.includes("confirmed") || swapStatus.includes("completed") ? "text-green-600" : "text-blue-600"}`}
                >
                  {swapStatus.includes("confirmed") ||
                  swapStatus.includes("completed") ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  )}
                  {swapStatus}
                </div>
              )}
              {txHash && (
                <div className="text-green-600 text-xs text-center mt-3 pt-2 border-t border-gray-200">
                  <a
                    href={getExplorerUrl(chainId, txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-green-700"
                  >
                    View on explorer
                  </a>
                  <div className="text-gray-500 mt-1 font-mono text-xs">
                    {txHash.length > 16
                      ? `${txHash.slice(0, 8)}...${txHash.slice(-8)}`
                      : txHash}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Swap button */}
          <Button
            onClick={
              swapStatus?.includes("confirmed") ||
              swapStatus?.includes("completed")
                ? () => {
                    setSwapStatus(null);
                    setSwapError(null);
                    setTxHash(null);
                    setPayAmount("");
                    setReceiveAmount("");
                    setLastQuoteTime(null);
                  }
                : executeCrossChainSwap
            }
            className={`w-full py-4 font-semibold rounded-xl ${swapStatus?.includes("confirmed") || swapStatus?.includes("completed") ? "bg-green-600 hover:bg-green-700" : "bg-black hover:bg-gray-800"} disabled:opacity-50 transition-colors`}
            disabled={
              isSwapping ||
              (!balanceValidation.isValid &&
                !(
                  swapStatus?.includes("confirmed") ||
                  swapStatus?.includes("completed")
                )) ||
              (isSwapButtonLoading() && !swapStatus?.includes("confirmed")) ||
              !payToken ||
              !receiveToken
            }
          >
            {swapStatus?.includes("confirmed") ||
            swapStatus?.includes("completed") ? (
              "New Swap"
            ) : isSwapping ? (
              "Swapping..."
            ) : !balanceValidation.isValid ? (
              "Insufficient Balance"
            ) : isSwapButtonLoading() ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                Getting Quote...
              </div>
            ) : !payAmount || !receiveAmount ? (
              "Enter Amount"
            ) : !receiveToken ? (
              "Select Token"
            ) : (
              "Swap"
            )}
          </Button>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          Token Select Drawer (shared for pay + receive)
      ═══════════════════════════════════════════════════════════════════════ */}
      {openDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setOpenDrawer(false);
              setSearchQuery("");
              setFilteredList([]);
            }}
          />

          {/* Panel */}
          <div className="relative w-full max-w-[30rem] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] mx-0 sm:mx-4 z-50">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h3 className="font-semibold text-lg text-gray-900">
                {selecting === "pay"
                  ? "Select Token to Pay"
                  : "Select Token to Receive"}
              </h3>
              <button
                onClick={() => {
                  setOpenDrawer(false);
                  setSearchQuery("");
                  setFilteredList([]);
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* ── PAY drawer content ── */}
            {selecting === "pay" && (
              <>
                {/* Chain filter */}
                <div className="px-5 pb-3 flex-shrink-0">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {PAY_CHAINS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handlePayChainSelect(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                          selectedPayChain === c.id
                            ? "bg-black text-white border-black"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {c.icon ? (
                          <Image
                            src={sanitizeImageUrl(c.icon)}
                            alt={c.name}
                            width={16}
                            height={16}
                            className="w-4 h-4 rounded-full"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              *
                            </span>
                          </div>
                        )}
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="px-5 pb-3 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search token name or symbol"
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                    />
                  </div>
                </div>

                {/* Token list */}
                <div className="flex-1 overflow-y-auto px-2 pb-5">
                  {isLoadingTokens ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-black" />
                    </div>
                  ) : availableTokens.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      No tokens found
                    </div>
                  ) : (
                    availableTokens
                      .filter((t) => t.address !== receiveToken?.address)
                      .map((t, i) => (
                        <TokenRow
                          key={t.address || i}
                          token={t}
                          onClick={() => handleTokenSelect(t, "pay")}
                        />
                      ))
                  )}
                </div>
              </>
            )}

            {/* ── RECEIVE drawer content (NEW) ── */}
            {selecting === "receive" && (
              <>
                {/* Search bar */}
                <div className="px-5 pb-3 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={onReceiveSearchChange}
                      placeholder="Search tokens across all chains..."
                      className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                      </div>
                    )}
                    {searchQuery && !isSearching && (
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        onClick={() => {
                          setSearchQuery("");
                          setFilteredList([]);
                        }}
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chain filter (only when not searching) */}
                {!searchQuery && (
                  <div className="px-5 pb-2 flex-shrink-0">
                    <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                      Select Chain
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {ALL_CHAINS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedReceiveChain(c.id);
                            setSearchQuery("");
                            setFilteredList([]);
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all flex-shrink-0 flex-1 ${
                            selectedReceiveChain === c.id
                              ? "bg-black border-black"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {c.icon ? (
                            <Image
                              src={sanitizeImageUrl(c.icon)}
                              alt={c.name}
                              width={28}
                              height={28}
                              className={`w-7 h-7 rounded-full ${selectedReceiveChain === c.id ? "ring-2 ring-white" : ""}`}
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                ✦
                              </span>
                            </div>
                          )}
                          <span
                            className={`text-xs font-medium ${selectedReceiveChain === c.id ? "text-white" : "text-gray-600"}`}
                          >
                            {c.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category tabs (only when not searching) */}
                {!searchQuery && (
                  <div className="px-5 pb-2 flex-shrink-0">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                      {TOKEN_CATEGORIES.map((cat, idx) => (
                        <button
                          key={cat}
                          onClick={() => setActiveReceiveTab(idx)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            activeReceiveTab === idx
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {categoryLabels[cat]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search hint when searching */}
                {searchQuery && filteredList.length > 0 && (
                  <div className="px-5 pb-1 flex-shrink-0">
                    <p className="text-xs text-gray-400">
                      {filteredList.length} result
                      {filteredList.length !== 1 ? "s" : ""} across all chains
                    </p>
                  </div>
                )}

                {/* Token list */}
                <div className="flex-1 overflow-y-auto px-2 pb-5">
                  {receiveDrawerLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-black" />
                      <p className="text-sm text-gray-400">Loading tokens…</p>
                    </div>
                  ) : isSearching ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-400" />
                    </div>
                  ) : visibleReceiveTokens.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-gray-400 text-sm">No tokens found</p>
                      {searchQuery && (
                        <p className="text-gray-300 text-xs mt-1">
                          Try a different name, symbol or address
                        </p>
                      )}
                      {!searchQuery && (
                        <p className="text-gray-300 text-xs mt-1">
                          Try selecting a different chain or category
                        </p>
                      )}
                    </div>
                  ) : (
                    visibleReceiveTokens
                      .filter((t) => {
                        const tAddr = (t.address || t.id || "").toLowerCase();
                        const payAddr = (
                          payToken?.address ||
                          payToken?.id ||
                          ""
                        ).toLowerCase();
                        return tAddr !== payAddr;
                      })
                      .map((t, i) => (
                        <TokenRow
                          key={(t.address || t.id || "") + i}
                          token={t}
                          onClick={() => handleTokenSelect(t, "receive")}
                        />
                      ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Slippage modal */}
      {showSlippageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSlippageModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md mx-4 z-50">
            <h3 className="text-lg font-semibold mb-4">Slippage Settings</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slippage tolerance
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[0.1, 0.5, 1.0, 2.0].map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setSlippage(v);
                      setCustomSlippage("");
                    }}
                    className={`py-2 text-sm rounded-lg transition-all ${slippage === v && !customSlippage ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                  >
                    {v === 0.5 ? "0.5% (Auto)" : `${v}%`}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={customSlippage}
                  onChange={(e) => {
                    setCustomSlippage(e.target.value);
                    const n = parseFloat(e.target.value);
                    if (!isNaN(n) && n >= 0.1 && n <= 50) setSlippage(n);
                  }}
                  placeholder="Custom"
                  className="pr-10"
                  step="0.1"
                  min="0.1"
                  max="50"
                />
                <span className="absolute right-3 top-2.5 text-gray-500">
                  %
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4 flex items-center gap-1">
              <Info className="w-4 h-4" />
              Transaction reverts if price changes more than this.
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowSlippageModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowSlippageModal(false)}
                className="flex-1 bg-black hover:bg-gray-800"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Swap in-progress overlay */}
      {isSwapping && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
            <p className="text-gray-700">{swapStatus || "Processing swap…"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
