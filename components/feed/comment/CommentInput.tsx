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
import CommentEmoji from "../CommentEmoji";
import { logger } from "ethers5";

interface CommentInputProps {
  postId: string;
  accessToken: string;
  latestCommentCount: number;
  setLatestCommentCount: (count: number | ((prev: number) => number)) => void;
  onCommentSubmitted?: (newTotalCommentCount: number) => void;
  parentCommentId?: string | null;
  placeholder?: string;
}

const MAX_LENGTH = 280;

export default function CommentInput({
  postId,
  accessToken,
  latestCommentCount,
  setLatestCommentCount,
  onCommentSubmitted,
  parentCommentId = null,
  placeholder = "Post your reply...",
}: CommentInputProps) {
  const { postContent, setPostContent, removeContent } =
    useCommentContentStore();
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

    try {
      // Upload all media items (images get uploaded to Cloudinary, GIF urls stay as-is)
      const uploadedMedia = await Promise.all(
        postContent.map(async (item) => ({
          type: item.type,
          src: item.src.startsWith("data:image")
            ? await sendCloudinaryImage(item.src)
            : item.src, // GIFs are already URLs, no upload needed
        })),
      );

      const response = await postComment(
        {
          postId,
          parentCommentId: parentCommentId || null,
          userId: user?._id,
          smartsiteId: user?.primaryMicrosite,
          // smartsiteUserName: "john_doe",
          // smartsiteEnsName: "johndoe.eth",
          // smartsiteProfilePic: "https://example.com/profiles/johndoe.png",
          title: commentText,
          post_content: uploadedMedia,
          // location: "Aftab nagar",
        },
        accessToken,
      );

      console.log("Comment posted successfully:", response);
      toast.success("Comment posted successfully!");

      // Reset state after successful post
      setPostContent([]);
      setCommentText("");
      const newTotal = latestCommentCount + 1;
      logger.info("New total comment count:", newTotal);
      setLatestCommentCount(newTotal);
      onCommentSubmitted?.(newTotal);
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full">
      <textarea
        rows={3}
        className={`bg-gray-100 rounded-lg p-3 w-full resize-none text-sm ${
          commentText.length > MAX_LENGTH
            ? "border-red-500 focus:outline-red-500"
            : "border-gray-300 focus:outline-gray-200"
        }`}
        placeholder={placeholder}
        value={commentText}
        onChange={handleChange}
        style={{ borderWidth: 1 }}
      />
      {error && <p className="text-red-500 text-xs mb-1">{error}</p>}

      {postContent.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {postContent.map((item, index) => (
            <div key={index} className="relative">
              <Image
                src={item.src}
                alt="img/gif"
                width={96}
                height={96}
                className="w-24 h-24 object-cover rounded-lg"
              />
              <button
                onClick={() => removeContent(index)}
                className="absolute -top-1.5 -right-1.5 bg-white rounded-full shadow"
                type="button"
              >
                <FaRegTimesCircle
                  size={16}
                  className="hover:scale-105 text-gray-600"
                />
              </button>
            </div>
          ))}
          {postContent.length < 4 && (
            <p className="text-xs text-gray-400 self-end pb-1">
              {postContent.length}/4 media
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <CommentImagePicker />
          <CommentGifPickerContent />
          <CommentEmoji
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            onEmojiSelect={handleEmojiSelect}
          />
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
