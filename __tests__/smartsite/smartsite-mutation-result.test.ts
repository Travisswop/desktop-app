import {
  isSmartSiteMutationSuccess,
  removePendingSmartSiteIcon,
} from "@/components/smartsite/EditMicrosite/smartsiteMutationResult";

describe("SmartSite mutation result helpers", () => {
  it("treats only successful mutation responses as close-worthy", () => {
    expect(isSmartSiteMutationSuccess({ state: "success" })).toBe(true);
    expect(isSmartSiteMutationSuccess({ state: "failed" })).toBe(false);
    expect(isSmartSiteMutationSuccess(null)).toBe(false);
    expect(isSmartSiteMutationSuccess(undefined)).toBe(false);
  });

  it("removes the saved editor from the pending icon list", () => {
    expect(removePendingSmartSiteIcon(["Embed", "Video"], "Embed")).toEqual([
      "Video",
    ]);
    expect(removePendingSmartSiteIcon(["Embed", "Video"], "Video")).toEqual([
      "Embed",
    ]);
  });
});
