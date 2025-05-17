'use client';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  FaRegImage,
  FaRegTimesCircle,
  FaTimesCircle,
  FaUser,
} from 'react-icons/fa';
import { HiOutlineGif } from 'react-icons/hi2';
import { IoSend } from 'react-icons/io5';
import Emoji from './Emoji';
import { getFeedComments, postComment } from '@/actions/postFeed';
import { MdScheduleSend } from 'react-icons/md';
import Image from 'next/image';
import { GoDotFill } from 'react-icons/go';
import dayjs from 'dayjs';
import {
  Modal,
  ModalBody,
  ModalContent,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useDisclosure,
} from '@nextui-org/react';
import { HiDotsHorizontal } from 'react-icons/hi';
import FeedLoading from '../loading/FeedLoading';
import DeleteFeedComment from './DeleteFeedComment';
import FeedCommentLoading from '../loading/FeedCommentLoading';
import { useUser } from '@/lib/UserContext';
import isUrl from '@/lib/isUrl';
import CommentGifPickerContent from './comment/GifPicker';
import { useCommentContentStore } from '@/zustandStore/CommentImgContent';
import { Loader } from 'lucide-react';
import CommentImagePicker from './comment/SelectImage';
import { sendCloudinaryImage } from '@/lib/SendCloudinaryImage';
import toast from 'react-hot-toast';

