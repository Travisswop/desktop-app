export const FEED_PAGE_LIMIT = 10;

type FeedItemLike = {
  _id?: unknown;
  id?: unknown;
  userId?: unknown;
  smartsiteId?: unknown;
  smartsiteDetails?: { _id?: unknown } | null;
  postType?: unknown;
  content?: Record<string, unknown> | null;
  createdAt?: unknown;
};

type FeedHasMoreInput = {
  requestedPage: number;
  returnedCount: number;
  pageSize?: number;
  totalPages?: unknown;
};

export function getFeedItemKey(item: FeedItemLike) {
  const key = item?._id ?? item?.id;
  return typeof key === "string" && key.trim() ? key : null;
}

export function mergeUniqueFeedItems<T extends FeedItemLike>(
  currentItems: T[],
  nextItems: T[],
) {
  const seen = new Set(currentItems.map(getFeedItemKey).filter(Boolean));
  const uniqueNextItems = nextItems.filter((item) => {
    const key = getFeedItemKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return [...currentItems, ...uniqueNextItems];
}

function idPart(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (!value || typeof value !== "object") return "";
  const record = value as {
    _id?: unknown;
    id?: unknown;
    toString?: () => string;
  };
  const nested: string = idPart(record._id) || idPart(record.id);
  if (nested) return nested;
  if (
    typeof record.toString === "function" &&
    record.toString !== Object.prototype.toString
  ) {
    const stringValue = record.toString();
    return stringValue === "[object Object]" ? "" : stringValue;
  }
  return "";
}

function perpsCoinPart(value: unknown) {
  const coin = String(value || "").trim().toUpperCase();
  if (!coin) return "";
  return coin.includes(":") ? coin.split(":").pop() || coin : coin;
}

function perpsSidePart(value: unknown) {
  const side = String(value || "").trim().toLowerCase();
  if (side === "long" || side === "short") return side;
  return "";
}

function perpsNumberPart(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function perpsCreatedAtMs(value: unknown) {
  const milliseconds = Date.parse(String(value || ""));
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function perpsSmartsitePart(item: FeedItemLike) {
  return (
    idPart(item.smartsiteDetails?._id) ||
    idPart(item.smartsiteId) ||
    ""
  );
}

function perpsMatchParts(item: FeedItemLike) {
  const content = item.content || {};
  const coin = perpsCoinPart(content.coin);
  const side = perpsSidePart(content.side);
  const sizeCoins = perpsNumberPart(content.sizeCoins);
  const createdAt = perpsCreatedAtMs(item.createdAt);
  const userId = idPart(item.userId);
  const smartsiteId = perpsSmartsitePart(item);

  if (!coin || !side || sizeCoins === null || createdAt === null) return null;

  return {
    userId,
    smartsiteId,
    coin,
    side,
    sizeCoins,
    createdAt,
  };
}

function isDuplicateLegacyPerps(
  legacy: FeedItemLike,
  lifecyclePosts: FeedItemLike[],
) {
  const legacyParts = perpsMatchParts(legacy);
  if (!legacyParts) return false;

  return lifecyclePosts.some((post) => {
    const lifecycleParts = perpsMatchParts(post);
    if (!lifecycleParts) return false;
    const sameOwner =
      (!legacyParts.userId ||
        !lifecycleParts.userId ||
        legacyParts.userId === lifecycleParts.userId) &&
      (!legacyParts.smartsiteId ||
        !lifecycleParts.smartsiteId ||
        legacyParts.smartsiteId === lifecycleParts.smartsiteId);
    const sameTrade =
      legacyParts.coin === lifecycleParts.coin &&
      legacyParts.side === lifecycleParts.side &&
      Math.abs(legacyParts.sizeCoins - lifecycleParts.sizeCoins) <= 0.000001;
    const nearTimestamp =
      Math.abs(legacyParts.createdAt - lifecycleParts.createdAt) <=
      30 * 60 * 1000;

    return sameOwner && sameTrade && nearTimestamp;
  });
}

export function filterDuplicateLegacyPerpsItems<T extends FeedItemLike>(
  items: T[],
) {
  const lifecyclePosts = items.filter(
    (item) => item.postType === "perpsPosition",
  );
  if (lifecyclePosts.length === 0) return items;

  return items.filter(
    (item) =>
      item.postType !== "perps" ||
      !isDuplicateLegacyPerps(item, lifecyclePosts),
  );
}

export function shouldFetchAnotherFeedPage({
  requestedPage,
  returnedCount,
  pageSize = FEED_PAGE_LIMIT,
  totalPages,
}: FeedHasMoreInput) {
  if (returnedCount <= 0) return false;

  const numericTotalPages = Number(totalPages);
  if (Number.isFinite(numericTotalPages) && numericTotalPages > 0) {
    return requestedPage < numericTotalPages;
  }

  return returnedCount >= pageSize;
}
