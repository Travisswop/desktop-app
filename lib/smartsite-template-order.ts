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

// ── Template picker catalog ────────────────────────────────────────────────
// The single source of truth for the "Add Template" picker (BottomNav).
// Titles for 1:1 sections derive from SMARTSITE_TEMPLATE_SECTION_META so the
// picker and the section labels can never drift; widget-backed entries (Tip
// Jar, Leads Form) share the 'widget' section and carry their own titles.
// Visual assets (preview images/icons) stay in the picker component — this
// module is imported by server code and must stay asset-free.
export interface SmartsiteTemplateCatalogEntry {
  /** Stable picker id — also the Add-form switch key in BottomNavContent. */
  id: string;
  sectionKey: SmartsiteTemplateSectionKey;
  title: string;
  description: string;
}

export const SMARTSITE_TEMPLATE_CATALOG: SmartsiteTemplateCatalogEntry[] = [
  {
    id: "small-icons",
    sectionKey: "socialTop",
    title: SMARTSITE_TEMPLATE_SECTION_META.socialTop.label,
    description: "Miniature Icons For Header Area",
  },
  {
    id: "infobar",
    sectionKey: "infoBar",
    title: SMARTSITE_TEMPLATE_SECTION_META.infoBar.label,
    description: "Display Bar for your links or CTAs",
  },
  {
    id: "embed",
    sectionKey: "videoUrl",
    title: SMARTSITE_TEMPLATE_SECTION_META.videoUrl.label,
    description: "Embed Youtube videos, Spotify list and more",
  },
  {
    id: "app-icon",
    sectionKey: "socialLarge",
    title: SMARTSITE_TEMPLATE_SECTION_META.socialLarge.label,
    description: "Displays your links like a App",
  },
  {
    id: "redeem-link",
    sectionKey: "redeemLink",
    title: SMARTSITE_TEMPLATE_SECTION_META.redeemLink.label,
    description: "Incentivize your following",
  },
  {
    id: "blog",
    sectionKey: "blog",
    title: SMARTSITE_TEMPLATE_SECTION_META.blog.label,
    description: "Write a blog and host on your page",
  },
  {
    id: "photo-video",
    sectionKey: "widget",
    title: SMARTSITE_TEMPLATE_SECTION_META.video.label,
    description: "Upload videos or photos to display",
  },
  {
    id: "mp3",
    sectionKey: "widget",
    title: SMARTSITE_TEMPLATE_SECTION_META.audio.label,
    description: "Upload MP3 files and host your album",
  },
  {
    id: "marketplace",
    sectionKey: "marketPlace",
    title: SMARTSITE_TEMPLATE_SECTION_META.marketPlace.label,
    description: "Sell Products, Subscriptions and more",
  },
  {
    id: "feed",
    sectionKey: "feed",
    title: SMARTSITE_TEMPLATE_SECTION_META.feed.label,
    description: "Display your Swop Feed",
  },
  {
    id: "tip-jar",
    sectionKey: "widget",
    title: "Tip Jar",
    description: "Accept preset or custom USDC tips",
  },
  {
    id: "chart-post",
    sectionKey: "widget",
    title: "Chart Post",
    description: "Publish a live market chart and trade thesis",
  },
  {
    id: "files",
    sectionKey: "widget",
    title: "Files",
    description: "Share public or token-gated downloads",
  },
  {
    id: "trader-stats", sectionKey: "widget", title: "Trader Stats", description: "Show live portfolio and trading performance",
  },
  {
    id: "ai-chat",
    sectionKey: "widget",
    title: "Chat",
    description: "Train an AI concierge on Markdown files",
  },
  {
    id: "leads-form",
    sectionKey: "widget",
    title: "Form",
    description: "Build a custom form and collect responses",
  },
];

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

/**
 * Per-tab gate config — the tab is gated on its OWN token, independent of the
 * site-wide Token Powered Site gate (gatedInfo/gatedAccess). The public
 * viewer blurs the tab's content behind an "Own X to view content" button
 * until the visitor's wallet holds minRequired of selectedToken. tokenName is
 * the display name baked in at config time for that button label.
 */
export interface SmartsiteTabGate {
  tokenType?: "NFT" | "Token";
  selectedToken?: string;
  tokenName?: string;
  minRequired?: number;
  network?: string;
}

export interface SmartsiteTab {
  id: string;
  name: string;
  order: string[];
  /**
   * Token-gated tab. With a per-tab `gate` config the tab verifies against
   * its own token; legacy gated tabs (no `gate`) fall back to the site's
   * gatedInfo and are inert when that gate is off.
   */
  gated?: boolean;
  gate?: SmartsiteTabGate | null;
}

export const SMARTSITE_MAX_TABS = 10;
export const SMARTSITE_TAB_NAME_MAX_LENGTH = 30;

