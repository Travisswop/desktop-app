'use client';

import { getSmartsiteFeed } from '@/actions/postFeed';
import Image from 'next/image';
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { FaUser } from 'react-icons/fa';
import { GoDotFill } from 'react-icons/go';
import dayjs from 'dayjs';
import { HiDotsHorizontal } from 'react-icons/hi';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@nextui-org/react';
import relativeTime from 'dayjs/plugin/relativeTime';
import Reaction from './view/Reaction';
import FeedLoading from '../loading/FeedLoading';
import DeleteFeedModal from './DeleteFeedModal';
import SwapTransactionCard from './SwapTransactionCard';
import isUrl from '@/lib/isUrl';
import { useUser } from '@/lib/UserContext';
import { useRouter } from 'next/navigation';

dayjs.extend(relativeTime);

const Transaction = ({
  accessToken,
  userId,
  setIsPosting,
  isPosting,
  setIsPostLoading,
}: {
  accessToken: string;
  userId: string;
  setIsPosting: (value: boolean) => void;
  isPosting: boolean;
  setIsPostLoading: (value: boolean) => void;
}) => {
  const [feedData, setFeedData] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false);
  const pageRef = useRef(1);
  const [smartsiteId, setSmartsiteId] = useState('');

  const { user } = useUser();

  console.log('feedData', feedData);

  useEffect(() => {
    if (user?.primaryMicrosite) {
      setSmartsiteId(user.primaryMicrosite);
    }
  }, [user]);

  const router = useRouter();

  const fetchFeedData = useCallback(
    async (reset = false) => {
      if (isFetching.current || !smartsiteId) return;
      isFetching.current = true;
      try {
        const currentPage = reset ? 1 : pageRef.current;
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/transaction/${smartsiteId}?page=${currentPage}&limit=5`;
        const newFeedData = await getSmartsiteFeed(url, accessToken);
        console.log('newFeedData', newFeedData);

        if (newFeedData?.data) {
          if (reset) {
            setFeedData(newFeedData.data);
            pageRef.current = 2; // Next page is 2 after reset
            setHasMore(newFeedData.data.length === 5);
          } else {
            setFeedData((prev) => [...prev, ...newFeedData.data]);
            setHasMore(newFeedData.data.length === 5);
            pageRef.current += 1;
          }
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error fetching feed data: ', error);
      } finally {
        setIsPostLoading(false);
        isFetching.current = false;
      }
    },
    [accessToken, smartsiteId, setIsPostLoading]
  );

  // Initial fetch once smartsiteId is available.
  useEffect(() => {
    if (smartsiteId) {
      fetchFeedData();
    }
  }, [smartsiteId, fetchFeedData]);

  // Refetch when a new post is created.
  useEffect(() => {
    if (isPosting) {
      setIsPostLoading(true);
      pageRef.current = 1; // Reset page ref
      setHasMore(true);
      fetchFeedData(true);
      setIsPosting(false);
    }
  }, [isPosting, fetchFeedData, setIsPosting, setIsPostLoading]);

  // Infinite scroll observer to trigger further fetches.
  useEffect(() => {
    if (!hasMore) return;

    const observerCallback = (
      entries: IntersectionObserverEntry[]
    ) => {
      if (entries[0].isIntersecting && !isFetching.current) {
        fetchFeedData();
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '0px',
      threshold: 1.0,
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer.disconnect();
  }, [hasMore, fetchFeedData]);

  // Helper function for rendering transaction content
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
    } = feed.content;

    // Use receiver ENS if available; otherwise, show a truncated wallet address.
    const recipientDisplay = receiver_ens
      ? receiver_ens
      : receiver_wallet_address &&
        `${receiver_wallet_address.slice(
          0,
          5
        )}...${receiver_wallet_address.slice(-5)}`;

    if (transaction_type === 'nft') {
      return (
        <div>
          <p className="text-gray-600 text-sm">
            Sent NFT{' '}
            <span className="font-medium text-base">
              {feed.content.name || 'item'}
            </span>{' '}
            to{' '}
            <span className="font-medium text-base">
              {recipientDisplay}
            </span>
            .
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
                {amount} {feed.content.currency || 'NFT'}
              </p>
            </div>
          )}
        </div>
      );
    } else if (transaction_type === 'token') {
      return (
        <p className="text-gray-600 text-sm">
          Transferred{' '}
          <span className="font-medium">
            {amount.toFixed(2)} {token}
          </span>{' '}
          {tokenPrice && (
            <span className="text-sm text-gray-600 font-medium mt-0.5">
              (${Number(tokenPrice).toFixed(2)})
            </span>
          )}{' '}
          tokens to{' '}
          <span className="font-medium">{recipientDisplay}</span> on
          the {chain}.
        </p>
      );
    } else {
      return (
        <p className="text-gray-600 text-sm">
          Executed a {transaction_type} transaction involving {amount}{' '}
          {feed.content.currency}.
        </p>
      );
    }
  };

  return (
    <div className="w-full flex gap-10">
      <div className="w-full flex flex-col gap-4">
        {feedData.map((feed) => (
          <div
            key={feed._id}
            className="flex gap-2 border-b border-gray-200 pb-4"
          >
            <div className="w-10 xl:w-12 h-10 xl:h-12 bg-gray-400 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
              {(() => {
                const profilePic =
                  feed?.smartsiteId?.profilePic ||
                  feed?.smartsiteProfilePic;
                return profilePic && isUrl(profilePic) ? (
                  <Image
                    alt="user"
                    src={profilePic}
                    width={300}
                    height={300}
                    quality={100}
                    className="rounded-full w-full h-full"
                  />
                ) : (
                  <FaUser size={28} color="white" />
                );
              })()}
            </div>
            <div className="flex-1">
              {/* User and Feed Information */}
              <div className="flex items-start justify-between">
                <div className="w-full">
                  <div className="flex items-center gap-1">
                    <p className="text-gray-700 font-semibold">
                      {feed?.smartsiteId?.name ||
                        feed?.smartsiteUserName ||
                        'Anonymous'}
                    </p>
                    <GoDotFill size={10} />
                    <p className="text-gray-500 font-normal">
                      {feed?.smartsiteId?.ens ||
                        feed?.smartsiteEnsName ||
                        'n/a'}
                    </p>
                    <GoDotFill size={10} />
                    <p className="text-gray-500 font-normal">
                      {dayjs(feed.createdAt).fromNow()}
                    </p>
                  </div>
                  {feed.postType === 'repost' &&
                    feed.content.title && (
                      <button
                        onClick={() =>
                          router.push(`/feed/${feed._id}`)
                        }
                      >
                        {feed.content.title
                          .split('\n')
                          .map((line: any, index: number) => (
                            <p className="break-text" key={index}>
                              {line}
                            </p>
                          ))}
                      </button>
                    )}
                  {feed.postType === 'swapTransaction' && (
                    <SwapTransactionCard
                      feed={feed}
                      onFeedClick={() =>
                        router.push(`/feed/${feed._id}`)
                      }
                    />
                  )}

                  {feed.postType === 'transaction' &&
                    renderTransactionContent(feed)}
                </div>
                {userId === feed.userId && (
                  <div>
                    <Popover
                      backdrop="opaque"
                      placement="bottom-end"
                      showArrow
                      style={{ zIndex: 10 }}
                    >
                      <PopoverTrigger>
                        <button type="button">
                          <HiDotsHorizontal size={20} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <div className="px-1 py-2 flex flex-col">
                          <DeleteFeedModal
                            postId={feed._id}
                            token={accessToken}
                            setIsPosting={setIsPosting}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
              <Reaction
                postId={feed._id}
                isLiked={feed.isLiked}
                likeCount={feed.likeCount}
                commentCount={feed.commentCount}
                repostCount={feed.repostCount}
                viewsCount={feed.viewsCount}
                setIsPosting={() => {}}
                // accessToken={accessToken}
              />
            </div>
          </div>
        ))}
        {hasMore && (
          <div ref={observerRef} className="loading-spinner">
            <FeedLoading />
          </div>
        )}
      </div>
    </div>
  );
};

export default Transaction;
