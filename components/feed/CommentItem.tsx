"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isUrl from "@/lib/isUrl";
// import Cookies from "js-cookie";
import CommentReaction from "./view/CommentReaction";
import { logger } from "ethers5";
import { formatEns } from "@/lib/formatEnsName";
import { HiDotsHorizontal } from "react-icons/hi";
import DeleteFeedModal from "./DeleteFeedModal";
import { Popover, PopoverContent, PopoverTrigger } from "@nextui-org/react";
import tipImg from "@/public/images/tip.png";
import TipContentModal from "./TipContent";

dayjs.extend(relativeTime);

interface PostContent {
  type: "image" | "gif" | "video";
  src: string;
  _id?: string;
}

export interface Comment {
  _id: string;
  postId: string;
  parentCommentId?: string | null;
  title?: string | null;
  post_content?: PostContent[];
  likeCount: number;
  replyCount: number;
  isLiked?: boolean;
  createdAt: string;
  userId: string;
  smartsiteId?: {
    _id: string;
    name: string;
    profilePic: string;
    ens: string;
  };
  smartsiteUserName?: string;
  smartsiteEnsName?: string;
  smartsiteProfilePic?: string;
}

interface CommentItemProps {
  comment: Comment;
  userId: string;
  postId: string;
  isLast?: boolean; // controls thread line extension
  accessToken: string;
  onDeleteSuccess: () => void;
}

// const REPLIES_LIMIT = 5;

export default function CommentItem({
  comment,
  userId,
  postId,
  isLast = false,
  accessToken,
  onDeleteSuccess,
}: CommentItemProps) {
  // const accessToken = Cookies.get("access-token") || "";

  const [isLiked, setIsLiked] = useState(comment.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(comment.likeCount ?? 0);
  const [replyCount, setReplyCount] = useState(comment.replyCount ?? 0);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);

  const [latestReplyCount, setLatestReplyCount] = useState(replyCount);

  logger.info("Rendering CommentItem for comment:", comment);
  logger.info("Initial likeCount:", likeCount, "isLiked:", isLiked);
  logger.info("Initial replyCount:", replyCount);
  logger.info("Initial latestReplyCount:", latestReplyCount);

  const profilePic =
    comment.smartsiteId?.profilePic || comment.smartsiteProfilePic;
  const userName =
    comment.smartsiteId?.name || comment.smartsiteUserName || "Anonymous";
  const ensName = comment.smartsiteId?.ens || comment.smartsiteEnsName || "";

  const handleTipOpen = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("open tip");
    setIsTipModalOpen(true);
  };

  return (
    <div className="flex gap-3 px-4 border-b py-2">
      {/* ── Left column: avatar + thread line ─────────────────────────────── */}
      <div className="flex flex-col items-center shrink-0 w-10">
        <Link href={ensName ? `/sp/${ensName}` : "#"} className="shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 ring-[1.5px] ring-white">
            {profilePic ? (
              <Image
                src={
                  isUrl(profilePic)
                    ? profilePic
                    : `/images/user_avator/${profilePic}@3x.png`
                }
                alt={userName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-sm font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* ── Right column: all content ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-start justify-between">
          <Link href={`/feed/comment/${comment._id}`} className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-[15px] text-gray-900 ">{userName}</p>
              <span className="text-[14px] text-gray-500">·</span>
              <span className="text-[14px] text-gray-500">
                {dayjs(comment.createdAt).fromNow()}
              </span>
              {userId !== comment.userId && (
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

            {ensName && (
              <span className="text-[14px] text-gray-500">
                {formatEns(ensName)}
              </span>
            )}

            {isTipModalOpen && (
              <TipContentModal
                isOpen={isTipModalOpen}
                onCloseModal={setIsTipModalOpen}
                feedItem={comment}
              />
            )}

            {/* Text body */}
            {comment.title && (
              <p className="text-[15px] text-gray-900 leading-normal mt-0.5 whitespace-pre-wrap break-words">
                {comment.title}
              </p>
            )}
          </Link>

          {userId === comment.userId && (
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
                      postId={comment._id}
                      token={accessToken}
                      onDeleteSuccess={onDeleteSuccess}
                      userId={userId}
                      isFromReply={true}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Media grid — exactly like X */}
        {comment.post_content && comment.post_content.length > 0 && (
          <div
            className={`mt-2 rounded-2xl overflow-hidden grid gap-0.5 ${
              comment.post_content.length === 1
                ? "grid-cols-1"
                : comment.post_content.length === 2
                  ? "grid-cols-2"
                  : comment.post_content.length === 3
                    ? "grid-cols-2"
                    : "grid-cols-2"
            }`}
            style={{ maxHeight: 280 }}
          >
            {comment.post_content.slice(0, 4).map((item, i) => {
              const isFirst3 = comment.post_content!.length === 3 && i === 0;
              return (
                <div
                  key={i}
                  className={`relative overflow-hidden bg-gray-100 ${isFirst3 ? "row-span-2" : ""}`}
                  style={{
                    aspectRatio:
                      comment.post_content!.length === 1 ? "16/9" : "1/1",
                  }}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.src}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={item.src}
                      alt=""
                      fill
                      className="object-cover hover:opacity-90 transition-opacity cursor-pointer"
                      sizes="240px"
                    />
                  )}
                  {i === 3 && comment.post_content!.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        +{comment.post_content!.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <CommentReaction
          commentId={comment._id}
          postId={postId}
          targetType={"reply"}
          likeCount={likeCount}
          replyCount={replyCount}
          repostCount={comment.repostCount ?? 0}
          isLiked={isLiked}
          //myRepostId={comment.myRepostId ?? null} // from your API — the repost feed post _id if user already reposted
          latestReplyCount={latestReplyCount}
          setLatestReplyCount={setLatestReplyCount}
          commentSnapshot={{
            userName,
            ensName,
            profilePic,
            title: comment.title ?? undefined,
            createdAt: comment.createdAt,
          }}
          onLikeUpdate={(_, u) => {
            setIsLiked(u.isLiked);
            setLikeCount(u.likeCount);
          }}
          // onReplySuccess={handleReplySuccess}
          // onRepostSuccess={() => router.refresh()}
        />
      </div>
    </div>
  );
}
