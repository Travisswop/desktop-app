import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tooltip } from "@nextui-org/react";
import toast from "react-hot-toast";
import { Check, Loader, Package, Search, X } from "lucide-react";
import { MdInfoOutline } from "react-icons/md";

import { useUser } from "@/lib/UserContext";
import {
  listMarketplaceProducts,
  type MarketplaceProduct,
} from "@/lib/marketplace-api";
import { getMarketplaceProductBadgeLabel } from "@/lib/marketplace-display";
import { createMarketPlace } from "@/actions/handleMarketPlace";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import productImg from "@/public/images/product.png";

interface ExistingMarketplaceItem {
  _id: string;
  marketplaceProductId?: string | MarketplaceProduct;
  carouselTitle?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_CAROUSEL_TITLE = "Featured products";

const productImage = (product: MarketplaceProduct) =>
  product.primaryImage || product.images?.[0]?.url || productImg;

const formatPrice = (product: MarketplaceProduct) => {
  const amount = Number(product.price?.amount || 0);
  const currency = product.price?.currency || "USDC";
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} ${currency}`;
};

const existingProductId = (item: ExistingMarketplaceItem) => {
  const value = item.marketplaceProductId;
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || "";
};

const AddMarketplace = ({ onCloseModal }: any) => {
  const { accessToken } = useUser();
  const params = useParams();
  const router = useRouter();
  const smartsiteId = params?.editId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [existingMarketplaceItems, setExistingMarketplaceItems] = useState<
    ExistingMarketplaceItem[]
  >([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [carouselTitle, setCarouselTitle] = useState(DEFAULT_CAROUSEL_TITLE);
  const [searchQuery, setSearchQuery] = useState("");

  const existingProductIds = useMemo(
    () =>
      new Set(
        existingMarketplaceItems
          .map((item) => existingProductId(item))
          .filter(Boolean),
      ),
    [existingMarketplaceItems],
  );

  const liveProducts = useMemo(
    () => products.filter((product) => product.status === "live"),
    [products],
  );

  const visibleProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return liveProducts;

    return liveProducts.filter((product) =>
      [product.title, product.description, product.productType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [liveProducts, searchQuery]);

  const selectedProducts = useMemo(
    () =>
      liveProducts.filter((product) => selectedProductIds.has(product._id)),
    [liveProducts, selectedProductIds],
  );

  const fetchExistingMarketplace = useCallback(async () => {
    if (!accessToken || !smartsiteId || !API_URL) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v5/microsite/marketplace/${smartsiteId}`,
        {
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) return;

