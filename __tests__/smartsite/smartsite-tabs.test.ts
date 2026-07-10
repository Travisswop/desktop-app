import {
  SmartsiteTab,
  appendKeyToSmartsiteTab,
  buildDefaultSmartsiteTabs,
  buildFlatTemplateOrderForTabs,
  flattenSmartsiteTabs,
  getDefaultSmartsiteTemplateBlockOrder,
  getSmartsiteTemplateItemKey,
  getStableSmartsiteOrderKeyPrefix,
  hasSmartsiteTemplateSectionContent,
  isTabbedSmartsite,
  moveKeyBetweenSmartsiteTabs,
  normalizeSmartsitePinnedOrder,
  normalizeSmartsiteTabs,
  pinKeyToHeader,
  pinSocialTopFirstInFlatOrder,
  unpinKeyToTab,
} from "@/lib/smartsite-template-order";

// A microsite with content across several sections. Item-level sections
// (blog, infoBar) produce per-item keys; section-level (marketPlace, video,
// socialTop) produce bare keys; feed comes from showFeed.
const site = {
  showFeed: true,
  templateOrder: [],
  info: {
    socialTop: [{ _id: "st1" }],
    marketPlace: [{ _id: "mp1" }],
    blog: [{ _id: "b1" }, { _id: "b2" }],
    infoBar: [{ _id: "i1" }],
    video: [{ _id: "v1" }],
  },
};

const blogKey0 = getSmartsiteTemplateItemKey("blog", { _id: "b1" }, 0);
const blogKey1 = getSmartsiteTemplateItemKey("blog", { _id: "b2" }, 1);
const infoBarKey = getSmartsiteTemplateItemKey("infoBar", { _id: "i1" }, 0);

describe("isTabbedSmartsite", () => {
  it("is false for legacy sites (missing or empty tabs)", () => {
    expect(isTabbedSmartsite(site)).toBe(false);
    expect(isTabbedSmartsite({ ...site, tabs: [] })).toBe(false);
    expect(isTabbedSmartsite(null)).toBe(false);
  });

  it("is true once a tab exists", () => {
    expect(
      isTabbedSmartsite({ ...site, tabs: [{ id: "a", name: "A", order: [] }] }),
    ).toBe(true);
  });
});

describe("buildDefaultSmartsiteTabs (first-tab conversion)", () => {
  it("creates one tab inheriting the full normalized flat order", () => {
    const tabs = buildDefaultSmartsiteTabs(site, "Home");
    expect(tabs).toHaveLength(1);
    expect(tabs[0].name).toBe("Home");
    // every piece of content is in the tab…
    expect(tabs[0].order).toEqual(
      expect.arrayContaining([
        "marketPlace",
        blogKey0,
        blogKey1,
        infoBarKey,
        "video",
        "feed",
      ]),
    );
    // …except socialTop, which is pinned in the header on tabbed sites
    expect(tabs[0].order).not.toContain("socialTop");
  });

  it("respects an existing saved flat order", () => {
    const saved = ["feed", "marketPlace", blogKey1, blogKey0];
    const tabs = buildDefaultSmartsiteTabs({ ...site, templateOrder: saved });
    expect(tabs[0].order.slice(0, 4)).toEqual(saved);
  });

  it("prefers an explicitly passed order over the stored templateOrder", () => {
    // Regression: the builder passes its CURRENT (possibly optimistic) flat
    // order — a reorder followed immediately by "+ Tab" must not snap back
    // to the stale data.templateOrder.
    const stale = ["marketPlace", "feed"];
    const local = ["feed", "marketPlace", blogKey1, blogKey0];
    const tabs = buildDefaultSmartsiteTabs(
      { ...site, templateOrder: stale },
      "Home",
      local,
    );
    expect(tabs[0].order.slice(0, 4)).toEqual(local);
  });
});

