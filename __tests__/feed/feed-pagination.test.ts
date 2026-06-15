import {
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
});
