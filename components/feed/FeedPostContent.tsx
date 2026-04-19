"use client";
import React, { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiPlusCircle } from "react-icons/fi";
import { useDisclosure } from "@nextui-org/react";
import PostTypeMedia from "./view/PostTypeMedia";
import IndividualFeedContent from "./IndividualFeedContent";
import SwapTransactionCard from "./SwapTransactionCard";
import PollCard from "./PollCard";
import RenderTransactionContent from "./view/feed-variants/RenderTransactions";
import RedeemClaimModal from "../modal/RedeemClaim";
import { makeLinksClickable } from "@/lib/makeLinksClickable";
import logger from "@/utils/logger";

interface FeedItemType {
  _id: string;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  [key: string]: any;
}

interface FeedPostContentProps {
  feed: any;
  userId: string;
  accessToken: string;
  onPostInteraction?: (postId: string, updates: Partial<FeedItemType>) => void;
}

const FeedPostContent = ({
  feed,
  userId,
  accessToken,
  onPostInteraction,
}: FeedPostContentProps) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [redeemFeedData, setRedeemFeedData] = useState({});

  const handleRedeemClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpen();
      setIsModalOpen(true);
      setRedeemFeedData(feed.content);
    },
    [feed.content, onOpen],
  );

  logger.info("feed from content", feed);

  return (
    <>
      {/* Post / Repost title */}
      {(feed.postType === "post" || feed.postType === "repost") &&
        (feed.content.title || feed?.content?.quote?.title) && (
          <div className="w-full text-start">
            {(feed.content.title || feed?.content?.quote?.title)
              .split("\n")
              .map((line: string, index: number) => (
                <p className="break-text" key={index}>
                  {makeLinksClickable(line)}
                </p>
              ))}
          </div>
        )}

      {/* Post media */}
      {feed.postType === "post" &&
        feed.content.post_content &&
        feed.content.post_content.length > 0 && (
          <PostTypeMedia mediaFiles={feed.content.post_content} />
        )}

      {/* Swap transaction */}
      {feed.postType === "swapTransaction" && (
        <SwapTransactionCard feed={feed} />
      )}

      {/* Repost — with content */}
      {feed.postType === "repost" && feed.repostedPostDetails ? (
        <IndividualFeedContent
          feed={feed}
          userId={userId}
          token={accessToken}
          onVoteSuccess={(updated) => {
            onPostInteraction?.(feed._id, updated);
          }}
        />
      ) : (
        /* Repost — original deleted */
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

      {/* Minting */}
      {feed.postType === "minting" && (
        <div className="w-max">
          <p>{feed.content.title}</p>
          <div className="shadow-medium bg-white rounded-lg mt-2 p-2 relative">
            <Link
              onClick={(e) => e.stopPropagation()}
              href={feed?.content?.link || ""}
              className="w-max"
            >
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
              <FiPlusCircle className="absolute top-2 right-2" size={24} />
            </Link>
          </div>
        </div>
      )}

      {/* Redeem */}
      {feed.postType === "redeem" && (
        <div className="flex flex-col gap-2 text-gray-600 text-sm">
          <p>
            Created a new {feed.content.redeemName} Redeemable Link –{" "}
            <button
              onClick={handleRedeemClick}
              className="text-blue-500 underline"
            >
              Claim
            </button>
          </p>
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
        </div>
      )}

      {/* Connection */}
      {feed.postType === "connection" && (
        <p className="text-gray-600 text-sm">
          Connected with{" "}
          <span className="text-gray-700 font-medium text-base">
            {feed.content.connectedSmartsiteName}
          </span>
        </p>
      )}

      {/* ENS Claim */}
      {feed.postType === "ensClaim" && (
        <p className="text-gray-600 text-sm">
          Claim a new ENS{" "}
          <span className="text-gray-700 font-medium text-base">
            {feed.content.claimEnsName}
          </span>
        </p>
      )}

      {/* Poll */}
      {feed.postType === "poll" && (
        <PollCard
          poll={feed}
          userId={userId}
          token={accessToken}
          onVoteSuccess={(updated) => {
            onPostInteraction?.(feed._id, updated);
          }}
        />
      )}

      {/* Transaction */}
      {feed.postType === "transaction" && (
        <RenderTransactionContent feed={feed} />
      )}

      {/* Redeem modal */}
      {isModalOpen && (
        <RedeemClaimModal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          redeemFeedData={redeemFeedData}
        />
      )}
    </>
  );
};

export default FeedPostContent;
