"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FaRegImage,
  FaRegTimesCircle,
  FaTimesCircle,
  FaUser,
} from "react-icons/fa";
import { HiOutlineGif } from "react-icons/hi2";
import { IoSend } from "react-icons/io5";
import Emoji from "./Emoji";
import { getFeedComments, postComment } from "@/actions/postFeed";
import { MdScheduleSend } from "react-icons/md";
// import Link from "next/link";
import Image from "next/image";
// import { FiPlusCircle } from "react-icons/fi";
import { GoDotFill } from "react-icons/go";
import dayjs from "dayjs";
import {
  Modal,
  ModalBody,
  ModalContent,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useDisclosure,
} from "@nextui-org/react";
import { HiDotsHorizontal } from "react-icons/hi";
// import { RiEdit2Fill } from "react-icons/ri";
import FeedLoading from "../loading/FeedLoading";
import DeleteFeedComment from "./DeleteFeedComment";
import FeedCommentLoading from "../loading/FeedCommentLoading";
import { useUser } from "@/lib/UserContext";
import isUrl from "@/lib/isUrl";
import CommentGifPickerContent from "./comment/GifPicker";
import { useCommentContentStore } from "@/zustandStore/CommentImgContent";
import { Loader } from "lucide-react";
import CommentImagePicker from "./comment/SelectImage";
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";

