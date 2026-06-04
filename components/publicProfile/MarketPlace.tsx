'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  Loader2,
  Minus,
  MoreHorizontal,
  Plus,
  ShoppingCart,
} from 'lucide-react';

import { addProductToCart } from '@/actions/addToCartActions';
// Sonner is mounted in layout.tsx with richColors. We use it for the
// add-to-cart surface so toasts can name the item, show selected options
// and the line total — much more informative than the previous generic
// "Item added to cart" string.
import { toast as sonner } from 'sonner';
import { useCart } from '@/app/(public-profile)/sp/[username]/cart/context/CartContext';
import { useUser } from '@/lib/UserContext';

const motionVariants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};

interface ProductVariant {
  name: string;
  options: string[];
}

const PHYGITAL_COLLECTION =
  'EFNUeHdd9dYNWaczMGfCtqThFea7HcL7xUdH8QNsYUcq';

const getId = (value: any) =>
  typeof value === 'object' && value?._id ? value._id : value;

const normalizeVariants = (template: any): ProductVariant[] => {
  if (Array.isArray(template?.variants) && template.variants.length) {
    return template.variants
      .map((variant: any) => ({
        name: String(variant.name || '').trim(),
        options: Array.isArray(variant.options)
          ? variant.options
              .map((option: any) => String(option).trim())
              .filter(Boolean)
          : [],
      }))
      .filter(
        (variant: ProductVariant) =>
          variant.name && variant.options.length,
      );
  }

  if (!Array.isArray(template?.benefits)) return [];

  const grouped = template.benefits.reduce<Record<string, string[]>>(
    (acc, benefit: string) => {
      const [rawName, ...rest] = String(benefit).split(':');
      if (!rest.length) return acc;
      const name = rawName.trim();
      const option = rest.join(':').trim();
      if (!name || !option) return acc;
      acc[name] = [...(acc[name] || []), option];
      return acc;
    },
    {},
  );

  return Object.entries(grouped).map(([name, options]) => ({
    name,
    options,
  }));
};

