"use client";

import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Image from "next/image";
import isUrl from "@/lib/isUrl";
import { GoDotFill } from "react-icons/go";
import PostTypeMedia from "./view/PostTypeMedia";
import Link from "next/link";
import { FiPlusCircle } from "react-icons/fi";
import Reaction from "./view/Reaction";
import IndividualFeedContentForFeedDetails from "./IndividualFeedContentForFeedDetails";
import { useRouter } from "next/navigation";
import { formatEns } from "@/lib/formatEnsName";

dayjs.extend(relativeTime);

const FeedDetails = ({ feedData, feedDetails, accessToken }: any) => {
  const router = useRouter();
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
          {currency}.
        </p>
      );
    }
  };

  return (
    <div className="w-full flex gap-10 pt-6">
      <div className="w-full flex flex-col gap-4">
        <div className="flex gap-2  pb-4">
          <div className="w-10 xl:w-12 h-10 xl:h-12 bg-gray-400 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
            {(() => {
              const profilePic =
                feedData?.smartsiteId?.profilePic ||
                feedData?.smartsiteProfilePic;
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
          <div className="flex-1">
            {/* User and Feed Info */}
            <div className="flex items-start justify-between">
              <div className="w-full">
                <div className="flex items-center gap-1">
                  <p className="text-gray-700 font-semibold">
                    {feedData?.smartsiteId?.name ||
                      feedData?.smartsiteUserName ||
                      "Anonymous"}
                  </p>
                  <GoDotFill size={10} />
                  <p className="text-gray-500 font-normal">
                    {dayjs(feedData.createdAt).fromNow()}
                  </p>
                </div>
                <p className="text-gray-500 font-normal">
                  {formatEns(
                    feedData?.smartsiteId?.ens || feedData?.smartsiteEnsName
                  )}
                </p>
                {/* Render Post Content */}
                {(feedData.postType === "post" ||
                  feedData.postType === "repost") &&
                  feedData.content.title && (
                    <div>
                      {feedData.content.title
                        .split("\n")
                        .map((line: string, index: number) => (
                          <p className="break-text" key={index}>
                            {line}
                          </p>
                        ))}
                    </div>
                  )}

                {feedData.postType === "repost" &&
                feedDetails.repostedPostDetails ? (
                  <IndividualFeedContentForFeedDetails feed={feedDetails} />
                ) : (
                  feedData.postType === "repost" &&
                  !feedDetails.repostedPostDetails && (
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
                {/* Render Redeem Content */}
                {feedData.postType === "redeem" && (
                  <div className="flex flex-col gap-2 text-gray-600 text-sm">
                    <div>
                      <p>
                        Created a new {feedData.content.redeemName} Redeemable
                        Link -{" "}
                        <button
                          // onClick={() => openRedeemModal(feedData.content)}
                          className="text-blue-500 underline"
                        >
                          Claim
                        </button>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Image
                        src={feedData.content.tokenImgUrl}
                        alt=""
                        width={300}
                        height={300}
                        quality={100}
                        className="w-24 h-auto border-r border-gray-300 pr-2"
                      />
                      <div className="font-semibold text-sm">
                        <p>{feedData.content.network}</p>
                        <p>
                          {feedData.content.amount} {feedData.content.symbol}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {feedData.postType === "connection" && (
                  <p className="text-gray-600 text-sm">
                    Connected with{" "}
                    <span className="text-gray-700 font-medium text-base">
                      {feedData.content.connectedSmartsiteName}
                    </span>
                  </p>
                )}
                {feedData.postType === "ensClaim" && (
                  <p className="text-gray-600 text-sm">
                    Claim a new ENS{" "}
                    <span className="text-gray-700 font-medium text-base">
                      {feedData.content.claimEnsName}
                    </span>
                  </p>
                )}
                {feedData.postType === "transaction" &&
                  renderTransactionContent(feedData)}

                {feedData.postType === "swapTransaction" && (
                  <div className="w-full flex justify-start mt-1">
                    <button
                      onClick={() => router.push(`/feed/${feedData._id}`)}
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
                            <div className="relative flex items-center !z-0">
                              <Image
                                src={
                                  feedData.content.inputToken.tokenImg.startsWith(
                                    "https"
                                  )
                                    ? feedData.content.inputToken.tokenImg
                                    : `/assets/crypto-icons/${feedData.content.inputToken.symbol}.png`
                                }
                                alt={feedData.content.inputToken.symbol}
                                width={120}
                                height={120}
                                className="w-10 h-10 rounded-full border-2 border-white shadow-sm z-10"
                              />
                              <Image
                                src={
                                  feedData.content.outputToken.tokenImg.startsWith(
                                    "https"
                                  )
                                    ? feedData.content.outputToken.tokenImg
                                    : `/assets/crypto-icons/${feedData.content.outputToken.symbol}.png`
                                }
                                alt={feedData.content.outputToken.symbol}
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
                              {dayjs(feedData.createdAt).format(
                                "MMM D, YYYY h:mm A"
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <p className="text-sm text-gray-600">You sent</p>
                            <p className="text-base font-semibold text-red-600">
                              {Number(
                                feedData.content.inputToken.amount
                              ).toFixed(2)}{" "}
                              {feedData.content.inputToken.symbol}
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
                                feedData.content.outputToken.amount
                              ).toFixed(2)}{" "}
                              {feedData.content.outputToken.symbol}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/wallet?inputToken=${feedData.content.inputToken.symbol}&outputToken=${feedData.content.outputToken.symbol}&amount=${feedData.content.inputToken.amount}`
                              );
                            }}
                            className="text-xs border border-gray-300 rounded px-3 py-1 font-medium hover:bg-gray-200"
                          >
                            Copy Trade
                          </button>
                          {feedData.content.signature && (
                            <div className="flex justify-end">
                              <a
                                onClick={(e) => e.stopPropagation()}
                                href={`https://solscan.io/tx/${feedData.content.signature}`}
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
              </div>
            </div>
            <div>
              {feedData.postType === "post" &&
                feedData.content.post_content.length > 0 && (
                  <PostTypeMedia mediaFiles={feedData.content.post_content} />
                )}

              {feedData.postType === "minting" && (
                <div className="w-max">
                  <p>{feedData.content.title}</p>
                  <div className="shadow-medium bg-white rounded-lg mt-2 p-2 relative">
                    <Link href={feedData.content.link} className="w-max">
                      <Image
                        src={feedData.content.image}
                        alt="nft image"
                        width={200}
                        height={200}
                      />
                      <p className="text-center text-sm text-gray-500 font-medium">
                        {feedData.content.price}
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
              postId={feedData._id}
              isFromFeedDetails={true}
              isLiked={feedData.isLiked}
              likeCount={feedData.likeCount}
              commentCount={feedData.commentCount}
              repostCount={feedData.repostCount}
              viewsCount={feedData.viewsCount}
              // setIsPosting={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedDetails;