describe("getStableSmartsiteOrderKeyPrefix", () => {
  it("strips the shifting index suffix from item-level keys", () => {
    // Regression: deleting an item shifts later items' index suffix — the
    // builder's "new content" diff must treat those as the SAME content,
    // not yank them onto the active tab.
    expect(getStableSmartsiteOrderKeyPrefix("infoBar:i2:1")).toBe(
      "infoBar:i2",
    );
    expect(getStableSmartsiteOrderKeyPrefix("infoBar:i2:0")).toBe(
      "infoBar:i2",
    );
    expect(
      getStableSmartsiteOrderKeyPrefix(getSmartsiteTemplateItemKey("blog", { _id: "b1" }, 3)),
    ).toBe(getStableSmartsiteOrderKeyPrefix(getSmartsiteTemplateItemKey("blog", { _id: "b1" }, 0)));
  });

  it("keeps section-level keys unchanged", () => {
    expect(getStableSmartsiteOrderKeyPrefix("marketPlace")).toBe("marketPlace");
    expect(getStableSmartsiteOrderKeyPrefix("feed")).toBe("feed");
  });

  it("is safe for ids containing ':' (encodeURIComponent in item keys)", () => {
    const key = getSmartsiteTemplateItemKey("videoUrl", { link: "https://x.com/a" }, 2);
    const keyShifted = getSmartsiteTemplateItemKey("videoUrl", { link: "https://x.com/a" }, 1);
    expect(getStableSmartsiteOrderKeyPrefix(key)).toBe(
      getStableSmartsiteOrderKeyPrefix(keyShifted),
    );
    expect(getStableSmartsiteOrderKeyPrefix(key)).not.toBe(key);
  });
});

describe("normalizeSmartsiteTabs", () => {
  it("returns [] for legacy sites", () => {
    expect(normalizeSmartsiteTabs(site)).toEqual([]);
    expect(normalizeSmartsiteTabs({ ...site, tabs: [] })).toEqual([]);
  });

  it("drops keys whose content no longer exists", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["marketPlace", "redeemLink:gone:0"] },
    ];
    const normalized = normalizeSmartsiteTabs(site, tabs);
    expect(normalized[0].order).toContain("marketPlace");
    expect(normalized[0].order).not.toContain("redeemLink:gone:0");
  });

  it("dedupes keys across tabs — first occurrence wins", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["marketPlace"] },
      { id: "b", name: "B", order: ["marketPlace", "video"] },
    ];
    const normalized = normalizeSmartsiteTabs(site, tabs);
    expect(normalized[0].order).toContain("marketPlace");
    expect(normalized[1].order).not.toContain("marketPlace");
    expect(normalized[1].order).toContain("video");
  });

  it("appends unassigned content to the FIRST tab (but never socialTop)", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["video"] },
      { id: "b", name: "B", order: ["feed"] },
    ];
    const normalized = normalizeSmartsiteTabs(site, tabs);
    // marketPlace, blogs, infoBar were unassigned → tab A
    expect(normalized[0].order).toEqual(
      expect.arrayContaining([
        "video",
        "marketPlace",
        blogKey0,
        blogKey1,
        infoBarKey,
      ]),
    );
    // socialTop is pinned in the header — never re-homed to a tab
    expect(normalized[0].order).not.toContain("socialTop");
    expect(normalized[1].order).toEqual(["feed"]);
  });

  it("expands a bare item-level section key into its blocks", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["blog"] },
      { id: "b", name: "B", order: ["feed"] },
    ];
    const normalized = normalizeSmartsiteTabs(site, tabs);
    expect(normalized[0].order).toEqual(
      expect.arrayContaining([blogKey0, blogKey1]),
    );
  });

  it("gives blank names a placeholder and truncates long names", () => {
    const tabs = [
      { id: "a", name: "   ", order: [] },
      { id: "b", name: "x".repeat(50), order: [] },
    ] as SmartsiteTab[];
    const normalized = normalizeSmartsiteTabs(site, tabs);
    expect(normalized[0].name).toBe("Tab 1");
    expect(normalized[1].name).toHaveLength(30);
  });
});

