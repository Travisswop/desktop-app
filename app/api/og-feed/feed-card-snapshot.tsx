/* eslint-disable @next/next/no-img-element */
import { POLYMARKET_BACKEND_URL } from "@/constants/polymarket";
import { apiFetch } from "@/lib/api/apiFetch";

const INK = "#20242D";
const MUTED = "#9CA3AF";
const HAIRLINE = "#ECECEB";
const BLUE = "#2F7ED8";
const GREEN = "#10875D";
const RED = "#E5484D";
const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

type AuthorSnapshot = {
  name: string;
  handle: string;
  avatar: string;
  initials: string;
};

type TeamSnapshot = {
  name: string;
  abbreviation: string;
  color: string;
  logo: string;
  score: number | null;
};

export type PredictionShareSnapshot = {
  kind: "prediction";
  author: AuthorSnapshot;
  createdAt: string;
  marketTitle: string;
  marketKind: string;
  league: string;
  status: string;
  live: boolean;
  outcome: string;
  yesOutcome: string;
  noOutcome: string;
  yesPrice: number;
  noPrice: number;
  yesTeam: TeamSnapshot;
  noTeam: TeamSnapshot;
  gameCenter: string;
  cost: number;
  shares: number | null;
  entryPrice: number;
  pnl: number | null;
  potentialWin: number | null;
  volume: string;
};

export type PerpsShareSnapshot = {
  kind: "perps";
  author: AuthorSnapshot;
  createdAt: string;
  coin: string;
  side: "LONG" | "SHORT";
  leverage: number;
  status: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  returnPct: number;
};

export type SwapShareSnapshot = {
  kind: "swap";
  author: AuthorSnapshot;
  createdAt: string;
  inputSymbol: string;
  inputAmount: number;
  inputImage: string;
  outputSymbol: string;
  outputAmount: number;
  outputImage: string;
  outputPrice: number;
  changePct: number;
};

export type FeedShareSnapshot =
  PredictionShareSnapshot | PerpsShareSnapshot | SwapShareSnapshot;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function text(...values: unknown[]) {
  for (const value of values) {
    const normalized = String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (normalized) return normalized;
  }
  return "";
}

