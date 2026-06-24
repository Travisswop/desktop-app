"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import toast from "react-hot-toast";

import CheckoutPaymentClient from "@/app/(public-profile)/checkout/[intentId]/CheckoutPaymentClient";
import QueryProvider from "@/components/provider/QueryProvider";
import {
  createMarketplaceCheckoutIntent,
  type CheckoutCustomerInfo,
} from "@/lib/checkout-api";
import {
  getMarketplaceProduct,
  type MarketplaceProduct,
} from "@/lib/marketplace-api";
import { sanitizeNextImageSrc } from "@/lib/sanitizeNextImageSrc";
import { useUser, type UserData } from "@/lib/UserContext";

type FeedProductCardProps = {
  feed: any;
  className?: string;
  compact?: boolean;
};

type FeedProductItem = {
  id: string;
  productId: string;
  title: string;
  image: string;
  hasImage: boolean;
  priceLabel: string;
  currency: string;
  category: string;
  productType: string;
  hasOptions: boolean;
  href: string;
  isNavigable: boolean;
};

type QuickCustomerInfo = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const DEFAULT_IMAGE = "/images/placeholder-photo.png";

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const valueId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return cleanText(value._id) || cleanText(value.id);
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
};

const imageUrl = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return firstText(value.url, value.src, value.image, value.imageUrl);
};

const firstImage = (...sources: any[]) => {
  for (const source of sources) {
    if (!source) continue;
    if (Array.isArray(source)) {
      for (const entry of source) {
        const image = imageUrl(entry);
        if (image) return image;
      }
      continue;
    }
    const image = imageUrl(source);
    if (image) return image;
  }
  return DEFAULT_IMAGE;
};

const priceAmount = (value: any): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numberValue = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numberValue) ? numberValue : null;
  }
  if (value && typeof value === "object") {
    return priceAmount(value.amount);
  }
  return null;
};

const priceCurrency = (value: any, fallback?: string) => {
  if (value && typeof value === "object") {
    return firstText(value.currency, fallback, "USDC");
  }
  return firstText(fallback, "USDC");
};

const formatPrice = (value: any, fallbackCurrency?: string) => {
  const rawText = typeof value === "string" ? value.trim() : "";
  const amount = priceAmount(value);
  const currency = priceCurrency(value, fallbackCurrency);

  if (amount === null) return rawText || "$0.00";

  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: amount >= 1 ? 2 : 6,
  });

  if (currency === "USD" || currency === "USDC") return `$${formatted}`;
  return `${formatted} ${currency}`;
};

const normalizeProductType = (
  values: unknown[],
  requiresShipping: boolean,
): "digital" | "physical" => {
  const normalized = values
    .map((value) => cleanText(value).replace(/_/g, " ").toLowerCase())
    .find(Boolean);

  if (
    requiresShipping ||
    normalized === "physical" ||
    normalized === "phygital" ||
    normalized === "phygitals" ||
    normalized === "menu"
  ) {
    return "physical";
  }

  return "digital";
};

const productCategoryLabel = (productType: "digital" | "physical") =>
  productType === "physical" ? "Physical" : "Digital";

const productRequiresShipping = (product?: FeedProductItem | null) => {
  const value = `${product?.productType || ""} ${product?.category || ""}`
    .toLowerCase()
    .trim();
  return (
    value.includes("physical") ||
    value.includes("phygital") ||
    value.includes("shipping")
  );
};

const hasProductOptions = (...values: any[]) =>
  values.some((value) => Array.isArray(value) && value.length > 0);

const quickCustomerInfoFromUser = (user: UserData | null): QuickCustomerInfo => ({
  name: firstText(user?.name),
  email: firstText(user?.email),
  phone: firstText(user?.mobileNo),
  line1: firstText(user?.address),
  line2: firstText(user?.apt),
  city: "",
  state: "",
  postalCode: "",
  country: firstText(user?.countryCode, "US"),
});

const requiredQuickCheckoutFields = (
  product: FeedProductItem | null,
  info: QuickCustomerInfo,
) => {
  const required = [
    { value: info.name, label: "name" },
    { value: info.email, label: "email" },
    { value: info.phone, label: "phone" },
  ];

  if (productRequiresShipping(product)) {
    required.push(
      { value: info.line1, label: "street address" },
      { value: info.city, label: "city" },
      { value: info.state, label: "state" },
      { value: info.postalCode, label: "ZIP" },
      { value: info.country, label: "country" },
    );
  }

  return required
    .filter((field) => !field.value || field.value.trim() === "")
    .map((field) => field.label);
};

