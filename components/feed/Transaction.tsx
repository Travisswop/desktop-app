"use client";

import { getSmartsiteFeed } from "@/actions/postFeed";
import Image from "next/image";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaUser } from "react-icons/fa";
import { GoDotFill } from "react-icons/go";
import dayjs from "dayjs";
import { HiDotsHorizontal } from "react-icons/hi";
import { Popover, PopoverContent, PopoverTrigger } from "@nextui-org/react";
import relativeTime from "dayjs/plugin/relativeTime";
import Reaction from "./view/Reaction";
import FeedLoading from "../loading/FeedLoading";
import DeleteFeedModal from "./DeleteFeedModal";
import isUrl from "@/lib/isUrl";
import { useUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";

dayjs.extend(relativeTime);

const Transaction = ({
  accessToken,
  userId,
  setIsPosting,
  isPosting,
  setIsPostLoading,
}: {
  accessToken: string;
  userId: string;
  setIsPosting: (value: boolean) => void;
  isPosting: boolean;
  setIsPostLoading: (value: boolean) => void;
}) => {
  const [feedData, setFeedData] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false);
  const pageRef = useRef(1);
  const [smartsiteId, setSmartsiteId] = useState("");

  const { user } = useUser();

  console.log("feedData", feedData);

  useEffect(() => {
    if (user?.primaryMicrosite) {
      setSmartsiteId(user.primaryMicrosite);
    }
  }, [user]);

  const router = useRouter();

  const fetchFeedData = useCallback(
    async (reset = false) => {
      if (isFetching.current || !smartsiteId) return;
      isFetching.current = true;
      try {
        const currentPage = reset ? 1 : pageRef.current;
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/transaction/${smartsiteId}?page=${currentPage}&limit=5`;
        const newFeedData = await getSmartsiteFeed(url, accessToken);
        console.log("newFeedData", newFeedData);

        if (newFeedData?.data) {
          if (reset) {
            setFeedData(newFeedData.data);
            pageRef.current = 2; // Next page is 2 after reset
            setHasMore(newFeedData.data.length === 5);
          } else {
            setFeedData((prev) => [...prev, ...newFeedData.data]);
            setHasMore(newFeedData.data.length === 5);
            pageRef.current += 1;
          }
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching feed data: ", error);
      } finally {
        setIsPostLoading(false);
        isFetching.current = false;
      }
    },
    [accessToken, smartsiteId, setIsPostLoading]
  );

  // Initial fetch once smartsiteId is available.
  useEffect(() => {
    if (smartsiteId) {
      fetchFeedData();
    }
  }, [smartsiteId, fetchFeedData]);

  // Refetch when a new post is created.
  useEffect(() => {
    if (isPosting) {
      setIsPostLoading(true);
      pageRef.current = 1; // Reset page ref
      setHasMore(true);
      fetchFeedData(true);
      setIsPosting(false);
    }
  }, [isPosting, fetchFeedData, setIsPosting, setIsPostLoading]);

  // Infinite scroll observer to trigger further fetches.
  useEffect(() => {
    if (!hasMore) return;

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && !isFetching.current) {
        fetchFeedData();
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "0px",
      threshold: 1.0,
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer.disconnect();
  }, [hasMore, fetchFeedData]);

  // Helper function for rendering transaction content
  const renderTransactionContent = (feed: any) => {
    const {
      transaction_type,
      receiver_ens,
      receiver_wallet_address,
      amount,
      token,
      chain,
      tokenPrice,
      image,
    } = feed.content;

    // Use receiver ENS if available; otherwise, show a truncated wallet address.
    const recipientDisplay = receiver_ens
      ? receiver_ens
      : receiver_wallet_address &&
        `${receiver_wallet_address.slice(
          0,
          5
        )}...${receiver_wallet_address.slice(-5)}`;

    if (transaction_type === "nft") {
      return (
        <div>
          <p className="text-gray-600 text-sm">
            Sent NFT{" "}
            <span className="font-medium text-base">
              {feed.content.name || "item"}
            </span>{" "}
            to <span className="font-medium text-base">{recipientDisplay}</span>
            .
          </p>
          {image && (
            <div className="w-52">
              <Image
                src={image}
                alt="NFT"
                width={300}
                height={300}
                className="w-full h-auto"
              />
              <p className="text-sm text-gray-600 font-medium mt-0.5 text-center">
                {amount} {feed.content.currency || "NFT"}
              </p>
            </div>
          )}
        </div>
      );
    } else if (transaction_type === "token") {
      return (
        <p className="text-gray-600 text-sm">
          Transferred{" "}
          <span className="font-medium">
            {amount.toFixed(2)} {token}
          </span>{" "}
          {tokenPrice && (
            <span className="text-sm text-gray-600 font-medium mt-0.5">
              (${Number(tokenPrice).toFixed(2)})
            </span>
          )}{" "}
          tokens to <span className="font-medium">{recipientDisplay}</span> on
          the {chain}.
        </p>
      );
    } else {
      return (
        <p className="text-gray-600 text-sm">
          Executed a {transaction_type} transaction involving {amount}{" "}
          {feed.content.currency}.
        </p>
      );
    }
  };

  return (
    <div className="w-full flex gap-10">
      <div className="w-full flex flex-col gap-4">
        {feedData.map((feed) => (
          <div
            key={feed._id}
            className="flex gap-2 border-b border-gray-200 pb-4"
          >
            <div className="w-10 xl:w-12 h-10 xl:h-12 bg-gray-400 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
              {(() => {
                const profilePic =
                  feed?.smartsiteId?.profilePic || feed?.smartsiteProfilePic;
                return profilePic && isUrl(profilePic) ? (
                  <Image
                    alt="user"
                    src={profilePic}
                    width={300}
                    height={300}
                    quality={100}
                    className="rounded-full w-full h-full"
                  />
                ) : (
                  <FaUser size={28} color="white" />
                );
              })()}
            </div>
            <div className="flex-1">
              {/* User and Feed Information */}
              <div className="flex items-start justify-between">
                <div className="w-full">
                  <div className="flex items-center gap-1">
                    <p className="text-gray-700 font-semibold">
                      {feed?.smartsiteId?.name ||
                        feed?.smartsiteUserName ||
                        "Anonymous"}
                    </p>
                    <GoDotFill size={10} />
                    <p className="text-gray-500 font-normal">
                      {feed?.smartsiteId?.ens ||
                        feed?.smartsiteEnsName ||
                        "n/a"}
                    </p>
                    <GoDotFill size={10} />
                    <p className="text-gray-500 font-normal">
                      {dayjs(feed.createdAt).fromNow()}
                    </p>
                  </div>
                  {feed.postType === "repost" && feed.content.title && (
                    <button onClick={() => router.push(`/feed/${feed._id}`)}>
                      {feed.content.title
                        .split("\n")
                        .map((line: any, index: number) => (
                          <p className="break-text" key={index}>
                            {line}
                          </p>
                        ))}
                    </button>
                  )}
                  {feed.postType === "swapTransaction" && (
                    <div className="w-full flex justify-start mt-1">
                      <button
                        onClick={() => router.push(`/feed/${feed._id}`)}
                        className="w-full max-w-xl"
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 0,
                        }}
                      >
                        <div className="flex flex-col gap-3 border rounded-xl p-4 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="relative flex items-center">
                                <Image
                                  src={
                                    feed.content.inputToken.tokenImg.startsWith(
                                      "https"
                                    )
                                      ? feed.content.inputToken.tokenImg
                                      : `/assets/crypto-icons/${feed.content.inputToken.symbol}.png`
                                  }
                                  alt={feed.content.inputToken.symbol}
                                  width={120}
                                  height={120}
                                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm z-10"
                                />
                                <Image
                                  src={
                                    feed.content.outputToken.tokenImg.startsWith(
                                      "https"
                                    )
                                      ? feed.content.outputToken.tokenImg
                                      : `/assets/crypto-icons/${feed.content.outputToken.symbol}.png`
                                  }
                                  alt={feed.content.outputToken.symbol}
                                  width={120}
                                  height={120}
                                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm -ml-4 z-20"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <p className="text-sm text-gray-500">
                                Swap Transaction
                              </p>
                              <p className="text-xs text-gray-400">
                                {dayjs(feed.createdAt).format(
                                  "MMM D, YYYY h:mm A"
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <p className="text-sm text-gray-600">You sent</p>
                              <p className="text-base font-semibold text-red-600">
                                {Number(feed.content.inputToken.amount).toFixed(
                                  2
                                )}{" "}
                                {feed.content.inputToken.symbol}
                              </p>
                            </div>
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                              />
                            </svg>
                            <div className="flex flex-col items-end">
                              <p className="text-sm text-gray-600">
                                You received
                              </p>
                              <p className="text-base font-semibold text-green-600">
                                {Number(
                                  feed.content.outputToken.amount
                                ).toFixed(2)}{" "}
                                {feed.content.outputToken.symbol}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/wallet?inputToken=${feed.content.inputToken.symbol}&outputToken=${feed.content.outputToken.symbol}&amount=${feed.content.inputToken.amount}`
                                );
                              }}
                              className="text-xs border border-gray-300 rounded px-3 py-1 font-medium hover:bg-gray-200"
                            >
                              Copy Trade
                            </button>
                            {feed.content.signature && (
                              <div className="flex justify-end">
                                <a
                                  onClick={(e) => e.stopPropagation()}
                                  href={`https://solscan.io/tx/${feed.content.signature}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                                >
                                  View on Solscan
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M17 7h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2m4-4h4m0 0v4m0-4L10 10"
                                    />
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {feed.postType === "transaction" &&
                    renderTransactionContent(feed)}
                </div>
                {userId === feed.userId && (
                  <div>
                    <Popover
                      backdrop="opaque"
                      placement="bottom-end"
                      showArrow
                      style={{ zIndex: 10 }}
                    >
                      <PopoverTrigger>
                        <button type="button">
                          <HiDotsHorizontal size={20} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <div className="px-1 py-2 flex flex-col">
                          <DeleteFeedModal
                            postId={feed._id}
                            token={accessToken}
                            setIsPosting={setIsPosting}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
              <Reaction
                postId={feed._id}
                isLiked={feed.isLiked}
                likeCount={feed.likeCount}
                commentCount={feed.commentCount}
                repostCount={feed.repostCount}
                viewsCount={feed.viewsCount}
                setIsPosting={() => {}}
                // accessToken={accessToken}
              />
            </div>
          </div>
        ))}
        {hasMore && (
          <div ref={observerRef} className="loading-spinner">
            <FeedLoading />
          </div>
        )}
      </div>
    </div>
  );
};

export default Transaction;
