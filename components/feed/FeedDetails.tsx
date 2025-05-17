'use client';

import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from 'next/image';
import isUrl from '@/lib/isUrl';
import { GoDotFill } from 'react-icons/go';
import PostTypeMedia from './view/PostTypeMedia';
import Link from 'next/link';
import { FiPlusCircle } from 'react-icons/fi';
import Reaction from './view/Reaction';
import IndividualFeedContentForFeedDetails from './IndividualFeedContentForFeedDetails';

dayjs.extend(relativeTime);

const FeedDetails = ({ feedData, feedDetails, accessToken }: any) => {
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
          Executed a {transaction_type} transaction involving {amount}{' '}
          {currency}.
        </p>
      );
    }
  };

  return (
    <div className="w-full flex gap-10 pt-6">
      <div className="w-full flex flex-col gap-4">
        <div className="flex gap-2 border-b border-gray-200 pb-4">
          <div className="w-10 xl:w-12 h-10 xl:h-12 bg-gray-400 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
            {(() => {
              const profilePic =
                feedData?.smartsiteId?.profilePic ||
                feedData?.smartsiteProfilePic;
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
                <Image
                  alt="user image"
                  src={`/images/user_avator/${profilePic}.png`}
                  width={300}
                  height={300}
                  quality={100}
                  className="rounded-full w-full h-full"
                />
              );
            })()}
          </div>
          <div className="flex-1">
            {/* User and Feed Info */}
            <div className="flex items-start justify-between">
              <div className="w-full">
                <div className="flex items-center gap-1">
                  <p className="text-gray-700 font-semibold">
                    {feedData?.smartsiteId?.name ||
                      feedData?.smartsiteUserName ||
                      'Anonymous'}
                  </p>
                  <GoDotFill size={10} />
                  <p className="text-gray-500 font-normal">
                    {feedData?.smartsiteId?.ens ||
                      feedData?.smartsiteEnsName ||
                      'n/a'}
                  </p>
                  <GoDotFill size={10} />
                  <p className="text-gray-500 font-normal">
                    {dayjs(feedData.createdAt).fromNow()}
                  </p>
                </div>
                {/* Render Post Content */}
                {(feedData.postType === 'post' ||
                  feedData.postType === 'repost') &&
                  feedData.content.title && (
                    <div>
                      {feedData.content.title
                        .split('\n')
                        .map((line: string, index: number) => (
                          <p className="break-text" key={index}>
                            {line}
                          </p>
                        ))}
                    </div>
                  )}

                {feedData.postType === 'repost' &&
                feedDetails.repostedPostDetails ? (
                  <IndividualFeedContentForFeedDetails
                    feed={feedDetails}
                  />
                ) : (
                  feedData.postType === 'repost' &&
                  !feedDetails.repostedPostDetails && (
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
                          <p className="font-medium">
                            Content Removed
                          </p>
                          <p className="mt-1 text-blue-700">
                            The original poster has deleted this
                            content
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
                {/* Render Redeem Content */}
                {feedData.postType === 'redeem' && (
                  <div className="flex flex-col gap-2 text-gray-600 text-sm">
                    <div>
                      <p>
                        Created a new {feedData.content.redeemName}{' '}
                        Redeemable Link -{' '}
                        <button
                          // onClick={() => openRedeemModal(feedData.content)}
                          className="text-blue-500 underline"
                        >
                          Claim
                        </button>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Image
                        src={feedData.content.tokenImgUrl}
                        alt=""
                        width={300}
                        height={300}
                        quality={100}
                        className="w-24 h-auto border-r border-gray-300 pr-2"
                      />
                      <div className="font-semibold text-sm">
                        <p>{feedData.content.network}</p>
                        <p>
                          {feedData.content.amount}{' '}
                          {feedData.content.symbol}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {feedData.postType === 'connection' && (
                  <p className="text-gray-600 text-sm">
                    Connected with{' '}
                    <span className="text-gray-700 font-medium text-base">
                      {feedData.content.connectedSmartsiteName}
                    </span>
                  </p>
                )}
                {feedData.postType === 'ensClaim' && (
                  <p className="text-gray-600 text-sm">
                    Claim a new ENS{' '}
                    <span className="text-gray-700 font-medium text-base">
                      {feedData.content.claimEnsName}
                    </span>
                  </p>
                )}
                {feedData.postType === 'transaction' &&
                  renderTransactionContent(feedData)}
              </div>
              {/* {userId === feed.userId && (
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
                )} */}
            </div>
            <div>
              {feedData.postType === 'post' &&
                feedData.content.post_content.length > 0 && (
                  <PostTypeMedia
                    mediaFiles={feedData.content.post_content}
                  />
                )}

              {feedData.postType === 'minting' && (
                <div className="w-max">
                  <p>{feedData.content.title}</p>
                  <div className="shadow-medium bg-white rounded-lg mt-2 p-2 relative">
                    <Link
                      href={feedData.content.link}
                      className="w-max"
                    >
                      <Image
                        src={feedData.content.image}
                        alt="nft image"
                        width={200}
                        height={200}
                      />
                      <p className="text-center text-sm text-gray-500 font-medium">
                        {feedData.content.price}
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
              postId={feedData._id}
              isFromFeedDetails={true}
              isLiked={feedData.isLiked}
              likeCount={feedData.likeCount}
              commentCount={feedData.commentCount}
              repostCount={feedData.repostCount}
              viewsCount={feedData.viewsCount}
              setIsPosting={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedDetails;
