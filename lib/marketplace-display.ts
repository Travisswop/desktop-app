import type { MarketplaceProductType } from "@/lib/marketplace-api";

export type MarketplaceProductDisplayType = "Physical" | "Digital" | "Service";

export const getMarketplaceProductDisplayType = (
  type?: MarketplaceProductType | string | null,
): MarketplaceProductDisplayType => {
  if (type === "physical") return "Physical";
  if (type === "digital") return "Digital";
  return "Service";
};

export const getMarketplaceProductBadgeLabel = (
  type?: MarketplaceProductType | string | null,
) => {
  if (type === "digital") return "Digital";
  if (type === "in_person_checkout") return "Service";
  return "Product";
};

export const getMarketplaceProductSectionLabel = (
  type?: MarketplaceProductType | string | null,
) => {
  if (type === "digital") return "Digital";
  if (type === "in_person_checkout") return "Services";
  if (type === "physical" || type === "phygital") return "Products";
  return type ? String(type).replace(/_/g, " ") : "Shop";
};

export const isInPersonCheckoutMode = (checkoutMode?: string | null) =>
  String(checkoutMode || "").toLowerCase() === "in_person";
