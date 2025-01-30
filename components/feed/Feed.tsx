"use client";

import { getUserFeed } from "@/actions/postFeed";
import Image from "next/image";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaUser } from "react-icons/fa";
import { GoDotFill } from "react-icons/go";
import dayjs from "dayjs";
import PostTypeMedia from "./view/PostTypeMedia";
import { HiDotsHorizontal } from "react-icons/hi";
import { Popover, PopoverContent, PopoverTrigger } from "@nextui-org/react";
import relativeTime from "dayjs/plugin/relativeTime";
import Reaction from "./view/Reaction";
import Link from "next/link";
import { FiPlusCircle } from "react-icons/fi";
import FeedLoading from "../loading/FeedLoading";
import DeleteFeedModal from "./DeleteFeedModal";
import isUrl from "@/lib/isUrl";

const Feed = ({
  accessToken,
  userId,
  setIsPosting,
  isPosting,
  setIsPostLoading,
}: // isPostLoading,
{
  accessToken: string;
  userId: string;
  setIsPosting: any;
  isPosting: boolean;
  setIsPostLoading: any;
  isPostLoading: any;
}) => {
  const [feedData, setFeedData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false);

  console.log("feedData", feedData);

  dayjs.extend(relativeTime);

  const fetchFeedData = useCallback(
    async (reset = false) => {
      if (isFetching.current) return; // Prevent duplicate fetch
      isFetching.current = true;

      const url = `${
        process.env.NEXT_PUBLIC_API_URL
      }/api/v1/feed/user/connect/${userId}?page=${reset ? 1 : page}&limit=5`;
      const newFeedData = await getUserFeed(url, accessToken);

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
        setFeedData(newFeedData.data); // Reset data when refetching
        setPage(2); // Set page to 2 after initial load for pagination
        setHasMore(newFeedData.data.length > 0); // Update hasMore based on response
        setIsPostLoading(false);
      } else {
        if (newFeedData.data.length === 0) {
          setHasMore(false); // Stop pagination if no more data
          setIsPostLoading(false);
        } else {
          setFeedData((prev) => [...prev, ...newFeedData.data]);
          setIsPostLoading(false);
        }
      }

      isFetching.current = false;
    },
    [userId, page, accessToken, setIsPostLoading]
  );

  // Initial fetch and fetch on page increment

  useEffect(() => {
    fetchFeedData();
  }, [page, fetchFeedData]);

  // Refetch data when isPosting becomes true
  useEffect(() => {
    if (isPosting) {
      setPage(1); // Reset page to 1 when a new post is created
      //setFeedData([]); // Clear feed data to avoid duplication
      setHasMore(true); // Reset hasMore to enable pagination
      fetchFeedData(true); // Fetch the first page of new feed data
      setIsPosting(false); // Reset isPosting after fetch
      setIsPostLoading(true);
    }
  }, [isPosting, fetchFeedData, setIsPosting, setIsPostLoading]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetching.current) {
        setPage((prevPage) => prevPage + 1);
      }
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div className="w-full flex gap-10">
      <div className="w-full flex flex-col gap-4">
        {feedData.map((feed) => (
          <div
            key={feed._id}
            className="flex gap-2 border-b border-gray-200 pb-4"
          >
            <div className="w-12 h-12 bg-gray-400 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
              {(() => {
                const profilePic =
                  feed?.smartsiteId?.profilePic || feed?.smartsiteProfilePic;

                if (profilePic) {
                  return isUrl(profilePic) ? (
                    <Image
                      alt="user image"
                      src={profilePic}
                      width={90}
                      height={90}
                      className="rounded-full w-full h-full"
                    />
                  ) : (
                    <Image
                      alt="user image"
                      src={`/images/user_avator/${profilePic}.png`}
                      width={90}
                      height={90}
                      className="rounded-full w-full h-full"
                    />
                  );
                } else {
                  return <FaUser size={28} color="white" />;
                }
              })()}
            </div>
            <div className="w-full">
              {/* User and Feed Info */}
              <div className="flex items-start justify-between">
                <div>
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
                  {/* Post Content */}
                  {feed.postType === "post" && feed.content.title && (
                    <div>
                      {feed.content.title
                        .split("\n")
                        .map((line: any, index: number) => (
                          <p className="break-text" key={index}>
                            {line}
                          </p>
                        ))}
                    </div>
                  )}

                  {/* Additional Post Types */}

                  {/* Redeem Content */}
                  {feed.postType === "redeem" && (
                    <div className="flex flex-col gap-2 text-gray-600 text-sm">
                      <div>
                        <p>
                          Created a new {feed.content.redeemName} Redeemable
                          Link -{" "}
                          <Link
                            href={feed.content.link}
                            className="text-blue-500 underline"
                          >
                            Claim
                          </Link>
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
                          <p>Limit: {feed.content.mintLimit}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {feed.postType === "connection" && (
                    <p className="text-gray-600 text-sm">
                      Connected with{" "}
                      <span className="text-gray-700 font-medium text-base">
                        {feed.content.connectedSmartsiteName}
                      </span>
                    </p>
                  )}
                  {feed.postType === "ensClaim" && (
                    <p className="text-gray-600 text-sm">
                      Claim a new ENS{" "}
                      <span className="text-gray-700 font-medium text-base">
                        {feed.content.claimEnsName}
                      </span>
                    </p>
                  )}
                  {feed.postType === "transaction" && (
                    <div>
                      <p className="text-gray-600 text-sm">
                        {feed.content.transaction_type == "nft"
                          ? `Send ${feed.content.name} nft to `
                          : `Created a new ${feed.content.transaction_type} transaction to `}
                        {feed.content.transaction_type == "nft" &&
                        !feed.content.receiver_ens ? (
                          <span className="text-gray-700 font-medium text-base">{`${feed.content.receiver_wallet_address.slice(
                            0,
                            5
                          )}....${feed.content.receiver_wallet_address.slice(
                            -5
                          )}`}</span>
                        ) : (
                          feed.content.receiver_ens
                        )}
                      </p>
                      {feed.content.transaction_type == "nft" && (
                        <div className="w-52">
                          <Image
                            src={feed.content.image}
                            alt="nft image"
                            width={300}
                            height={300}
                            className="w-full h-auto"
                          />
                          <p className="text-xs text-gray-600 font-medium mt-[1px] text-center">
                            {feed.content.amount} {feed.content.currency}
                          </p>
                        </div>
                      )}
                      {feed.content.transaction_type != "nft" && (
                        <p className="text-sm text-gray-600 font-medium mt-0.5">
                          {feed.content.amount} {feed.content.currency}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {userId === feed.userId && (
                  <div>
                    <Popover
                      backdrop="opaque"
                      placement="bottom-end"
                      showArrow={true}
                      style={{ zIndex: 10 }}
                    >
                      <PopoverTrigger>
                        <button type="button">
                          <HiDotsHorizontal size={20} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <div className="px-1 py-2 flex flex-col">
                          {/* <button className="text-gray-700 flex items-center gap-1 font-medium border-b p-1 text-sm">
                            <RiEdit2Fill color="black" size={18} /> Edit
                          </button> */}
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
              <div>
                {/* Post Media */}
                {feed.postType === "post" &&
                  feed.content.post_content.length > 0 && (
                    <PostTypeMedia mediaFiles={feed.content.post_content} />
                  )}
                {feed.postType === "minting" && (
                  <div className="w-max">
                    <p>{feed.content.title}</p>
                    <div className="shadow-medium bg-white rounded-lg mt-2 p-2 relative">
                      <Link href={feed.content.link} className="w-max">
                        <Image
                          src={feed.content.image}
                          alt="nft image"
                          width={200}
                          height={200}
                        />
                        <p className="text-center text-sm text-gray-500 font-medium">
                          {feed.content.price}
                        </p>
                        <FiPlusCircle
                          className="absolute top-2 right-2"
                          size={24}
                        />
                      </Link>
                    </div>
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
                accessToken={accessToken}
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

export default Feed;
