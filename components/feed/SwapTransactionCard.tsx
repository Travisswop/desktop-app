"use client";
import React from "react";
import Image from "next/image";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";

interface SwapTransactionCardProps {
  feed: any;
  onFeedClick?: () => void;
}

const SwapTransactionCard: React.FC<SwapTransactionCardProps> = ({
  feed,
  onFeedClick,
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (onFeedClick) {
      onFeedClick();
    } else {
      router.push(`/feed/${feed._id}`);
    }
  };

  const handleCopyTradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(
      `/wallet?inputToken=${feed.content.inputToken.symbol}&outputToken=${feed.content.outputToken.symbol}&amount=${feed.content.inputToken.amount}`
    );
  };

  return (
    <div className="w-full flex justify-start mt-1">
      <div
        onClick={handleClick}
        className="w-full max-w-xl"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        <div className="flex flex-col gap-3 border rounded-xl p-4 bg-white hover:bg-gray-50 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center z-0">
                <Image
                  src={
                    feed.content.inputToken.tokenImg.startsWith("https")
                      ? feed.content.inputToken.tokenImg
                      : `/assets/crypto-icons/${feed.content.inputToken.symbol}.png`
                  }
                  alt={feed.content.inputToken.symbol}
                  width={120}
                  height={120}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm z-10"
                />
                <Image
                  src={
                    feed.content.outputToken.tokenImg.startsWith("https")
                      ? feed.content.outputToken.tokenImg
                      : `/assets/crypto-icons/${feed.content.outputToken.symbol}.png`
                  }
                  alt={feed.content.outputToken.symbol}
                  width={120}
                  height={120}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm -ml-4 z-20"
                />
              </div>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-sm text-gray-500">Swap Transaction</p>
              <p className="text-xs text-gray-400">
                {dayjs(feed.createdAt).format("MMM D, YYYY h:mm A")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-sm text-gray-600">You sent</p>
              <p className="text-base font-semibold text-red-600">
                {Number(feed.content.inputToken.amount).toFixed(2)}{" "}
                {feed.content.inputToken.symbol}
              </p>
            </div>
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
            <div className="flex flex-col items-end">
              <p className="text-sm text-gray-600">You received</p>
              <p className="text-base font-semibold text-green-600">
                {Number(feed.content.outputToken.amount).toFixed(2)}{" "}
                {feed.content.outputToken.symbol}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <button
              onClick={handleCopyTradeClick}
              className="text-xs border border-gray-300 rounded px-3 py-1 font-medium hover:bg-gray-200"
            >
              Copy Trade
            </button>
            {feed.content.signature && (
              <div className="flex justify-end">
                <a
                  onClick={(e) => e.stopPropagation()}
                  href={`https://solscan.io/tx/${feed.content.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                >
                  View on Solscan
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 7h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2m4-4h4m0 0v4m0-4L10 10"
                    />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapTransactionCard;
