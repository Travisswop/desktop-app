"use client";

import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { ChevronDown, Loader2, Lock } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { useMultiChainTokenData } from "@/lib/hooks/useToken";
import { useNFT } from "@/lib/hooks/useNFT";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SmartsiteTabGate } from "@/lib/smartsite-template-order";

type TokenType = "NFT" | "Token";

/**
 * Per-tab token gate config — the differentiated flow from the whole-page
 * Token Powered Site editor: no On/Off, forward link, or cover image. Pick a
 * token/NFT + min amount; the parent persists { gated: true, gate } onto the
 * tab entry and the public viewer blurs just that tab's content behind an
 * "Own X to view content" pill.
 */
export default function TabGateConfigModal({
  open,
  onOpenChange,
  tabName,
  initialGate,
  saving = false,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabName: string;
  initialGate?: SmartsiteTabGate | null;
  saving?: boolean;
  onSave: (gate: SmartsiteTabGate) => void;
}) {
  const { wallets: solanaWallets } = useSolanaWallets();
  const { wallets: ethWallets } = useWallets();

  const solWalletAddress = useMemo(
    () =>
      solanaWallets?.find(
        (w) => w.walletClientType === "privy" || w.connectorType === "embedded",
      )?.address,
    [solanaWallets],
  );
  const evmWalletAddress = useMemo(
    () =>
      ethWallets?.find(
        (w) => w.walletClientType === "privy" || w.connectorType === "embedded",
      )?.address,
    [ethWallets],
  );

  // Same Solana-only catalog the Token Powered Site editor offers.
  const { tokens, loading: tokensLoading } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    ["SOLANA"],
  );
  const { nfts, loading: nftsLoading } = useNFT(
    solWalletAddress,
    evmWalletAddress,
    ["SOLANA"],
  );

  const solanaTokens = useMemo(
    () => tokens.filter((token) => token.chain === "SOLANA"),
    [tokens],
  );
  const solanaNFTs = useMemo(
    () => nfts.filter((nft) => nft.network === "solana"),
    [nfts],
  );

  const [tokenType, setTokenType] = useState<TokenType>("NFT");
  const [selectedToken, setSelectedToken] = useState("");
  const [minRequired, setMinRequired] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Re-seed from the tab's saved config each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setTokenType(initialGate?.tokenType === "Token" ? "Token" : "NFT");
    setSelectedToken(initialGate?.selectedToken ?? "");
    setMinRequired(
      typeof initialGate?.minRequired === "number" &&
        Number.isFinite(initialGate.minRequired)
        ? String(initialGate.minRequired)
        : "",
    );
  }, [open, initialGate]);

  const currentItems = useMemo(() => {
    if (tokenType === "NFT") {
      return solanaNFTs.map((nft) => ({
        value: nft.contract,
        label: nft.name,
      }));
    }
    return solanaTokens.map((token) => ({
      value: token.address || token.symbol,
      label: `${token.name} (${token.symbol})`,
      symbol: token.symbol,
    }));
  }, [tokenType, solanaNFTs, solanaTokens]);

  const optionsLoading = tokenType === "NFT" ? nftsLoading : tokensLoading;

  const handleTokenTypeChange = (type: TokenType) => {
    if (type === tokenType) return;
    setTokenType(type);
    setSelectedToken("");
    setError(null);
  };

  const handleSave = () => {
    if (!selectedToken) {
      setError(`Please select a ${tokenType === "NFT" ? "NFT" : "token"}.`);
      return;
    }
    if (tokenType === "Token" && (!minRequired || Number(minRequired) <= 0)) {
      setError("Please enter a valid minimum token amount.");
      return;
    }
    const picked = currentItems.find((item) => item.value === selectedToken);
    const tokenName =
      tokenType === "Token"
        ? ((picked as { symbol?: string } | undefined)?.symbol ??
          picked?.label ??
          "")
        : (picked?.label ?? initialGate?.tokenName ?? "");
    onSave({
      tokenType,
      selectedToken,
      tokenName,
      minRequired: tokenType === "Token" ? Number(minRequired) : 1,
      network: "SOLANA",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.04]">
              <Lock className="h-5 w-5 text-gray-950" />
            </div>
            <DialogTitle className="text-xl">Token gate this tab</DialogTitle>
          </div>
          <DialogDescription className="text-[13px] text-gray-500">
            Only the <span className="font-semibold">{tabName}</span> tab is
            gated — visitors see its content blurred until their wallet holds
            the token below. The rest of the page stays public.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Token type */}
          <div className="flex rounded-full bg-black/[0.04] p-1">
            {(["NFT", "Token"] as TokenType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTokenTypeChange(type)}
                className={`flex-1 rounded-full py-2 text-[13px] font-semibold transition ${
                  tokenType === type
                    ? "bg-white text-gray-950 shadow-sm"
                    : "text-gray-500 hover:text-gray-950"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Asset picker */}
          <div className="relative">
            {optionsLoading ? (
              <div className="flex w-full items-center justify-center rounded-xl border border-black/[0.06] bg-white px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="ml-2 text-[13px] text-gray-500">
                  Loading wallet…
                </span>
              </div>
            ) : (
              <>
                <select
                  value={selectedToken}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    setSelectedToken(e.target.value);
                    setError(null);
                  }}
                  disabled={currentItems.length === 0}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-[14px] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {currentItems.length === 0
                      ? `No ${tokenType === "NFT" ? "NFTs" : "tokens"} found`
                      : `Select ${tokenType === "NFT" ? "an NFT" : "a token"}`}
                  </option>
                  {currentItems.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
              </>
            )}
          </div>

          {/* Min amount (fungible tokens only) */}
          {tokenType === "Token" && (
            <div>
              <input
                type="text"
                inputMode="decimal"
                value={minRequired}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setMinRequired(e.target.value.replace(/[^0-9.]/g, ""));
                  setError(null);
                }}
                placeholder="Minimum amount (e.g. 100)"
                className="w-full rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-[14px] focus:outline-none"
              />
              <p className="mt-1 text-[12px] text-gray-400">
                Visitors need at least this balance to view the tab.
              </p>
            </div>
          )}

          {error && <p className="text-[13px] text-red-600">{error}</p>}
        </div>

        <DialogFooter className="gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-black/[0.04] px-6 py-2.5 text-[13px] font-semibold text-gray-700 transition hover:bg-black/[0.08]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || optionsLoading}
            className="flex items-center gap-2 rounded-full bg-gray-950 px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Gate this tab
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
