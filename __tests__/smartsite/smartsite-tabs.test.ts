import {
  SmartsiteTab,
  appendKeyToSmartsiteTab,
  buildDefaultSmartsiteTabs,
  flattenSmartsiteTabs,
  getSmartsiteTemplateItemKey,
  isTabbedSmartsite,
  normalizeSmartsiteTabs,
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
    // every piece of content is in the tab
    expect(tabs[0].order).toEqual(
      expect.arrayContaining([
        "socialTop",
        "marketPlace",
        blogKey0,
        blogKey1,
        infoBarKey,
        "video",
        "feed",
      ]),
    );
  });

  it("respects an existing saved flat order", () => {
    const saved = ["feed", "marketPlace", blogKey1, blogKey0];
    const tabs = buildDefaultSmartsiteTabs({ ...site, templateOrder: saved });
    expect(tabs[0].order.slice(0, 4)).toEqual(saved);
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

  it("appends unassigned content to the FIRST tab", () => {
    const tabs: SmartsiteTab[] = [
      { id: "a", name: "A", order: ["video"] },
      { id: "b", name: "B", order: ["feed"] },
    ];
    const normalized = normalizeSmartsiteTabs(site, tabs);
    // marketPlace, socialTop, blogs, infoBar were unassigned → tab A
    expect(normalized[0].order).toEqual(
      expect.arrayContaining([
        "video",
        "socialTop",
        "marketPlace",
        blogKey0,
        blogKey1,
        infoBarKey,
      ]),
    );
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
