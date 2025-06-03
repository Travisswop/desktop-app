'use client';

import { getUserFeed } from '@/actions/postFeed';
import Image from 'next/image';
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  useMemo,
} from 'react';
import { GoDotFill } from 'react-icons/go';
import dayjs from 'dayjs';
import PostTypeMedia from './view/PostTypeMedia';
import { HiDotsHorizontal } from 'react-icons/hi';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  useDisclosure,
} from '@nextui-org/react';
import relativeTime from 'dayjs/plugin/relativeTime';
import Reaction from './view/Reaction';
import Link from 'next/link';
import { FiPlusCircle } from 'react-icons/fi';
import DeleteFeedModal from './DeleteFeedModal';
import isUrl from '@/lib/isUrl';
import RedeemClaimModal from '../modal/RedeemClaim';
import { useRouter } from 'next/navigation';
import IndividualFeedContent from './IndividualFeedContent';
import { FeedMainContentDataLoading } from '../loading/TabSwitcherLoading';
import FeedLoading from '../loading/FeedLoading';
import logger from '@/utils/logger';
import FeedItem from './FeedItem';

dayjs.extend(relativeTime);

interface FeedProps {
  accessToken: string;
  userId: string;
  setIsPosting: (value: boolean) => void;
  isPosting: boolean;
  setIsPostLoading: (value: boolean) => void;
  isPostLoading: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const Feed = memo(
  ({
    accessToken,
    userId,
    setIsPosting,
    isPosting,
    setIsPostLoading,
  }: FeedProps) => {
    const [feedData, setFeedData] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<HTMLDivElement>(null);
    const isFetching = useRef(false);
    const pageRef = useRef(1);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [redeemFeedData, setRedeemFeedData] = useState({});
    const [initiaLoading, setInitialLoading] = useState(true);

    console.log('accessToken', accessToken);
    logger.log('feedData', feedData);

    // Memoized callbacks to prevent unnecessary re-renders
    const openRedeemModal = useCallback(
      (data: any) => {
        onOpen();
        setIsModalOpen(true);
        setRedeemFeedData(data);
      },
      [onOpen]
    );

    const router = useRouter();

    // Memoized transaction content renderer
    const renderTransactionContent = useCallback((feed: any) => {
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
            Executed a {transaction_type} transaction involving{' '}
            {amount} {currency}.
          </p>
        );
      }
    }, []);

    const fetchFeedData = useCallback(
      async (reset = false) => {
        if (isFetching.current) return;
        isFetching.current = true;

        try {
          const currentPage = reset ? 1 : pageRef.current;
          const url = `${API_URL}/api/v1/feed/user/connect/${userId}?page=${currentPage}&limit=5`;
          const newFeedData = await getUserFeed(url, accessToken);

          if (!newFeedData?.data) {
            setHasMore(false);
            return;
          }

          if (newFeedData.data.length < 5) {
            setHasMore(false);
          }

          if (reset) {
            setFeedData(newFeedData.data);
            pageRef.current = 2; // Reset pagination: next page is 2
            setHasMore(newFeedData.data.length > 0);
          } else {
            if (newFeedData.data.length === 0) {
              setHasMore(false);
            } else {
              setFeedData((prev) => [...prev, ...newFeedData.data]);
              pageRef.current += 1;
            }
          }

          setInitialLoading(false);
        } catch (error) {
          console.error('Error fetching feed data:', error);
          setHasMore(false);
        } finally {
          setIsPostLoading(false);
          isFetching.current = false;
        }
      },
      [accessToken, userId, setIsPostLoading]
    );

    // Initial fetch on mount.
    useEffect(() => {
      fetchFeedData();
    }, [fetchFeedData]);

    // Refetch data when a new post is created.
    useEffect(() => {
      if (isPosting) {
        setIsPostLoading(true);
        pageRef.current = 1;
        setHasMore(true);
        fetchFeedData(true);
        setIsPosting(false);
      }
    }, [isPosting, fetchFeedData, setIsPostLoading, setIsPosting]);

    // Infinite scroll observer to trigger additional data fetches.
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
          {feedData.map((feed) => (
            <FeedItem
              key={feed._id}
              feed={feed}
              userId={userId}
              accessToken={accessToken}
              onRedeemModalOpen={openRedeemModal}
              setIsPosting={setIsPosting}
              renderTransactionContent={renderTransactionContent}
            />
          ))}
          {hasMore && (
            <div ref={observerRef}>
              {initiaLoading ? (
                <FeedMainContentDataLoading />
              ) : (
                <FeedLoading />
              )}
            </div>
          )}
        </div>
        {isModalOpen && (
          <RedeemClaimModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            redeemFeedData={redeemFeedData}
          />
        )}
      </div>
    );
  }
);

Feed.displayName = 'Feed';

export default Feed;
