import {
  filterDuplicateLegacyPerpsItems,
  filterDuplicatePerpsPositionItems,
  mergeFreshFeedItems,
  mergeUniqueFeedItems,
  shouldFetchAnotherFeedPage,
} from "@/components/feed/feedPagination";

describe("feed pagination", () => {
  it("uses full page size as the fallback when later pages omit totalPages", () => {
    expect(
      shouldFetchAnotherFeedPage({
        requestedPage: 2,
        returnedCount: 10,
        pageSize: 10,
        totalPages: null,
      }),
    ).toBe(true);
  });

  it("stops when a later page is short or empty", () => {
    expect(
      shouldFetchAnotherFeedPage({
        requestedPage: 3,
        returnedCount: 4,
        pageSize: 10,
        totalPages: null,
      }),
    ).toBe(false);

    expect(
      shouldFetchAnotherFeedPage({
        requestedPage: 4,
        returnedCount: 0,
        pageSize: 10,
        totalPages: null,
      }),
    ).toBe(false);
  });

  it("honors explicit totalPages when the backend provides them", () => {
    expect(
      shouldFetchAnotherFeedPage({
        requestedPage: 1,
        returnedCount: 10,
        pageSize: 10,
        totalPages: 3,
      }),
    ).toBe(true);

    expect(
      shouldFetchAnotherFeedPage({
        requestedPage: 3,
        returnedCount: 10,
        pageSize: 10,
        totalPages: 3,
      }),
    ).toBe(false);
  });

  it("dedupes items while preserving order", () => {
    expect(
      mergeUniqueFeedItems(
        [{ _id: "a" }, { _id: "b" }],
        [{ _id: "b" }, { _id: "c" }, { _id: "d" }],
      ),
    ).toEqual([{ _id: "a" }, { _id: "b" }, { _id: "c" }, { _id: "d" }]);
  });

  it("merges a refreshed first page without dropping loaded older posts", () => {
    expect(
      mergeFreshFeedItems(
        [
          { _id: "new", text: "new post" },
          { _id: "a", text: "fresh copy" },
        ],
        [
          { _id: "a", text: "stale copy" },
          { _id: "b", text: "older post" },
          { id: "c", text: "id fallback" },
        ],
      ),
    ).toEqual([
      { _id: "new", text: "new post" },
      { _id: "a", text: "fresh copy" },
      { _id: "b", text: "older post" },
      { id: "c", text: "id fallback" },
    ]);
  });

  it("collapses duplicate perps position lifecycle rows and prefers the live row over stale terminal data", () => {
    const items = [
      {
        _id: "stale-liquidated",
        postType: "perpsPosition",
        createdAt: "2026-06-19T00:18:57.503Z",
        updatedAt: "2026-06-20T13:43:28.302Z",
        content: {
          positionKey: "hyperliquid:wallet:XYZ:CL",
          coin: "XYZ:CL",
          dex: "xyz",
          status: "liquidated",
          event: "liquidate",
          openedAt: "2026-06-19T00:18:57.503Z",
          updatedAt: "2026-06-18T06:10:21.512Z",
          liquidatedAt: "2026-06-18T06:10:21.512Z",
          side: "long",
          sizeCoins: 7.487,
        },
      },
      {
        _id: "live",
        postType: "perpsPosition",
        createdAt: "2026-06-19T00:18:57.503Z",
        updatedAt: "2026-06-20T13:49:00.000Z",
        content: {
          positionKey: "hyperliquid:wallet:XYZ:CL",
          coin: "XYZ:CL",
          dex: "xyz",
          status: "open",
          event: "open",
          openedAt: "2026-06-19T00:18:57.503Z",
          updatedAt: "2026-06-20T13:49:00.000Z",
          side: "long",
          sizeCoins: 7.487,
        },
      },
      {
        _id: "stale-closed",
        postType: "perpsPosition",
        createdAt: "2026-06-19T00:18:57.503Z",
        updatedAt: "2026-06-20T13:50:00.000Z",
        content: {
          positionKey: "hyperliquid:wallet:XYZ:CL",
          coin: "XYZ:CL",
          dex: "xyz",
          status: "closed",
          event: "close",
          openedAt: "2026-06-19T00:18:57.503Z",
          updatedAt: "2026-06-20T01:34:52.581Z",
          closedAt: "2026-06-20T01:34:52.581Z",
          side: "long",
          sizeCoins: 7.487,
        },
      },
      { _id: "other", postType: "post", content: { title: "keep" } },
    ];

    expect(filterDuplicatePerpsPositionItems(items).map((item) => item._id))
      .toEqual(["live", "other"]);
  });

  it("suppresses legacy perps cards when the lifecycle card exists", () => {
    const items = [
      {
        _id: "legacy",
        postType: "perps",
        userId: "user-1",
        smartsiteId: "site-1",
        createdAt: "2026-06-15T23:00:00.000Z",
        content: {
          coin: "XYZ:SPCX",
          side: "SHORT",
          sizeCoins: 2.39,
        },
      },
      {
        _id: "position",
        postType: "perpsPosition",
        userId: "user-1",
        smartsiteId: "site-1",
        createdAt: "2026-06-15T23:04:00.000Z",
        content: {
          coin: "xyz:SPCX",
          side: "short",
          sizeCoins: 2.39,
        },
      },
      { _id: "other", postType: "post", content: { title: "keep" } },
    ];

    expect(
      filterDuplicateLegacyPerpsItems(items).map((item) => item._id),
    ).toEqual(["position", "other"]);
  });

  it("keeps standalone legacy perps cards without a matching lifecycle card", () => {
    const items = [
      {
        _id: "legacy",
        postType: "perps",
        userId: "user-1",
        smartsiteId: "site-1",
        createdAt: "2026-06-15T23:00:00.000Z",
        content: {
          coin: "ETH",
          side: "LONG",
          sizeCoins: 1,
        },
      },
    ];

    expect(filterDuplicateLegacyPerpsItems(items)).toEqual(items);
  });
});
