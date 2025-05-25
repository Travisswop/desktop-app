"use client";

import isUrl from "@/lib/isUrl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  useDisclosure,
} from "@nextui-org/react";
import dayjs from "dayjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoDotFill } from "react-icons/go";
import { HiDotsHorizontal } from "react-icons/hi";
import DeleteFeedModal from "./DeleteFeedModal";
import PostTypeMedia from "./view/PostTypeMedia";
import Link from "next/link";
import { FiPlusCircle } from "react-icons/fi";

const IndividualFeedContent = ({ feed }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [redeemFeedData, setRedeemFeedData] = useState({});
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const openRedeemModal = (data: any) => {
    onOpen();
    setIsModalOpen(true);
    setRedeemFeedData(data);
  };

  console.log("feedgg", feed);

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
    } = feed.repostedPostDetails.content;

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
    <div className="flex gap-2 border border-gray-200 p-3 rounded-xl mt-2">
      <div className="w-10 xl:w-12 h-10 xl:h-12 bg-gray-400 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
        {(() => {
          const profilePic =
            feed.repostedPostDetails?.smartsiteId?.profilePic ||
            feed.repostedPostDetails?.smartsiteProfilePic;
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
        <div className="w-full flex items-start justify-between">
          <div className="w-full">
            <button
              onClick={() =>
                router.push(`/feed/${feed.repostedPostDetails._id}`)
              }
              className="flex items-center gap-1"
            >
              <p className="text-gray-700 font-semibold">
                {feed.repostedPostDetails?.smartsiteId?.name ||
                  feed.repostedPostDetails?.smartsiteUserName ||
                  "Anonymous"}
              </p>
              <GoDotFill size={10} />
              <p className="text-gray-500 font-normal">
                {feed.repostedPostDetails?.smartsiteId?.ens ||
                  feed.repostedPostDetails?.smartsiteEnsName ||
                  "n/a"}
              </p>
              <GoDotFill size={10} />
              <p className="text-gray-500 font-normal">
                {dayjs(feed.repostedPostDetails.createdAt).fromNow()}
              </p>
            </button>
            {/* Render Post Content */}
            {feed.repostedPostDetails.postType === "post" &&
              feed.repostedPostDetails.content.title && (
                <button
                  onClick={() => router.push(`/feed/${feed._id}`)}
                  className="w-full text-start"
                >
                  {feed.repostedPostDetails.content.title
                    .split("\n")
                    .map((line: string, index: number) => (
                      <p className="break-text" key={index}>
                        {line}
                      </p>
                    ))}
                </button>
              )}

            {feed.repostedPostDetails.postType === "swapTransaction" && (
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
                              feed.repostedPostDetails.content.inputToken.tokenImg.startsWith(
                                "https"
                              )
                                ? feed.repostedPostDetails.content.inputToken
                                    .tokenImg
                                : `/assets/crypto-icons/${feed.repostedPostDetails.content.inputToken.symbol}.png`
                            }
                            alt={
                              feed.repostedPostDetails.content.inputToken.symbol
                            }
                            width={120}
                            height={120}
                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm z-10"
                          />
                          <Image
                            src={
                              feed.repostedPostDetails.content.outputToken.tokenImg.startsWith(
                                "https"
                              )
                                ? feed.repostedPostDetails.content.outputToken
                                    .tokenImg
                                : `/assets/crypto-icons/${feed.repostedPostDetails.content.outputToken.symbol}.png`
                            }
                            alt={
                              feed.repostedPostDetails.content.outputToken
                                .symbol
                            }
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
                          {dayjs(feed.repostedPostDetails.createdAt).format(
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
                            feed.repostedPostDetails.content.inputToken.amount
                          ).toFixed(2)}{" "}
                          {feed.repostedPostDetails.content.inputToken.symbol}
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
                        <p className="text-sm text-gray-600">You received</p>
                        <p className="text-base font-semibold text-green-600">
                          {Number(
                            feed.repostedPostDetails.content.outputToken.amount
                          ).toFixed(2)}{" "}
                          {feed.repostedPostDetails.content.outputToken.symbol}
                        </p>
                      </div>
                    </div>
                    {feed.repostedPostDetails.content.signature && (
                      <div className="flex justify-end mt-2">
                        <a
                          onClick={(e) => e.stopPropagation()}
                          href={`https://solscan.io/tx/${feed.repostedPostDetails.content.signature}`}
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
                </button>
              </div>
            )}
            {/* Render Redeem Content */}
            {feed.repostedPostDetails.postType === "redeem" && (
              <div className="flex flex-col gap-2 text-gray-600 text-sm">
                <div>
                  <p>
                    Created a new {feed.repostedPostDetails.content.redeemName}{" "}
                    Redeemable Link -{" "}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openRedeemModal(feed.content);
                      }}
                      className="text-blue-500 underline"
                    >
                      Claim
                    </button>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Image
                    src={feed.repostedPostDetails.content.tokenImgUrl}
                    alt=""
                    width={300}
                    height={300}
                    quality={100}
                    className="w-24 h-auto border-r border-gray-300 pr-2"
                  />
                  <div className="font-semibold text-sm">
                    <p>{feed.repostedPostDetails.content.network}</p>
                    <p>
                      {feed.repostedPostDetails.content.amount}{" "}
                      {feed.repostedPostDetails.content.symbol}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {feed.repostedPostDetails.postType === "connection" && (
              <p className="text-gray-600 text-sm">
                Connected with{" "}
                <span className="text-gray-700 font-medium text-base">
                  {feed.repostedPostDetails.content.connectedSmartsiteName}
                </span>
              </p>
            )}
            {feed.repostedPostDetails.postType === "ensClaim" && (
              <p className="text-gray-600 text-sm">
                Claim a new ENS{" "}
                <span className="text-gray-700 font-medium text-base">
                  {feed.repostedPostDetails.content.claimEnsName}
                </span>
              </p>
            )}
            {feed.repostedPostDetails.postType === "transaction" &&
              renderTransactionContent(feed)}
          </div>
        </div>
        <div>
          {feed.repostedPostDetails.postType === "post" &&
            feed.repostedPostDetails.content.post_content.length > 0 && (
              <PostTypeMedia
                mediaFiles={feed.repostedPostDetails.content.post_content}
                isFromRepost={true}
              />
            )}
          {feed.repostedPostDetails.postType === "minting" && (
            <div className="w-max">
              <p>{feed.repostedPostDetails.content.title}</p>
              <div className="shadow-medium bg-white rounded-lg mt-2 p-2 relative">
                <Link
                  onClick={(e) => e.stopPropagation()}
                  href={feed.repostedPostDetails.content.link}
                  className="w-max"
                >
                  <Image
                    src={feed.repostedPostDetails.content.image}
                    alt="nft image"
                    width={200}
                    height={200}
                  />
                  <p className="text-center text-sm text-gray-500 font-medium">
                    {feed.repostedPostDetails.content.price}
                  </p>
                  <FiPlusCircle className="absolute top-2 right-2" size={24} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndividualFeedContent;
