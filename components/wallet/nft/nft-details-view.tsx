"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  ImageIcon,
  LockKeyhole,
  Play,
  Send,
  Share2,
  ShieldCheck,
  Tag,
  Ticket,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NFT, NFTAttribute } from "@/types/nft";
import NFTImage from "./nft-image";

interface NFTDetailProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT;
  onNext: () => void;
}

type VaultItem = {
  id: string;
  title: string;
  meta: string;
  kind: "receipt" | "community" | "promo" | "ticket" | "video";
  cta: string;
};

export default function NFTDetailView({
  isOpen = false,
  onClose,
  nft,
  onNext,
}: NFTDetailProps) {
  const [activeThumb, setActiveThumb] = useState(0);
  const externalUrl = getSafeExternalUrl(nft.externalUrl);
  const isReceiptUrl = externalUrl.includes("/receipt/");
  const collectionName =
    nft.collection?.collectionName && nft.collection.collectionName !== "Unknown Collection"
      ? nft.collection.collectionName
      : "Swop Collectibles";
  const tokenId = nft.tokenId || shortValue(nft.contract);
  const network = networkLabel(nft.network);
  const attributes = normalizeAttributes(nft.attributes);
  const vaultItems = useMemo(() => buildVaultItems(isReceiptUrl), [isReceiptUrl]);

  const handleCopy = async (value: string, label = "Copied") => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleShare = async () => {
    const value = externalUrl || nft.metadataUri || nft.contract;
    if (!value) {
      toast.error("No link available for this NFT");
      return;
    }
    await handleCopy(value, "NFT link copied");
  };

  const handleOpenExternal = () => {
    if (!externalUrl) {
      toast.error("No external link available");
      return;
    }
    window.open(externalUrl, "_blank", "noopener,noreferrer");
  };

  const handleVaultClick = (item: VaultItem) => {
    if (!isReceiptUrl) {
      toast("Exclusive content unlocks through Swop marketplace receipt NFTs.");
      return;
    }
    if (item.kind === "receipt") {
      handleOpenExternal();
      return;
    }
    toast("Open the receipt page to access this holder content.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        hideCloseButton
        className="w-[96vw] max-w-[980px] max-h-[92vh] overflow-y-auto rounded-[26px] border-0 bg-white p-0 shadow-[0_40px_100px_-28px_rgba(0,0,0,0.55)] gap-0"
      >
        <DialogTitle className="sr-only">{nft.name}</DialogTitle>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.07] bg-white/80 text-gray-900 backdrop-blur transition hover:bg-[#efefee]"
          aria-label="Close NFT details"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-black/[0.07] bg-[#fafafa] px-5 py-3 md:px-6">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-gray-400">
            NFT individual view
          </span>
          <div className="ml-auto hidden text-xs text-gray-500 sm:block">
            {isReceiptUrl
              ? "Receipt NFT detected - holder content available"
              : "Wallet-owned collectible"}
          </div>
        </div>

        <div className="flex flex-col gap-6 p-5 md:p-6">
          <section className="grid gap-6 md:grid-cols-[360px_minmax(0,1fr)] md:gap-7">
            <div>
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[20px] border border-black/[0.07] bg-[radial-gradient(circle_at_50%_0%,#2c2c30_0%,#161618_55%,#0c0c0e_100%)]">
                <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-white backdrop-blur">
                    {nft.tokenType || "NFT"}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-white backdrop-blur">
                    {network}
                  </span>
                </div>
                <div className="absolute bottom-[16%] left-1/2 h-6 w-[56%] -translate-x-1/2 rounded-full bg-black/50 blur" />
                <div className="relative flex h-[74%] w-[74%] rotate-[-4deg] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.07] bg-black shadow-[0_26px_50px_-16px_rgba(0,0,0,0.7)]">
                  <NFTImage
                    src={nft.image}
                    alt={nft.name}
                    width={320}
                    height={320}
                    className="h-full w-full object-cover"
                    priority
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {[
                  { label: "Front", icon: <ImageIcon className="h-5 w-5" /> },
                  { label: "Meta", icon: <FileText className="h-5 w-5" /> },
                  { label: "Perks", icon: <ShieldCheck className="h-5 w-5" /> },
                  { label: "Link", icon: <ExternalLink className="h-5 w-5" /> },
                ].map((thumb, index) => (
                  <button
                    type="button"
                    key={thumb.label}
                    onClick={() => setActiveThumb(index)}
                    className={`relative flex aspect-square items-center justify-center rounded-xl border bg-[#fafafa] text-gray-400 ${
                      index === activeThumb
                        ? "border-gray-950"
                        : "border-black/[0.07]"
                    }`}
                    aria-label={`View ${thumb.label}`}
                  >
                    {index === 0 ? (
                      <NFTImage
                        src={nft.image}
                        alt=""
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      thumb.icon
                    )}
                    <span
                      className={`absolute bottom-1 right-1 rounded px-1 font-mono text-[8px] font-bold uppercase tracking-[0.05em] ${
                        index === 0
                          ? "bg-white/80 text-gray-500"
                          : "text-gray-500"
                      }`}
                    >
                      {thumb.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.04em] text-gray-500">
                  {collectionName}
                </span>
                <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#19a974]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified
                </span>
              </div>

              <h2 className="mt-2 text-[28px] font-semibold leading-[1.05] text-[#0a0a0c] md:text-[30px]">
                {nft.name}
              </h2>
              <div className="mt-1 font-mono text-[13px] text-gray-500">
                #{tokenId} - {nft.symbol || "collectible"}
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-[#fafafa] px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dfe6ef] text-[12.5px] font-bold text-gray-900">
                  {network.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gray-500">
                    Owned by
                  </div>
                  <div className="truncate text-[13.5px] font-semibold text-gray-950">
                    {shortValue(nft.owner || nft.contract)}
                  </div>
                </div>
                <span className="ml-auto rounded-full border border-[#19a974]/20 bg-[#19a974]/10 px-3 py-1 text-[11px] font-bold text-[#19a974]">
                  You
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-4 border-t border-black/[0.07] pt-4">
                <Stat
                  label="Standard"
                  value={nft.tokenType || (network === "Solana" ? "Metaplex" : "ERC")}
                  sub={network}
                />
                <Stat
                  label="Floor"
                  value={
                    nft.collection?.floorPrice != null
                      ? String(nft.collection.floorPrice)
                      : "n/a"
                  }
                  sub={nft.collection?.floorPrice != null ? "collection" : "no floor"}
                />
                <Stat
                  label="Content"
                  value={String(vaultItems.length)}
                  sub={isReceiptUrl ? "unlocked" : "locked"}
                />
              </div>

              <div className="mt-5 grid grid-cols-[1fr_1fr_44px] gap-2">
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex items-center justify-center gap-2 rounded-[13px] border border-gray-950 bg-gray-950 px-3 py-3.5 text-[13.5px] font-semibold text-white transition hover:bg-[#232327]"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="inline-flex items-center justify-center gap-2 rounded-[13px] border border-black/[0.07] bg-white px-3 py-3.5 text-[13.5px] font-semibold text-gray-950 transition hover:bg-[#fafafa]"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  disabled={!externalUrl}
                  className="inline-flex items-center justify-center rounded-[13px] border border-black/[0.07] bg-white text-gray-950 transition hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={isReceiptUrl ? "Open receipt" : "Open external NFT link"}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <NftVault
            items={vaultItems}
            locked={!isReceiptUrl}
            onOpen={handleVaultClick}
            onUnlock={handleOpenExternal}
            canUnlock={Boolean(externalUrl)}
          />

          {nft.description ? (
            <section className="border-t border-black/[0.07] pt-5">
              <SectionHeader title="Description" />
              <p className="max-w-[680px] text-[14.5px] leading-[1.55] text-[#1a1a1f]">
                {nft.description}
              </p>
            </section>
          ) : null}

          <section className="border-t border-black/[0.07] pt-5">
            <SectionHeader title="Details" aside={`${network.toLowerCase()} - wallet NFT`} />
            <div className="grid overflow-hidden rounded-2xl border border-black/[0.07] bg-black/[0.07] sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                { label: "Token standard", value: nft.tokenType || "NFT" },
                { label: "Blockchain", value: network },
                { label: "Token ID", value: tokenId },
                {
                  label: "Contract",
                  value: shortValue(nft.contract),
                  copyValue: nft.contract,
                },
                {
                  label: "Metadata",
                  value: shortValue(nft.metadataUri),
                  copyValue: nft.metadataUri,
                },
                {
                  label: "Transferable",
                  value: nft.isCompressed ? "Compressed" : "Yes",
                  tone: "green" as const,
                },
              ] as Array<{
                label: string;
                value?: string;
                copyValue?: string;
                tone?: "green";
              }>
              ).map((detail) => (
                <div key={detail.label} className="bg-white p-4">
                  <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gray-500">
                    {detail.label}
                  </div>
                  <button
                    type="button"
                    disabled={!detail.copyValue}
                    onClick={() =>
                      detail.copyValue
                        ? void handleCopy(detail.copyValue, `${detail.label} copied`)
                        : undefined
                    }
                    className={`mt-1 inline-flex max-w-full items-center gap-1.5 text-left font-mono text-[13px] font-semibold ${
                      detail.tone === "green" ? "text-[#19a974]" : "text-gray-950"
                    } ${detail.copyValue ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span className="truncate">{detail.value || "Not set"}</span>
                    {detail.copyValue ? <Copy className="h-3 w-3 text-gray-400" /> : null}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-black/[0.07] pt-5">
            <SectionHeader title="Properties" aside={`${attributes.length} traits`} />
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {attributes.map((attribute) => (
                <div
                  key={`${attribute.trait_type}-${attribute.value}`}
                  className="rounded-xl border border-black/[0.07] bg-[#fafafa] p-3"
                >
                  <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-gray-500">
                    {attribute.trait_type}
                  </div>
                  <div className="mt-1 text-[13.5px] font-semibold text-gray-950">
                    {String(attribute.value)}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-gray-400">
                    wallet trait
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-[#fafafa] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ececeb] text-gray-500">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gray-500">
                Contract
              </div>
              <div className="truncate font-mono text-[12.5px] font-semibold text-gray-950">
                {nft.contract}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy(nft.contract, "Contract copied")}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-semibold text-gray-950"
            >
              Copy
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gray-500">
        {label}
      </div>
      <div className="mt-1 font-mono text-[17px] font-semibold text-gray-950">
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-gray-400">{sub}</div>
    </div>
  );
}

function SectionHeader({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="font-mono text-[13px] font-bold uppercase tracking-[0.04em] text-gray-500">
        {title}
      </h3>
      {aside ? (
        <span className="font-mono text-[11px] text-gray-400">{aside}</span>
      ) : null}
    </div>
  );
}

function NftVault({
  items,
  locked,
  canUnlock,
  onOpen,
  onUnlock,
}: {
  items: VaultItem[];
  locked: boolean;
  canUnlock: boolean;
  onOpen: (item: VaultItem) => void;
  onUnlock: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[radial-gradient(circle_at_100%_0%,#1c2a24_0%,#111113_48%,#0a0a0c_100%)] text-white">
      <div className="flex items-start gap-3 border-b border-white/[0.07] px-5 py-5 md:px-6">
        <div
          className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border ${
            locked
              ? "border-white/15 bg-white/[0.06] text-gray-400"
              : "border-[#19a974]/30 bg-[#19a974]/15 text-[#19a974]"
          }`}
        >
          {locked ? (
            <LockKeyhole className="h-5 w-5" />
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">
              Holder content
            </h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] ${
                locked
                  ? "border-white/15 bg-white/[0.06] text-gray-400"
                  : "border-[#19a974]/30 bg-[#19a974]/15 text-[#5fe0aa]"
              }`}
            >
              {locked ? "Locked" : "Unlocked"}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-[1.45] text-white/60">
            {locked
              ? "Marketplace perks unlock when this NFT is a Swop receipt or gated collectible."
              : "Your wallet holds the receipt NFT - open it to access the attached marketplace files."}
          </p>
        </div>
        <div className="whitespace-nowrap font-mono text-[11px] text-white/45">
          {items.length} {items.length === 1 ? "item" : "items"}
        </div>
      </div>

      <div className="relative flex flex-col gap-1 p-2.5">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onOpen(item)}
            className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-3.5 py-3 text-left transition hover:bg-white/[0.045]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-white">
              {vaultIcon(item.kind)}
            </div>
            <div className="min-w-0">
              <div
                className={`flex items-center gap-2 text-[14.5px] font-semibold ${
                  locked ? "blur-[3px] select-none" : ""
                }`}
              >
                <span className="truncate">{item.title}</span>
                <span className="rounded-md border border-white/15 px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-white/40">
                  {item.kind === "receipt" ? "Download" : item.kind}
                </span>
              </div>
              <div
                className={`mt-1 truncate font-mono text-[11px] text-white/50 ${
                  locked ? "blur-[3px] select-none" : ""
                }`}
              >
                {item.meta}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/15 bg-white/[0.08] px-3.5 py-2 text-[12.5px] font-semibold text-white">
              {locked ? <LockKeyhole className="h-3.5 w-3.5" /> : null}
              {locked ? "Unlock" : item.cta}
            </span>
          </button>
        ))}

        {locked ? (
          <div className="absolute inset-2 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-[#0c0c0e]/25 via-[#0c0c0e]/80 to-[#0c0c0e]/95 px-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08]">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div className="mt-3 text-[17px] font-semibold">
              Content locked
            </div>
            <p className="mt-1 max-w-[360px] text-[13px] leading-[1.5] text-white/60">
              Receipt NFTs from Swop marketplace orders verify ownership before
              downloads stream from the receipt page.
            </p>
            <button
              type="button"
              onClick={onUnlock}
              disabled={!canUnlock}
              className="mt-4 rounded-xl bg-white px-5 py-3 text-[13.5px] font-semibold text-[#0a0a0c] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {canUnlock ? "Open source" : "No receipt link"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function vaultIcon(kind: VaultItem["kind"]) {
  if (kind === "video") return <Play className="h-[18px] w-[18px] fill-current" />;
  if (kind === "community") return <Users className="h-[18px] w-[18px]" />;
  if (kind === "promo") return <Tag className="h-[18px] w-[18px]" />;
  if (kind === "ticket") return <Ticket className="h-[18px] w-[18px]" />;
  return <FileText className="h-[18px] w-[18px]" />;
}

function buildVaultItems(isReceiptUrl: boolean): VaultItem[] {
  if (isReceiptUrl) {
    return [
      {
        id: "receipt-download",
        title: "Receipt-gated marketplace files",
        meta: "Order options - receipt NFT verified",
        kind: "receipt",
        cta: "Open",
      },
      {
        id: "community-access",
        title: "Seller holder updates",
        meta: "Marketplace access - token-gated",
        kind: "community",
        cta: "View",
      },
      {
        id: "promo",
        title: "Buyer-only perks",
        meta: "Promo or event pass - seller managed",
        kind: "promo",
        cta: "View",
      },
    ];
  }

  return [
    {
      id: "marketplace-content",
      title: "Marketplace exclusive content",
      meta: "Unlocks with compatible Swop receipt NFTs",
      kind: "receipt",
      cta: "Open",
    },
    {
      id: "holder-access",
      title: "Holder access",
      meta: "Community, downloads, promos, and passes",
      kind: "community",
      cta: "View",
    },
    {
      id: "event-pass",
      title: "IRL and digital perks",
      meta: "Seller managed - gated by ownership",
      kind: "ticket",
      cta: "View",
    },
  ];
}

function normalizeAttributes(attributes?: NFTAttribute[]) {
  const clean = (attributes || [])
    .filter((attribute) => attribute?.trait_type && attribute.value != null)
    .slice(0, 6);
  if (clean.length) return clean;
  return [
    { trait_type: "Collection", value: "Wallet NFT" },
    { trait_type: "Access", value: "Marketplace" },
    { trait_type: "Standard", value: "On-chain" },
    { trait_type: "Status", value: "Transferable" },
  ];
}

function networkLabel(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("sol")) return "Solana";
  if (normalized.includes("poly")) return "Polygon";
  if (normalized.includes("base")) return "Base";
  if (normalized.includes("eth")) return "Ethereum";
  return "Solana";
}

function shortValue(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) return "Not set";
  if (text.length <= 14) return text;
  return `${text.slice(0, 6)}...${text.slice(-6)}`;
}

function getSafeExternalUrl(value?: string): string {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value.trim());

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    if (
      (url.hostname === "swop.id" || url.hostname === "www.swop.id") &&
      url.pathname.startsWith("/receipt/")
    ) {
      return `https://www.swopme.app${url.pathname}${url.search}`;
    }

    return url.toString();
  } catch {
    return "";
  }
}
