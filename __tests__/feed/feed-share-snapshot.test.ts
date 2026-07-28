import {
  buildFeedShareSnapshot,
  buildLegacyFeedShareSnapshot,
} from "@/app/api/og-feed/feed-card-snapshot";

const APP_URL = "https://www.swopme.app";

describe("feed share snapshots", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("hydrates a prediction preview with live score and quote data", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/prices")) {
        return new Response(
          JSON.stringify({
            yes: { bid: 0.61, ask: 0.63 },
            no: { bid: 0.37, ask: 0.39 },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/events/live")) {
        return new Response(
          JSON.stringify({
            live: true,
            ended: false,
            teams: [
              {
                name: "Cleveland Guardians",
                abbreviation: "cle",
                score: 4,
                color: "#c41230",
              },
              {
                name: "Cincinnati Reds",
                abbreviation: "cin",
                score: 3,
                color: "#c6011f",
              },
            ],
            markets: [
              {
                id: "market",
                clobTokenIds: ["yes", "no"],
                outcomePrices: [0.62, 0.38],
              },
            ],
          }),
          { status: 200 },
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const snapshot = await buildFeedShareSnapshot(
      {
        postType: "prediction",
        createdAt: "2026-07-28T18:42:18.166Z",
        smartsiteDetails: {
          name: "Travis Herron",
          ens: "travis.swop.id",
          profilePic: "https://example.com/travis.png",
        },
        content: {
          marketId: "market",
          marketTitle: "Cleveland Guardians vs. Cincinnati Reds",
          outcome: "Cincinnati Reds",
          side: "BUY",
          executedCost: 2.23,
          executedPrice: 0.17,
          executedShares: 13.1,
          eventSlug: "mlb-cle-cin-2026-07-27",
          yesOutcome: "Cleveland Guardians",
          noOutcome: "Cincinnati Reds",
          yesTokenId: "yes",
          noTokenId: "no",
        },
      },
      APP_URL,
    );

    expect(snapshot).toMatchObject({
      kind: "prediction",
      league: "MLB",
      status: "LIVE",
      live: true,
      yesPrice: 0.62,
      noPrice: 0.38,
      gameCenter: "4 – 3",
      yesTeam: {
        abbreviation: "CLE",
        score: 4,
      },
      noTeam: {
        abbreviation: "CIN",
        score: 3,
      },
    });
    expect(snapshot?.kind === "prediction" ? snapshot.pnl : null).toBeCloseTo(
      2.748,
      3,
    );
  });

  it("maps perps and swap posts into the same fields their feed cards use", async () => {
    const perps = await buildFeedShareSnapshot(
      {
        postType: "perpsPosition",
        smartsiteDetails: { name: "Alex Hennigan", ens: "henni93" },
        content: {
          coin: "SOL",
          side: "LONG",
          leverage: 20,
          status: "open",
          sizeCoins: 4.09,
          entryPrice: 71.12,
          markPrice: 73.86,
        },
      },
      APP_URL,
    );
    const swap = await buildFeedShareSnapshot(
      {
        postType: "swapTransaction",
        smartsiteDetails: { name: "Travis Herron", ens: "travis" },
        content: {
          inputToken: { symbol: "USDC", amount: 100, price: 1 },
          outputToken: { symbol: "SOL", amount: 1.3547, price: 73.86 },
        },
      },
      APP_URL,
    );

    expect(perps).toMatchObject({
      kind: "perps",
      coin: "SOL",
      side: "LONG",
      leverage: 20,
      size: 4.09,
      entryPrice: 71.12,
      markPrice: 73.86,
    });
    expect(
      perps?.kind === "perps" ? perps.returnPct : null,
    ).toBeCloseTo(3.8526, 3);
    expect(swap).toMatchObject({
      kind: "swap",
      inputSymbol: "USDC",
      inputAmount: 100,
      outputSymbol: "SOL",
      outputAmount: 1.3547,
      outputPrice: 73.86,
    });
  });

  it("upgrades legacy cached trade image URLs to feed-style snapshots", () => {
    const params = new URLSearchParams({
      type: "perps",
      ensName: "henni93",
      author: "Alex Hennigan",
      coin: "SOL",
      perpsSide: "LONG",
      leverage: "20",
      entryPrice: "$71.12",
      markPrice: "$73.86",
      returnPct: "+3.85%",
    });

    expect(buildLegacyFeedShareSnapshot(params)).toMatchObject({
      kind: "perps",
      coin: "SOL",
      side: "LONG",
      leverage: 20,
      entryPrice: 71.12,
      markPrice: 73.86,
      returnPct: 3.85,
    });
  });
});
