"use client";

import { getUserFeed } from "@/actions/postFeed";
import Image from "next/image";
import React, { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import { useDisclosure } from "@nextui-org/react";
import relativeTime from "dayjs/plugin/relativeTime";
import RedeemClaimModal from "../modal/RedeemClaim";
import { FeedMainComponentLoading } from "../loading/TabSwitcherLoading";
import FeedLoading from "../loading/FeedLoading";
import FeedItem from "./FeedItem";
import { formatEns } from "@/lib/formatEnsName";

dayjs.extend(relativeTime);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Feed({
  accessToken,
  userId,
  initialFeedData,
  setIsPosting,
  isPosting,
  setIsPostLoading,
}) {
  const initialArray = initialFeedData?.data ?? [];
  const totalPages = initialFeedData?.pagination?.totalPages ?? 1;

  const [feedData, setFeedData] = useState(initialArray);
  const [hasMore, setHasMore] = useState(
    initialArray.length > 0 && totalPages > 1,
  );
  const [initialLoading, setInitialLoading] = useState(
    initialArray.length === 0,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [redeemFeedData, setRedeemFeedData] = useState({});

  const observerRef = useRef(null);
  const isFetching = useRef(false);
  const pageRef = useRef(initialArray.length > 0 ? 2 : 1);
  const hasMoreRef = useRef(hasMore);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const fetchFeedData = useCallback(
    async (reset = false) => {
      if (isFetching.current) return;
      if (!reset && !hasMoreRef.current) return;

      isFetching.current = true;
      try {
        const currentPage = reset ? 1 : pageRef.current;
        const url = `${API_URL}/api/v2/feed/user/connect/${userId}?page=${currentPage}&limit=5`;
        const response = await getUserFeed(url, accessToken);
        const data = response?.data ?? [];
        const respTotalPages = response?.pagination?.totalPages ?? 1;

        if (reset) {
          setFeedData(data);
          pageRef.current = 2;
          const more = 2 <= respTotalPages;
          setHasMore(more);
          hasMoreRef.current = more;
          if (isPosting) setIsPosting(false);
        } else {
          if (data.length === 0) {
            setHasMore(false);
            hasMoreRef.current = false;
          } else {
            setFeedData((prev) => [...prev, ...data]);
            pageRef.current += 1;
            const more = pageRef.current <= respTotalPages;
            setHasMore(more);
            hasMoreRef.current = more;
          }
        }
        setInitialLoading(false);
      } catch (error) {
        console.error("Error fetching feed data:", error);
        setHasMore(false);
        hasMoreRef.current = false;
        setInitialLoading(false);
        if (isPosting) setIsPosting(false);
      } finally {
        setIsPostLoading(false);
        isFetching.current = false;
      }
    },
    [accessToken, userId, isPosting, setIsPosting, setIsPostLoading],
  );

  // Fetch on mount only if no initial data
  useEffect(() => {
    if (initialArray.length === 0) fetchFeedData();
  }, []);

  // Refetch on new post / delete
  useEffect(() => {
    if (!isPosting) return;
    isFetching.current = false;
    pageRef.current = 1;
    setHasMore(true);
    hasMoreRef.current = true;
    setIsPostLoading(true);
    fetchFeedData(true);
  }, [isPosting]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || !observerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetching.current && hasMoreRef.current) {
          fetchFeedData();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [feedData, fetchFeedData]);

  const handlePostInteraction = useCallback((postId, updates) => {
    setFeedData((current) =>
      current.map((item) => {
        if (item._id === postId || item.repostedPostDetails?._id === postId) {
          if (item.postType === "repost" && item.repostedPostDetails) {
            return {
              ...item,
              repostedPostDetails: {
                ...item.repostedPostDetails,
                content: { ...item.repostedPostDetails.content, ...updates },
              },
            };
          }
          return { ...item, ...updates };
        }
        return item;
      }),
    );
  }, []);

  const renderTransactionContent = useCallback((feed) => {
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
    const recipientDisplay =
      receiver_ens ??
      (receiver_wallet_address &&
        `${receiver_wallet_address.slice(0, 5)}...${receiver_wallet_address.slice(-5)}`);

    if (transaction_type === "nft") {
      return (
        <div>
          <p className="text-gray-600 text-sm">
            Sent NFT{" "}
            <span className="font-medium text-base">{name || "item"}</span> to{" "}
            <span className="font-medium text-base">{recipientDisplay}</span>.
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
                {amount} {currency || "NFT"}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (transaction_type === "token") {
      return (
        <p className="text-black text-sm">
          Transferred{" "}
          <span className="font-medium">
            {amount.toFixed(2)} {token}
          </span>{" "}
          {tokenPrice && <span>(${Number(tokenPrice).toFixed(2)})</span>} tokens
          to{" "}
          <a
            href={`https://${recipientDisplay}`}
            target="_blank"
            className="font-semibold"
          >
            {formatEns(recipientDisplay)}
          </a>{" "}
          on the {chain}.
        </p>
      );
    }

    return (
      <p className="text-gray-600 text-sm">
        Executed a {transaction_type} transaction involving {amount} {currency}.
      </p>
    );
  }, []);

  return (
    <div className="w-full flex gap-10">
      <div className="w-full flex flex-col gap-4">
        {feedData.map((feed) => (
          <FeedItem
            key={feed._id}
            feed={feed}
            userId={userId}
            accessToken={accessToken}
            onRedeemModalOpen={(data) => {
              onOpen();
              setIsModalOpen(true);
              setRedeemFeedData(data);
            }}
            onRepostSuccess={() => {}}
            onDeleteSuccess={() => setIsPosting(true)}
            renderTransactionContent={renderTransactionContent}
            onPostInteraction={handlePostInteraction}
          />
        ))}

        {hasMore && (
          <div ref={observerRef}>
            {initialLoading ? (
              <div className="w-full sm:w-[520px]">
                <FeedMainComponentLoading />
              </div>
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