const quickCheckoutCustomerInfo = (
  info: QuickCustomerInfo,
): CheckoutCustomerInfo => ({
  name: info.name.trim(),
  email: info.email.trim(),
  phone: info.phone.trim(),
  address: {
    line1: info.line1.trim(),
    line2: info.line2.trim(),
    city: info.city.trim(),
    state: info.state.trim(),
    postalCode: info.postalCode.trim(),
    country: info.country.trim() || "US",
  },
});

const isSwopAppHost = (hostname: string) => {
  const normalizedHost = hostname.toLowerCase();
  return (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "swopme.app" ||
    normalizedHost.endsWith(".swopme.app") ||
    normalizedHost === "swopme.co" ||
    normalizedHost.endsWith(".swopme.co")
  );
};

const normalizeSmartsiteUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (isSwopAppHost(url.hostname)) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
};

const sellerProfilePath = (feed: any) => {
  const content = feed?.content || {};
  const profileUrl = firstText(
    feed?.smartsiteDetails?.profileUrl,
    content.smartsiteProfileUrl,
    content.sellerProfileUrl,
  );
  if (profileUrl) return normalizeSmartsiteUrl(profileUrl);

  const ens = firstText(
    feed?.smartsiteDetails?.ens,
    feed?.smartsiteId?.ens,
    feed?.smartsiteEnsName,
    content.smartsiteEns,
    content.sellerEns,
  );

  return ens ? `/sp/${ens}` : "#";
};

const withProductQuery = (
  sellerPath: string,
  productId: string,
  fallbackLink: string,
) => {
  if (sellerPath && sellerPath !== "#" && productId) {
    const separator = sellerPath.includes("?") ? "&" : "?";
    return `${sellerPath}${separator}product=${encodeURIComponent(productId)}`;
  }

  if (fallbackLink) return fallbackLink;
  if (!sellerPath || sellerPath === "#") return "#";
  return sellerPath;
};

const productCandidates = (content: any) => {
  const explicitProducts = Array.isArray(content?.products)
    ? content.products
    : Array.isArray(content?.items)
      ? content.items
      : [];

  if (explicitProducts.length > 0) return explicitProducts;

  if (content?.product && typeof content.product === "object") {
    return [{ ...content.product, ...content }];
  }

  return [content];
};

const productIdFromCandidate = (candidate: any, content: any) =>
  valueId(candidate?.marketplaceProductId) ||
  valueId(candidate?.productId) ||
  valueId(candidate?.templateId) ||
  valueId(candidate?._id) ||
  valueId(content?.marketplaceProductId) ||
  valueId(content?.productId);

const normalizeProduct = (
  candidate: any,
  feed: any,
  sellerPath: string,
  hydratedProduct?: MarketplaceProduct | null,
): FeedProductItem => {
  const content = feed?.content || {};
  const embeddedProductRecord =
    candidate?.marketplaceProductId &&
    typeof candidate.marketplaceProductId === "object"
      ? candidate.marketplaceProductId
      : candidate?.templateId && typeof candidate.templateId === "object"
        ? candidate.templateId
        : null;
  const productRecord = hydratedProduct || embeddedProductRecord;
  const productId = productIdFromCandidate(candidate, content);
  const title = firstText(
    candidate?.title,
    candidate?.itemName,
    candidate?.name,
    productRecord?.title,
    productRecord?.name,
    content?.title,
    "Product",
  );
  const rawImage = firstImage(
    candidate?.images,
    candidate?.primaryImage,
    candidate?.itemImageUrl,
    candidate?.image,
    candidate?.imageUrl,
    productRecord?.images,
    productRecord?.primaryImage,
    productRecord?.image,
    content?.image,
  );
  const image = sanitizeNextImageSrc(rawImage);
  const priceValue =
    candidate?.price ??
    candidate?.itemPrice ??
    productRecord?.price ??
    content?.price;
  const currency = priceCurrency(
    priceValue,
    firstText(candidate?.currency, productRecord?.price?.currency, "USDC"),
  );
  const fallbackLink = firstText(candidate?.link, content?.link);
  const href = withProductQuery(sellerPath, productId, fallbackLink);
  const requiresShipping = Boolean(
    candidate?.fulfillment?.requiresShipping ||
      productRecord?.fulfillment?.requiresShipping ||
      content?.fulfillment?.requiresShipping ||
      candidate?.shippingRequired ||
      productRecord?.shippingRequired ||
      content?.shippingRequired,
  );
  const productType = normalizeProductType(
    [
      productRecord?.productType,
      productRecord?.nftType,
      productRecord?.type,
      candidate?.productType,
      candidate?.nftType,
      candidate?.category,
      content?.productType,
      content?.nftType,
    ],
    requiresShipping,
  );

  return {
    id: productId || title,
    productId,
    title,
    image: image || DEFAULT_IMAGE,
    hasImage: Boolean(rawImage && rawImage !== DEFAULT_IMAGE),
    priceLabel: formatPrice(priceValue, currency),
    currency,
    category: productCategoryLabel(productType),
    productType,
    hasOptions: hasProductOptions(
      candidate?.variants,
      candidate?.options,
      candidate?.productOptions,
      productRecord?.variants,
      productRecord?.options,
      productRecord?.productOptions,
    ),
    href,
    isNavigable: href !== "#",
  };
};

