"use client";

import { getSmartsiteFeed } from "@/actions/postFeed";
import Image from "next/image";
import React, { useState, useEffect, useRef, useCallback } from "react";
// import { FaUser } from "react-icons/fa";
import { GoDotFill } from "react-icons/go";
import dayjs from "dayjs";
// import PostTypeMedia from "./view/PostTypeMedia";
import { HiDotsHorizontal, HiDotsVertical } from "react-icons/hi";
import { Popover, PopoverContent, PopoverTrigger } from "@nextui-org/react";
import relativeTime from "dayjs/plugin/relativeTime";
// import Reaction from "./view/Reaction";
import Link from "next/link";
import { FiPlusCircle } from "react-icons/fi";
import FeedLoading from "../loading/FeedLoading";
import DeleteFeedModal from "./DeleteFeedModal";
import isUrl from "@/lib/isUrl";
import { useUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
// import IndividualFeedContent from "./IndividualFeedContent";
import SmartsiteLivePreviewFeedMedia from "./view/SmartsiteLivePreviewFeedMedia";
import SmartsiteLivePreviewRepostContent from "./SmartsiteLivePreviewRepostContent";
import updateLocale from "dayjs/plugin/updateLocale";

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);

dayjs.updateLocale("en", {
  relativeTime: {
    future: "in %s",
    past: "%s",
    s: "just now", // Changed from 'a few seconds'
    m: "1 minute ago",
    mm: "%d minutes ago",
    h: "1 hour ago",
    hh: "%d hours ago",
    d: "1 day ago",
    dd: "%d days ago",
    M: "1 month ago",
    MM: "%d months ago",
    y: "1 year ago",
    yy: "%d years ago",
  },
});

