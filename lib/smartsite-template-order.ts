export const SMARTSITE_TEMPLATE_SECTION_ORDER = [
  "socialTop",
  "marketPlace",
  "blog",
  "socialLarge",
  "referral",
  "message",
  "redeemLink",
  "contact",
  "ens",
  "infoBar",
  "product",
  "audio",
  "video",
  "videoUrl",
  "feed",
] as const;

export type SmartsiteTemplateSectionKey =
  (typeof SMARTSITE_TEMPLATE_SECTION_ORDER)[number];

export const SMARTSITE_TEMPLATE_SECTION_META: Record<
  SmartsiteTemplateSectionKey,
  { label: string }
> = {
  socialTop: { label: "Small Icons" },
  marketPlace: { label: "Marketplace" },
  blog: { label: "Blog" },
  socialLarge: { label: "App Icon" },
  referral: { label: "Referral" },
  message: { label: "Message" },
  redeemLink: { label: "Redeem Link" },
  contact: { label: "Contact Card" },
  ens: { label: "ENS" },
  infoBar: { label: "Info Bar" },
  product: { label: "Swop Pay" },
  audio: { label: "MP3" },
  video: { label: "Photo/Video" },
  videoUrl: { label: "Embed" },
  feed: { label: "Feed" },
};

const SMARTSITE_TEMPLATE_SECTION_KEY_SET = new Set<string>(
  SMARTSITE_TEMPLATE_SECTION_ORDER,
);

export const isSmartsiteTemplateSectionKey = (
  value: unknown,
): value is SmartsiteTemplateSectionKey =>
  typeof value === "string" && SMARTSITE_TEMPLATE_SECTION_KEY_SET.has(value);

export const normalizeSmartsiteTemplateOrder = (
  order?: unknown,
): SmartsiteTemplateSectionKey[] => {
  const requestedOrder = Array.isArray(order) ? order : [];
  const normalizedOrder: SmartsiteTemplateSectionKey[] = [];

  requestedOrder.forEach((key) => {
    if (
      isSmartsiteTemplateSectionKey(key) &&
      !normalizedOrder.includes(key)
    ) {
      normalizedOrder.push(key);
    }
  });

  SMARTSITE_TEMPLATE_SECTION_ORDER.forEach((key) => {
    if (!normalizedOrder.includes(key)) {
      normalizedOrder.push(key);
    }
  });

  return normalizedOrder;
};

const ITEM_LEVEL_TEMPLATE_SECTIONS = new Set<SmartsiteTemplateSectionKey>([
  "blog",
  "referral",
  "redeemLink",
  "contact",
  "infoBar",
  "product",
  "audio",
  "videoUrl",
]);

const getStableItemId = (item: any, index: number) =>
  String(
    item?._id ||
      item?.id ||
      item?.marketplaceEntryId ||
      item?.marketplaceProductId ||
      item?.name ||
      item?.title ||
      item?.link ||
      item?.url ||
      index,
  );

export const getSmartsiteTemplateItemKey = (
  sectionKey: SmartsiteTemplateSectionKey,
  item?: any,
  index = 0,
) => {
  if (!ITEM_LEVEL_TEMPLATE_SECTIONS.has(sectionKey) || !item) {
    return sectionKey;
  }

  return `${sectionKey}:${encodeURIComponent(getStableItemId(item, index))}:${index}`;
};

export const getSmartsiteTemplateSectionKeyFromOrderKey = (
  orderKey: unknown,
): SmartsiteTemplateSectionKey | null => {
  if (typeof orderKey !== "string") {
    return null;
  }

  const [sectionKey] = orderKey.split(":");

  return isSmartsiteTemplateSectionKey(sectionKey) ? sectionKey : null;
};

const hasItems = (items: unknown) => Array.isArray(items) && items.length > 0;

