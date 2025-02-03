"use client";

import { getSmartsiteFeed } from "@/actions/postFeed";
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
import { useUser } from "@/lib/UserContext";

const Transaction = ({
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
  const [smartsiteId, setSmartsiteId] = useState("");

  const { user, loading, error: userError }: any = useUser();

  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     const id = localStorage.getItem("userPrimaryMicrosite");
  //     if (id && /^[a-fA-F0-9]{24}$/.test(id)) {
  //       setSmartsiteId(id);
  //     } else {
  //       console.error("Invalid smartsiteId format:", id);
  //     }
  //   }
  // }, []);

  useEffect(() => {
    if (user) {
      setSmartsiteId(user.primaryMicrosite);
    }
  }, [user]);

  console.log("transactions feedData", feedData);

  dayjs.extend(relativeTime);

  const fetchFeedData = useCallback(
    async (reset = false) => {
      if (isFetching.current) return; // Prevent duplicate fetch
      isFetching.current = true;

      const url = `${
        process.env.NEXT_PUBLIC_API_URL
      }/api/v1/feed/transaction/${smartsiteId}?page=${
        reset ? 1 : page
      }&limit=5`;
      const newFeedData = await getSmartsiteFeed(url, accessToken);

      if (newFeedData.data.length < 5) {
        setHasMore(false);
      }

      if (reset) {
        setFeedData(newFeedData.data); // Reset data when refetching
        setPage(2); // Set page to 2 after initial load for pagination
        setHasMore(newFeedData.data.length > 0); // Update hasMore based on response
        setIsPostLoading(false);
      } else {
        if (newFeedData?.data?.length === 0) {
          setHasMore(false); // Stop pagination if no more data
          setIsPostLoading(false);
        } else {
          setFeedData((prev) => [...prev, ...newFeedData.data]);
          setIsPostLoading(false);
        }
      }

      isFetching.current = false;
    },
    [accessToken, page, setIsPostLoading, smartsiteId]
  );

  // Initial fetch and fetch on page increment

  useEffect(() => {
    if (smartsiteId) {
      fetchFeedData();
    }
  }, [page, fetchFeedData, smartsiteId]);

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
            <div className="w-10 xl:w-12 h-10 xl:h-12 bg-gray-400 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
              {(() => {
                const profilePic =
                  feed?.smartsiteId?.profilePic || feed?.smartsiteProfilePic;

                if (profilePic) {
                  return isUrl(profilePic) ? (
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
                } else {
                  return <FaUser size={28} color="white" />;
                }
              })()}
            </div>
            <div className="flex-1">
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
                          <p className="text-sm text-gray-600 font-medium mt-0.5 text-center">
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

export default Transaction;