describe("flattenSmartsiteTabs (dual-write payload)", () => {
  it("concatenates in tab order", () => {
    expect(
      flattenSmartsiteTabs([
        { id: "a", name: "A", order: ["marketPlace", blogKey0] },
        { id: "b", name: "B", order: ["feed"] },
      ]),
    ).toEqual(["marketPlace", blogKey0, "feed"]);
  });

  it("handles empty input", () => {
    expect(flattenSmartsiteTabs([])).toEqual([]);
    expect(flattenSmartsiteTabs(undefined)).toEqual([]);
  });
});

describe("appendKeyToSmartsiteTab (Add-template flow)", () => {
  const tabs: SmartsiteTab[] = [
    { id: "a", name: "A", order: ["marketPlace"] },
    { id: "b", name: "B", order: ["feed"] },
  ];

  it("appends to the target tab", () => {
    const next = appendKeyToSmartsiteTab(tabs, "b", blogKey0);
    expect(next[1].order).toEqual(["feed", blogKey0]);
    expect(next[0].order).toEqual(["marketPlace"]);
  });

  it("does not duplicate an already-assigned key", () => {
    const next = appendKeyToSmartsiteTab(tabs, "b", "marketPlace");
    expect(next).toEqual(tabs);
  });

  it("falls back to the first tab when the target id is unknown", () => {
    const next = appendKeyToSmartsiteTab(tabs, "missing", blogKey1);
    expect(next[0].order).toContain(blogKey1);
  });
});

describe("moveKeyBetweenSmartsiteTabs (builder move-to-tab)", () => {
  const tabs: SmartsiteTab[] = [
    { id: "a", name: "A", order: ["marketPlace", blogKey0] },
    { id: "b", name: "B", order: ["feed", "video"] },
  ];

  it("moves the key from the source tab to the END of the target tab", () => {
    const next = moveKeyBetweenSmartsiteTabs(tabs, blogKey0, "a", "b");
    expect(next[0].order).toEqual(["marketPlace"]);
    expect(next[1].order).toEqual(["feed", "video", blogKey0]);
  });

  it("is a no-op when source and target are the same tab", () => {
    expect(moveKeyBetweenSmartsiteTabs(tabs, blogKey0, "a", "a")).toBe(tabs);
  });

  it("is a no-op when the key isn't on the source tab", () => {
    expect(moveKeyBetweenSmartsiteTabs(tabs, "feed", "a", "b")).toBe(tabs);
  });

  it("is a no-op when either tab id is unknown", () => {
    expect(moveKeyBetweenSmartsiteTabs(tabs, blogKey0, "a", "missing")).toBe(
      tabs,
    );
    expect(moveKeyBetweenSmartsiteTabs(tabs, blogKey0, "missing", "b")).toBe(
      tabs,
    );
  });

  it("does not mutate the input tabs", () => {
    const before = JSON.parse(JSON.stringify(tabs));
    moveKeyBetweenSmartsiteTabs(tabs, blogKey0, "a", "b");
    expect(tabs).toEqual(before);
  });

  it("preserves the gated flag on moved-through tabs", () => {
    const gatedTabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["marketPlace"], gated: true },
      { id: "b", name: "B", order: [], gated: false },
    ];
    const next = moveKeyBetweenSmartsiteTabs(gatedTabs, "marketPlace", "a", "b");
    expect(next[0].gated).toBe(true);
    expect(next[1].gated).toBe(false);
    expect(next[1].order).toEqual(["marketPlace"]);
  });
});

