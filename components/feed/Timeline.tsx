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
import PostTypeMedia from './view/PostTypeMedia';
import { HiDotsHorizontal } from 'react-icons/hi';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@nextui-org/react';
import relativeTime from 'dayjs/plugin/relativeTime';
import Reaction from './view/Reaction';
import Link from 'next/link';
import { FiPlusCircle } from 'react-icons/fi';
import FeedLoading from '../loading/FeedLoading';
import DeleteFeedModal from './DeleteFeedModal';
import isUrl from '@/lib/isUrl';
import { useUser } from '@/lib/UserContext';

dayjs.extend(relativeTime);

const Timeline = ({
  accessToken,
  userId,
  setIsPosting,
  isPosting,
  setIsPostLoading,
  isPostLoading,
}: {
  accessToken: string;
  userId: string;
  setIsPosting: (value: boolean) => void;
  isPosting: boolean;
  setIsPostLoading: (value: boolean) => void;
  isPostLoading: boolean;
}) => {
  const [feedData, setFeedData] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false);
  const pageRef = useRef(1);
  const [smartsiteId, setSmartsiteId] = useState('');

  const { user } = useUser();

  useEffect(() => {
    if (user) {
      setSmartsiteId(user.primaryMicrosite);
    }
  }, [user]);

  /**
   * Helper function to render a transaction post
   */
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
    } = feed.content;

    // Use receiver ENS if available; otherwise, show a truncated wallet address.
    const recipientDisplay = receiver_ens
      ? receiver_ens
      : `${receiver_wallet_address.slice(
          0,
          5
        )}...${receiver_wallet_address.slice(-5)}`;

    if (transaction_type === 'nft') {
      return (
        <div>
          <p className="text-gray-600 text-sm">
            Sent NFT{' '}
            <span className="font-medium text-base">
              {name || 'item'}
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
                {amount} {currency || 'NFT'}
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
          {currency}.
        </p>
      );
    }
  };

  const fetchFeedData = useCallback(
    async (reset = false) => {
      if (isFetching.current || !smartsiteId) return;
      isFetching.current = true;

      const currentPage = reset ? 1 : pageRef.current;
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/smartsite/${smartsiteId}?page=${currentPage}&limit=5`;
      const newFeedData = await getSmartsiteFeed(url, accessToken);

      if (!newFeedData?.data) {
        setHasMore(false);
        setIsPostLoading(false);
        isFetching.current = false;
        return;
      }

      if (newFeedData.data.length < 5) {
        setHasMore(false);
      }

      if (reset) {
        setFeedData(newFeedData.data);
        pageRef.current = 2; // Reset pagination: next page is 2
        setHasMore(newFeedData.data.length > 0);
        setIsPostLoading(false);
      } else {
        if (newFeedData.data.length === 0) {
          setHasMore(false);
          setIsPostLoading(false);
        } else {
          setFeedData((prev) => [...prev, ...newFeedData.data]);
          setIsPostLoading(false);
          pageRef.current += 1;
        }
      }
      isFetching.current = false;
    },
    [accessToken, smartsiteId, setIsPostLoading]
  );

  // Initial fetch once smartsiteId is available.
  useEffect(() => {
    if (smartsiteId) {
      fetchFeedData();
    }
  }, [smartsiteId, fetchFeedData]);

  // Refetch data when isPosting becomes true.
  useEffect(() => {
    if (isPosting) {
      setIsPostLoading(true);
      pageRef.current = 1;
      setHasMore(true);
      fetchFeedData(true);
      setIsPosting(false);
    }
  }, [isPosting, fetchFeedData, setIsPostLoading, setIsPosting]);

  // Infinite scroll observer to load additional data.
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

  return (
    <div className="w-full flex gap-10">
      <div className="w-full flex flex-col gap-4">
        {feedData.map((feed, index) => (
          <div
            key={index}
            className="flex gap-2 border-b border-gray-200 pb-4"
          >
            <div className="w-10 xl:w-12 h-10 xl:h-12 bg-gray-400 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
              {(() => {
                const profilePic =
                  feed?.smartsiteId?.profilePic ||
                  feed?.smartsiteProfilePic;
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
                  <FaUser size={28} color="white" />
                );
              })()}
            </div>
            <div className="flex-1">
              {/* User and Feed Information */}
              <div className="flex items-start justify-between">
                <div>
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
                  {/* Redeem Content */}
                  {feed.postType === 'redeem' && (
                    <div className="flex flex-col gap-2 text-gray-600 text-sm">
                      <div>
                        <p>
                          Created a new {feed.content.redeemName}{' '}
                          Redeemable Link -{' '}
                          <a
                            href={feed.content.link}
                            target="_blank"
                            className="text-blue-500 underline"
                          >
                            Claim
                          </a>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Image
                          src={feed.content.tokenImgUrl}
                          alt=""
                          width={300}
                          height={300}
                          quality={100}
                          className="w-24 h-auto border-r border-gray-300 pr-2"
                        />
                        <div className="font-semibold text-sm">
                          <p>{feed.content.network}</p>
                          <p>
                            {feed.content.amount}{' '}
                            {feed.content.symbol}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Post Content */}
                  {feed.postType === 'post' && feed.content.title && (
                    <div>
                      {feed.content.title
                        .split('\n')
                        .map((line: any, index: number) => (
                          <p className="break-text" key={index}>
                            {line}
                          </p>
                        ))}
                    </div>
                  )}
                  {/* Additional Post Types */}
                  {feed.postType === 'connection' && (
                    <p className="text-gray-600 text-sm">
                      Connected with{' '}
                      <span className="text-gray-700 font-medium text-base">
                        {feed.content.connectedSmartsiteName}
                      </span>
                    </p>
                  )}
                  {feed.postType === 'ensClaim' && (
                    <p className="text-gray-600 text-sm">
                      Claim a new ENS{' '}
                      <span className="text-gray-700 font-medium text-base">
                        {feed.content.claimEnsName}
                      </span>
                    </p>
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
              <div>
                {/* Post Media */}
                {feed.postType === 'post' &&
                  feed.content.post_content.length > 0 && (
                    <PostTypeMedia
                      mediaFiles={feed.content.post_content}
                    />
                  )}
                {feed.postType === 'minting' && (
                  <div className="w-max">
                    <p>{feed.content.title}</p>
                    <div className="shadow-medium bg-white rounded-lg mt-2 p-2 relative">
                      <Link
                        href={feed.content.link}
                        className="w-max"
                      >
                        <Image
                          src={feed.content.image}
                          alt="nft image"
                          width={200}
                          height={200}
                        />
                        <p className="text-center text-sm text-gray-500 font-medium">
                          {feed.content.price}
                        </p>
                        <FiPlusCircle
                          className="absolute top-2 right-2"
                          size={24}
                        />
                      </Link>
                    </div>
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
                accessToken={accessToken}
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

export default Timeline;
