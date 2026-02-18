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
import SwapTransactionCard from "./SwapTransactionCard";
import { formatEns } from "@/lib/formatEnsName";
import PollCard from "./PollCard";
import { makeLinksClickable } from "@/lib/makeLinksClickable";

const IndividualFeedContent = ({ feed, userId, token, onVoteSuccess }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [redeemFeedData, setRedeemFeedData] = useState({});
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const openRedeemModal = (data: any) => {
    onOpen();
    setIsModalOpen(true);
    setRedeemFeedData(data);
  };

  console.log("feedgg re", feed);

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
          5,
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
          {tokenPrice && <span>(${Number(tokenPrice).toFixed(2)})</span>} tokens
          to{" "}
          <a
            href={`https://${recipientDisplay}`}
            target="_blank"
            className="font-semibold"
          >
            {formatEns(recipientDisplay)}
          </a>{" "}
          on the {chain}.
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
            <div className="flex items-center gap-1">
              <p className="text-gray-700 font-semibold">
                {feed.repostedPostDetails?.smartsiteId?.name ||
                  feed.repostedPostDetails?.smartsiteUserName ||
                  "Anonymous"}
              </p>
              <GoDotFill size={10} />
              <p className="text-gray-500 font-normal">
                {dayjs(feed.repostedPostDetails.createdAt).fromNow()}
              </p>
            </div>
            <p className="text-gray-500 font-normal">
              {formatEns(
                feed.repostedPostDetails?.smartsiteId?.ens ||
                  feed.repostedPostDetails?.smartsiteEnsName ||
                  "n/a",
              )}
            </p>
            {/* Render Post Content */}
            {feed.repostedPostDetails.postType === "post" ||
              (feed.repostedPostDetails.postType === "repost" &&
                feed.repostedPostDetails.content.title && (
                  <div className="w-full text-start">
                    {feed.repostedPostDetails.content.title
                      .split("\n")
                      .map((line: string, index: number) => (
                        <p className="break-text" key={index}>
                          {makeLinksClickable(line)}
                        </p>
                      ))}
                  </div>
                ))}

            {feed.repostedPostDetails.postType === "swapTransaction" && (
              <SwapTransactionCard
                feed={feed.repostedPostDetails}
                showAmountDetails={true}
                showCopyTrade={true}
                showSolscanLink={true}
                onFeedClick={() =>
                  router.push(`/feed/${feed.repostedPostDetails._id}`)
                }
              />
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

            {feed.repostedPostDetails.postType === "poll" && (
              <PollCard
                poll={feed.repostedPostDetails}
                userId={userId}
                token={token}
                onVoteSuccess={onVoteSuccess}
              />
            )}
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
                  href={feed?.repostedPostDetails?.content?.link || "#"}
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
