"use client";
import React, { useState } from "react";
import { FaRegTimesCircle } from "react-icons/fa";

import { postComment } from "@/actions/postFeed";
import Image from "next/image";
import { Loader } from "lucide-react";
import { useCommentContentStore } from "@/zustandStore/CommentImgContent";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import { useUser } from "@/lib/UserContext";
import toast from "react-hot-toast";
import CommentImagePicker from "./SelectImage";
import CommentGifPickerContent from "./GifPicker";
import Emoji from "../Emoji";

interface CommentInputProps {
  postId: string;
  accessToken: string;
  latestCommentCount: number;
  setLatestCommentCount: (count: number | ((prev: number) => number)) => void;
  onCommentSubmitted?: (newTotalCommentCount: number) => void;
}

const MAX_LENGTH = 280;

export default function CommentInput({
  postId,
  accessToken,
  latestCommentCount,
  setLatestCommentCount,
  onCommentSubmitted,
}: CommentInputProps) {
  const { postContent, setPostContent } = useCommentContentStore();
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user }: any = useUser();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setError(
      value.length > MAX_LENGTH
        ? `** Comment cannot exceed ${MAX_LENGTH} characters.`
        : "",
    );
    setCommentText(value);
  };

  const handleEmojiSelect = (emoji: string) => {
    setCommentText((prev) => prev + emoji);
  };

  const handleSubmit = async () => {
    const isEmpty = commentText.length === 0 && postContent.length === 0;
    if (
      commentText.length > MAX_LENGTH ||
      isEmpty ||
      isLoading ||
      !accessToken
    ) {
      toast.error("Cannot post empty comment or exceeds character limit.");
      return;
    }

    setIsLoading(true);

    const contentPayload = {
      postContent: [
        {
          type: postContent[0]?.type || "image",
          src: postContent[0]?.src || "",
        },
      ],
    };

    if (
      postContent?.length > 0 &&
      postContent[0].src.startsWith("data:image")
    ) {
      const imageUrl = await sendCloudinaryImage(postContent[0].src);
      contentPayload.postContent[0].src = imageUrl;
    }

    await postComment(
      {
        postId,
        smartsiteId: user?.primaryMicrosite,
        commentText,
        commentMedia: contentPayload,
      },
      accessToken,
    );

    setPostContent([]);
    setCommentText("");
    const newTotal = latestCommentCount + 1;
    setLatestCommentCount(newTotal);
    onCommentSubmitted?.(newTotal);
    setIsLoading(false);
  };

  return (
    <div className="w-full">
      <textarea
        rows={3}
        className={`bg-gray-100 rounded-lg p-3 w-full resize-none text-sm ${
          commentText.length > MAX_LENGTH
            ? "border-red-500 focus:outline-red-500"
            : "border-gray-300 focus:outline-gray-200"
        }`}
        placeholder="Post your reply..."
        value={commentText}
        onChange={handleChange}
        style={{ borderWidth: 1 }}
      />
      {error && <p className="text-red-500 text-xs mb-1">{error}</p>}

      {postContent.length > 0 && (
        <div className="mb-2 relative w-max">
          <Image
            src={postContent[0].src}
            alt="img/gif"
            width={500}
            height={500}
            className="w-32 h-auto rounded-lg"
          />
          <button
            onClick={() => setPostContent([])}
            className="absolute top-0 -right-5"
          >
            <FaRegTimesCircle size={16} className="hover:scale-105" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <CommentImagePicker />
          <CommentGifPickerContent />
          <Emoji onEmojiSelect={handleEmojiSelect} />
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${commentText.length > MAX_LENGTH ? "text-red-500" : "text-gray-400"}`}
          >
            {commentText.length}/{MAX_LENGTH}
          </span>
          <button
            onClick={handleSubmit}
            disabled={
              commentText.length > MAX_LENGTH ||
              (commentText.length === 0 && postContent.length === 0) ||
              isLoading ||
              !accessToken
            }
            className="flex items-center gap-1.5 bg-black text-white text-sm font-semibold px-4 py-1.5 rounded-full disabled:opacity-40 hover:bg-gray-800 transition-colors"
          >
            {isLoading ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              "Reply"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