      const { data } = await response.json();
      setExistingMarketplaceItems(data || []);
    } catch (error) {
      console.error("Error fetching SmartSite marketplace:", error);
    }
  }, [accessToken, smartsiteId]);

  const fetchProducts = useCallback(async () => {
    if (!accessToken) {
      setError(new Error("Access token is required."));
      setLoading(false);
      return;
    }

    try {
      const response = await listMarketplaceProducts(accessToken, {
        scope: "mine",
        limit: 200,
      });
      setProducts(response.items || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to load products.";
      setError(new Error(errorMessage));
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const handleToggleProduct = useCallback(
    (product: MarketplaceProduct) => {
      if (existingProductIds.has(product._id)) return;

      setSelectedProductIds((current) => {
        const next = new Set(current);
        if (next.has(product._id)) {
          next.delete(product._id);
        } else {
          next.add(product._id);
        }
        return next;
      });
    },
    [existingProductIds],
  );

  const handleCreateMarket = useCallback(async () => {
    if (selectedProducts.length === 0) {
      toast.error("Select at least one product");
      return;
    }

    if (!smartsiteId) {
      toast.error("SmartSite data not available");
      return;
    }

    const title = carouselTitle.trim() || DEFAULT_CAROUSEL_TITLE;

    try {
      setIsLoading(true);

      const payload = {
        micrositeId: smartsiteId,
        multipleItems: selectedProducts.map((product) => ({
          source: "marketplaceProduct",
          marketplaceProductId: product._id,
          carouselTitle: title,
        })),
        template: {},
      };

      const response = await createMarketPlace(payload, accessToken || "");

      if (!response || response.state === "failed") {
        throw new Error(response?.message || "Marketplace creation failed");
      }

      toast.success("Products added to carousel");
      setSelectedProductIds(new Set());
      await fetchExistingMarketplace();
      router.refresh();
      onCloseModal();
    } catch (error: any) {
      console.error("Marketplace creation error:", error);
      toast.error(error.message || "Failed to add products");
    } finally {
      setIsLoading(false);
    }
  }, [
    accessToken,
    carouselTitle,
    fetchExistingMarketplace,
    onCloseModal,
    router,
    selectedProducts,
    smartsiteId,
  ]);

  useEffect(() => {
    if (accessToken) {
      Promise.all([fetchProducts(), fetchExistingMarketplace()]);
    } else {
      const timeoutId = setTimeout(() => {
        if (!accessToken) {
          setError(new Error("Access token is required."));
          setLoading(false);
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [accessToken, fetchExistingMarketplace, fetchProducts]);

  if (loading) {
    return (
      <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
        <div className="flex items-center justify-center h-32">
          <Loader className="h-8 w-8 animate-spin text-gray-700" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
        <div className="flex items-center justify-center h-32">
          <p className="text-red-500 text-center">{error.message}</p>
        </div>
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-900"
          type="button"
          onClick={() => onCloseModal()}
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex max-h-[80vh] flex-col gap-4">
      <div className="sticky top-0 z-10 flex items-end justify-center gap-1 bg-white pb-4">
        <h2 className="text-center text-xl font-semibold text-gray-700">
          Marketplace
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                Select products and title the SmartSite carousel
              </span>
            }
            className="h-auto max-w-44"
          >
            <button type="button">
              <MdInfoOutline />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto sm:px-10 2xl:px-[5%]">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-800">
            Carousel title
          </label>
          <input
            value={carouselTitle}
            onChange={(event) => setCarouselTitle(event.target.value)}
            maxLength={120}
            placeholder={DEFAULT_CAROUSEL_TITLE}
            className="h-12 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-500"
          />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search products"
            className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm font-medium text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-500"
          />
        </div>

        {liveProducts.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-6 text-center">
            <Package className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-500">
              No live products yet
            </p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-6 text-center">
            <p className="text-sm font-medium text-gray-500">
              No products match this search
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleProducts.map((product) => {
              const isSelected = selectedProductIds.has(product._id);
              const isAlreadyAdded = existingProductIds.has(product._id);

              return (
                <button
                  key={product._id}
                  type="button"
                  onClick={() => handleToggleProduct(product)}
                  disabled={isAlreadyAdded}
                  className={`flex min-h-[92px] w-full items-center gap-3 rounded-lg border bg-white p-3 text-left transition-colors ${
                    isSelected
                      ? "border-gray-900"
                      : "border-gray-200 hover:border-gray-400"
                  } ${
                    isAlreadyAdded
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer"
                  }`}
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <Image
                      src={productImage(product)}
                      alt={product.title || "Product"}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {product.title || "Untitled product"}
                      </p>
                      <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        {getMarketplaceProductBadgeLabel(product.productType)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {product.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-gray-800">
                      {formatPrice(product)}
                    </p>
                  </div>

                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 text-transparent"
                    }`}
                  >
                    {isAlreadyAdded ? (
                      <Check className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
            {selectedProducts.length} selected for {carouselTitle || DEFAULT_CAROUSEL_TITLE}
          </div>
        )}

        <div className="sticky bottom-0 bg-white pt-4 pb-2">
          <PrimaryButton
            onClick={handleCreateMarket}
            disabled={isLoading || selectedProducts.length === 0}
            className="w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              `Save ${selectedProducts.length} Item${
                selectedProducts.length !== 1 ? "s" : ""
              }`
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default AddMarketplace;
