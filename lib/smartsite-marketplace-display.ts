import type { MarketplaceProduct } from "@/lib/marketplace-api";
import { getMarketplaceProductSectionLabel } from "@/lib/marketplace-display";

export type SmartsiteMarketplaceDisplayItem = MarketplaceProduct & {
  marketplaceEntryId?: string;
  marketplaceProductId?: string;
  carouselTitle?: string;
  itemName?: string;
  itemImageUrl?: string;
  itemDescription?: string;
  itemPrice?: number;
  templateId?: {
    nftType?: string;
    type?: string;
  };
};

const isObject = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === "object";

const valueId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
};

export const getMarketplaceProductFromEntry = (
  item: any,
): MarketplaceProduct | null => {
  if (isObject(item?.marketplaceProductId)) {
    return item.marketplaceProductId as MarketplaceProduct;
  }

  if (isObject(item?.product)) {
    return item.product as MarketplaceProduct;
  }

  return null;
};

export const normalizeSmartsiteMarketplaceItem = (
  item: any,
): SmartsiteMarketplaceDisplayItem | null => {
  if (!item) return null;

  const product = getMarketplaceProductFromEntry(item);
  const productId =
    valueId(product) ||
    valueId(item.marketplaceProductId) ||
    valueId(item.productId) ||
    valueId(item._id);

  if (!productId) return null;

  const images = product?.images || item.images || [];
  const primaryImage =
    product?.primaryImage ||
    images?.[0]?.url ||
    item.primaryImage ||
    item.itemImageUrl ||
    "/images/placeholder-photo.png";
  const title = product?.title || item.title || item.itemName || "Product";
  const description =
    product?.description || item.description || item.itemDescription || "";
  const priceAmount = Number(product?.price?.amount ?? item.itemPrice ?? 0);
  const priceCurrency = product?.price?.currency || item.currency || "USDC";

  return {
    ...item,
    ...(product || {}),
    _id: productId,
    marketplaceEntryId: valueId(item._id),
    marketplaceProductId: productId,
    carouselTitle: String(item.carouselTitle || "").trim(),
    title,
    description,
    primaryImage,
    images: images?.length ? images : [{ url: primaryImage, alt: title }],
    price: {
      ...(product?.price || {}),
      amount: priceAmount,
      currency: priceCurrency,
    },
    itemName: item.itemName || title,
    itemImageUrl: item.itemImageUrl || primaryImage,
    itemDescription: item.itemDescription || description,
    itemPrice: Number(item.itemPrice ?? priceAmount),
  };
};

export const getSmartsiteMarketplaceSectionTitle = (
  item: SmartsiteMarketplaceDisplayItem,
) => {
  const customTitle = item.carouselTitle?.trim();
  if (customTitle) return customTitle;

  const legacyType =
    item.productType || item.templateId?.nftType || item.templateId?.type || "";
  return getMarketplaceProductSectionLabel(String(legacyType));
};

export const normalizeSmartsiteMarketplaceItems = (items: any[] = []) =>
  items
    .map((item) => normalizeSmartsiteMarketplaceItem(item))
    .filter(Boolean) as SmartsiteMarketplaceDisplayItem[];

export const groupSmartsiteMarketplaceItems = (
  items: SmartsiteMarketplaceDisplayItem[],
) =>
  items.reduce(
    (groups, item) => {
      const title = getSmartsiteMarketplaceSectionTitle(item);
      if (!groups[title]) groups[title] = [];
      groups[title].push(item);
      return groups;
    },
    {} as Record<string, SmartsiteMarketplaceDisplayItem[]>,
  );

export const getSmartsiteMarketplaceImage = (
  item: SmartsiteMarketplaceDisplayItem,
) =>
  item.primaryImage ||
  item.images?.[0]?.url ||
  item.itemImageUrl ||
  "/images/placeholder-photo.png";

export const getSmartsiteMarketplaceName = (
  item: SmartsiteMarketplaceDisplayItem,
) => item.title || item.itemName || "Product";

export const getSmartsiteMarketplacePrice = (
  item: SmartsiteMarketplaceDisplayItem,
) => Number(item.price?.amount ?? item.itemPrice ?? 0);