const LivePreviewTimeline = ({
  accessToken,
  userId,
  setIsPosting,
  isPosting,
  setIsPostLoading,
  isFromPublicProfile = false,
  micrositeId = "",
}: {
  accessToken: string;
  userId: string;
  setIsPosting: (value: boolean) => void;
  isPosting: boolean;
  setIsPostLoading: (value: boolean) => void;
  isPostLoading: boolean;
  isFromPublicProfile?: boolean;
  micrositeId?: string;
}) => {
  const [feedData, setFeedData] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false);
  const pageRef = useRef(1);
  const [smartsiteId, setSmartsiteId] = useState("");
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const { user } = useUser();

  useEffect(() => {
    if (user) {
      setSmartsiteId(user.primaryMicrosite || "");
    }
  }, [user]);

  /**
   * Helper function to render a transaction post
   */
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
      name,
      currency,
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
            <span className="font-medium text-base">{name || "item"}</span> to{" "}
            <span className="font-medium text-base">{recipientDisplay}</span>.
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
                {amount} {currency || "NFT"}
              </p>
            </div>
          )}
        </div>
      );
    } else if (transaction_type === "token") {
      return (
        <p className="text-black text-sm">
          Transferred{" "}
          <span className="font-medium">
            {amount.toFixed(2)} {token}
          </span>{" "}
          {tokenPrice && (
            <span className="text-sm text-black font-medium mt-0.5">
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
          {currency}.
        </p>
      );
    }
  };

  const fetchFeedData = useCallback(
    async (reset = false) => {
      if (isFetching.current || !smartsiteId) return;
      isFetching.current = true;

      const currentPage = reset ? 1 : pageRef.current;
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/smartsite/${
        micrositeId ? micrositeId : smartsiteId
      }?page=${currentPage}&limit=5`;
      const newFeedData = await getSmartsiteFeed(url, accessToken);

      if (!newFeedData?.data) {
        setHasMore(false);
        setIsPostLoading(false);
        isFetching.current = false;
        return;
      }

      if (newFeedData.data.length < 5) {
        setHasMore(false);
      }

      if (reset) {
        setFeedData(newFeedData.data);
        pageRef.current = 2; // Reset pagination: next page is 2
        setHasMore(newFeedData.data.length > 0);
        setIsPostLoading(false);
      } else {
        if (newFeedData.data.length === 0) {
          setHasMore(false);
          setIsPostLoading(false);
        } else {
          setFeedData((prev) => [...prev, ...newFeedData.data]);
          setIsPostLoading(false);
          pageRef.current += 1;
        }
      }
      isFetching.current = false;
    },
    [accessToken, smartsiteId, setIsPostLoading]
  );

  // Initial fetch once smartsiteId is available.
  useEffect(() => {
    if (smartsiteId) {
      fetchFeedData();
    }
  }, [smartsiteId, fetchFeedData]);

  // Refetch data when isPosting becomes true.
  useEffect(() => {
    if (isPosting) {
      setIsPostLoading(true);
      pageRef.current = 1;
      setHasMore(true);
      fetchFeedData(true);
      setIsPosting(false);
    }
  }, [isPosting, fetchFeedData, setIsPostLoading, setIsPosting]);

  // Infinite scroll observer to load additional data.
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

  const router = useRouter();

  return (
    <div
      className={`flex flex-col gap-2 mx-2 bg-white py-3 text-sm overflow-y-auto hide-scrollbar ${
        isFromPublicProfile
          ? "w-full px-3 shadow-medium rounded-xl mt-1 h-[30rem]"
          : "px-2 rounded-lg mt-2 h-[32rem]"
      }`}
    >
      {feedData.map((feed, index) => (
        <div
          key={index}
          className="flex gap-2 border-b border-gray-200 pb-4 w-full"
        >
          <div className="min-w-10 h-10">
            {(() => {
              const profilePic =
                feed?.smartsiteId?.profilePic || feed?.smartsiteProfilePic;
              return profilePic && isUrl(profilePic) ? (
                <Image
                  alt="user image"
                  src={profilePic}
                  width={300}
                  height={300}
                  quality={100}
                  className="rounded-full w-full h-full"
                />
              ) : (
                <Image
                  alt="user image"
                  src={`/images/user_avator/${profilePic}.png`}
                  width={300}
                  height={300}
                  quality={100}
                  className="rounded-full w-full h-full"
                />
              );
            })()}
          </div>
          <div className={`w-full`}>
            {/* User and Feed Information */}
            <div
              className={`${
                isFromPublicProfile && "w-full"
              } flex items-start justify-between`}
            >
              <div className="w-full">
                <div className="flex items-start justify-between w-full">
                  <button
                    onClick={() => router.push(`/feed/${feed._id}`)}
                    className="flex flex-wrap gap-x-1 items-center"
                  >
                    <p className="text-gray-700 font-semibold">
                      {feed?.smartsiteId?.name ||
                        feed?.smartsiteUserName ||
                        "Anonymous"}
                    </p>
                    <GoDotFill size={6} />
                    <p className="text-gray-500 font-normal">
                      {dayjs(feed.createdAt).fromNow()}
                    </p>
                  </button>
                </div>
                <p className="text-gray-500 font-normal mb-1">
                  {feed?.smartsiteId?.ens || feed?.smartsiteEnsName || "n/a"}
                </p>
                {/* Redeem Content */}
                {feed.postType === "redeem" && (
                  <button
                    onClick={() => router.push(`/feed/${feed._id}`)}
                    className="flex flex-col gap-2 text-gray-600 text-sm"
                  >
                    <div>
                      <p>
                        Created a new {feed.content.redeemName} Redeemable Link
                        -{" "}
                        <a
                          href={feed.content.link}
                          target="_blank"
                          className="text-blue-500 underline"
                        >
                          Claim
                        </a>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Image
                        src={feed.content.tokenImgUrl}
                        alt=""
                        width={300}
                        height={300}
                        quality={100}
                        className="w-24 h-auto border-r border-gray-300 pr-2"
                      />
                      <div className="font-semibold text-sm">
                        <p>{feed.content.network}</p>
                        <p>
                          {feed.content.amount} {feed.content.symbol}
                        </p>
                      </div>
                    </div>
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
                              {Number(feed.content.outputToken.amount).toFixed(
                                2
                              )}{" "}
                              {feed.content.outputToken.symbol}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between mt-2">
                          {/* <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/wallet?inputToken=${feed.content.inputToken.symbol}&outputToken=${feed.content.outputToken.symbol}&amount=${feed.content.inputToken.amount}`
                              );
                            }}
                            className="text-xs border border-gray-300 rounded px-3 py-0.5 font-medium hover:bg-gray-200"
                          >
                            Copy Trade
                          </button> */}
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
                {/* Post Content */}
                {(feed.postType === "post" || feed.postType === "repost") &&
                  feed.content.title && (
                    <button onClick={() => router.push(`/feed/${feed._id}`)}>
                      {feed.content.title
                        .split("\n")
                        .map((line: any, index: number) => (
                          <p
                            className="break-text text-start text-sm"
                            key={index}
                          >
                            {line}
                          </p>
                        ))}
                    </button>
                  )}
                {feed.postType === "repost" && feed.repostedPostDetails ? (
                  <SmartsiteLivePreviewRepostContent feed={feed} />
                ) : (
                  // <p>feed repost details</p>
                  feed.postType === "repost" &&
                  !feed.repostedPostDetails && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-blue-800 text-sm mt-1">
                      <div className="flex items-start">
                        <svg
                          className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div>
                          <p className="font-medium">Content Removed</p>
                          <p className="mt-1 text-blue-700">
                            The original poster has deleted this content
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
                {/* Additional Post Types */}
                {feed.postType === "connection" && (
                  <button
                    onClick={() => router.push(`/feed/${feed._id}`)}
                    className="text-gray-600 text-sm"
                  >
                    Connected with{" "}
                    <span className="text-gray-700 font-medium text-base">
                      {feed.content.connectedSmartsiteName}
                    </span>
                  </button>
                )}
                {feed.postType === "ensClaim" && (
                  <button
                    onClick={() => router.push(`/feed/${feed._id}`)}
                    className="text-gray-600 text-sm"
                  >
                    Claim a new ENS{" "}
                    <span className="text-gray-700 font-medium text-base">
                      {feed.content.claimEnsName}
                    </span>
                  </button>
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
                    isOpen={openPopoverId === feed._id}
                    onOpenChange={(open) =>
                      setOpenPopoverId(open ? feed._id : null)
                    }
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
                          onDeleteSuccess={() => {
                            setFeedData((prev) =>
                              prev.filter((item) => item._id !== feed._id)
                            );
                            setOpenPopoverId(null); // Close popover after delete
                          }}
                          // onOpen={() => setOpenPopoverId(null)}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            <div>
              {/* Post Media */}
              {feed.postType === "post" &&
                feed.content.post_content.length > 0 && (
                  <SmartsiteLivePreviewFeedMedia
                    mediaFiles={feed.content.post_content}
                  />
                )}
              {feed.postType === "minting" && (
                <div className="w-max">
                  <p>{feed.content.title}</p>
                  <div className="shadow-medium bg-white rounded-lg mt-2 p-2 relative">
                    <Link href={feed?.content?.link || ""} className="w-max">
                      <Image
                        src={feed.content.image}
                        alt="nft image"
                        width={200}
                        height={200}
                      />
                      {feed?.content?.price && (
                        <p className="text-center text-sm text-gray-500 font-medium">
                          {feed.content.price}
                        </p>
                      )}
                      <FiPlusCircle
                        className="absolute top-2 right-2"
                        size={24}
                      />
                    </Link>
                  </div>
                </div>
              )}
            </div>
            {/* <Reaction
              postId={feed._id}
              isLiked={feed.isLiked}
              likeCount={feed.likeCount}
              commentCount={feed.commentCount}
              repostCount={feed.repostCount}
              viewsCount={feed.viewsCount}
              setIsPosting={setIsPosting}
              // accessToken={accessToken}
            /> */}
          </div>
        </div>
      ))}
      {hasMore && (
        <div ref={observerRef} className="loading-spinner">
          <FeedLoading />
        </div>
      )}
    </div>
  );
};

export default LivePreviewTimeline;
