'use client';
import React, { memo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { GoDotFill } from 'react-icons/go';
import { HiDotsHorizontal } from 'react-icons/hi';
import { FiPlusCircle } from 'react-icons/fi';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@nextui-org/react';
import PostTypeMedia from './view/PostTypeMedia';
import Reaction from './view/Reaction';
import DeleteFeedModal from './DeleteFeedModal';
import IndividualFeedContent from './IndividualFeedContent';
import SwapTransactionCard from './SwapTransactionCard';
import isUrl from '@/lib/isUrl';

interface FeedItemProps {
  feed: any;
  userId: string;
  accessToken: string;
  onRedeemModalOpen: (data: any) => void;
  setIsPosting: (value: boolean) => void;
  renderTransactionContent: (feed: any) => JSX.Element;
}

const FeedItem = memo(
  ({
    feed,
    userId,
    accessToken,
    onRedeemModalOpen,
    setIsPosting,
    renderTransactionContent,
  }: FeedItemProps) => {
    const router = useRouter();

    const handleFeedClick = useCallback(() => {
      router.push(`/feed/${feed._id}`);
    }, [router, feed._id]);

    const handleRedeemClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRedeemModalOpen(feed.content);
      },
      [onRedeemModalOpen, feed.content]
    );

    const profilePic =
      feed?.smartsiteId?.profilePic || feed?.smartsiteProfilePic;
    const userName =
      feed?.smartsiteId?.name ||
      feed?.smartsiteUserName ||
      'Anonymous';
    const ensName =
      feed?.smartsiteId?.ens || feed?.smartsiteEnsName || 'n/a';

    return (
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        <Link
          href={`/sp/${
            feed?.smartsiteId?.ens || feed?.smartsiteEnsName
          }`}
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
              src={`/images/user_avator/${profilePic}.png`}
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
              <Link
                href={`/feed/${feed._id}`}
                className="flex items-center gap-1"
              >
                <p className="text-gray-700 font-semibold">
                  {userName}
                </p>
                <GoDotFill size={10} />
                <p className="text-gray-500 font-normal">{ensName}</p>
                <GoDotFill size={10} />
                <p className="text-gray-500 font-normal">
                  {dayjs(feed.createdAt).fromNow()}
                </p>
              </Link>

              {/* Render Post Content */}
              {(feed.postType === 'post' ||
                feed.postType === 'repost') &&
                feed.content.title && (
                  <button
                    onClick={handleFeedClick}
                    className="w-full text-start"
                  >
                    {feed.content.title
                      .split('\n')
                      .map((line: string, index: number) => (
                        <p className="break-text" key={index}>
                          {line}
                        </p>
                      ))}
                  </button>
                )}

              {/* Swap Transaction Content */}
              {feed.postType === 'swapTransaction' && (
                <SwapTransactionCard
                  feed={feed}
                  onFeedClick={handleFeedClick}
                />
              )}

              {/* Repost Content */}
              {feed.postType === 'repost' &&
              feed.repostedPostDetails ? (
                <IndividualFeedContent feed={feed} />
              ) : (
                feed.postType === 'repost' &&
                !feed.repostedPostDetails && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-blue-800 text-sm mt-1">
                    <div className="flex items-start">
                      <svg
                        className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="font-medium">Content Removed</p>
                        <p className="mt-1 text-blue-700">
                          The original poster has deleted this content
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Redeem Content */}
              {feed.postType === 'redeem' && (
                <div className="flex flex-col gap-2 text-gray-600 text-sm">
                  <div>
                    <p>
                      Created a new {feed.content.redeemName}{' '}
                      Redeemable Link -{' '}
                      <button
                        onClick={handleRedeemClick}
                        className="text-blue-500 underline"
                      >
                        Claim
                      </button>
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
                        {feed.content.amount} {feed.content.symbol}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Connection Content */}
              {feed.postType === 'connection' && (
                <p className="text-gray-600 text-sm">
                  Connected with{' '}
                  <span className="text-gray-700 font-medium text-base">
                    {feed.content.connectedSmartsiteName}
                  </span>
                </p>
              )}

              {/* ENS Claim Content */}
              {feed.postType === 'ensClaim' && (
                <p className="text-gray-600 text-sm">
                  Claim a new ENS{' '}
                  <span className="text-gray-700 font-medium text-base">
                    {feed.content.claimEnsName}
                  </span>
                </p>
              )}

              {/* Transaction Content */}
              {feed.postType === 'transaction' &&
                renderTransactionContent(feed)}
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
                    <button
                      onClick={(e) => e.stopPropagation()}
                      type="button"
                    >
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

          {/* Post Media */}
          <div>
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
                    onClick={(e) => e.stopPropagation()}
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

          {/* Reactions */}
          <Reaction
            postId={feed._id}
            isLiked={feed.isLiked}
            likeCount={feed.likeCount}
            commentCount={feed.commentCount}
            repostCount={feed.repostCount}
            viewsCount={feed.viewsCount}
            setIsPosting={setIsPosting}
          />
        </div>
      </div>
    );
  }
);

FeedItem.displayName = 'FeedItem';

export default FeedItem;