export const hasSmartsiteTemplateSectionContent = (
  micrositeData: any,
  key: SmartsiteTemplateSectionKey,
) => {
  const info = micrositeData?.info || {};

  switch (key) {
    case "socialTop":
      return hasItems(info.socialTop);
    case "marketPlace":
      return hasItems(info.marketPlace);
    case "blog":
      return hasItems(info.blog);
    case "socialLarge":
      return hasItems(info.socialLarge);
    case "referral":
      return hasItems(info.referral);
    case "message":
    case "ens":
      return hasItems(info.ensDomain);
    case "redeemLink":
      return hasItems(info.redeemLink);
    case "contact":
      return hasItems(info.contact);
    case "infoBar":
      return hasItems(info.infoBar);
    case "product":
      return hasItems(info.product);
    case "audio":
      return hasItems(info.audio);
    case "video":
      return hasItems(info.video);
    case "videoUrl":
      return hasItems(info.videoUrl);
    case "feed":
      return Boolean(micrositeData?.showFeed);
    default:
      return false;
  }
};

export const getActiveSmartsiteTemplateOrder = (
  micrositeData: any,
  order?: unknown,
) =>
  normalizeSmartsiteTemplateOrder(order ?? micrositeData?.templateOrder).filter(
    (key) => hasSmartsiteTemplateSectionContent(micrositeData, key),
  );

export const getDefaultSmartsiteTemplateBlockOrder = (micrositeData: any) => {
  const info = micrositeData?.info || {};
  const order: string[] = [];

  const pushSection = (key: SmartsiteTemplateSectionKey) => {
    if (hasSmartsiteTemplateSectionContent(micrositeData, key)) {
      order.push(key);
    }
  };

  const pushItems = (key: SmartsiteTemplateSectionKey, items: unknown) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    items.forEach((item, index) => {
      order.push(getSmartsiteTemplateItemKey(key, item, index));
    });
  };

  pushSection("socialTop");
  pushSection("marketPlace");
  pushItems("blog", info.blog);
  pushSection("socialLarge");
  pushItems("referral", info.referral);
  pushSection("message");
  pushItems("redeemLink", info.redeemLink);
  pushItems("contact", info.contact);
  pushSection("ens");
  pushItems("infoBar", info.infoBar);
  pushItems("product", info.product);
  pushItems("audio", info.audio);
  pushSection("video");
  pushItems("videoUrl", info.videoUrl);
  pushSection("feed");

  return order;
};

export const normalizeSmartsiteTemplateBlockOrder = (
  micrositeData: any,
  order?: unknown,
) => {
  const defaultOrder = getDefaultSmartsiteTemplateBlockOrder(micrositeData);
  const defaultOrderSet = new Set(defaultOrder);
  const defaultBlocksBySection = new Map<SmartsiteTemplateSectionKey, string[]>();
  const normalizedOrder: string[] = [];

  defaultOrder.forEach((orderKey) => {
    const sectionKey = getSmartsiteTemplateSectionKeyFromOrderKey(orderKey);

    if (!sectionKey) {
      return;
    }

    const sectionOrder = defaultBlocksBySection.get(sectionKey) || [];
    sectionOrder.push(orderKey);
    defaultBlocksBySection.set(sectionKey, sectionOrder);
  });

  const addOrderKey = (orderKey: string) => {
    if (defaultOrderSet.has(orderKey) && !normalizedOrder.includes(orderKey)) {
      normalizedOrder.push(orderKey);
    }
  };

  if (Array.isArray(order)) {
    order.forEach((rawOrderKey) => {
      if (typeof rawOrderKey !== "string") {
        return;
      }

      if (defaultOrderSet.has(rawOrderKey)) {
        addOrderKey(rawOrderKey);
        return;
      }

      if (isSmartsiteTemplateSectionKey(rawOrderKey)) {
        defaultBlocksBySection.get(rawOrderKey)?.forEach(addOrderKey);
      }
    });
  }

  defaultOrder.forEach(addOrderKey);

  return normalizedOrder;
};
