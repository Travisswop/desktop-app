export const FEED_PAGE_LIMIT = 10;

type FeedItemLike = {
  _id?: unknown;
  id?: unknown;
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