const CommentContent = ({
  postId,
  accessToken,
  latestCommentCount,
  setLatestCommentCount,
}: any) => {
  const { postContent, setPostContent } = useCommentContentStore(); //manage comment content

  const [postComments, setPostComments] = useState<any>([]);
  const [isNewCommentPost, setIsNewCommentPost] = useState(false);
  const [commentLoading, setCommentLoading] = useState(true);
  const [commentPostContent, setCommentPostContent] = useState("");
  const [smartsiteId, setSmartsiteId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCommentDelete, setIsCommentDelete] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const commentObserverRef = useRef<HTMLDivElement>(null);
  const isCommentFetching = useRef(false);
  const [image, setImage] = useState("");
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const handleOpenImage = (image: string) => {
    setIsLoading(true);
    setImage(image);
    onOpen();
  };

  const { user, loading, error: userError }: any = useUser();

  const MAX_LENGTH = 280;

  const handleCommentChange = (e: any) => {
    const value = e.target.value;

    // Check if the content length exceeds the max length
    if (value.length > MAX_LENGTH) {
      setError(`** Comment cannot exceed ${MAX_LENGTH} characters.`);
    } else {
      setError("");
    }

    setCommentPostContent(value);
  };
  const handleEmojiSelect = (emoji: string) => {
    setCommentPostContent((prevContent) => prevContent + emoji);
  };

  useEffect(() => {
    if (user) {
      setSmartsiteId(user.primaryMicrosite);
    }
  }, [user]);

  // console.log("postComments", postComments);

  const fetchFeedData = useCallback(
    async (reset = false) => {
      if (isCommentFetching.current) return; // Prevent duplicate fetch
      isCommentFetching.current = true;
      // setCommentLoading(true);
      const url = `${
        process.env.NEXT_PUBLIC_API_URL
      }/api/v1/feed/comment/${postId}?page=${reset ? 1 : page}&limit=5`;
      const newFeedData = await getFeedComments(url, accessToken);

      if (reset) {
        // console.log("trigger reset");

        setPostComments(newFeedData.comments); // Reset data when refetching
        setPage(1); // Set page to 2 after initial load for pagination
        setHasMore(newFeedData.comments.length > 0); // Update hasMore based on response
        setCommentLoading(false);
      } else {
        if (newFeedData.comments.length === 0) {
          setHasMore(false); // Stop pagination if no more data
          setCommentLoading(false);
        } else {
          setHasMore(true);
          setPostComments((prev: any) => [...prev, ...newFeedData.comments]);
          setCommentLoading(false);
        }
      }

      isCommentFetching.current = false;
    },
    [accessToken, hasMore, page, postId]
  );

  // Initial fetch and fetch on page increment
  useEffect(() => {
    fetchFeedData();
  }, [page, fetchFeedData]);

  useEffect(() => {
    if (isCommentDelete) {
      console.log("hit delete");

      setPage(1); // Reset page to 1 when a new post is created
      setPostComments([]); // Clear feed data to avoid duplication
      setHasMore(true); // Reset hasMore to enable pagination !need to check
      fetchFeedData(true); // Fetch the first page of new feed data
      setIsCommentDelete(false);
    }
  }, [fetchFeedData, isCommentDelete]);

  useEffect(() => {
    if (isNewCommentPost) {
      console.log("hit post");
      setPage(1); // Reset page to 1 when a new post is created
      setPostComments([]); // Clear feed data to avoid duplication
      setHasMore(true); // Reset hasMore to enable pagination !need to check
      fetchFeedData(true); // Fetch the first page of new feed data
      setIsNewCommentPost(false);
    }
  }, [fetchFeedData, isNewCommentPost]);

  useEffect(() => {
    if (!hasMore || isCommentFetching.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage((prevPage) => prevPage + 1);
      }
    });

    if (commentObserverRef.current) {
      observer.observe(commentObserverRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isCommentFetching.current]);

  const handleCommentPost = async () => {
    setIsLoading(true);
    const contentPayload = {
      postContent: [
        {
          type: postContent[0]?.type || "image",
          src: postContent[0]?.src || "",
        },
      ],
    };
    const payload = {
      postId,
      smartsiteId,
      commentText: commentPostContent,
      commentMedia: contentPayload,
    };
    if (postContent?.length > 0) {
      if (postContent[0].src.startsWith("data:image")) {
        const imageUrl = await sendCloudinaryImage(postContent[0].src);
        contentPayload.postContent[0].src = imageUrl;
      }
    }

    await postComment(payload, accessToken);
    setPostContent([]);
    setLatestCommentCount(latestCommentCount + 1);
    setCommentPostContent("");
    setIsLoading(false);
    setIsNewCommentPost(true);
    // setPage(1); // Reset page to 1 when a new post is created
    // //setFeedData([]); // Clear feed data to avoid duplication
    // setHasMore(true); // Reset hasMore to enable pagination
    // fetchFeedData(true); // Fetch the first page of new feed data
  };

  console.log("ostComments", postComments);

  return (
    <div className="">
      <hr className="my-3" />
      <div className="">
        <textarea
          name="commentText"
          id="commentText"
          rows={2}
          className={`bg-gray-100 rounded-lg p-3  w-full ${
            commentPostContent.length > MAX_LENGTH
              ? "border-red-500 focus:outline-red-500"
              : "border-gray-300 focus:outline-gray-200"
          }`}
          placeholder="Type Comment..."
          value={commentPostContent}
          onChange={handleCommentChange}
          style={{ borderWidth: 1 }}
        ></textarea>
        {error && (
          <p className="text-red-500 text-sm -translate-y-1">{error}</p>
        )}
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
        <div className="flex items-center gap-6 justify-between">
          <div className="flex items-center gap-3">
            {/* <FaRegImage size={22} className={"text-gray-400"} /> */}
            <CommentImagePicker />
            <CommentGifPickerContent />
            <Emoji onEmojiSelect={handleEmojiSelect} />
          </div>
          <button
            onClick={handleCommentPost}
            disabled={
              commentPostContent.length > MAX_LENGTH ||
              (commentPostContent.length === 0 && postContent.length === 0) ||
              isLoading
            }
          >
            {isLoading ? (
              // <MdScheduleSend size={23} className="text-gray-700" />
              <Loader size={20} className="animate-spin text-black" />
            ) : (
              <IoSend
                size={22}
                className={`${
                  commentPostContent.length > MAX_LENGTH ||
                  (commentPostContent.length === 0 && postContent.length === 0)
                    ? "text-gray-400"
                    : "text-gray-700"
                }`}
              />
            )}
          </button>
        </div>
      </div>
      <hr className="my-3" />
      {commentLoading ? (
        <FeedLoading />
      ) : (
        <div className="max-h-96 overflow-y-auto hide-scrollbar flex flex-col gap-4">
          {postComments.map((comment: any) => (
            <div
              key={comment._id}
              className="flex gap-2 border-b border-gray-200 pb-4"
            >
              <div className="w-10 h-10 bg-gray-400 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
                {(() => {
                  const profilePic =
                    comment?.smartsiteId?.profilePic ||
                    comment?.smartsiteProfileImage;

                  if (profilePic) {
                    return isUrl(profilePic) ? (
                      <Image
                        alt="user image"
                        src={profilePic}
                        width={90}
                        height={90}
                        className="rounded-full w-full h-full"
                      />
                    ) : (
                      <Image
                        alt="user image"
                        src={`/images/user_avator/${profilePic}.png`}
                        width={90}
                        height={90}
                        className="rounded-full w-full h-full"
                      />
                    );
                  } else {
                    return <FaUser size={28} color="white" />;
                  }
                })()}
              </div>
              <div className="w-full">
                {/* User and Feed Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-base">
                      <p className="text-gray-700 font-semibold">
                        {comment?.smartsiteId?.name ||
                          comment?.smartsiteName ||
                          "Anonymous"}
                      </p>
                      <GoDotFill size={10} />
                      <p className="text-gray-500 font-normal">
                        {comment?.smartsiteId?.ens ||
                          comment?.smartsiteEns ||
                          "n/a"}
                      </p>
                      <GoDotFill size={10} />
                      <p className="text-gray-500 font-normal">
                        {dayjs(comment.createdAt).fromNow()}
                      </p>
                    </div>
                    {/* Post Content */}
                    {comment.commentText && (
                      <div className="text-sm">
                        {comment.commentText
                          .split("\n")
                          .map((line: any, index: number) => (
                            <p className="break-text" key={index}>
                              {line}
                            </p>
                          ))}
                      </div>
                    )}
                    {comment.commentMedia.postContent.length > 0 && (
                      <button
                        onClick={() =>
                          handleOpenImage(
                            comment.commentMedia.postContent[0].src
                          )
                        }
                      >
                        <Image
                          src={comment.commentMedia.postContent[0].src}
                          alt="image"
                          width={500}
                          height={500}
                          className="w-32 h-auto rounded-lg mt-0.5"
                        />
                      </button>
                    )}
                  </div>
                  {comment.smartsiteId._id === smartsiteId && (
                    <div>
                      <Popover
                        backdrop="opaque"
                        placement="bottom-end"
                        showArrow={true}
                        style={{ zIndex: 10 }}
                        // shouldBlockScroll={true}
                        // shouldUpdatePosition={false}
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
                            <DeleteFeedComment
                              commentId={comment._id}
                              accessToken={accessToken}
                              setIsCommentDelete={setIsCommentDelete}
                              latestCommentCount={latestCommentCount}
                              setLatestCommentCount={setLatestCommentCount}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
                {/* <Reaction
                postId={feed._id}
                likeCount={feed.likeCount}
                commentCount={feed.commentCount}
                repostCount={feed.repostCount}
                viewsCount={feed.viewsCount}
                accessToken={accessToken}
              /> */}
              </div>
            </div>
          ))}
          {hasMore && (
            <div ref={commentObserverRef} className="mt-2">
              <FeedCommentLoading />
            </div>
          )}
        </div>
      )}
      <Modal size="full" isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <ModalBody>
              <div className="relative w-[90vw] h-[90vh] mx-auto my-auto">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                    <span>Loading...</span>
                  </div>
                )}
                <Image
                  src={image}
                  alt="feed image"
                  fill
                  // placeholder="blur"
                  // blurDataURL="/images/image_placeholder.png"
                  className="object-contain"
                  // sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  onLoadingComplete={() => setIsLoading(false)}
                />
              </div>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default CommentContent;
