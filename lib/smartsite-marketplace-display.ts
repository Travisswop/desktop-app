import type {
  MarketplaceExclusiveContentItem,
  MarketplaceProduct,
  MarketplaceProductType,
  MarketplaceProductVariant,
} from "@/lib/marketplace-api";
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
    _id?: string;
    id?: string;
    name?: string;
    title?: string;
    description?: string;
    image?: string;
    imageUrl?: string;
    primaryImage?: string;
    extraImages?: any[];
    images?: Array<{ url?: string; alt?: string } | string>;
    price?: number | { amount?: number; currency?: string };
    mintLimit?: number;
    variants?: any[];
    productType?: string;
    nftType?: string;
    type?: string;
    shippingRequired?: boolean;
    shippingCost?: number;
    fulfillment?: MarketplaceProduct["fulfillment"];
    inventory?: MarketplaceProduct["inventory"];
    exclusiveContent?: MarketplaceExclusiveContentItem[];
  };
  exclusiveContent?: MarketplaceExclusiveContentItem[];
};

const isObject = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === "object";

const valueId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
};

const priceAmount = (value: any): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (isObject(value)) return Number(value.amount ?? 0) || 0;
  return 0;
};

const productTypeFor = (
  value: unknown,
  requiresShipping: boolean,
): MarketplaceProductType => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "physical" || normalized === "phygital") {
    return "physical";
  }
  if (normalized === "in_person_checkout") {
    return "in_person_checkout";
  }
  if (requiresShipping) return "physical";
  return "digital";
};

const optionValue = (option: any): string => {
  if (option == null) return "";
  if (typeof option === "string" || typeof option === "number") {
    return String(option).trim();
  }
  return String(
    option.name ??
      option.label ??
      option.title ??
      option.value ??
      option.option ??
      "",
  ).trim();
};

const numericOptionField = (
  option: any,
  fields: string[],
): number | undefined => {
  if (!isObject(option)) return undefined;
  for (const field of fields) {
    const value = option[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const numberValue = Number(value);
      if (Number.isFinite(numberValue)) return numberValue;
    }
  }
  return undefined;
};

export const normalizeSmartsiteMarketplaceVariants = (
  variants: any[] = [],
): MarketplaceProductVariant[] =>
  variants
    .map((variant) => {
      if (!isObject(variant)) return null;
      const name = String(
        variant.name ?? variant.label ?? variant.title ?? "",
      ).trim();
      const rawOptions = Array.isArray(variant.options)
        ? variant.options
        : Array.isArray(variant.values)
          ? variant.values
          : Array.isArray(variant.items)
            ? variant.items
            : [];
      const options = rawOptions
        .map((option) => {
          const name = optionValue(option);
          if (!name) return null;
          const quantity = numericOptionField(option, [
            "quantity",
            "stock",
            "available",
            "inventory",
            "qty",
          ]);
          const sold = numericOptionField(option, [
            "sold",
            "soldCount",
            "soldQuantity",
          ]);
          return {
            name,
            ...(quantity !== undefined ? { quantity } : {}),
            ...(sold !== undefined ? { sold } : {}),
          };
        })
        .filter(Boolean) as NonNullable<MarketplaceProductVariant["options"]>;

      if (!name || options.length === 0) return null;
      return { name, options };
    })
    .filter(Boolean) as MarketplaceProductVariant[];

const imageUrl = (image: any): string => {
  if (!image) return "";
  if (typeof image === "string") return image.trim();
  return String(image.url || image.src || image.image || image.imageUrl || "").trim();
};

const imageListFor = (
  title: string,
  ...sources: any[]
): Array<{ url: string; alt?: string }> => {
  const seen = new Set<string>();
  const images: Array<{ url: string; alt?: string }> = [];

  const pushImage = (image: any) => {
    const url = imageUrl(image);
    if (!url || seen.has(url)) return;
    seen.add(url);
    const alt = isObject(image) ? image.alt || image.name || title : title;
    images.push({ url, alt: String(alt || title) });
  };

  for (const source of sources) {
    if (!source) continue;
    if (Array.isArray(source)) {
      source.forEach(pushImage);
    } else {
      pushImage(source);
    }
  }

  return images;
};

const compactText = (value: unknown): string => String(value || "").trim();

const normalizeExclusiveContentItems = (
  ...sources: unknown[]
): MarketplaceExclusiveContentItem[] => {
  const seen = new Set<string>();
  const items: MarketplaceExclusiveContentItem[] = [];

  const push = (source: unknown) => {
    if (!isObject(source)) return;
    const title = compactText(
      source.title ?? source.name ?? source.label ?? source.fileName,
    );
    const description = compactText(
      source.description ?? source.subtitle ?? source.note ?? source.details,
    );
    const fileName = compactText(source.fileName ?? source.originalName);
    const url = compactText(source.url ?? source.href ?? source.link);

    if (!title && !description && !fileName && !url) return;

    const id =
      compactText(source.id ?? source._id ?? source.key) ||
      `${title || fileName || url}-${items.length}`;
    if (seen.has(id)) return;
    seen.add(id);

    items.push({
      id,
      title: title || fileName || "Exclusive content",
      description,
      kind: compactText(source.kind ?? source.type ?? source.contentType) || "file",
      ctaLabel: compactText(source.ctaLabel ?? source.actionLabel),
      url,
      fileName,
      originalName: compactText(source.originalName),
      mimeType: compactText(source.mimeType),
      size:
        typeof source.size === "number" && Number.isFinite(source.size)
          ? source.size
          : undefined,
      accessPolicy: compactText(source.accessPolicy),
      lockedBy: compactText(source.lockedBy),
      expiresAt: compactText(source.expiresAt) || null,
    });
  };

  for (const source of sources) {
    if (Array.isArray(source)) {
      source.forEach(push);
    } else {
      push(source);
    }
  }

  return items;
};

