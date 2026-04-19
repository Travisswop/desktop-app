"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@nextui-org/react";
import Image from "next/image";
import { IoClose } from "react-icons/io5";
import { Loader } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import toast from "react-hot-toast";

import { postFeed } from "@/actions/postFeed";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import { sendCloudinaryVideo } from "@/lib/sendCloudinaryVideo";
import isUrl from "@/lib/isUrl";
import MediaPreview from "./MediaPreview";
import FeedPostContent from "./FeedPostContent";
import CustomModal from "../modal/CustomModal";

dayjs.extend(relativeTime);

// ─── Types ────────────────────────────────────────────────────────────────────
type MediaFile = { type: "image" | "video" | "gif"; src: string };

interface RepostComposerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  feed: any;
  user: any;
  accessToken: string;
  primarySmartsiteData: any;
  onPostInteraction?: (postId: string, updates: any) => void;
  isFromMainFeed?: boolean;
  onRepostSuccess?: () => void;
}

// ─── Quoted Original Post ─────────────────────────────────────────────────────
const QuotedPost = ({
  feed,
  user,
  accessToken,
  onPostInteraction,
}: {
  feed: any;
  user: any;
  accessToken: string;
  onPostInteraction?: (postId: string, updates: any) => void;
}) => {
  if (!feed) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mt-2 mb-1">
      <div className="flex items-start gap-2 px-3 pt-2.5 pb-2">
        <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden shrink-0">
          {feed.smartsiteDetails?.profilePic && (
            <Image
              src={
                isUrl(feed.smartsiteDetails.profilePic)
                  ? feed.smartsiteDetails.profilePic
                  : `/images/user_avator/${feed.smartsiteDetails.profilePic}@3x.png`
              }
              alt="avatar"
              width={28}
              height={28}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {feed.smartsiteDetails?.name ||
                feed.smartsiteUserName ||
                "Unknown"}
            </span>
            <span className="text-xs text-gray-400">
              · {dayjs(feed.createdAt).fromNow()}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-1">
            @{feed.smartsiteDetails?.ens || feed.smartsiteUserName}
          </p>
          <FeedPostContent
            feed={feed}
            userId={user?._id}
            accessToken={accessToken}
            onPostInteraction={onPostInteraction}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const RepostComposer = ({
  isOpen,
  onOpenChange,
  postId,
  feed,
  user,
  accessToken,
  primarySmartsiteData,
  onPostInteraction,
  isFromMainFeed = false,
  onRepostSuccess,
}: RepostComposerProps) => {
  const MAX_CHARS = 2000;

  const [postContent, setPostContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canPost =
    (postContent.trim().length > 0 || mediaFiles.length > 0) &&
    postContent.length <= MAX_CHARS &&
    !loading;

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [postContent]);

  // ── Reset state when modal opens ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setPostContent("");
      setMediaFiles([]);
      setFileError("");
    }
  }, [isOpen]);

  // ── Show file errors as toasts ────────────────────────────────────────────
  useEffect(() => {
    if (fileError) {
      toast.error(fileError);
      setFileError("");
    }
  }, [fileError]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleClose = () => onOpenChange(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPostContent(e.target.value);
  };

  const handleEmojiSelect = useCallback((emoji: string) => {
    setPostContent((prev) => prev + emoji);
  }, []);

  const handlePost = async () => {
    if (!accessToken) return toast.error("Please login to continue.");
    if (!canPost) return;

    setLoading(true);
    try {
      const uploadedMedia = await Promise.all(
        mediaFiles.map(async (file) => {
          if (file.type === "image") {
            const url = await sendCloudinaryImage(file.src);
            return { type: "image" as const, src: url };
          }
          if (file.type === "video") {
            const url = await sendCloudinaryVideo(file.src);
            return { type: "video" as const, src: url };
          }
          return file;
        }),
      );

      const quote: Record<string, any> = {};
      if (postContent.trim()) quote.title = postContent.trim();
      if (uploadedMedia.length > 0) quote.post_content = uploadedMedia;

      const payload = {
        smartsiteId: user?.primaryMicrosite,
        userId: user?._id,
        postType: "repost",
        content: {
          postId,
          isFromFeed: isFromMainFeed,
          quote,
        },
      };

      const data = await postFeed(payload, accessToken);

      if (data?.state === "success") {
        toast.success("Reposted successfully!");
        handleClose();
        onRepostSuccess?.();
      } else if (data?.state === "not-allowed") {
        toast.error("You are not allowed to create a feed post!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={handleClose}
      width="max-w-[520px]"
      removeCloseButton // we render our own close button below
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
        <button
          onClick={handleClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
        >
          <IoClose size={20} />
        </button>

        <Button
          type="button"
          onPress={handlePost}
          isDisabled={!canPost}
          isLoading={loading}
          spinner={<Loader size={15} className="animate-spin" />}
          className="bg-black text-white text-sm font-bold rounded-full px-5 h-8 min-w-0 disabled:opacity-40"
        >
          {loading ? "" : "Post"}
        </Button>
      </div>

      {/* ── Composer body ── */}
      <div className="flex gap-3 px-4 pt-3 pb-4">
        {/* Current user avatar */}
        <div className="shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            {primarySmartsiteData?.profilePic && (
              <Image
                src={
                  isUrl(primarySmartsiteData.profilePic)
                    ? primarySmartsiteData.profilePic
                    : `/images/user_avator/${primarySmartsiteData.profilePic}@3x.png`
                }
                alt="you"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Username */}
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {primarySmartsiteData?.name || "You"}
          </p>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            className="w-full border-none outline-none resize-none bg-transparent placeholder-gray-400"
            placeholder="Add your thoughts…"
            value={postContent}
            onChange={handleTextChange}
            autoFocus
          />

          {/* Quoted original post */}
          <QuotedPost
            feed={feed}
            user={user}
            accessToken={accessToken}
            onPostInteraction={onPostInteraction}
          />

          <MediaPreview
            mediaFiles={mediaFiles}
            setMediaFiles={setMediaFiles}
            setFileError={setFileError}
            postContent={postContent}
            onEmojiSelect={handleEmojiSelect}
            onOpenPoll={() => {}}
            onOpenMint={() => {}}
          />
        </div>
      </div>
    </CustomModal>
  );
};

export default RepostComposer;