const productCountLabel = (count: number) =>
  `${count} ${count === 1 ? "PRODUCT" : "PRODUCTS"}`;

export default function ProductFeedCard({
  feed,
  className = "",
  compact = false,
}: FeedProductCardProps) {
  const router = useRouter();
  const { accessToken, user } = useUser();
  const content = useMemo(() => feed?.content || {}, [feed?.content]);
  const sellerPath = sellerProfilePath(feed);
  const productCandidateList = useMemo(() => productCandidates(content), [content]);
  const productIds = useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          productCandidateList
            .map((candidate: any) => productIdFromCandidate(candidate, content))
            .filter(Boolean),
        ),
      ),
    [content, productCandidateList],
  );
  const [hydratedProducts, setHydratedProducts] = useState<
    Record<string, MarketplaceProduct | null>
  >({});
  const products = useMemo<FeedProductItem[]>(() => {
    return productCandidateList.map((candidate: any) =>
      normalizeProduct(
        candidate,
        feed,
        sellerPath,
        hydratedProducts[productIdFromCandidate(candidate, content)],
      ),
    );
  }, [content, feed, hydratedProducts, productCandidateList, sellerPath]);
  const [page, setPage] = useState(0);
  const pageSize = products.length > 1 ? 2 : 1;
  const maxPage = Math.max(0, Math.ceil(products.length / pageSize) - 1);
  const currentPage = Math.min(page, maxPage);
  const visibleProducts: FeedProductItem[] = products.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize,
  );
  const [checkoutIntentId, setCheckoutIntentId] = useState("");
  const [checkoutFallbackHref, setCheckoutFallbackHref] = useState("");
  const [checkoutLoadingProductId, setCheckoutLoadingProductId] = useState("");
  const count =
    Number(content.productCount || content.totalProducts) || products.length;
  const sellerHref = sellerPath === "#" ? "#" : sellerPath;
  const canPage = products.length > pageSize;
  const isSingleProduct = products.length === 1;
  const widthClass = isSingleProduct
    ? "max-w-[320px]"
    : compact
      ? "max-w-[520px]"
      : "max-w-[620px]";

  const goPrevious = () => setPage((current) => Math.max(0, current - 1));
  const goNext = () => setPage((current) => Math.min(maxPage, current + 1));

  useEffect(() => {
    if (!accessToken || productIds.length === 0) return;

    const unfetchedProductIds = productIds.filter(
      (productId) => hydratedProducts[productId] === undefined,
    );
    if (unfetchedProductIds.length === 0) return;

    let cancelled = false;

    const hydrateProducts = async () => {
      const entries = await Promise.all(
        unfetchedProductIds.map(async (productId) => {
          try {
            const product = await getMarketplaceProduct(accessToken, productId);
            return [productId, product] as const;
          } catch {
            return [productId, null] as const;
          }
        }),
      );

      if (!cancelled) {
        setHydratedProducts((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));
      }
    };

    hydrateProducts();

    return () => {
      cancelled = true;
    };
  }, [accessToken, hydratedProducts, productIds]);

  const openProductOnSmartsite = (product: FeedProductItem, message: string) => {
    toast(message);
    if (product.isNavigable) {
      router.push(product.href);
    }
  };

  const startQuickCheckout = async (product: FeedProductItem) => {
    setCheckoutFallbackHref(product.isNavigable ? product.href : "");

    if (!accessToken) {
      const message = "Sign in to pay with your Swop wallet.";
      toast.error(message);
      return;
    }

    if (!product.productId) {
      openProductOnSmartsite(
        product,
        "Open the Smartsite to finish this product.",
      );
      return;
    }

    if (product.hasOptions) {
      openProductOnSmartsite(
        product,
        "Choose this product's options on the Smartsite first.",
      );
      return;
    }

    const quickCustomerInfo = quickCustomerInfoFromUser(user);
    const missingQuickFields = requiredQuickCheckoutFields(
      product,
      quickCustomerInfo,
    );
    if (missingQuickFields.length > 0) {
      openProductOnSmartsite(
        product,
        `Add ${missingQuickFields.join(", ")} on the Smartsite to continue.`,
      );
      return;
    }

    if (productRequiresShipping(product)) {
      openProductOnSmartsite(
        product,
        "Open the Smartsite to confirm shipping before payment.",
      );
      return;
    }

    setCheckoutLoadingProductId(product.id);

    try {
      const intent = await createMarketplaceCheckoutIntent(
        {
          merchantCurrency: "USDC",
          checkoutMode: "online",
          checkoutBaseUrl:
            typeof window !== "undefined" ? window.location.origin : undefined,
          description: product.title,
          lineItems: [{ productId: product.productId, quantity: 1 }],
          customerInfo: quickCheckoutCustomerInfo(quickCustomerInfo),
        },
        accessToken,
      );
      setCheckoutIntentId(intent.intentId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Checkout could not be created. Open the Smartsite to finish.";
      toast.error(message);
    } finally {
      setCheckoutLoadingProductId("");
    }
  };

  return (
    <>
      <section
        className={`mt-3 w-full ${widthClass} overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] ${className}`}
      >
        <div className={compact ? "px-3 py-3" : "px-3 py-3 sm:px-4"}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>{productCountLabel(count)}</span>
            </div>
            {sellerHref !== "#" && (
              <Link
                href={sellerHref}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-950 transition-colors hover:text-gray-600"
              >
                Shop all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div
            className={`grid gap-2.5 ${
              visibleProducts.length > 1
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {visibleProducts.map((product) => {
              const ProductMedia = (
                <div className="relative aspect-square overflow-hidden bg-[linear-gradient(135deg,#f5f3f1_0,#f5f3f1_24%,#ece8e4_24%,#ece8e4_26%,#f5f3f1_26%,#f5f3f1_50%,#ece8e4_50%,#ece8e4_52%,#f5f3f1_52%)] bg-[length:34px_34px]">
                  {product.hasImage ? (
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      sizes="(min-width: 640px) 300px, 90vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-4 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-400">
                      {product.category}
                    </div>
                  )}
                </div>
              );
              const ProductDetails = (
                <div className="block flex-1">
                  <p className="line-clamp-2 text-sm font-bold leading-tight text-gray-950">
                    {product.title}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    <ShoppingBag className="h-3 w-3" />
                    <span className="truncate">{product.category}</span>
                  </div>
                  <p className="mt-2 text-lg font-extrabold leading-none tabular-nums text-gray-950">
                    {product.priceLabel}
                  </p>
                </div>
              );

              return (
                <div
                  key={product.id}
                  className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                >
                  {product.isNavigable ? (
                    <Link
                      href={product.href}
                      onClick={(event) => event.stopPropagation()}
                      className="block"
                    >
                      {ProductMedia}
                    </Link>
                  ) : (
                    ProductMedia
                  )}
                  <div className="flex min-h-[122px] flex-col p-3">
                    {product.isNavigable ? (
                      <Link
                        href={product.href}
                        onClick={(event) => event.stopPropagation()}
                        className="block flex-1"
                      >
                        {ProductDetails}
                      </Link>
                    ) : (
                      ProductDetails
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        startQuickCheckout(product);
                      }}
                      disabled={checkoutLoadingProductId === product.id}
                      className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-gray-950 text-xs font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-wait disabled:opacity-70"
                    >
                      {checkoutLoadingProductId === product.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      {checkoutLoadingProductId === product.id
                        ? "Opening checkout"
                        : "Buy now"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {canPage && (
            <div className="mt-3 flex items-center justify-between gap-4 text-gray-400">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={currentPage === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous products"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: maxPage + 1 }).map((_, index) => (
                    <span
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentPage
                          ? "w-8 bg-gray-950"
                          : "w-2 bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={currentPage === maxPage}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next products"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs font-semibold">
                {currentPage * pageSize + 1}-
                {Math.min((currentPage + 1) * pageSize, products.length)} /{" "}
                {products.length}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-xs font-semibold text-gray-500 sm:px-4">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>
            Pay with{" "}
            <span className="font-black text-gray-950">
              {products[0]?.currency || "USDC"}
            </span>{" "}
            · settles instantly to the merchant
          </span>
        </div>
      </section>

      {checkoutIntentId && (
        <div className="fixed inset-0 z-[1000]">
          <QueryProvider>
            <CheckoutPaymentClient
              intentId={checkoutIntentId}
              initialScanMethod="swop"
              fallbackHref={checkoutFallbackHref}
              fallbackLabel="Open Smartsite"
              onClose={() => {
                setCheckoutIntentId("");
                setCheckoutFallbackHref("");
              }}
            />
          </QueryProvider>
        </div>
      )}
    </>
  );
}
