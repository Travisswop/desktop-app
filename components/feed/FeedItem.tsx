"use client";
import React, { memo, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";
import { GoDotFill } from "react-icons/go";
import { HiDotsHorizontal } from "react-icons/hi";
import { FiPlusCircle } from "react-icons/fi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  useDisclosure,
} from "@nextui-org/react";
import PostTypeMedia from "./view/PostTypeMedia";
import Reaction from "./view/Reaction";
import DeleteFeedModal from "./DeleteFeedModal";
import IndividualFeedContent from "./IndividualFeedContent";
import SwapTransactionCard from "./SwapTransactionCard";
import isUrl from "@/lib/isUrl";
import PollCard from "./PollCard";
import tipImg from "@/public/images/tip.png";
import TipContentModal from "./TipContent";
import { formatEns } from "@/lib/formatEnsName";
import { makeLinksClickable } from "@/lib/makeLinksClickable";
import { useRouter } from "next/navigation";
import RenderTransactionContent from "./view/feed-variants/RenderTransactions";
import RedeemClaimModal from "../modal/RedeemClaim";
import { formatCountReaction } from "@/lib/formatFeedReactionCount";
import FeedPostContent from "./FeedPostContent";
// import FeedDetailsReaction from "./view/FeedDetailsReaction";
// Assuming FeedItemType is (or will be) available globally or can be imported.
// For now, using 'any' as a placeholder if FeedItemType is not directly accessible here.
// Ideally, import FeedItemType from where it's defined (e.g., Feed.tsx or a types file).
interface FeedItemType {
  _id: string;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  [key: string]: any;
}

interface FeedItemProps {
  feed: any;
  userId: string;
  accessToken: string;
  onRepostSuccess: () => void;
  onDeleteSuccess: () => void;
  onPostInteraction?: (postId: string, updates: Partial<FeedItemType>) => void;
  isFromFeedDetailsPage?: boolean;
}

const FeedItem = memo(
  ({
    feed,
    userId,
    accessToken,
    // onRedeemModalOpen,
    onRepostSuccess,
    onDeleteSuccess,
    onPostInteraction,
    isFromFeedDetailsPage = false,
  }: FeedItemProps) => {
    const [isTipModalOpen, setIsTipModalOpen] = useState(false);

    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [redeemFeedData, setRedeemFeedData] = useState({});

    console.log("ffeed indof", feed);

    dayjs.extend(relativeTime);
    dayjs.extend(updateLocale);

    // Update the locale to always use numbers
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

    const handleRedeemClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpen();
        setIsModalOpen(true);
        setRedeemFeedData(feed.content);
      },
      [feed?.content, onOpen], // Added feed.content to dependencies,
    );

    const profilePic =
      feed?.smartsiteId?.profilePic || feed?.smartsiteProfilePic;
    const userName =
      feed?.smartsiteId?.name || feed?.smartsiteUserName || "Anonymous";
    const ensName = feed?.smartsiteId?.ens || feed?.smartsiteEnsName || "n/a";

    // console.log("ensName", ensName);

    const handleTipOpen = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("open tip");
      setIsTipModalOpen(true);
    };

    const router = useRouter();

    return (
      <div className="flex gap-2 border-b border-gray-200 py-4">
        <Link
          href={`/sp/${feed?.smartsiteId?.ens || feed?.smartsiteEnsName}`}
          className="w-10 xl:w-12 h-10 xl:h-12 bg-gray-400 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center"
        >
          {profilePic && isUrl(profilePic) ? (
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
              // src={`/images/user_avator/${profilePic}.png`}
              src={`/images/user_avator/${profilePic}@3x.png`}
              width={300}
              height={300}
              quality={100}
              className="rounded-full w-full h-full"
            />
          )}
        </Link>

        <div className="flex-1">
          {/* User and Feed Info */}
          <div className="w-full flex items-start justify-between">
            <div className="w-full">
              <Link href={`/feed/${feed._id}`}>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1">
                    <p className="text-black font-semibold">{userName}</p>
                    <GoDotFill size={10} />
                    <p className="text-black font-medium">
                      {dayjs(feed.createdAt).fromNow()}
                    </p>
                  </div>
                  {userId !== feed.userId && (
                    <button onClick={(e) => handleTipOpen(e)}>
                      <Image
                        src={tipImg}
                        alt="tip"
                        className="w-5 h-auto"
                        quality={100}
                      />
                    </button>
                  )}
                </div>
                <p className="text-gray-500 font-medium mb-1">
                  {" "}
                  {formatEns(ensName)}
                </p>

                {/* Stop propagation so modal clicks don't trigger the Link */}
                <span onClick={(e) => e.stopPropagation()}>
                  {isTipModalOpen && (
                    <TipContentModal
                      isOpen={isTipModalOpen}
                      onCloseModal={setIsTipModalOpen}
                      feedItem={feed}
                    />
                  )}
                </span>
              </Link>

              <FeedPostContent
                feed={feed}
                userId={userId}
                accessToken={accessToken}
                onPostInteraction={onPostInteraction}
              />
            </div>

            {/* Actions Menu */}
            {userId === feed.userId && (
              <div>
                <Popover
                  backdrop="transparent"
                  placement="bottom-end"
                  showArrow
                  style={{ zIndex: 10 }}
                >
                  <PopoverTrigger>
                    <button onClick={(e) => e.stopPropagation()} type="button">
                      <HiDotsHorizontal size={20} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="px-1 py-2 flex flex-col">
                      <DeleteFeedModal
                        postId={feed._id}
                        token={accessToken}
                        onDeleteSuccess={onDeleteSuccess}
                        userId={userId}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {isFromFeedDetailsPage && (
            <div className="flex items-center gap-2 text-gray-500 text-sm mt-3 border-b pb-2 ">
              <span>{dayjs(feed.createdAt).format("h:mm A")}</span>

              <span>·</span>

              <span>{dayjs(feed.createdAt).format("MMM D, YYYY")}</span>

              <span>·</span>

              <span className="font-medium text-gray-600">
                {formatCountReaction(feed.viewsCount)} Views
              </span>
            </div>
          )}

          <Reaction
            postId={feed._id}
            isLiked={feed.isLiked}
            likeCount={feed.likeCount}
            commentCount={feed.commentCount || feed.replyCount}
            repostCount={feed.repostCount}
            viewsCount={feed.viewsCount}
            onRepostSuccess={onRepostSuccess}
            onPostInteraction={onPostInteraction}
            feed={feed}
            isFromMainFeed={true}
          />
        </div>
      </div>
    );
  },
);

FeedItem.displayName = "FeedItem";

export default FeedItem;