export const getMarketplaceExclusiveContentItems = (
  item: SmartsiteMarketplaceDisplayItem,
): MarketplaceExclusiveContentItem[] => {
  const digitalAsset = item.fulfillment?.digitalAsset;
  const synthesizedDigitalAsset =
    digitalAsset?.enabled
      ? normalizeExclusiveContentItems({
          id: `digital-asset-${item.marketplaceProductId || item._id}`,
          title:
            digitalAsset.originalName ||
            digitalAsset.fileName ||
            "Receipt-gated download",
          description:
            item.fulfillment?.digitalDeliveryNote ||
            "Unlock this marketplace file after checkout with the receipt NFT.",
          kind: "download",
          ctaLabel: "Download",
          fileName: digitalAsset.fileName,
          originalName: digitalAsset.originalName,
          mimeType: digitalAsset.mimeType,
          size: digitalAsset.size,
          accessPolicy: digitalAsset.accessPolicy || "receipt_nft",
          lockedBy: "receipt_nft",
        })
      : [];

  const explicitItems = normalizeExclusiveContentItems(
    item.exclusiveContent,
    item.fulfillment?.exclusiveContent,
    item.templateId?.exclusiveContent,
    item.templateId?.fulfillment?.exclusiveContent,
  );

  const seen = new Set<string>();
  return [...synthesizedDigitalAsset, ...explicitItems].filter((content) => {
    const key =
      content.id ||
      content.fileName ||
      content.originalName ||
      `${content.title}-${content.kind}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

  if (isObject(item?.templateId)) {
    return item.templateId as MarketplaceProduct;
  }

  return null;
};

export const normalizeSmartsiteMarketplaceItem = (
  item: any,
): SmartsiteMarketplaceDisplayItem | null => {
  if (!item) return null;

  const product = getMarketplaceProductFromEntry(item);
  const productRecord = product as any;
  const productId =
    valueId(product) ||
    valueId(item.marketplaceProductId) ||
    valueId(item.productId) ||
    valueId(item.templateId) ||
    valueId(item._id);

  if (!productId) return null;

  const title =
    product?.title ||
    productRecord?.name ||
    item.title ||
    item.itemName ||
    "Product";
  const description =
    product?.description || item.description || item.itemDescription || "";
  const images = imageListFor(
    title,
    product?.images,
    product?.primaryImage,
    productRecord?.image,
    productRecord?.imageUrl,
    productRecord?.extraImages,
    item.images,
    item.primaryImage,
    item.itemImageUrl,
    item.image,
    item.imageUrl,
  );
  const primaryImage = images[0]?.url || "/images/placeholder-photo.png";
  const productPrice = priceAmount(
    product?.price ?? item.price ?? item.itemPrice,
  );
  const priceCurrency = product?.price?.currency || item.currency || "USDC";
  const mintLimit = Number(productRecord?.mintLimit ?? item.mintLimit ?? 0);
  const requiresShipping = Boolean(
    product?.fulfillment?.requiresShipping ??
      item.fulfillment?.requiresShipping ??
      productRecord?.shippingRequired ??
      item.shippingRequired,
  );
  const shippingCost = Number(
    product?.fulfillment?.shippingCost ??
      item.fulfillment?.shippingCost ??
      productRecord?.shippingCost ??
      item.shippingCost ??
      0,
  );
  const productVariants = normalizeSmartsiteMarketplaceVariants(
    product?.variants || [],
  );
  const itemVariants = normalizeSmartsiteMarketplaceVariants(item.variants || []);

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
    productType: productTypeFor(
      product?.productType ||
        item.productType ||
        productRecord?.nftType ||
        productRecord?.type,
      requiresShipping,
    ),
    price: {
      ...(product?.price || {}),
      amount: productPrice,
      currency: priceCurrency,
    },
    inventory:
      product?.inventory ||
      item.inventory ||
      (mintLimit > 0
        ? {
            track: true,
            available: mintLimit,
          }
        : undefined),
    variants: productVariants.length ? productVariants : itemVariants,
    fulfillment: {
      ...(item.fulfillment || {}),
      ...(product?.fulfillment || {}),
      requiresShipping,
      shippingCost,
    },
    exclusiveContent: normalizeExclusiveContentItems(
      productRecord?.exclusiveContent,
      product?.fulfillment?.exclusiveContent,
      item.exclusiveContent,
      item.fulfillment?.exclusiveContent,
      productRecord?.fulfillment?.exclusiveContent,
    ),
    itemName: item.itemName || title,
    itemImageUrl: item.itemImageUrl || primaryImage,
    itemDescription: item.itemDescription || description,
    itemPrice: Number(item.itemPrice ?? productPrice),
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