export const isTabbedSmartsite = (micrositeData: any): boolean =>
  Array.isArray(micrositeData?.tabs) && micrositeData.tabs.length > 0;

export const generateSmartsiteTabId = () =>
  `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const flattenSmartsiteTabs = (tabs?: SmartsiteTab[] | null): string[] =>
  (tabs || []).flatMap((tab) => (Array.isArray(tab?.order) ? tab.order : []));

/**
 * Pin 'socialTop' (Small Icons) at the head of a flat templateOrder: strips
 * every occurrence, then prepends the key when the site actually has icons.
 * The builder renders the icons as a fixed header row (under the Bio) on
 * every site, so any flat order it saves must lead with 'socialTop' — that's
 * what pre-tabs/public flat renderers use to place the icons at the top.
 */
export const pinSocialTopFirstInFlatOrder = (
  micrositeData: any,
  order: string[],
): string[] => {
  const flatOrder = order.filter((orderKey) => orderKey !== "socialTop");

  return hasSmartsiteTemplateSectionContent(micrositeData, "socialTop")
    ? ["socialTop", ...flatOrder]
    : flatOrder;
};

/**
 * Normalize the pinned-header zone (templates pinned ABOVE the tab bar,
 * visible on every tab). Rules:
 *  - only keys whose content actually exists (default block order set)
 *  - never contains 'socialTop' — the Small Icons row is implicitly pinned
 *    separately and handled by pinSocialTopFirstInFlatOrder
 *  - deduped, stored order preserved
 * Callers holding a fresher local pinned order than
 * `micrositeData.pinnedOrder` can pass it as `pinnedOrder`.
 */
export const normalizeSmartsitePinnedOrder = (
  micrositeData: any,
  pinnedOrder?: unknown,
): string[] => {
  const requested = pinnedOrder ?? micrositeData?.pinnedOrder;

  if (!Array.isArray(requested) || requested.length === 0) {
    return [];
  }

  const defaultOrderSet = new Set(
    getDefaultSmartsiteTemplateBlockOrder(micrositeData),
  );
  const normalized: string[] = [];

  requested.forEach((rawKey: unknown) => {
    if (
      typeof rawKey === "string" &&
      rawKey !== "socialTop" &&
      defaultOrderSet.has(rawKey) &&
      !normalized.includes(rawKey)
    ) {
      normalized.push(rawKey);
    }
  });

  return normalized;
};

/**
 * The flat templateOrder dual-written alongside tabs on every save. On tabbed
 * sites 'socialTop' (Small Icons) is pinned in the header — it lives in no
 * tab — but pre-tabs clients render only the flat order, so it must LEAD the
 * flattened payload whenever the site has socialTop content (icons stay at
 * the top for them, matching the pinned header position). Pinned-header
 * templates come next (they render above the tab bar), then the tabs'
 * content in tab order. Callers holding a fresher local pinned order than
 * `micrositeData.pinnedOrder` (optimistic save in flight) pass it as
 * `pinnedOrder`.
 */
export const buildFlatTemplateOrderForTabs = (
  micrositeData: any,
  tabs?: SmartsiteTab[] | null,
  pinnedOrder?: string[] | null,
): string[] => {
  const pinned = normalizeSmartsitePinnedOrder(micrositeData, pinnedOrder);
  const pinnedSet = new Set(pinned);

  return pinSocialTopFirstInFlatOrder(micrositeData, [
    ...pinned,
    ...flattenSmartsiteTabs(tabs).filter((key) => !pinnedSet.has(key)),
  ]);
};

/**
 * Pin a template above the tab bar: appends the key to the pinned-header
 * zone and strips it from every tab (pinned blocks are visible on every
 * tab, so they live in no tab — mirroring 'socialTop'). Pure; returns the
 * inputs unchanged when the pin is a no-op ('socialTop' or already pinned).
 */
export const pinKeyToHeader = (
  pinned: string[],
  tabs: SmartsiteTab[],
  orderKey: string,
): { pinned: string[]; tabs: SmartsiteTab[] } => {
  if (orderKey === "socialTop" || pinned.includes(orderKey)) {
    return { pinned, tabs };
  }

  return {
    pinned: [...pinned, orderKey],
    tabs: tabs.map((tab) =>
      tab.order.includes(orderKey)
        ? { ...tab, order: tab.order.filter((key) => key !== orderKey) }
        : tab,
    ),
  };
};

/**
 * Unpin a template from the pinned-header zone to the END of a tab (the
 * discoverable "unpin to this tab" affordance). Pure; returns the inputs
 * unchanged when the move is a no-op (key not pinned, or unknown tab).
 */
export const unpinKeyToTab = (
  pinned: string[],
  tabs: SmartsiteTab[],
  tabId: string,
  orderKey: string,
): { pinned: string[]; tabs: SmartsiteTab[] } => {
  if (!pinned.includes(orderKey) || !tabs.some((tab) => tab.id === tabId)) {
    return { pinned, tabs };
  }

  return {
    pinned: pinned.filter((key) => key !== orderKey),
    tabs: tabs.map((tab) =>
      tab.id === tabId
        ? {
            ...tab,
            order: [...tab.order.filter((key) => key !== orderKey), orderKey],
          }
        : tab,
    ),
  };
};

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
    // 'socialTop' is pinned in the header on tabbed sites — never tab content
    order: normalizeSmartsiteTemplateBlockOrder(
      micrositeData,
      order ?? micrositeData?.templateOrder,
    ).filter((orderKey) => orderKey !== "socialTop"),
  },
];

/**
 * Reconcile stored tabs against the content that actually exists. Rules
 * (identical on desktop and mobile so both renderers agree without a save):
 *  - keys pointing at deleted content are dropped
 *  - 'socialTop' is stripped from every tab — on tabbed sites the Small
 *    Icons are pinned in the header (under the Bio, above the tab bar), not
 *    tab content, and must never be re-homed to a tab
 *  - keys in the site's pinned-header zone (micrositeData.pinnedOrder) are
 *    pre-claimed the same way: stripped from every tab, never re-homed
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

  // Pre-claiming 'socialTop' and the pinned-header keys both strips them
  // from stored tab orders and excludes them from the unassigned-content
  // re-home below (pinned blocks live in no tab).
  const claimed = new Set<string>([
    "socialTop",
    ...normalizeSmartsitePinnedOrder(micrositeData),
  ]);
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
        // Preserve the per-tab gate config verbatim — every tabs save
        // persists the normalized array, so dropping it here would wipe it.
        ...(tab?.gate && typeof tab.gate === "object"
          ? { gate: tab.gate as SmartsiteTabGate }
          : {}),
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

export const SMARTSITE_FEED_TAB_NAME = "Feed";

/**
 * A tab whose entire content is the feed block. The embedded feed renders
 * "plain" on such a tab — no card chrome, full-width scrolling posts.
 */
export const isFeedOnlySmartsiteTab = (
  tab?: Pick<SmartsiteTab, "order"> | null,
): boolean =>
  Boolean(
    tab &&
      Array.isArray(tab.order) &&
      tab.order.length === 1 &&
      tab.order[0] === "feed",
  );

/**
 * Feed auto-tab: enabling the Feed template on a TABBED site gives the feed
 * a dedicated "Feed" tab instead of landing inside another tab.
 *
 * `tabs` is the NORMALIZED tab list (where the normalizer re-homes
 * unassigned content — including a freshly enabled 'feed' — onto the first
 * tab). `rawStoredTabs` (the unnormalized micrositeData.tabs) tells the
 * cases apart:
 *  - a stored tab claims 'feed' AND is feed-only: a dedicated Feed tab
 *    already exists (an earlier auto-tab) — reuse it, never duplicate
 *  - a stored MIXED tab claims 'feed' (a stale key inherited by first-tab
 *    conversion while the feed was on): the feed must not swallow that
 *    tab — strip the key and append a dedicated feed-only tab
 *  - no stored tab claims it: the key only sits on the first tab via the
 *    normalizer's re-home — strip it and append a new feed-only tab
 * Pure; `changed` is false when the inputs are returned unchanged.
 */
export const ensureFeedTabInSmartsiteTabs = (
  tabs: SmartsiteTab[],
  rawStoredTabs?: unknown,
): { tabs: SmartsiteTab[]; feedTabId: string | null; changed: boolean } => {
  if (tabs.length === 0) {
    return { tabs, feedTabId: null, changed: false };
  }

  const currentFeedTab = tabs.find((tab) => tab.order.includes("feed")) ?? null;
  const storedTabHoldsDedicatedFeed = (
    Array.isArray(rawStoredTabs) ? rawStoredTabs : []
  ).some(
    (tab: any) =>
      Array.isArray(tab?.order) &&
      tab.order.includes("feed") &&
      typeof tab?.id === "string" &&
      tab.id === currentFeedTab?.id &&
      isFeedOnlySmartsiteTab(currentFeedTab),
  );

  if (storedTabHoldsDedicatedFeed || tabs.length >= SMARTSITE_MAX_TABS) {
    return { tabs, feedTabId: currentFeedTab?.id ?? null, changed: false };
  }

  const feedTab: SmartsiteTab = {
    id: generateSmartsiteTabId(),
    name: SMARTSITE_FEED_TAB_NAME,
    order: ["feed"],
    gated: false,
  };

  return {
    tabs: [
      ...tabs.map((tab) =>
        tab.order.includes("feed")
          ? { ...tab, order: tab.order.filter((key) => key !== "feed") }
          : tab,
      ),
      feedTab,
    ],
    feedTabId: feedTab.id,
    changed: true,
  };
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
