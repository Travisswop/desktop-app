import {
  getMarketplaceExclusiveContentItems,
  normalizeSmartsiteMarketplaceItem,
  normalizeSmartsiteMarketplaceVariants,
} from "@/lib/smartsite-marketplace-display";

describe("SmartSite marketplace display normalization", () => {
  it("uses populated template product data and normalizes string variant options", () => {
    const item = {
      _id: "entry-1",
      marketplaceProductId: "6a3371ed18d916b34f2dfa3e",
      carouselTitle: "Products",
      templateId: {
        _id: "6a3371ed18d916b34f2dfa3e",
        name: "NFC Card",
        description: "Dual connect NFC tap + scannable QR",
        image: "https://cdn.swop.id/nfc-card.png",
        extraImages: ["https://cdn.swop.id/nfc-card-back.png"],
        price: 7.99,
        mintLimit: 42,
        nftType: "phygital",
        shippingRequired: true,
        shippingCost: 1.99,
        variants: [
          {
            _id: "6a3371ed18d916b34f2dfa3f",
            name: "Color",
            options: ["Black", "White"],
          },
        ],
      },
    };

    const normalized = normalizeSmartsiteMarketplaceItem(item);

    expect(normalized).toMatchObject({
      _id: "6a3371ed18d916b34f2dfa3e",
      marketplaceEntryId: "entry-1",
      marketplaceProductId: "6a3371ed18d916b34f2dfa3e",
      title: "NFC Card",
      description: "Dual connect NFC tap + scannable QR",
      primaryImage: "https://cdn.swop.id/nfc-card.png",
      productType: "physical",
      price: {
        amount: 7.99,
        currency: "USDC",
      },
      inventory: {
        track: true,
        available: 42,
      },
      fulfillment: {
        requiresShipping: true,
        shippingCost: 1.99,
      },
      variants: [
        {
          name: "Color",
          options: [{ name: "Black" }, { name: "White" }],
        },
      ],
    });
  });

  it("normalizes common SKU option shapes with quantity and sold counts", () => {
    expect(
      normalizeSmartsiteMarketplaceVariants([
        {
          label: "Size",
          values: [
            { label: "Small", stock: "5", soldCount: "2" },
            { value: "Large", available: 0, sold: 0 },
          ],
        },
        {
          title: "Finish",
          items: ["Matte", { name: "Gloss", quantity: 3 }],
        },
        {
          name: "Empty",
          options: [],
        },
      ]),
    ).toEqual([
      {
        name: "Size",
        options: [
          { name: "Small", quantity: 5, sold: 2 },
          { name: "Large", quantity: 0, sold: 0 },
        ],
      },
      {
        name: "Finish",
        options: [{ name: "Matte" }, { name: "Gloss", quantity: 3 }],
      },
    ]);
  });

  it("exposes receipt-gated digital assets as marketplace exclusive content", () => {
    const normalized = normalizeSmartsiteMarketplaceItem({
      _id: "entry-2",
      marketplaceProductId: {
        _id: "product-2",
        title: "Black Swop Networking Card",
        description: "Founder edition card",
        productType: "digital",
        price: { amount: 85, currency: "USDC" },
        images: [{ url: "https://cdn.swop.id/card.png" }],
        fulfillment: {
          digitalDeliveryNote: "Includes the holder onboarding kit.",
          digitalAsset: {
            enabled: true,
            fileName: "holder-kit.zip",
            originalName: "Holder Kit.zip",
            mimeType: "application/zip",
            size: 2048,
            accessPolicy: "receipt_nft",
          },
        },
      },
    });

    expect(normalized).toBeTruthy();
    expect(getMarketplaceExclusiveContentItems(normalized!)).toEqual([
      expect.objectContaining({
        title: "Holder Kit.zip",
        description: "Includes the holder onboarding kit.",
        kind: "download",
        ctaLabel: "Download",
        fileName: "holder-kit.zip",
        originalName: "Holder Kit.zip",
        accessPolicy: "receipt_nft",
        lockedBy: "receipt_nft",
      }),
    ]);
  });
});