describe("socialTop pinned on tabbed sites", () => {
  it("normalizeSmartsiteTabs strips socialTop from every tab's order", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["socialTop", "marketPlace"] },
      { id: "b", name: "B", order: ["feed", "socialTop"] },
    ];
    const normalized = normalizeSmartsiteTabs(site, tabs);
    expect(normalized[0].order).toEqual(
      expect.arrayContaining(["marketPlace"]),
    );
    normalized.forEach((tab) => {
      expect(tab.order).not.toContain("socialTop");
    });
  });

  it("buildFlatTemplateOrderForTabs leads with socialTop when the site has icons", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["marketPlace", blogKey0] },
      { id: "b", name: "B", order: ["feed"] },
    ];
    expect(buildFlatTemplateOrderForTabs(site, tabs)).toEqual([
      "socialTop",
      "marketPlace",
      blogKey0,
      "feed",
    ]);
  });

  it("buildFlatTemplateOrderForTabs omits socialTop when the site has no icons", () => {
    const siteWithoutIcons = {
      ...site,
      info: { ...site.info, socialTop: [] },
    };
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["marketPlace"] },
    ];
    expect(buildFlatTemplateOrderForTabs(siteWithoutIcons, tabs)).toEqual([
      "marketPlace",
    ]);
  });

  it("buildFlatTemplateOrderForTabs never duplicates a stray socialTop from tabs", () => {
    // Defensive: un-normalized tabs (e.g. a stale save) may still carry it
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["marketPlace", "socialTop"] },
    ];
    expect(buildFlatTemplateOrderForTabs(site, tabs)).toEqual([
      "socialTop",
      "marketPlace",
    ]);
  });

  it("legacy sites keep socialTop in the default block order", () => {
    // tabs=[] → the normalizer leaves the flat path alone. socialTop stays
    // in the default block order (public flat renderers still place it by
    // templateOrder) — the BUILDER pins it in the header and re-pins the
    // flat order on save via pinSocialTopFirstInFlatOrder.
    expect(normalizeSmartsiteTabs(site)).toEqual([]);
    expect(getDefaultSmartsiteTemplateBlockOrder(site)).toContain("socialTop");
  });
});

describe("pinSocialTopFirstInFlatOrder (legacy flat saves)", () => {
  it("prepends socialTop when the site has icons and the order lacks it", () => {
    expect(
      pinSocialTopFirstInFlatOrder(site, ["marketPlace", blogKey0]),
    ).toEqual(["socialTop", "marketPlace", blogKey0]);
  });

  it("moves a mid-list socialTop to the front (dedupes every occurrence)", () => {
    expect(
      pinSocialTopFirstInFlatOrder(site, [
        "marketPlace",
        "socialTop",
        blogKey0,
        "socialTop",
      ]),
    ).toEqual(["socialTop", "marketPlace", blogKey0]);
  });

  it("strips socialTop entirely when the site has no icons", () => {
    const siteWithoutIcons = {
      ...site,
      info: { ...site.info, socialTop: [] },
    };
    expect(
      pinSocialTopFirstInFlatOrder(siteWithoutIcons, [
        "marketPlace",
        "socialTop",
      ]),
    ).toEqual(["marketPlace"]);
  });
});

describe("normalizeSmartsitePinnedOrder (pinned header zone)", () => {
  it("keeps only keys whose content exists, deduped, order preserved", () => {
    expect(
      normalizeSmartsitePinnedOrder(site, [
        "video",
        "redeemLink:gone:0", // deleted content → dropped
        blogKey0,
        42, // non-string → dropped
        "video", // dupe → dropped
        "notAKey",
      ]),
    ).toEqual(["video", blogKey0]);
  });

  it("never contains socialTop (implicitly pinned separately)", () => {
    expect(
      normalizeSmartsitePinnedOrder(site, ["socialTop", "marketPlace"]),
    ).toEqual(["marketPlace"]);
  });

  it("reads micrositeData.pinnedOrder when no explicit order is passed", () => {
    expect(
      normalizeSmartsitePinnedOrder({ ...site, pinnedOrder: ["feed"] }),
    ).toEqual(["feed"]);
    expect(normalizeSmartsitePinnedOrder(site)).toEqual([]);
  });

  it("prefers an explicitly passed order over the stored pinnedOrder", () => {
    expect(
      normalizeSmartsitePinnedOrder({ ...site, pinnedOrder: ["feed"] }, [
        "video",
      ]),
    ).toEqual(["video"]);
  });

  it("handles missing/garbage input", () => {
    expect(normalizeSmartsitePinnedOrder(site, "feed")).toEqual([]);
    expect(normalizeSmartsitePinnedOrder(null)).toEqual([]);
  });
});

