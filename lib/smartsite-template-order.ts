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
  "widget",
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
  widget: { label: "Widget" },
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
  "widget",
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

/**
 * The identity-stable part of an order key. Item-level keys are
 * `section:encodeURIComponent(id):index` — the trailing index shifts whenever
 * an earlier item in the same section is deleted, so "is this content new?"
 * checks must compare on `section:id` only. Section-level keys pass through.
 */
export const getStableSmartsiteOrderKeyPrefix = (orderKey: string) => {
  const separatorIndex = orderKey.lastIndexOf(":");
  return separatorIndex === -1 ? orderKey : orderKey.slice(0, separatorIndex);
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
    case "widget":
      return hasItems(info.widget);
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
  pushItems("widget", info.widget);
  pushSection("feed");

  return order;
};

// ── Named tabs ─────────────────────────────────────────────────────────────
// Templates can be grouped under named tabs. Each tab holds an ordered list
// of the same order keys used by templateOrder. tabs.length === 0 (or the
// field missing) means the legacy flat rendering path — every pre-tabs
// smartsite. Whenever tabs are saved, a flattened templateOrder is saved
// alongside so older clients keep rendering all content as one column.

export interface SmartsiteTab {
  id: string;
  name: string;
  order: string[];
  /**
   * Token-gated tab. Only meaningful when the site's gatedInfo.isOn is true —
   * with no token gate configured the flag is inert and content renders.
   */
  gated?: boolean;
}

export const SMARTSITE_MAX_TABS = 10;
export const SMARTSITE_TAB_NAME_MAX_LENGTH = 30;

export const isTabbedSmartsite = (micrositeData: any): boolean =>
  Array.isArray(micrositeData?.tabs) && micrositeData.tabs.length > 0;

export const generateSmartsiteTabId = () =>
  `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const flattenSmartsiteTabs = (tabs?: SmartsiteTab[] | null): string[] =>
  (tabs || []).flatMap((tab) => (Array.isArray(tab?.order) ? tab.order : []));

export const areSmartsiteTabsEqual = (
  a?: SmartsiteTab[] | null,
  b?: SmartsiteTab[] | null,
) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

/**
 * First-tab conversion: the first tab a user creates inherits the site's
 * entire normalized flat order (so nothing moves or disappears). Callers
 * holding a fresher local order than `micrositeData.templateOrder` (e.g. an
 * optimistic reorder whose refetch hasn't landed) can pass it as `order`.
 */
export const buildDefaultSmartsiteTabs = (
  micrositeData: any,
  name = "Home",
  order?: unknown,
): SmartsiteTab[] => [
  {
    id: generateSmartsiteTabId(),
    name,
    order: normalizeSmartsiteTemplateBlockOrder(
      micrositeData,
      order ?? micrositeData?.templateOrder,
    ),
  },
];

/**
 * Reconcile stored tabs against the content that actually exists. Rules
 * (identical on desktop and mobile so both renderers agree without a save):
 *  - keys pointing at deleted content are dropped
 *  - a key lives in exactly one tab (first occurrence wins)
 *  - a bare item-level section key expands to that section's blocks
 *  - content assigned to no tab appends to the FIRST tab in default order
 *  - blank tab names get a placeholder
 * Returns [] when the site is not tabbed (legacy flat rendering).
 */
export const normalizeSmartsiteTabs = (
  micrositeData: any,
  tabs?: unknown,
): SmartsiteTab[] => {
  const requestedTabs = Array.isArray(tabs) ? tabs : micrositeData?.tabs;

  if (!Array.isArray(requestedTabs) || requestedTabs.length === 0) {
    return [];
  }

  const defaultOrder = getDefaultSmartsiteTemplateBlockOrder(micrositeData);
  const defaultOrderSet = new Set(defaultOrder);
  const defaultBlocksBySection = new Map<SmartsiteTemplateSectionKey, string[]>();

  defaultOrder.forEach((orderKey) => {
    const sectionKey = getSmartsiteTemplateSectionKeyFromOrderKey(orderKey);
    if (!sectionKey) {
      return;
    }
    const sectionOrder = defaultBlocksBySection.get(sectionKey) || [];
    sectionOrder.push(orderKey);
    defaultBlocksBySection.set(sectionKey, sectionOrder);
  });

  const claimed = new Set<string>();
  const normalizedTabs: SmartsiteTab[] = requestedTabs.map(
    (tab: any, index: number) => {
      const rawName = typeof tab?.name === "string" ? tab.name.trim() : "";
      const order: string[] = [];

      const addOrderKey = (orderKey: string) => {
        if (defaultOrderSet.has(orderKey) && !claimed.has(orderKey)) {
          claimed.add(orderKey);
          order.push(orderKey);
        }
      };

      (Array.isArray(tab?.order) ? tab.order : []).forEach(
        (rawOrderKey: unknown) => {
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
        },
      );

      return {
        id: typeof tab?.id === "string" && tab.id ? tab.id : `tab-${index}`,
        name: rawName
          ? rawName.slice(0, SMARTSITE_TAB_NAME_MAX_LENGTH)
          : `Tab ${index + 1}`,
        order,
        gated: tab?.gated === true,
      };
    },
  );

  // Content in no tab lands on the first tab, in default order
  defaultOrder.forEach((orderKey) => {
    if (!claimed.has(orderKey)) {
      claimed.add(orderKey);
      normalizedTabs[0].order.push(orderKey);
    }
  });

  return normalizedTabs;
};

/**
 * Append a newly created template's key to a tab (used by the Add flows so
 * a template added while a tab is active lands on that tab).
 */
export const appendKeyToSmartsiteTab = (
  tabs: SmartsiteTab[],
  tabId: string,
  orderKey: string,
): SmartsiteTab[] => {
  const alreadyAssigned = tabs.some((tab) => tab.order.includes(orderKey));
  if (alreadyAssigned) {
    return tabs;
  }
  const targetExists = tabs.some((tab) => tab.id === tabId);
  return tabs.map((tab, index) => {
    const isTarget = targetExists ? tab.id === tabId : index === 0;
    return isTarget ? { ...tab, order: [...tab.order, orderKey] } : tab;
  });
};

/**
 * Move a single order key from one tab to the END of another (the builder's
 * "move to tab" affordance). Pure; returns the input array unchanged when the
 * move is a no-op (same tab, unknown key/tabs, or key not on the source tab).
 */
export const moveKeyBetweenSmartsiteTabs = (
  tabs: SmartsiteTab[],
  orderKey: string,
  fromTabId: string,
  toTabId: string,
): SmartsiteTab[] => {
  if (fromTabId === toTabId) {
    return tabs;
  }

  const fromTab = tabs.find((tab) => tab.id === fromTabId);
  const toTab = tabs.find((tab) => tab.id === toTabId);

  if (!fromTab || !toTab || !fromTab.order.includes(orderKey)) {
    return tabs;
  }

  return tabs.map((tab) => {
    if (tab.id === fromTabId) {
      return { ...tab, order: tab.order.filter((key) => key !== orderKey) };
    }
    if (tab.id === toTabId) {
      return {
        ...tab,
        order: [...tab.order.filter((key) => key !== orderKey), orderKey],
      };
    }
    return tab;
  });
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
