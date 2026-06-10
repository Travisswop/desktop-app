"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  Minus,
  MoreHorizontal,
  Plus,
  ShoppingCart,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from "@/app/(public-profile)/sp/[username]/cart/context/CartContext";
import { useMicrositeData } from "@/app/(public-profile)/sp/[username]/context/MicrositeContext";
import {
  getSmartsiteMarketplaceImage,
  getSmartsiteMarketplaceName,
  getSmartsiteMarketplacePrice,
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

  const images = useMemo(() => {
    const list = (item.images || [])
      .map((image) => image?.url)
      .filter(Boolean) as string[];
    return list.length ? list : [getSmartsiteMarketplaceImage(item)];
  }, [item]);

  const variants = useMemo(
    () =>
      (item.variants || []).filter(
        (variant) => variant?.name && variant?.options?.length,
      ),
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

  const isOptionSoldOut = (option: {
    name?: string;
    quantity?: number;
    sold?: number;
  }) =>
    tracksInventory &&
    typeof option.quantity === "number" &&
    option.quantity - Number(option.sold || 0) <= 0;

  // Reset selection each time the modal opens, defaulting to the first
  // in-stock option of every variant group.
  useEffect(() => {
    if (!open) return;
    setActiveImage(0);
    setQuantity(1);
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

  const totalPrice = productPrice * quantity;

  const handleShareLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?product=${productId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Product link copied");
    } catch {
      toast.error("Could not copy link");
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
    // Variant-scoped cart line id so two sizes of the same product stay
    // separate lines; checkout still sends marketplaceProductId.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-md w-[92%] rounded-3xl p-0 gap-0 overflow-hidden bg-white border-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={() => onOpenChange(false)}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label="Close product details"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Product Details
          </DialogTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-700" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem
                onClick={handleShareLink}
                className="gap-2 cursor-pointer"
              >
                Share Link <LinkIcon className="w-4 h-4 ml-auto" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[65vh] px-5 pb-5">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-3">
            <Image
              src={images[activeImage] || images[0]}
              alt={productName}
              fill
              quality={100}
              className="object-contain"
            />
          </div>

          {images.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() =>
                  setActiveImage(
                    (current) => (current - 1 + images.length) % images.length,
                  )
                }
                className="shrink-0 text-gray-500 hover:text-gray-900"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    onClick={() => setActiveImage(index)}
                    className={`relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === activeImage
                        ? "border-gray-900"
                        : "border-transparent"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${productName} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  setActiveImage((current) => (current + 1) % images.length)
                }
                className="shrink-0 text-gray-500 hover:text-gray-900"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <h3 className="text-xl font-bold text-gray-900">{productName}</h3>
          {productDescription && (
            <p className="text-sm text-gray-400 mt-1">{productDescription}</p>
          )}

          {variants.map((variant) => (
            <div key={variant.name} className="mt-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {variant.name} Option
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
                      className={`min-w-10 h-10 px-3 rounded-full border text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                      } ${soldOut ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                    >
                      {option.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Seller */}
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Seller</p>
            <div className="flex items-center gap-3">
              {sellerAvatar ? (
                <Image
                  src={sellerAvatar}
                  alt={sellerName}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                  {sellerName.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-semibold text-gray-900">
                {sellerName}
              </p>
            </div>
          </div>

          {/* Quantity */}
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Quantity</p>
            <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full px-3 py-1.5">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="text-gray-700 disabled:opacity-40"
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold w-5 text-center">
                {quantity}
              </span>
              <button
                onClick={() => handleQuantityChange(1)}
                className="text-gray-700"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-white">
          <div>
            <p className="text-xs text-gray-500">Total Price</p>
            <p className="text-xl font-bold text-gray-900">
              ${totalPrice.toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart || isSoldOut}
            className="flex items-center gap-2 bg-gray-900 text-white rounded-2xl px-6 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-4 h-4" />
            {isSoldOut ? "Sold out" : "Add to cart"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailsModal;