function numberOrNull(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function clampProbability(value: number | null, fallback = 0.5) {
  if (value === null || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
}

function initials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "SW";
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function avatarUrl(value: unknown, appUrl: string) {
  const source = text(value);
  if (!source) return "";
  if (/^\d+$/.test(source)) {
    return `${appUrl}/assets/avatar/${source}.png`;
  }
  if (source.startsWith("//")) return `https:${source}`;
  if (source.startsWith("/")) return `${appUrl}${source}`;
  return source;
}

function authorFromFeed(feed: UnknownRecord, appUrl: string): AuthorSnapshot {
  const details = record(feed.smartsiteDetails);
  const smartsite = record(feed.smartsiteId);
  const name =
    text(
      details.name,
      smartsite.name,
      feed.smartsiteUserName,
      details.ens,
      smartsite.ens,
      feed.smartsiteEnsName,
    ) || "Swop";
  const handle = text(details.ens, smartsite.ens, feed.smartsiteEnsName);
  const avatar = avatarUrl(
    details.profilePic ??
      details.profilePicture ??
      smartsite.profilePic ??
      smartsite.profilePicture ??
      feed.smartsiteProfilePic,
    appUrl,
  );

  return {
    name,
    handle: handle
      ? handle.toLowerCase().endsWith(".swop.id")
        ? handle
        : `${handle}.Swop.Id`
      : "",
    avatar,
    initials: initials(name),
  };
}

function teamFromContent(
  value: unknown,
  outcome: string,
  fallbackColor: string,
): TeamSnapshot {
  const team = record(value);
  const name = text(team.name, outcome) || "Team";
  return {
    name,
    abbreviation:
      text(team.abbreviation) ||
      name
        .replace(/[^a-z0-9]/gi, "")
        .slice(0, 3)
        .toUpperCase(),
    color: text(team.color) || fallbackColor,
    logo: text(team.logo),
    score: numberOrNull(team.score),
  };
}

function predictionStatus(content: UnknownRecord) {
  const status = text(
    content.resultStatus,
    content.result,
    content.status,
    content.fillStatus,
  ).toLowerCase();
  const side = text(content.side).toUpperCase();
  if (status.includes("won") || status.includes("win")) return "WON";
  if (
    status.includes("lost") ||
    status.includes("loss") ||
    status.includes("lose")
  )
    return "LOST";
  if (side === "SELL" || status.includes("sold") || status.includes("closed"))
    return "SOLD";
  if (status.includes("live")) return "LIVE";
  return "OPEN";
}

function marketKind(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("spread")) return "SPREAD";
  if (normalized.includes("total") || normalized.includes("over/under"))
    return "TOTAL";
  if (normalized.includes("up") && normalized.includes("down"))
    return "UP / DOWN";
  return "MONEYLINE";
}

const LEAGUES = [
  "nba",
  "wnba",
  "nfl",
  "mlb",
  "nhl",
  "ncaab",
  "ncaaf",
  "epl",
  "mls",
  "ufc",
];

function leagueLabel(title: string, slug: string) {
  const source = `${title} ${slug}`.toLowerCase();
  return (
    LEAGUES.find((league) =>
      new RegExp(`(^|[^a-z])${league}([^a-z]|$)`).test(source),
    )?.toUpperCase() || "PREDICTION"
  );
}

function parseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function quoteMid(value: unknown) {
  const quote = record(value);
  const mid = numberOrNull(quote.midPrice, quote.mid);
  if (mid !== null) return mid;
  const bid = numberOrNull(quote.bidPrice, quote.bid);
  const ask = numberOrNull(quote.askPrice, quote.ask);
  if (bid !== null && ask !== null) return (bid + ask) / 2;
  return bid ?? ask;
}

function teamsMatch(team: UnknownRecord, outcome: string) {
  const target = outcome.toLowerCase();
  const name = text(team.name).toLowerCase();
  const abbreviation = text(team.abbreviation).toLowerCase();
  return Boolean(
    target &&
    ((name && (name.includes(target) || target.includes(name))) ||
      (abbreviation && target.includes(abbreviation))),
  );
}

function applyLiveTeam(
  base: TeamSnapshot,
  liveTeams: unknown[],
  outcome: string,
  fallbackIndex: number,
) {
  const match =
    liveTeams.map(record).find((team) => teamsMatch(team, outcome)) ??
    record(liveTeams[fallbackIndex]);
  if (!Object.keys(match).length) return base;
  return {
    name: text(match.name, base.name),
    abbreviation: text(match.abbreviation, base.abbreviation).toUpperCase(),
    color: text(match.color, base.color),
    logo: text(match.logo, base.logo),
    score: numberOrNull(match.score, base.score),
  };
}

async function fetchPredictionLiveState(content: UnknownRecord): Promise<{
  yesPrice: number | null;
  noPrice: number | null;
  live: UnknownRecord | null;
}> {
  const yesTokenId = text(content.yesTokenId);
  const noTokenId = text(content.noTokenId);
  const eventSlug = text(content.eventSlug, content.slug);
  const tokenIds = [yesTokenId, noTokenId].filter(Boolean);

  const [quotesResult, liveResult] = await Promise.allSettled([
    tokenIds.length
      ? fetch(`${POLYMARKET_BACKEND_URL}/api/prediction-markets/prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ tokenIds }),
        }).then((response) => (response.ok ? response.json() : null))
      : Promise.resolve(null),
    eventSlug
      ? fetch(
          `${POLYMARKET_BACKEND_URL}/api/prediction-markets/events/live?slug=${encodeURIComponent(
            eventSlug,
          )}`,
          { cache: "no-store" },
        ).then((response) => (response.ok ? response.json() : null))
      : Promise.resolve(null),
  ]);

  const quotes =
    quotesResult.status === "fulfilled" ? record(quotesResult.value) : {};
  const live =
    liveResult.status === "fulfilled" && liveResult.value
      ? record(liveResult.value)
      : null;

  const markets = Array.isArray(live?.markets) ? live.markets : [];
  const marketId = text(content.marketId, content.conditionId);
  const matchedMarket = markets.map(record).find((market) => {
    const marketTokenIds = parseArray(market.clobTokenIds).map(String);
    return (
      (marketId &&
        [market.id, market.conditionId].some((id) => text(id) === marketId)) ||
      marketTokenIds.some((id) => id === yesTokenId || id === noTokenId)
    );
  });
  const marketTokenIds = parseArray(matchedMarket?.clobTokenIds).map(String);
  const outcomePrices = parseArray(matchedMarket?.outcomePrices).map(Number);
  const yesIndex = marketTokenIds.indexOf(yesTokenId);
  const noIndex = marketTokenIds.indexOf(noTokenId);

  return {
    yesPrice:
      quoteMid(quotes[yesTokenId]) ??
      numberOrNull(outcomePrices[yesIndex >= 0 ? yesIndex : 0]),
    noPrice:
      quoteMid(quotes[noTokenId]) ??
      numberOrNull(outcomePrices[noIndex >= 0 ? noIndex : 1]),
    live,
  };
}

async function buildPredictionSnapshot(
  feed: UnknownRecord,
  content: UnknownRecord,
  appUrl: string,
): Promise<PredictionShareSnapshot> {
  const marketTitle =
    text(content.marketTitle, content.question, content.title) ||
    "Prediction market";
  const outcome = text(content.outcome, content.pickedOutcome) || "Pick";
  const yesOutcome = text(content.yesOutcome) || "Yes";
  const noOutcome = text(content.noOutcome) || "No";
  const eventSlug = text(content.eventSlug, content.slug);
  const entryPrice = clampProbability(
    numberOrNull(content.executedPrice, content.acceptedPrice, content.price),
  );
  const cost =
    numberOrNull(
      content.executedCost,
      content.executedProceeds,
      content.cost,
    ) ?? 0;
  const explicitShares = numberOrNull(content.executedShares, content.shares);
  const shares =
    explicitShares ?? (entryPrice > 0 && cost > 0 ? cost / entryPrice : null);
  const liveState = await fetchPredictionLiveState(content);
  const storedYesPrice = numberOrNull(content.yesPrice);
  const storedNoPrice = numberOrNull(content.noPrice);
  let yesPrice = clampProbability(liveState.yesPrice ?? storedYesPrice);
  let noPrice = clampProbability(liveState.noPrice ?? storedNoPrice);
  if (liveState.yesPrice === null && storedYesPrice === null) {
    const pickedIsNo =
      outcome.toLowerCase() === noOutcome.toLowerCase() ||
      outcome.toLowerCase() === "no";
    yesPrice = pickedIsNo ? 1 - entryPrice : entryPrice;
  }
  if (liveState.noPrice === null && storedNoPrice === null) {
    noPrice = 1 - yesPrice;
  }
  const total = yesPrice + noPrice || 1;
  yesPrice /= total;
  noPrice /= total;

  const liveTeams = Array.isArray(liveState.live?.teams)
    ? liveState.live.teams
    : [];
  const yesTeam = applyLiveTeam(
    teamFromContent(content.yesTeam, yesOutcome, "#374151"),
    liveTeams,
    yesOutcome,
    0,
  );
  const noTeam = applyLiveTeam(
    teamFromContent(content.noTeam, noOutcome, BLUE),
    liveTeams,
    noOutcome,
    1,
  );
  const live = Boolean(liveState.live?.live);
  const ended = Boolean(liveState.live?.ended || liveState.live?.closed);
  const storedStatus = predictionStatus(content);
  const status =
    storedStatus !== "OPEN"
      ? storedStatus
      : live
        ? "LIVE"
        : ended
          ? "FINAL"
          : "OPEN";
  const pickedIsNo =
    outcome.toLowerCase() === noOutcome.toLowerCase() ||
    outcome.toLowerCase() === "no";
  const pickedPrice = pickedIsNo ? noPrice : yesPrice;
  const explicitPnl = numberOrNull(
    content.realizedPnl,
    content.cashPnl,
    content.sellPnl,
    content.pnl,
    content.profitAmount,
  );
  const pnl =
    explicitPnl ?? (shares !== null ? shares * pickedPrice - cost : null);
  const gameStart = text(content.gameStartTime);
  const gameCenter =
    yesTeam.score !== null && noTeam.score !== null
      ? `${yesTeam.score} – ${noTeam.score}`
      : gameStart
        ? new Date(gameStart).toLocaleString("en-US", {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })
        : "Market open";

  return {
    kind: "prediction",
    author: authorFromFeed(feed, appUrl),
    createdAt: text(feed.createdAt),
    marketTitle,
    marketKind: marketKind(marketTitle),
    league: leagueLabel(marketTitle, eventSlug),
    status,
    live,
    outcome,
    yesOutcome,
    noOutcome,
    yesPrice,
    noPrice,
    yesTeam,
    noTeam,
    gameCenter,
    cost,
    shares,
    entryPrice,
    pnl,
    potentialWin: numberOrNull(content.potentialWin),
    volume: text(content.volume),
  };
}

function buildPerpsSnapshot(
  feed: UnknownRecord,
  content: UnknownRecord,
  appUrl: string,
): PerpsShareSnapshot {
  const size = numberOrNull(content.sizeCoins, content.size) ?? 0;
  const side =
    text(content.side).toUpperCase() === "SHORT" || size < 0 ? "SHORT" : "LONG";
  const entryPrice = numberOrNull(content.entryPrice) ?? 0;
  const markPrice =
    numberOrNull(content.exitPrice, content.markPrice, content.currentPrice) ??
    entryPrice;
  const storedReturn = numberOrNull(content.returnPct, content.returnPercent);
  const computedReturn =
    entryPrice > 0
      ? ((markPrice - entryPrice) / entryPrice) *
        100 *
        (side === "SHORT" ? -1 : 1)
      : 0;
  return {
    kind: "perps",
    author: authorFromFeed(feed, appUrl),
    createdAt: text(feed.createdAt),
    coin: text(content.coin).toUpperCase() || "PERP",
    side,
    leverage: numberOrNull(content.leverage) ?? 1,
    status: text(content.status, content.event).toUpperCase() || "OPEN",
    size: Math.abs(size),
    entryPrice,
    markPrice,
    returnPct: storedReturn ?? computedReturn,
  };
}

function buildSwapSnapshot(
  feed: UnknownRecord,
  content: UnknownRecord,
  appUrl: string,
): SwapShareSnapshot {
  const input = record(content.inputToken);
  const output = record(content.outputToken);
  const inputAmount = numberOrNull(input.amount) ?? 0;
  const outputAmount = numberOrNull(output.amount) ?? 0;
  const inputPrice = numberOrNull(input.price, input.usdValue) ?? 0;
  const outputPrice =
    numberOrNull(output.price, output.tokenPrice, output.marketPrice) ?? 0;
  const inputValue = inputAmount * inputPrice;
  const outputValue = outputAmount * outputPrice;
  return {
    kind: "swap",
    author: authorFromFeed(feed, appUrl),
    createdAt: text(feed.createdAt),
    inputSymbol: text(input.symbol).toUpperCase() || "TOKEN",
    inputAmount,
    inputImage: text(input.tokenImg, input.logoURI),
    outputSymbol: text(output.symbol).toUpperCase() || "TOKEN",
    outputAmount,
    outputImage: text(output.tokenImg, output.logoURI),
    outputPrice,
    changePct:
      inputValue > 0 ? ((outputValue - inputValue) / inputValue) * 100 : 0,
  };
}

export async function buildFeedShareSnapshot(
  feedValue: unknown,
  appUrl: string,
): Promise<FeedShareSnapshot | null> {
  const feed = record(feedValue);
  const content = record(feed.content);
  if (feed.postType === "prediction") {
    return buildPredictionSnapshot(feed, content, appUrl);
  }
  if (feed.postType === "perps" || feed.postType === "perpsPosition") {
    return buildPerpsSnapshot(feed, content, appUrl);
  }
  if (feed.postType === "swapTransaction") {
    return buildSwapSnapshot(feed, content, appUrl);
  }
  return null;
}

export async function loadFeedShareSnapshot(
  feedId: string,
  appUrl: string,
): Promise<FeedShareSnapshot | null> {
  const apiBase = text(process.env.NEXT_PUBLIC_API_URL).replace(/\/+$/, "");
  if (!apiBase || !feedId) return null;
  try {
    const response = await apiFetch(
      `${apiBase}/api/v2/feed/${encodeURIComponent(feedId)}/og`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const payload = await response.json();
    return buildFeedShareSnapshot(payload?.data, appUrl);
  } catch {
    return null;
  }
}

export function buildLegacyFeedShareSnapshot(
  searchParams: URLSearchParams,
): FeedShareSnapshot | null {
  const type = text(searchParams.get("type"));
  const author = {
    name:
      text(searchParams.get("author"), searchParams.get("ensName")) || "Swop",
    handle: text(searchParams.get("ensName")),
    avatar: "",
    initials: initials(
      text(searchParams.get("author"), searchParams.get("ensName")) || "Swop",
    ),
  };
  const createdAt = text(searchParams.get("date"));

  if (type === "prediction" && !searchParams.has("pickedOutcome")) {
    const outcome = text(searchParams.get("outcome")) || "Pick";
    const price = clampProbability(
      numberOrNull(
        String(searchParams.get("price") || "").replace(/[^\d.-]/g, ""),
      ),
    );
    const stake =
      numberOrNull(
        String(searchParams.get("stake") || "").replace(/[^\d.-]/g, ""),
      ) ?? 0;
    return {
      kind: "prediction",
      author,
      createdAt,
      marketTitle:
        text(searchParams.get("marketTitle"), searchParams.get("title")) ||
        "Prediction market",
      marketKind: "MARKET",
      league: "PREDICTION",
      status: text(searchParams.get("status")).toUpperCase() || "OPEN",
      live: false,
      outcome,
      yesOutcome: outcome,
      noOutcome: "Other",
      yesPrice: price,
      noPrice: 1 - price,
      yesTeam: teamFromContent(null, outcome, "#374151"),
      noTeam: teamFromContent(null, "Other", BLUE),
      gameCenter: "Market open",
      cost: stake,
      shares: price > 0 ? stake / price : null,
      entryPrice: price,
      pnl: numberOrNull(
        String(searchParams.get("pnl") || "").replace(/[^\d.-]/g, ""),
      ),
      potentialWin: null,
      volume: "",
    };
  }

  if (type === "perps") {
    const entryPrice =
      numberOrNull(
        String(searchParams.get("entryPrice") || "").replace(/[^\d.-]/g, ""),
      ) ?? 0;
    const markPrice =
      numberOrNull(
        String(searchParams.get("markPrice") || "").replace(/[^\d.-]/g, ""),
      ) ?? entryPrice;
    const side = text(
      searchParams.get("perpsSide"),
      searchParams.get("side"),
    ).toUpperCase();
    return {
      kind: "perps",
      author,
      createdAt,
      coin: text(searchParams.get("coin")).toUpperCase() || "PERP",
      side: side === "SHORT" ? "SHORT" : "LONG",
      leverage: numberOrNull(searchParams.get("leverage")) ?? 1,
      status: text(searchParams.get("status")).toUpperCase() || "OPEN",
      size:
        numberOrNull(searchParams.get("size"), searchParams.get("sizeCoins")) ??
        0,
      entryPrice,
      markPrice,
      returnPct:
        numberOrNull(
          String(
            searchParams.get("returnPct") ??
              searchParams.get("returnPercent") ??
              "",
          ).replace(/[^\d.-]/g, ""),
        ) ?? 0,
    };
  }

  if (type === "swap") {
    return {
      kind: "swap",
      author,
      createdAt,
      inputSymbol:
        text(searchParams.get("inputSymbol")).toUpperCase() || "TOKEN",
      inputAmount: numberOrNull(searchParams.get("inputAmount")) ?? 0,
      inputImage: text(searchParams.get("inputImg")),
      outputSymbol:
        text(searchParams.get("outputSymbol")).toUpperCase() || "TOKEN",
      outputAmount: numberOrNull(searchParams.get("outputAmount")) ?? 0,
      outputImage: text(searchParams.get("outputImg")),
      outputPrice: numberOrNull(searchParams.get("outputPrice")) ?? 0,
      changePct: numberOrNull(searchParams.get("priceChange")) ?? 0,
    };
  }

  return null;
}

function formatUsd(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "$0.00";
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatSignedUsd(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

function formatAmount(value: number, digits = 4) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return "$0.00";
  const digits = Math.abs(value) >= 100 ? 2 : Math.abs(value) >= 1 ? 3 : 5;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function statusColors(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "live" || normalized === "lost") {
    return { color: RED, background: "#FDEEEE", border: "#F6C6C7" };
  }
  if (normalized === "won") {
    return { color: GREEN, background: "#E8F7EF", border: "#BCE6D2" };
  }
  if (normalized === "sold" || normalized === "final") {
    return { color: BLUE, background: "#EAF2FC", border: "#CFE0F6" };
  }
  return { color: "#6B7280", background: "#F7F7F7", border: "#E5E7EB" };
}

function PostHeader({
  snapshot,
  appUrl,
}: {
  snapshot: FeedShareSnapshot;
  appUrl: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: 78,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {snapshot.author.avatar ? (
          <img
            src={snapshot.author.avatar}
            width="64"
            height="64"
            alt=""
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              objectFit: "cover",
              border: "1px solid #E5E7EB",
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#EAF2FC",
              color: BLUE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            {snapshot.author.initials}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 29,
              fontWeight: 850,
              color: "#0B0B0B",
            }}
          >
            {snapshot.author.name}
            <span style={{ margin: "0 9px", fontSize: 22 }}>·</span>
            <span style={{ fontSize: 22, fontWeight: 600 }}>now</span>
          </div>
          {snapshot.author.handle ? (
            <div
              style={{
                marginTop: 2,
                display: "flex",
                color: MUTED,
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {snapshot.author.handle}
            </div>
          ) : null}
        </div>
      </div>
      <img
        src={`${appUrl}/images/swop-logo.png`}
        width="144"
        height="46"
        alt="Swop"
        style={{
          width: 144,
          height: 46,
          objectFit: "contain",
          objectPosition: "right center",
        }}
      />
    </div>
  );
}

function TeamMark({ team }: { team: TeamSnapshot }) {
  return (
    <div
      style={{
        width: 68,
        height: 68,
        flexShrink: 0,
        borderRadius: 21,
        backgroundColor: team.color,
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: 17,
        fontWeight: 900,
        overflow: "hidden",
        boxShadow: "0 7px 16px rgba(15,23,42,0.16)",
      }}
    >
      {team.logo ? (
        <img
          src={team.logo}
          width="56"
          height="56"
          alt=""
          style={{ width: 56, height: 56, objectFit: "contain" }}
        />
      ) : (
        team.abbreviation
      )}
    </div>
  );
}

function TrendChart({
  start,
  end,
  color,
  height = 64,
}: {
  start: number;
  end: number;
  color: string;
  height?: number;
}) {
  const width = 1000;
  const safeStart = Number.isFinite(start) ? start : 0;
  const safeEnd = Number.isFinite(end) ? end : safeStart;
  const low = Math.min(safeStart, safeEnd);
  const high = Math.max(safeStart, safeEnd);
  const span = high - low || Math.max(Math.abs(high), 1) * 0.06;
  const points = Array.from({ length: 18 }, (_, index) => {
    const progress = index / 17;
    const wave =
      Math.sin(index * 1.17) * span * 0.12 +
      Math.sin(index * 0.49) * span * 0.08;
    const value = safeStart + (safeEnd - safeStart) * progress + wave;
    return {
      x: progress * width,
      y: 8 + (1 - (value - (low - span * 0.25)) / (span * 1.5)) * (height - 16),
    };
  });
  const line = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const last = points[points.length - 1];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="1000"
      height={height}
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient
          id={`share-trend-${color.slice(1)}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        x2={width}
        y1={height / 2}
        y2={height / 2}
        stroke="#E5E7EB"
        strokeDasharray="8 12"
        strokeWidth="2"
      />
      <path d={area} fill={`url(#share-trend-${color.slice(1)})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r="8"
        fill="#FFFFFF"
        stroke={color}
        strokeWidth="5"
      />
    </svg>
  );
}

function PredictionCard({ snapshot }: { snapshot: PredictionShareSnapshot }) {
  const splitTotal = snapshot.yesPrice + snapshot.noPrice || 1;
  const yesPct = Math.round((snapshot.yesPrice / splitTotal) * 100);
  const noPct = 100 - yesPct;
  const status = statusColors(snapshot.status);
  const pickedNo =
    snapshot.outcome.toLowerCase() === snapshot.noOutcome.toLowerCase() ||
    snapshot.outcome.toLowerCase() === "no";
  const pickedPrice = pickedNo ? snapshot.noPrice : snapshot.yesPrice;
  const positionKicker =
    snapshot.status === "WON" || snapshot.status === "LOST"
      ? "RESULT"
      : snapshot.pnl === null
        ? "OPEN"
        : snapshot.pnl >= 0
          ? "UP"
          : "DOWN";

  return (
    <div
      style={{
        width: "100%",
        height: 1010,
        minHeight: 1010,
        maxHeight: 1010,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        border: `1px solid ${HAIRLINE}`,
        borderRadius: 34,
        padding: "34px 36px 32px",
        boxShadow: "0 18px 38px rgba(15,23,42,0.10)",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: "#09090B" }}>
            {snapshot.league}
          </span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#D1D5DB",
            }}
          />
          <span
            style={{
              fontFamily: MONO,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: 3,
              color: MUTED,
            }}
          >
            {snapshot.marketKind}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: `2px solid ${status.border}`,
            borderRadius: 999,
            backgroundColor: status.background,
            color: status.color,
            padding: "10px 20px",
            fontFamily: MONO,
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: 3,
          }}
        >
          {snapshot.live ? (
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: RED,
              }}
            />
          ) : null}
          <span style={{ display: "flex" }}>{snapshot.status}</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <TeamMark team={snapshot.yesTeam} />
          <span
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#09090B",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {snapshot.yesTeam.name || snapshot.yesOutcome}
          </span>
        </div>
        <span
          style={{
            minWidth: 180,
            display: "flex",
            justifyContent: "center",
            fontFamily: MONO,
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: 2,
            color: MUTED,
          }}
        >
          {snapshot.gameCenter}
        </span>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 18,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#09090B",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {snapshot.noTeam.name || snapshot.noOutcome}
          </span>
          <TeamMark team={snapshot.noTeam} />
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              backgroundColor: INK,
            }}
          />
          <span style={{ fontSize: 22, fontWeight: 850 }}>
            {snapshot.yesOutcome}
          </span>
        </div>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 17,
            fontWeight: 900,
            letterSpacing: 3,
            color: MUTED,
          }}
        >
          {snapshot.status === "OPEN" || snapshot.status === "LIVE"
            ? "WIN PROB"
            : "FINAL"}
        </span>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 850 }}>
            {snapshot.noOutcome}
          </span>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              backgroundColor: BLUE,
            }}
          />
        </div>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 14,
          width: "100%",
          height: 150,
          display: "flex",
          overflow: "hidden",
          borderRadius: 32,
          backgroundColor: INK,
        }}
      >
        <div
          style={{
            width: `${yesPct}%`,
            height: "100%",
            display: "flex",
            alignItems: "center",
            background: "linear-gradient(180deg, #3A404B 0%, #1E222B 100%)",
            color: "#FFFFFF",
            paddingLeft: 30,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 18,
                fontWeight: 900,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {snapshot.yesTeam.abbreviation || "YES"}
            </span>
            <span
              style={{
                marginTop: 2,
                fontFamily: MONO,
                fontSize: 54,
                lineHeight: 1,
                fontWeight: 900,
              }}
            >
              {yesPct}%
            </span>
          </div>
        </div>
        <div
          style={{
            width: `${noPct}%`,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            background: "linear-gradient(180deg, #5BA2F1 0%, #2F7ED8 100%)",
            color: "#FFFFFF",
            paddingRight: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 18,
                fontWeight: 900,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {snapshot.noTeam.abbreviation || "NO"}
            </span>
            <span
              style={{
                marginTop: 2,
                fontFamily: MONO,
                fontSize: 54,
                lineHeight: 1,
                fontWeight: 900,
              }}
            >
              {noPct}%
            </span>
          </div>
        </div>
        {yesPct > 6 && yesPct < 94 ? (
          <div
            style={{
              position: "absolute",
              left: `${yesPct}%`,
              top: 47,
              width: 56,
              height: 56,
              marginLeft: -28,
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              backgroundColor: "#FFFFFF",
              boxShadow: "0 8px 18px rgba(15,23,42,0.20)",
            }}
          >
            <span
              style={{
                width: 3,
                height: 20,
                borderRadius: 2,
                backgroundColor: "#D1D5DB",
              }}
            />
            <span
              style={{
                width: 3,
                height: 20,
                borderRadius: 2,
                backgroundColor: "#D1D5DB",
              }}
            />
          </div>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: MONO,
              color: MUTED,
              fontSize: 17,
              fontWeight: 900,
              letterSpacing: 3,
            }}
          >
            <span>WIN PROB · TIMELINE</span>
            <span>backing {snapshot.outcome}</span>
          </div>
          <div style={{ marginTop: 10, display: "flex", width: "100%" }}>
            <TrendChart
              start={snapshot.entryPrice}
              end={pickedPrice}
              color={pickedNo ? BLUE : INK}
              height={132}
            />
          </div>
        </div>
        <div
          style={{
            marginTop: 22,
            width: "100%",
            height: 112,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #F0F0F0",
            paddingTop: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#EAF2FC",
                color: BLUE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 20,
              }}
            >
              {snapshot.author.initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 25,
                  fontWeight: 900,
                  color: "#09090B",
                }}
              >
                You&apos;re on{" "}
                <span style={{ color: BLUE }}>{snapshot.outcome}</span>
              </span>
              <span
                style={{
                  marginTop: 5,
                  fontFamily: MONO,
                  fontSize: 18,
                  fontWeight: 700,
                  color: MUTED,
                }}
              >
                {formatUsd(snapshot.cost)}
                {snapshot.shares !== null
                  ? ` · ${formatAmount(snapshot.shares, 1)} sh`
                  : ""}{" "}
                @ {Math.round(snapshot.entryPrice * 100)}¢
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 16,
                fontWeight: 900,
                letterSpacing: 3,
                color: MUTED,
              }}
            >
              {positionKicker}
            </span>
            <span
              style={{
                marginTop: 2,
                fontFamily: MONO,
                fontSize: 38,
                lineHeight: 1,
                fontWeight: 900,
                color:
                  snapshot.pnl === null
                    ? MUTED
                    : snapshot.pnl >= 0
                      ? GREEN
                      : RED,
              }}
            >
              {formatSignedUsd(snapshot.pnl)}
            </span>
          </div>
        </div>
        <div
          style={{
            marginTop: 24,
            width: "100%",
            height: 76,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            backgroundColor: "#000000",
            color: "#FFFFFF",
            fontSize: 24,
            fontWeight: 900,
          }}
        >
          {snapshot.status === "OPEN" || snapshot.status === "LIVE"
            ? "Copy Bet"
            : "View Predictions"}
        </div>
      </div>
    </div>
  );
}

function PerpsCard({ snapshot }: { snapshot: PerpsShareSnapshot }) {
  const positive = snapshot.returnPct >= 0;
  const sideColor = snapshot.side === "SHORT" ? RED : GREEN;
  return (
    <div
      style={{
        width: "100%",
        height: 1010,
        minHeight: 1010,
        maxHeight: 1010,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        border: `1px solid ${HAIRLINE}`,
        borderRadius: 34,
        overflow: "hidden",
        boxShadow: "0 18px 38px rgba(15,23,42,0.10)",
      }}
    >
      <div
        style={{
          padding: "38px 38px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <span
              style={{
                display: "flex",
                borderRadius: 16,
                border: `2px solid ${sideColor}33`,
                backgroundColor:
                  snapshot.side === "SHORT" ? "#FDEEEE" : "#E8F7EF",
                color: sideColor,
                padding: "12px 22px",
                fontFamily: MONO,
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 3,
              }}
            >
              {snapshot.side} {formatAmount(snapshot.leverage, 0)}X
            </span>
            <span
              style={{
                fontFamily: MONO,
                color: MUTED,
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              {snapshot.status}
            </span>
          </div>
          <span
            style={{
              marginTop: 18,
              fontFamily: MONO,
              color: "#09090B",
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            {formatAmount(snapshot.size)} {snapshot.coin}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 58,
              lineHeight: 1,
              fontWeight: 900,
              color: "#09090B",
            }}
          >
            {formatPrice(snapshot.markPrice)}
          </span>
          <span
            style={{
              marginTop: 10,
              fontFamily: MONO,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: 3,
              color: MUTED,
            }}
          >
            {snapshot.coin} PRICE
          </span>
        </div>
      </div>

      <div
        style={{
          height: 360,
          width: "100%",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <TrendChart
          start={snapshot.entryPrice}
          end={snapshot.markPrice}
          color="#000000"
          height={360}
        />
      </div>

      <div
        style={{
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          borderTop: "1px solid #F0F0F0",
          borderBottom: "1px solid #F0F0F0",
          padding: "0 36px",
        }}
      >
        {["1D", "1W", "1M", "1Y", "ALL"].map((period) => (
          <span
            key={period}
            style={{
              display: "flex",
              borderRadius: 999,
              backgroundColor: period === "1W" ? "#000000" : "transparent",
              color: period === "1W" ? "#FFFFFF" : MUTED,
              padding: "9px 24px",
              fontFamily: MONO,
              fontSize: 17,
              fontWeight: 900,
            }}
          >
            {period}
          </span>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "26px 36px 32px",
        }}
      >
        <div style={{ width: "100%", display: "flex", alignItems: "center" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 17,
                fontWeight: 900,
                letterSpacing: 3,
                color: MUTED,
              }}
            >
              ENTRY PRICE
            </span>
            <span
              style={{
                marginTop: 9,
                fontFamily: MONO,
                fontSize: 34,
                fontWeight: 900,
                color: "#09090B",
              }}
            >
              {formatPrice(snapshot.entryPrice)}
            </span>
          </div>
          <div style={{ width: 1, height: 74, backgroundColor: "#F0F0F0" }} />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 17,
                fontWeight: 900,
                letterSpacing: 3,
                color: MUTED,
              }}
            >
              RETURN
            </span>
            <span
              style={{
                marginTop: 9,
                fontFamily: MONO,
                fontSize: 34,
                fontWeight: 900,
                color: positive ? GREEN : RED,
              }}
            >
              {positive ? "+" : ""}
              {snapshot.returnPct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div
          style={{
            width: "100%",
            height: 76,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            backgroundColor: "#000000",
            color: "#FFFFFF",
            fontSize: 24,
            fontWeight: 900,
          }}
        >
          Copy Trade
        </div>
      </div>
    </div>
  );
}

function TokenMark({
  image,
  symbol,
  overlap = false,
}: {
  image: string;
  symbol: string;
  overlap?: boolean;
}) {
  return (
    <div
      style={{
        width: 72,
        height: 72,
        marginLeft: overlap ? -20 : 0,
        borderRadius: 36,
        border: "3px solid #FFFFFF",
        backgroundColor: "#F3F4F6",
        color: INK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: MONO,
        fontWeight: 900,
        boxShadow: "0 3px 12px rgba(0,0,0,0.12)",
      }}
    >
      {image ? (
        <img
          src={image}
          width="72"
          height="72"
          alt=""
          style={{ width: 72, height: 72, objectFit: "cover" }}
        />
      ) : (
        symbol.slice(0, 3)
      )}
    </div>
  );
}

function SwapCard({ snapshot }: { snapshot: SwapShareSnapshot }) {
  const positive = snapshot.changePct >= 0;
  const displayPrice =
    snapshot.outputPrice > 0
      ? snapshot.outputPrice
      : snapshot.outputAmount > 0
        ? snapshot.inputAmount / snapshot.outputAmount
        : 0;
  return (
    <div
      style={{
        width: "100%",
        height: 1010,
        minHeight: 1010,
        maxHeight: 1010,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        border: `1px solid ${HAIRLINE}`,
        borderRadius: 34,
        overflow: "hidden",
        boxShadow: "0 18px 38px rgba(15,23,42,0.10)",
      }}
    >
      <div
        style={{
          padding: "38px 38px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <TokenMark
              image={snapshot.inputImage}
              symbol={snapshot.inputSymbol}
            />
            <TokenMark
              image={snapshot.outputImage}
              symbol={snapshot.outputSymbol}
              overlap
            />
          </div>
          <div
            style={{
              marginTop: 16,
              alignSelf: "flex-start",
              display: "flex",
              borderRadius: 999,
              backgroundColor: positive ? "#E8F7EF" : "#FDEEEE",
              color: positive ? GREEN : RED,
              padding: "9px 18px",
              fontFamily: MONO,
              fontSize: 19,
              fontWeight: 900,
            }}
          >
            {positive ? "+" : ""}
            {snapshot.changePct.toFixed(2)}%
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 58,
              lineHeight: 1,
              fontWeight: 900,
              color: "#09090B",
            }}
          >
            {formatPrice(displayPrice)}
          </span>
          <span
            style={{
              marginTop: 10,
              fontFamily: MONO,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: 3,
              color: MUTED,
            }}
          >
            {snapshot.outputSymbol} PRICE
          </span>
        </div>
      </div>

      <div
        style={{
          height: 360,
          width: "100%",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <TrendChart
          start={displayPrice * (1 - snapshot.changePct / 100)}
          end={displayPrice}
          color="#000000"
          height={360}
        />
      </div>

      <div
        style={{
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          borderTop: "1px solid #F0F0F0",
          borderBottom: "1px solid #F0F0F0",
          padding: "0 36px",
        }}
      >
        {["1D", "1W", "1M", "1Y", "ALL"].map((period) => (
          <span
            key={period}
            style={{
              display: "flex",
              borderRadius: 999,
              backgroundColor: period === "1W" ? "#000000" : "transparent",
              color: period === "1W" ? "#FFFFFF" : MUTED,
              padding: "9px 24px",
              fontFamily: MONO,
              fontSize: 17,
              fontWeight: 900,
            }}
          >
            {period}
          </span>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "26px 36px 32px",
        }}
      >
        <div style={{ width: "100%", display: "flex", alignItems: "center" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 17,
                fontWeight: 900,
                letterSpacing: 3,
                color: MUTED,
              }}
            >
              QUANTITY
            </span>
            <span
              style={{
                marginTop: 9,
                fontFamily: MONO,
                fontSize: 30,
                fontWeight: 900,
                color: GREEN,
              }}
            >
              {formatAmount(snapshot.outputAmount)} {snapshot.outputSymbol}
            </span>
          </div>
          <div style={{ width: 1, height: 74, backgroundColor: "#F0F0F0" }} />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 17,
                fontWeight: 900,
                letterSpacing: 3,
                color: MUTED,
              }}
            >
              PRICE
            </span>
            <span
              style={{
                marginTop: 9,
                fontFamily: MONO,
                fontSize: 30,
                fontWeight: 900,
                color: RED,
              }}
            >
              {formatAmount(snapshot.inputAmount)} {snapshot.inputSymbol}
            </span>
          </div>
        </div>
        <div
          style={{
            width: "100%",
            height: 76,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            backgroundColor: "#000000",
            color: "#FFFFFF",
            fontSize: 24,
            fontWeight: 900,
          }}
        >
          Copy Trade
        </div>
      </div>
    </div>
  );
}

export function FeedShareImage({
  snapshot,
  appUrl,
}: {
  snapshot: FeedShareSnapshot;
  appUrl: string;
}) {
  return (
    <div
      style={{
        width: 1200,
        height: 1200,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
        backgroundColor: "#F7F7F6",
        padding: "40px 46px 42px",
        color: "#09090B",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <PostHeader snapshot={snapshot} appUrl={appUrl} />
      <div
        style={{
          marginTop: 20,
          width: "100%",
          height: 1010,
          minHeight: 1010,
          maxHeight: 1010,
          flexBasis: "1010px",
          display: "flex",
          flexShrink: 0,
        }}
      >
        {snapshot.kind === "prediction" ? (
          <PredictionCard snapshot={snapshot} />
        ) : snapshot.kind === "perps" ? (
          <PerpsCard snapshot={snapshot} />
        ) : (
          <SwapCard snapshot={snapshot} />
        )}
      </div>
    </div>
  );
}