describe("pinned keys in normalizeSmartsiteTabs", () => {
  const pinnedSite = { ...site, pinnedOrder: ["video", blogKey0] };

  it("strips pinned keys from every tab's order", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["video", "marketPlace"] },
      { id: "b", name: "B", order: ["feed", blogKey0] },
    ];
    const normalized = normalizeSmartsiteTabs(pinnedSite, tabs);
    expect(normalized[0].order).not.toContain("video");
    expect(normalized[1].order).not.toContain(blogKey0);
    expect(normalized[0].order).toContain("marketPlace");
    expect(normalized[1].order).toContain("feed");
  });

  it("never re-homes pinned keys to the first tab (they live in no tab)", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["marketPlace"] },
      { id: "b", name: "B", order: ["feed"] },
    ];
    const normalized = normalizeSmartsiteTabs(pinnedSite, tabs);
    normalized.forEach((tab) => {
      expect(tab.order).not.toContain("video");
      expect(tab.order).not.toContain(blogKey0);
    });
    // unpinned unassigned content still re-homes to the first tab
    expect(normalized[0].order).toContain(blogKey1);
    expect(normalized[0].order).toContain(infoBarKey);
  });
});

describe("pinned keys in buildFlatTemplateOrderForTabs", () => {
  const tabs: SmartsiteTab[] = [
    { id: "a", name: "A", order: ["marketPlace", blogKey0] },
    { id: "b", name: "B", order: ["feed"] },
  ];

  it("flat order = socialTop + pinned zone + tab content", () => {
    expect(
      buildFlatTemplateOrderForTabs(
        { ...site, pinnedOrder: ["video", infoBarKey] },
        tabs,
      ),
    ).toEqual(["socialTop", "video", infoBarKey, "marketPlace", blogKey0, "feed"]);
  });

  it("prefers an explicitly passed pinned order (optimistic save)", () => {
    expect(
      buildFlatTemplateOrderForTabs({ ...site, pinnedOrder: ["video"] }, tabs, [
        infoBarKey,
      ]),
    ).toEqual(["socialTop", infoBarKey, "marketPlace", blogKey0, "feed"]);
  });

  it("dedupes a key that a stale tab still carries", () => {
    expect(
      buildFlatTemplateOrderForTabs({ ...site, pinnedOrder: [blogKey0] }, tabs),
    ).toEqual(["socialTop", blogKey0, "marketPlace", "feed"]);
  });

  it("no pinned zone → unchanged behavior", () => {
    expect(buildFlatTemplateOrderForTabs(site, tabs)).toEqual([
      "socialTop",
      "marketPlace",
      blogKey0,
      "feed",
    ]);
  });
});

describe("pinKeyToHeader / unpinKeyToTab", () => {
  const tabs: SmartsiteTab[] = [
    { id: "a", name: "A", order: ["marketPlace", blogKey0] },
    { id: "b", name: "B", order: ["feed"], gated: true },
  ];

  it("pinKeyToHeader appends to pinned and strips the key from its tab", () => {
    const result = pinKeyToHeader(["video"], tabs, blogKey0);
    expect(result.pinned).toEqual(["video", blogKey0]);
    expect(result.tabs[0].order).toEqual(["marketPlace"]);
    expect(result.tabs[1].order).toEqual(["feed"]);
    expect(result.tabs[1].gated).toBe(true);
  });

  it("pinKeyToHeader is a no-op for socialTop and already-pinned keys", () => {
    expect(pinKeyToHeader([], tabs, "socialTop")).toEqual({
      pinned: [],
      tabs,
    });
    const result = pinKeyToHeader(["video"], tabs, "video");
    expect(result.pinned).toEqual(["video"]);
    expect(result.tabs).toBe(tabs);
  });

  it("pinKeyToHeader does not mutate its inputs", () => {
    const pinnedBefore = ["video"];
    const tabsBefore = JSON.parse(JSON.stringify(tabs));
    pinKeyToHeader(pinnedBefore, tabs, blogKey0);
    expect(pinnedBefore).toEqual(["video"]);
    expect(tabs).toEqual(tabsBefore);
  });

  it("unpinKeyToTab removes from pinned and appends to the END of the tab", () => {
    const result = unpinKeyToTab(["video", blogKey0], tabs, "b", "video");
    expect(result.pinned).toEqual([blogKey0]);
    expect(result.tabs[1].order).toEqual(["feed", "video"]);
    expect(result.tabs[1].gated).toBe(true);
    expect(result.tabs[0].order).toEqual(["marketPlace", blogKey0]);
  });

  it("unpinKeyToTab is a no-op for unpinned keys or unknown tabs", () => {
    const noKey = unpinKeyToTab([], tabs, "a", "video");
    expect(noKey.pinned).toEqual([]);
    expect(noKey.tabs).toBe(tabs);

    const noTab = unpinKeyToTab(["video"], tabs, "missing", "video");
    expect(noTab.pinned).toEqual(["video"]);
    expect(noTab.tabs).toBe(tabs);
  });

  it("pin → unpin round-trips content back into a tab", () => {
    const pinned = pinKeyToHeader([], tabs, "feed");
    const unpinned = unpinKeyToTab(pinned.pinned, pinned.tabs, "a", "feed");
    expect(unpinned.pinned).toEqual([]);
    expect(unpinned.tabs[0].order).toEqual(["marketPlace", blogKey0, "feed"]);
    expect(unpinned.tabs[1].order).toEqual([]);
  });
});