const MarketPlace = ({
  data,
  sellerId,
  number,
  userName,
  accessToken,
  userId,
  fontColor,
}: any) => {
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [isExisting, setIsExisting] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [mounted, setMounted] = useState(false);

  const {
    itemImageUrl,
    itemName,
    itemPrice,
    collectionId,
    templateId,
    itemDescription,
    mintLimit,
  } = data;

  const template = useMemo(
    () =>
      typeof templateId === 'object' && templateId ? templateId : {},
    [templateId],
  );
  const templateObjectId = getId(templateId);
  const collectionObjectId = getId(collectionId);
  const variants = useMemo(
    () => normalizeVariants(template),
    [template],
  );
  const images = useMemo(() => {
    const extra = Array.isArray(template?.extraImages)
      ? template.extraImages
      : [];
    return [template?.image || itemImageUrl, ...extra].filter(
      Boolean,
    );
  }, [itemImageUrl, template]);
  const [activeImage, setActiveImage] = useState(
    images[0] || itemImageUrl,
  );
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});

  const { user } = useUser();
  const { dispatch } = useCart();
  const delay = number + 1 * 0.2;
  const rawAvailable = template?.mintLimit ?? mintLimit;
  const totalAvailable =
    rawAvailable === undefined || rawAvailable === null
      ? null
      : Number(rawAvailable);
  const hasAvailability =
    typeof totalAvailable === 'number' && Number.isFinite(totalAvailable);
  const maxQuantity =
    hasAvailability && totalAvailable > 0 ? totalAvailable : 1;
  const isSoldOut = hasAvailability && totalAvailable <= 0;
  const isPhygital =
    template?.nftType === 'phygital' ||
    data.collectionMintAddress === PHYGITAL_COLLECTION;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveImage(images[0] || itemImageUrl);
  }, [images, itemImageUrl]);

  useEffect(() => {
    if (!isDetailOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDetailOpen]);

  useEffect(() => {
    setQuantity((value) => Math.min(Math.max(1, value), maxQuantity));
  }, [maxQuantity]);

  useEffect(() => {
    const defaults = variants.reduce<Record<string, string>>(
      (acc, variant) => {
        if (variant.options[0])
          acc[variant.name] = variant.options[0];
        return acc;
      },
      {},
    );
    setSelectedOptions(defaults);
  }, [variants]);

  useEffect(() => {
    if (!accessToken) {
      setIsExisting(false);
    } else if (user) {
      const isMyPublicProfile = user?.microsites?.find(
        (item: any) =>
          item?.ens === userName ||
          item?.ensData?.ens === userName ||
          item?.ensData?.ensData?.name === userName,
      );
      setIsExisting(Boolean(isMyPublicProfile));
    } else {
      setIsExisting(false);
    }
  }, [accessToken, user, userName]);

  const handleOpenDetails = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (isExisting) return;
    setIsDetailOpen(true);
  };

  const decreaseQuantity = () => {
    setQuantity((value) => Math.max(1, value - 1));
  };

  const increaseQuantity = () => {
    setQuantity((value) => Math.min(maxQuantity, value + 1));
  };

  const handleAddToCart = async () => {
    if (isSoldOut) {
      sonner.warning('Out of stock', {
        description: `${itemName} isn't available right now. Check back soon.`,
      });
      return;
    }

    setAddToCartLoading(true);

    const cartItem = {
      _id: `${templateObjectId}-${JSON.stringify(selectedOptions)}-${Date.now()}`,
      quantity,
      selectedOptions,
      timestamp: new Date().getTime(),
      sellerId,
      collectionId: collectionObjectId,
      templateId: templateObjectId,
      nftTemplate: {
        _id: templateObjectId,
        name: itemName,
        description: itemDescription,
        image: itemImageUrl,
        price: itemPrice,
        collectionId: collectionObjectId,
        templateId: templateObjectId,
        nftType: isPhygital
          ? ('phygital' as const)
          : ('non-phygital' as const),
        shippingRequired: Boolean(template?.shippingRequired),
        shippingCost: Number(template?.shippingCost || 0),
      },
    };

    // Build a contextual description: selected options + subtotal so the
    // shopper sees exactly what was added without opening the cart.
    const optionsSummary = Object.entries(selectedOptions || {})
      .map(([name, value]) => `${name}: ${value}`)
      .join(' · ');
    const lineTotal = (Number(itemPrice) || 0) * quantity;
    const subtotalLabel = `Subtotal $${lineTotal.toFixed(2)}`;
    const description = optionsSummary
      ? `${optionsSummary} · ${subtotalLabel}`
      : subtotalLabel;
    const title = `${quantity} × ${itemName} added`;

    if (!accessToken) {
      dispatch({ type: 'ADD_ITEM', payload: cartItem });
      setAddToCartLoading(false);
      setIsDetailOpen(false);
      sonner.success(title, {
        description: optionsSummary
          ? `${description} · Sign in to sync your cart across devices.`
          : `${subtotalLabel} · Sign in to sync your cart across devices.`,
        duration: 3500,
      });
      return;
    }

    try {
      const cartData = {
        userId,
        collectionId: collectionObjectId,
        templateId: templateObjectId,
        quantity,
        sellerId,
        selectedOptions,
      };

      const response = await addProductToCart(
        cartData,
        accessToken,
        userName,
      );

      if (response.state === 'success') {
        dispatch({ type: 'ADD_ITEM', payload: cartItem });
        setIsDetailOpen(false);
        sonner.success(title, {
          description,
          duration: 3000,
        });
      } else {
        throw new Error(
          response.message || 'Failed to add item to cart',
        );
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      sonner.error("Couldn't add to cart", {
        description:
          error instanceof Error
            ? error.message
            : 'Something went wrong while adding the item. Please try again.',
      });
    } finally {
      setAddToCartLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial="hidden"
        animate="enter"
        exit="exit"
        variants={motionVariants}
        transition={{
          duration: 0.4,
          delay,
          type: 'easeInOut',
        }}
        className="w-full"
      >
        <div
          className="relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-small"
          onClick={handleOpenDetails}
        >
          {!isExisting && (
            <button
              onClick={handleOpenDetails}
              disabled={addToCartLoading || isExisting}
              className="absolute right-3 top-3 z-10 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="View product details"
            >
              {addToCartLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
              ) : (
                <ShoppingCart className="h-5 w-5 text-gray-700" />
              )}
            </button>
          )}

          <div className="relative m-6 mx-10 aspect-square overflow-hidden rounded-md">
            <Image
              src={itemImageUrl}
              alt={itemName}
              fill
              quality={100}
              className="object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </div>

          <div className="p-3 pt-0">
            <div className="flex flex-col gap-0.5">
              <p
                style={{ color: fontColor || 'black' }}
                className="line-clamp-1 text-sm font-medium"
              >
                {itemName}
              </p>
              <p className="mt-0.5 w-max rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium">
                ${itemPrice}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {mounted &&
        isDetailOpen &&
        createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 px-3 py-4">
          <div className="relative flex max-h-[92vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100"
                aria-label="Close product details"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-sm font-semibold">
                Product Details
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100"
                aria-label="More product actions"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="overflow-y-auto px-4 pb-4">
              <div className="mx-auto flex h-40 w-48 items-center justify-center">
                <div className="relative h-40 w-40 overflow-hidden rounded-2xl bg-gray-50">
                  <Image
                    src={activeImage}
                    alt={itemName}
                    fill
                    quality={100}
                    className="object-cover"
                  />
                </div>
              </div>

              {images.length > 1 && (
                <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((src, index) => (
                    <button
                      type="button"
                      key={`${src}-${index}`}
                      onClick={() => setActiveImage(src)}
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border ${
                        activeImage === src
                          ? 'border-black'
                          : 'border-gray-200'
                      }`}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3">
                <h2 className="text-base font-semibold leading-tight text-gray-950">
                  {itemName}
                </h2>
                <p className="mt-1 line-clamp-3 text-xs leading-4 text-gray-400">
                  {itemDescription}
                </p>
              </div>

              {variants.map((variant) => (
                <div key={variant.name} className="mt-3">
                  <div className="mb-1 text-xs font-semibold text-gray-900">
                    {variant.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map((option) => {
                      const active =
                        selectedOptions[variant.name] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [variant.name]: option,
                            }))
                          }
                          className={`min-w-8 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            active
                              ? 'border-black bg-black text-white'
                              : 'border-gray-200 bg-white text-gray-700'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {hasAvailability && (
                <div className="mt-3 text-xs font-semibold text-gray-900">
                  Available: {Math.max(totalAvailable, 0)}
                </div>
              )}

              <div className="mt-4">
                <div className="mb-1 text-xs font-semibold text-gray-900">
                  Quantity
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="min-w-5 text-center text-xs font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={increaseQuantity}
                    disabled={quantity >= maxQuantity || isSoldOut}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-gray-100 p-4">
              <div className="w-24">
                <div className="text-[11px] font-medium text-gray-500">
                  Total Price
                </div>
                <div className="text-sm font-bold">
                  ${(Number(itemPrice) * quantity).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addToCartLoading || isSoldOut}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 text-sm font-bold text-black disabled:opacity-60"
              >
                {addToCartLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart size={15} />
                )}
                {isSoldOut ? 'Out of stock' : 'Add to cart'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default MarketPlace;
