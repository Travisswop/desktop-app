"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  LockKeyhole,
  Minus,
  Play,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Ticket,
  Users,
  X,
} from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/app/(public-profile)/sp/[username]/cart/context/CartContext";
import { useMicrositeData } from "@/app/(public-profile)/sp/[username]/context/MicrositeContext";
import type { MarketplaceExclusiveContentItem } from "@/lib/marketplace-api";
import {
  getMarketplaceExclusiveContentItems,
  getSmartsiteMarketplaceImage,
  getSmartsiteMarketplaceName,
  getSmartsiteMarketplacePrice,
  normalizeSmartsiteMarketplaceVariants,
  type SmartsiteMarketplaceDisplayItem,
} from "@/lib/smartsite-marketplace-display";
import isUrl from "@/lib/isUrl";

interface ProductDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SmartsiteMarketplaceDisplayItem;
  sellerId: string;
  canAddToCart: boolean;
}

type MarketplaceDetail = {
  label: string;
  value: string;
  tone?: "green";
  copyValue?: string;
};

const ProductDetailsModal = ({
  open,
  onOpenChange,
  item,
  sellerId,
  canAddToCart,
}: ProductDetailsModalProps) => {
  const { state, dispatch } = useCart();
  const { micrositeData } = useMicrositeData();

  const productId = String(item.marketplaceProductId || item._id || "");
  const productName = getSmartsiteMarketplaceName(item);
  const productPrice = getSmartsiteMarketplacePrice(item);
  const productDescription = item.description || item.itemDescription || "";
  const requiresShipping =
    item.productType === "physical" ||
    Boolean(item.fulfillment?.requiresShipping);
  const digitalAsset = item.fulfillment?.digitalAsset;
  const hasReceiptGatedAsset = Boolean(digitalAsset?.enabled);
  const exclusiveItems = useMemo(
    () => getMarketplaceExclusiveContentItems(item),
    [item],
  );

  const images = useMemo(() => {
    const list = (item.images || [])
      .map((image) => image?.url)
      .filter(Boolean) as string[];
    return list.length ? list : [getSmartsiteMarketplaceImage(item)];
  }, [item]);

  const variants = useMemo(
    () => normalizeSmartsiteMarketplaceVariants(item.variants || []),
    [item.variants],
  );

  const tracksInventory = Boolean(item.inventory?.track);
  const availableStock = tracksInventory
    ? Number(item.inventory?.available || 0)
    : Infinity;
  const isSoldOut = tracksInventory && availableStock <= 0;

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [activeExclusiveItem, setActiveExclusiveItem] =
    useState<MarketplaceExclusiveContentItem | null>(null);

  const isOptionSoldOut = (option: {
    name?: string;
    quantity?: number;
    sold?: number;
  }) =>
    tracksInventory &&
    typeof option.quantity === "number" &&
    option.quantity - Number(option.sold || 0) <= 0;

  useEffect(() => {
    if (!open) return;
    setActiveImage(0);
    setQuantity(1);
    setActiveExclusiveItem(null);
    const defaults: Record<string, string> = {};
    for (const variant of variants) {
      const firstAvailable =
        variant.options?.find((option) => !isOptionSoldOut(option)) ||
        variant.options?.[0];
      if (variant.name && firstAvailable?.name) {
        defaults[variant.name] = firstAvailable.name;
      }
    }
    setSelectedOptions(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  const sellerName = micrositeData?.name || "Seller";
  const sellerAvatar = micrositeData?.profilePic
    ? isUrl(micrositeData.profilePic)
      ? micrositeData.profilePic
      : `/images/user_avator/${micrositeData.profilePic}@3x.png`
    : null;

  const sellerInitials =
    sellerName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S";

  const contentLocked = canAddToCart || isSoldOut;
  const stockLabel = tracksInventory
    ? `${Math.max(0, availableStock)} available`
    : "Open edition";
  const fulfillmentLabel = requiresShipping
    ? "Ships to buyer"
    : hasReceiptGatedAsset
      ? "Receipt NFT unlock"
      : "Digital checkout";

  const handleShareLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?product=${productId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Product link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleCopy = async (value: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((current) => {
      const next = current + delta;
      if (next < 1) return 1;
      if (tracksInventory && next > availableStock) {
        toast.error("No more stock available");
        return current;
      }
      return next;
    });
  };

  const handleAddToCart = () => {
    if (!productId) {
      toast.error("This product is not available for checkout.");
      return;
    }

    const optionEntries = Object.entries(selectedOptions);
    const variantKey = optionEntries
      .map(([name, value]) => `${name}:${value}`)
      .join("|");
    const cartId = variantKey ? `${productId}__${variantKey}` : productId;
    const displayName = variantKey
      ? `${productName} (${optionEntries.map(([, value]) => value).join(", ")})`
      : productName;

    const existing = state.items?.find((cartItem) => cartItem._id === cartId);
    if (existing) {
      dispatch({
        type: "UPDATE_QUANTITY",
        payload: { id: cartId, quantity: existing.quantity + quantity },
      });
    } else {
      dispatch({
        type: "ADD_ITEM",
        payload: {
          _id: cartId,
          marketplaceProductId: productId,
          productType: item.productType,
          quantity,
          timestamp: new Date().getTime(),
          sellerId,
          selectedOptions:
            optionEntries.length > 0 ? selectedOptions : undefined,
          nftTemplate: {
            _id: productId,
            name: displayName,
            description: productDescription,
            image: images[0],
            price: productPrice,
            nftType: requiresShipping
              ? ("phygital" as const)
              : ("non-phygital" as const),
          },
        },
      });
    }

    toast.success("Item added to cart");
    onOpenChange(false);
  };

  const openExclusiveItem = (content: MarketplaceExclusiveContentItem) => {
    if (contentLocked) {
      toast("Buy this marketplace NFT to unlock the holder content.");
      return;
    }
    setActiveExclusiveItem(content);
  };

  const details: MarketplaceDetail[] = [
    { label: "Item type", value: marketplaceTypeLabel(item.productType) },
    { label: "Blockchain", value: "Solana" },
    {
      label: "Unlock policy",
      value: hasReceiptGatedAsset ? "Receipt NFT" : "Marketplace checkout",
      tone: hasReceiptGatedAsset ? "green" : undefined,
    },
    {
      label: "Product ID",
      value: shortValue(productId),
      copyValue: productId,
    },
    {
      label: "Inventory",
      value: stockLabel,
      tone: !isSoldOut ? "green" : undefined,
    },
    { label: "Fulfillment", value: fulfillmentLabel },
  ];

  const propertyCards = buildPropertyCards(item, variants, exclusiveItems);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="w-[96vw] max-w-[980px] max-h-[92vh] overflow-y-auto rounded-[26px] border-0 bg-white p-0 shadow-[0_40px_100px_-28px_rgba(0,0,0,0.55)] gap-0"
      >
        <DialogTitle className="sr-only">{productName}</DialogTitle>
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.07] bg-white/80 text-gray-900 backdrop-blur transition hover:bg-[#efefee]"
          aria-label="Close product details"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-black/[0.07] bg-[#fafafa] px-5 py-3 md:px-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.07] bg-white text-gray-700 transition hover:bg-gray-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-gray-400">
            NFT marketplace item
          </span>
          <span className="ml-auto hidden text-xs text-gray-500 sm:block">
            Exclusive content unlocks after checkout
          </span>
        </div>

        <div className="flex flex-col gap-6 p-5 md:p-6">
          <section className="grid gap-6 md:grid-cols-[360px_minmax(0,1fr)] md:gap-7">
            <div>
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[20px] border border-black/[0.07] bg-[radial-gradient(circle_at_50%_0%,#2c2c30_0%,#161618_55%,#0c0c0e_100%)]">
                <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-white backdrop-blur">
                    {marketplaceTypeLabel(item.productType)}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-white backdrop-blur">
                    Solana
                  </span>
                </div>
                <div className="absolute bottom-[16%] left-1/2 h-6 w-[56%] -translate-x-1/2 rounded-full bg-black/50 blur" />
                <div className="relative h-[74%] w-[74%] rotate-[-4deg] overflow-hidden rounded-2xl border border-white/[0.07] bg-black shadow-[0_26px_50px_-16px_rgba(0,0,0,0.7)]">
                  <Image
                    src={images[activeImage] || images[0]}
                    alt={productName}
                    fill
                    quality={100}
                    className="object-cover"
                    sizes="(max-width: 768px) 90vw, 320px"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {images.slice(0, 4).map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() => setActiveImage(index)}
                    className={`relative aspect-square overflow-hidden rounded-xl border bg-[#fafafa] ${
                      index === activeImage
                        ? "border-gray-950"
                        : "border-black/[0.07]"
                    }`}
                    aria-label={`View ${productName} image ${index + 1}`}
                  >
                    <Image
                      src={image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                    <span className="absolute bottom-1 right-1 rounded bg-white/80 px-1 font-mono text-[8px] font-bold uppercase tracking-[0.05em] text-gray-500">
                      {index === 0 ? "Front" : `0${index + 1}`}
                    </span>
                  </button>
                ))}
                {images.length < 4
                  ? Array.from({ length: 4 - images.length }).map((_, index) => (
                      <div
                        key={`empty-thumb-${index}`}
                        className="relative flex aspect-square items-center justify-center rounded-xl border border-black/[0.07] bg-[#fafafa] text-gray-300"
                      >
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    ))
                  : null}
              </div>
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.04em] text-gray-500">
                  {sellerName}
                </span>
                <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#19a974]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified
                </span>
              </div>

              <h2 className="mt-2 text-[28px] font-semibold leading-[1.05] text-[#0a0a0c] md:text-[30px]">
                {productName}
              </h2>
              <div className="mt-1 font-mono text-[13px] text-gray-500">
                {shortValue(productId)} - {stockLabel}
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-[#fafafa] px-3 py-2.5">
                {sellerAvatar ? (
                  <Image
                    src={sellerAvatar}
                    alt={sellerName}
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dfe6ef] text-[12.5px] font-bold text-gray-900">
                    {sellerInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gray-500">
                    Sold by
                  </div>
                  <div className="truncate text-[13.5px] font-semibold text-gray-950">
                    {sellerName}
                  </div>
                </div>
                {hasReceiptGatedAsset ? (
                  <span className="ml-auto rounded-full border border-[#19a974]/20 bg-[#19a974]/10 px-3 py-1 text-[11px] font-bold text-[#19a974]">
                    Gated
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-4 border-t border-black/[0.07] pt-4">
                <Stat label="Price" value={formatUsd(productPrice)} sub="USDC checkout" />
                <Stat
                  label="Available"
                  value={tracksInventory ? String(Math.max(0, availableStock)) : "Open"}
                  sub={tracksInventory ? "remaining" : "edition"}
                />
                <Stat
                  label="Content"
                  value={String(exclusiveItems.length)}
                  sub={exclusiveItems.length === 1 ? "item" : "items"}
                />
              </div>

              <div className="mt-5 grid grid-cols-[1fr_1fr_44px] gap-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canAddToCart || isSoldOut}
                  className="inline-flex items-center justify-center gap-2 rounded-[13px] border border-gray-950 bg-gray-950 px-3 py-3.5 text-[13.5px] font-semibold text-white transition hover:bg-[#232327] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {isSoldOut ? "Sold out" : "Add to cart"}
                </button>
                <button
                  type="button"
                  onClick={handleShareLink}
                  className="inline-flex items-center justify-center gap-2 rounded-[13px] border border-black/[0.07] bg-white px-3 py-3.5 text-[13.5px] font-semibold text-gray-950 transition hover:bg-[#fafafa]"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy(productId, "Product ID copied")}
                  className="inline-flex items-center justify-center rounded-[13px] border border-black/[0.07] bg-white text-gray-950 transition hover:bg-[#fafafa]"
                  aria-label="Copy product ID"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  Quantity
                </p>
                <div className="inline-flex items-center gap-3 rounded-full bg-gray-100 px-3 py-1.5">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="text-gray-700 disabled:opacity-40"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="text-gray-700"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <ExclusiveContentVault
            items={exclusiveItems}
            locked={exclusiveItems.length > 0 && contentLocked}
            onOpen={openExclusiveItem}
            onUnlock={handleAddToCart}
            canUnlock={canAddToCart && !isSoldOut}
          />

          {variants.length > 0 ? (
            <section className="border-t border-black/[0.07] pt-5">
              <SectionHeader title="Options" aside={`${variants.length} groups`} />
              <div className="space-y-4">
                {variants.map((variant) => (
                  <div key={variant.name}>
                    <p className="mb-2 text-sm font-semibold text-gray-900">
                      {variant.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {variant.options?.map((option) => {
                        if (!option?.name) return null;
                        const soldOut = isOptionSoldOut(option);
                        const isSelected =
                          selectedOptions[variant.name || ""] === option.name;
                        return (
                          <button
                            key={option.name}
                            disabled={soldOut}
                            onClick={() =>
                              setSelectedOptions((current) => ({
                                ...current,
                                [variant.name || ""]: option.name || "",
                              }))
                            }
                            className={`min-h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
                              isSelected
                                ? "border-gray-900 bg-gray-900 text-white"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                            } ${soldOut ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                          >
                            {option.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {productDescription ? (
            <section className="border-t border-black/[0.07] pt-5">
              <SectionHeader title="Description" />
              <p className="max-w-[680px] text-[14.5px] leading-[1.55] text-[#1a1a1f]">
                {productDescription}
              </p>
            </section>
          ) : null}

          <section className="border-t border-black/[0.07] pt-5">
            <SectionHeader title="Details" aside="marketplace - on-chain receipt" />
            <div className="grid overflow-hidden rounded-2xl border border-black/[0.07] bg-black/[0.07] sm:grid-cols-2 lg:grid-cols-3">
              {details.map((detail) => (
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
                    <span className="truncate">{detail.value}</span>
                    {detail.copyValue ? <Copy className="h-3 w-3 text-gray-400" /> : null}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {propertyCards.length > 0 ? (
            <section className="border-t border-black/[0.07] pt-5">
              <SectionHeader title="Properties" aside={`${propertyCards.length} traits`} />
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {propertyCards.map((property) => (
                  <div
                    key={`${property.label}-${property.value}`}
                    className="rounded-xl border border-black/[0.07] bg-[#fafafa] p-3"
                  >
                    <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-gray-500">
                      {property.label}
                    </div>
                    <div className="mt-1 text-[13.5px] font-semibold text-gray-950">
                      {property.value}
                    </div>
                    {property.meta ? (
                      <div className="mt-1 font-mono text-[10px] text-gray-400">
                        {property.meta}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-[#fafafa] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ececeb] text-gray-500">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gray-500">
                Marketplace product ID
              </div>
              <div className="truncate font-mono text-[12.5px] font-semibold text-gray-950">
                {productId}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy(productId, "Product ID copied")}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-semibold text-gray-950"
            >
              Copy
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {activeExclusiveItem ? (
          <ExclusiveContentViewer
            item={activeExclusiveItem}
            onClose={() => setActiveExclusiveItem(null)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

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

function ExclusiveContentVault({
  items,
  locked,
  canUnlock,
  onOpen,
  onUnlock,
}: {
  items: MarketplaceExclusiveContentItem[];
  locked: boolean;
  canUnlock: boolean;
  onOpen: (item: MarketplaceExclusiveContentItem) => void;
  onUnlock: () => void;
}) {
  const isEmpty = items.length === 0;

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
              {isEmpty ? "No content" : locked ? "Locked" : "Unlocked"}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-[1.45] text-white/60">
            {isEmpty
              ? "No holder content is attached to this marketplace item yet."
              : locked
              ? "Buy this marketplace NFT to unlock the content attached by the seller."
              : "This view can preview the content attached to the marketplace item."}
          </p>
        </div>
        <div className="whitespace-nowrap font-mono text-[11px] text-white/45">
          {items.length} {items.length === 1 ? "item" : "items"}
        </div>
      </div>

      <div className="relative flex flex-col gap-1 p-2.5">
        {isEmpty ? (
          <div className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-white/70">
              <FileText className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0">
              <div className="text-[14.5px] font-semibold">
                Ready for exclusive content
              </div>
              <div className="mt-1 font-mono text-[11px] text-white/50">
                Digital Delivery uploads and future exclusiveContent rows appear here.
              </div>
            </div>
          </div>
        ) : (
          items.map((content) => (
            <button
              type="button"
              key={content.id || content.title}
              onClick={() => onOpen(content)}
              className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-3.5 py-3 text-left transition hover:bg-white/[0.045]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-white">
                {contentIcon(content)}
              </div>
              <div className="min-w-0">
                <div
                  className={`flex items-center gap-2 text-[14.5px] font-semibold ${
                    locked ? "blur-[3px] select-none" : ""
                  }`}
                >
                  <span className="truncate">
                    {content.title || "Exclusive content"}
                  </span>
                  <span className="rounded-md border border-white/15 px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-white/40">
                    {contentKindLabel(content)}
                  </span>
                </div>
                <div
                  className={`mt-1 truncate font-mono text-[11px] text-white/50 ${
                    locked ? "blur-[3px] select-none" : ""
                  }`}
                >
                  {contentMeta(content)}
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/15 bg-white/[0.08] px-3.5 py-2 text-[12.5px] font-semibold text-white">
                {locked ? <LockKeyhole className="h-3.5 w-3.5" /> : null}
                {locked ? "Unlock" : content.ctaLabel || defaultContentCta(content)}
              </span>
            </button>
          ))
        )}

        {locked ? (
          <div className="absolute inset-2 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-[#0c0c0e]/25 via-[#0c0c0e]/80 to-[#0c0c0e]/95 px-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08]">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div className="mt-3 text-[17px] font-semibold">
              Content locked
            </div>
            <p className="mt-1 max-w-[360px] text-[13px] leading-[1.5] text-white/60">
              Checkout mints a receipt NFT. That receipt unlocks the seller's
              attached files from your order options and receipt page.
            </p>
            <button
              type="button"
              onClick={onUnlock}
              disabled={!canUnlock}
              className="mt-4 rounded-xl bg-white px-5 py-3 text-[13.5px] font-semibold text-[#0a0a0c] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {canUnlock ? "Add to cart" : "Unavailable"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ExclusiveContentViewer({
  item,
  onClose,
}: {
  item: MarketplaceExclusiveContentItem;
  onClose: () => void;
}) {
  const isPlayable = contentKindLabel(item) === "Video";
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#08080a]/80 p-6 backdrop-blur-md">
      <div className="relative w-full max-w-[540px] overflow-hidden rounded-[22px] border border-white/10 bg-[#111113] text-white shadow-[0_40px_90px_-20px_rgba(0,0,0,0.7)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Close content preview"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_0%,#1d2a25,#0a0a0c)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#0a0a0c]">
            {isPlayable ? <Play className="ml-1 h-6 w-6 fill-current" /> : contentIcon(item)}
          </div>
        </div>
        <div className="p-6">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#19a974]">
            {contentKindLabel(item)} - receipt-gated
          </div>
          <div className="mt-2 text-[19px] font-semibold">
            {item.title || item.fileName || "Exclusive content"}
          </div>
          <p className="mt-1 text-[13.5px] leading-[1.55] text-white/60">
            {item.description ||
              "This content is attached to the marketplace item and unlocks with the buyer's receipt NFT."}
          </p>
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-white/20 p-4">
            <span className="min-w-0 flex-1 truncate font-mono text-[15px] font-bold tracking-[0.06em]">
              {item.fileName || item.originalName || item.url || "RECEIPT NFT"}
            </span>
            <span className="rounded-lg bg-white px-3 py-2 text-[12.5px] font-semibold text-[#0a0a0c]">
              Preview
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function marketplaceTypeLabel(type?: string | null) {
  if (type === "physical") return "Physical";
  if (type === "in_person_checkout") return "In-person";
  return "Digital";
}

function formatUsd(value: number) {
  return `$${value.toLocaleString(undefined, {
    maximumFractionDigits: value >= 1 ? 2 : 6,
  })}`;
}

function shortValue(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) return "Not set";
  if (text.length <= 14) return text;
  return `${text.slice(0, 6)}...${text.slice(-6)}`;
}

function fileSize(size?: number) {
  if (!size || !Number.isFinite(size)) return "secure file";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function contentKindLabel(content: MarketplaceExclusiveContentItem) {
  const kind = String(content.kind || "").toLowerCase();
  if (kind.includes("video")) return "Video";
  if (kind.includes("community") || kind.includes("access")) return "Access";
  if (kind.includes("promo") || kind.includes("coupon")) return "Promo";
  if (kind.includes("event") || kind.includes("ticket")) return "Ticket";
  if (kind.includes("link")) return "Link";
  if (kind.includes("download")) return "Download";
  return "File";
}

function defaultContentCta(content: MarketplaceExclusiveContentItem) {
  const label = contentKindLabel(content);
  if (label === "Video") return "Play";
  if (label === "Access") return "Open";
  if (label === "Promo") return "Reveal";
  if (label === "Ticket") return "View";
  return "Preview";
}

function contentMeta(content: MarketplaceExclusiveContentItem) {
  const label = contentKindLabel(content);
  const file = content.fileName || content.originalName;
  const size = fileSize(content.size);
  if (file) return `${file} - ${size}`;
  if (content.url) return `${label} - external link`;
  if (content.expiresAt) return `${label} - expires ${content.expiresAt}`;
  return `${label} - receipt NFT gated`;
}

function contentIcon(content: MarketplaceExclusiveContentItem) {
  const label = contentKindLabel(content);
  if (label === "Video") return <Play className="h-[18px] w-[18px] fill-current" />;
  if (label === "Access") return <Users className="h-[18px] w-[18px]" />;
  if (label === "Promo") return <Tag className="h-[18px] w-[18px]" />;
  if (label === "Ticket") return <Ticket className="h-[18px] w-[18px]" />;
  if (label === "Download") return <Download className="h-[18px] w-[18px]" />;
  if (label === "Link") return <ExternalLink className="h-[18px] w-[18px]" />;
  return <FileText className="h-[18px] w-[18px]" />;
}

function buildPropertyCards(
  item: SmartsiteMarketplaceDisplayItem,
  variants: ReturnType<typeof normalizeSmartsiteMarketplaceVariants>,
  exclusiveItems: MarketplaceExclusiveContentItem[],
) {
  const cards: Array<{ label: string; value: string; meta?: string }> = [];
  if (item.productType) {
    cards.push({
      label: "Type",
      value: marketplaceTypeLabel(item.productType),
      meta: "marketplace",
    });
  }
  if (item.fulfillment?.requiresShipping) {
    cards.push({ label: "Shipping", value: "Required", meta: "physical" });
  } else {
    cards.push({ label: "Delivery", value: "Digital", meta: "receipt-gated" });
  }
  if (exclusiveItems.length) {
    cards.push({
      label: "Access",
      value: "Holder",
      meta: `${exclusiveItems.length} unlocks`,
    });
  }
  for (const variant of variants.slice(0, 5)) {
    cards.push({
      label: variant.name || "Option",
      value: String(variant.options?.[0]?.name || "Selectable"),
      meta:
        (variant.options?.length || 0) > 1
          ? `${variant.options?.length} choices`
          : "option",
    });
  }
  for (const tag of (item.tags || []).slice(0, Math.max(0, 6 - cards.length))) {
    cards.push({ label: "Tag", value: tag, meta: "seller" });
  }
  return cards.slice(0, 6);
}

export default ProductDetailsModal;