const CommentContent = ({
  postId,
  accessToken,
  latestCommentCount,
  setLatestCommentCount,
}: any) => {
  const { postContent, setPostContent } = useCommentContentStore();
  const [postComments, setPostComments] = useState<any>([]);
  const [isNewCommentPost, setIsNewCommentPost] = useState(false);
  const [commentLoading, setCommentLoading] = useState(true);
  const [commentPostContent, setCommentPostContent] = useState('');
  const [smartsiteId, setSmartsiteId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCommentDelete, setIsCommentDelete] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const commentObserverRef = useRef<HTMLDivElement>(null);
  const isCommentFetching = useRef(false);
  const [image, setImage] = useState('');
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
    if (value.length > MAX_LENGTH) {
      setError(`** Comment cannot exceed ${MAX_LENGTH} characters.`);
    } else {
      setError('');
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

  const fetchFeedData = useCallback(
    async (reset = false) => {
      if (isCommentFetching.current) return;
      isCommentFetching.current = true;
      setCommentLoading(true);

      try {
        const url = `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/v1/feed/comment/${postId}?page=${
          reset ? 1 : page
        }&limit=5`;
        const newFeedData = await getFeedComments(url, accessToken);

        if (reset) {
          setPostComments(newFeedData.comments);
          if (page !== 1) setPage(1);
        } else {
          setPostComments((prev: any) => [
            ...prev,
            ...newFeedData.comments,
          ]);
        }

        setHasMore(newFeedData.comments.length === 5);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setHasMore(false);
      } finally {
        setCommentLoading(false);
        isCommentFetching.current = false;
      }
    },
    [accessToken, postId, page]
  );

  // Initial fetch
  useEffect(() => {
    fetchFeedData(true);
  }, [fetchFeedData]);

  // Handle comment post/delete effects
  useEffect(() => {
    if (isCommentDelete || isNewCommentPost) {
      fetchFeedData(true);
      setIsCommentDelete(false);
      setIsNewCommentPost(false);
    }
  }, [isCommentDelete, isNewCommentPost, fetchFeedData]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isCommentFetching.current &&
          !commentLoading &&
          postComments.length > 0
        ) {
          setPage((prevPage) => prevPage + 1);
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    if (commentObserverRef.current && hasMore) {
      observer.observe(commentObserverRef.current);
    }

    return () => {
      if (commentObserverRef.current) {
        observer.unobserve(commentObserverRef.current);
      }
    };
  }, [hasMore, commentLoading, postComments.length]);

  const handleCommentPost = async () => {
    setIsLoading(true);
    if (
      commentPostContent.length > MAX_LENGTH ||
      (commentPostContent.length === 0 && postContent.length === 0) ||
      isLoading ||
      !accessToken
    ) {
      toast.error('something went wrong!');
    }
    const contentPayload = {
      postContent: [
        {
          type: postContent[0]?.type || 'image',
          src: postContent[0]?.src || '',
        },
      ],
    };
    const payload = {
      postId,
      smartsiteId,
      commentText: commentPostContent,
      commentMedia: contentPayload,
    };

    if (
      postContent?.length > 0 &&
      postContent[0].src.startsWith('data:image')
    ) {
      const imageUrl = await sendCloudinaryImage(postContent[0].src);
      contentPayload.postContent[0].src = imageUrl;
    }

    await postComment(payload, accessToken);
    setPostContent([]);
    setLatestCommentCount(latestCommentCount + 1);
    setCommentPostContent('');
    setIsLoading(false);
    setIsNewCommentPost(true);
  };

  return (
    <div className="">
      <hr className="my-3" />
      <div className="">
        <textarea
          name="commentText"
          id="commentText"
          rows={2}
          className={`bg-gray-100 rounded-lg p-3 w-full ${
            commentPostContent.length > MAX_LENGTH
              ? 'border-red-500 focus:outline-red-500'
              : 'border-gray-300 focus:outline-gray-200'
          }`}
          placeholder="Type Comment..."
          value={commentPostContent}
          onChange={handleCommentChange}
          style={{ borderWidth: 1 }}
        ></textarea>
        {error && (
          <p className="text-red-500 text-sm -translate-y-1">
            {error}
          </p>
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
              <FaRegTimesCircle
                size={16}
                className="hover:scale-105"
              />
            </button>
          </div>
        )}
        <div className="flex items-center gap-6 justify-between">
          <div className="flex items-center gap-3">
            <CommentImagePicker />
            <CommentGifPickerContent />
            <Emoji onEmojiSelect={handleEmojiSelect} />
          </div>
          <button
            onClick={handleCommentPost}
            disabled={
              commentPostContent.length > MAX_LENGTH ||
              (commentPostContent.length === 0 &&
                postContent.length === 0) ||
              isLoading ||
              !accessToken
            }
          >
            {isLoading ? (
              <Loader size={20} className="animate-spin text-black" />
            ) : (
              <IoSend
                size={22}
                className={`${
                  commentPostContent.length > MAX_LENGTH ||
                  (commentPostContent.length === 0 &&
                    postContent.length === 0) ||
                  !accessToken
                    ? 'text-gray-400'
                    : 'text-gray-700'
                }`}
              />
            )}
          </button>
        </div>
      </div>
      <hr className="my-3" />
      {commentLoading && postComments.length === 0 ? (
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
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-base">
                      <p className="text-gray-700 font-semibold">
                        {comment?.smartsiteId?.name ||
                          comment?.smartsiteName ||
                          'Anonymous'}
                      </p>
                      <GoDotFill size={10} />
                      <p className="text-gray-500 font-normal">
                        {comment?.smartsiteId?.ens ||
                          comment?.smartsiteEns ||
                          'n/a'}
                      </p>
                      <GoDotFill size={10} />
                      <p className="text-gray-500 font-normal">
                        {dayjs(comment.createdAt).fromNow()}
                      </p>
                    </div>
                    {comment.commentText && (
                      <div className="text-sm">
                        {comment.commentText
                          .split('\n')
                          .map((line: any, index: number) => (
                            <p className="break-text" key={index}>
                              {line}
                            </p>
                          ))}
                      </div>
                    )}
                    {comment.commentMedia.postContent.length > 0 &&
                      comment.commentMedia.postContent[0].src && (
                        <button
                          onClick={() =>
                            handleOpenImage(
                              comment.commentMedia.postContent[0].src
                            )
                          }
                        >
                          <Image
                            src={
                              comment.commentMedia.postContent[0].src
                            }
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
                      >
                        <PopoverTrigger>
                          <button type="button">
                            <HiDotsHorizontal size={20} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <div className="px-1 py-2 flex flex-col">
                            <DeleteFeedComment
                              commentId={comment._id}
                              accessToken={accessToken}
                              setIsCommentDelete={setIsCommentDelete}
                              latestCommentCount={latestCommentCount}
                              setLatestCommentCount={
                                setLatestCommentCount
                              }
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {commentLoading && postComments.length > 0 && (
            <div className="mt-2">
              <FeedCommentLoading />
            </div>
          )}

          {!hasMore && postComments.length > 0 && (
            <div className="text-center py-4 text-gray-500">
              No more comments available
            </div>
          )}

          {hasMore && !commentLoading && postComments.length > 0 && (
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
                  className="object-contain"
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