describe("gated tab flag", () => {
  it("normalizeSmartsiteTabs preserves gated and defaults it to false", () => {
    const tabs = [
      { id: "a", name: "A", order: [], gated: true },
      { id: "b", name: "B", order: [] },
      { id: "c", name: "C", order: [], gated: "yes" }, // non-boolean → false
    ];
    const normalized = normalizeSmartsiteTabs(site, tabs as any);
    expect(normalized[0].gated).toBe(true);
    expect(normalized[1].gated).toBe(false);
    expect(normalized[2].gated).toBe(false);
  });
});

describe("widget section", () => {
  const widgetItems = [
    { _id: "w1", widgetType: "tipJar", config: {} },
    { _id: "w2", widgetType: "vaultCard", config: {} },
  ];
  const siteWithWidgets = {
    ...site,
    info: { ...site.info, widget: widgetItems },
  };
  const widgetKey0 = getSmartsiteTemplateItemKey("widget", widgetItems[0], 0);
  const widgetKey1 = getSmartsiteTemplateItemKey("widget", widgetItems[1], 1);

  it("hasSmartsiteTemplateSectionContent reflects info.widget", () => {
    expect(hasSmartsiteTemplateSectionContent(site, "widget")).toBe(false);
    expect(
      hasSmartsiteTemplateSectionContent(
        { info: { widget: [] } },
        "widget",
      ),
    ).toBe(false);
    expect(hasSmartsiteTemplateSectionContent(siteWithWidgets, "widget")).toBe(
      true,
    );
  });

  it("produces item-level order keys (section:id:index)", () => {
    expect(widgetKey0).toBe("widget:w1:0");
    expect(widgetKey1).toBe("widget:w2:1");
  });

  it("default block order places widgets before feed", () => {
    const order = getDefaultSmartsiteTemplateBlockOrder(siteWithWidgets);
    expect(order).toEqual(expect.arrayContaining([widgetKey0, widgetKey1]));
    expect(order.indexOf(widgetKey0)).toBeLessThan(order.indexOf("feed"));
    expect(order.indexOf(widgetKey1)).toBeLessThan(order.indexOf("feed"));
  });

  it("widget keys participate in tab normalization like any other block", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["video"] },
      { id: "b", name: "B", order: [widgetKey1] },
    ];
    const normalized = normalizeSmartsiteTabs(siteWithWidgets, tabs);
    // assigned widget stays on tab B; unassigned widget falls to first tab
    expect(normalized[1].order).toEqual([widgetKey1]);
    expect(normalized[0].order).toContain(widgetKey0);
  });

  it("a bare 'widget' section key expands to its item keys", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["widget"] },
      { id: "b", name: "B", order: ["feed"] },
    ];
    const normalized = normalizeSmartsiteTabs(siteWithWidgets, tabs);
    expect(normalized[0].order).toEqual(
      expect.arrayContaining([widgetKey0, widgetKey1]),
    );
  });
});
