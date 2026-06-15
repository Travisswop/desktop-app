import {
  resolveTipRecipient,
  resolveTipRecipientAddress,
} from "@/lib/feed/tipRecipient";

describe("tip recipient resolver", () => {
  it("uses smartsiteDetails when smartsiteId is not populated", () => {
    const recipient = resolveTipRecipient({
      smartsiteId: "microsite-id",
      smartsiteDetails: {
        name: "Travis",
        ens: "travis.swop.id",
        profilePic: "8",
      },
    });

    expect(recipient).toMatchObject({
      ens: "travis.swop.id",
      name: "Travis",
      image: "/images/user_avator/8@3x.png",
    });
  });

  it("falls back to flattened feed identity fields", () => {
    const recipient = resolveTipRecipient({
      smartsiteUserName: "Astro",
      smartsiteEnsName: "astro.swop.id",
      smartsiteProfilePic: "https://cdn.example.com/avatar.png",
    });

    expect(recipient).toMatchObject({
      ens: "astro.swop.id",
      name: "Astro",
      image: "https://cdn.example.com/avatar.png",
    });
  });

  it("resolves solana addresses from ENS data before generic wallet fallbacks", () => {
    const recipient = resolveTipRecipient({
      smartsiteDetails: {
        ens: "tip.swop.id",
        walletAddress: "9uQeWvG816bUx9EPfD4i8zU4BrC3mZ8r4qUxQeWvG816",
      },
    });

    expect(
      resolveTipRecipientAddress({
        recipient,
        chain: "SOLANA",
        ensData: {
          addresses: {
            "501": "7qQeWvG816bUx9EPfD4i8zU4BrC3mZ8r4qUxQeWvG700",
          },
        },
      }),
    ).toBe("7qQeWvG816bUx9EPfD4i8zU4BrC3mZ8r4qUxQeWvG700");
  });

  it("does not use a solana-looking generic wallet for EVM tips", () => {
    const recipient = resolveTipRecipient({
      smartsiteDetails: {
        walletAddress: "9uQeWvG816bUx9EPfD4i8zU4BrC3mZ8r4qUxQeWvG816",
      },
    });

    expect(
      resolveTipRecipientAddress({
        recipient,
        chain: "ETHEREUM",
      }),
    ).toBe("");
  });
});
