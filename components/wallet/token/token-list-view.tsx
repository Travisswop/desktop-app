"use client";
import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { TokenData } from "@/types/token";
import TokenImage from "./token-image";
import { BsThreeDots } from "react-icons/bs";
import { useWalletHideBalanceStore } from "@/zustandStore/useWalletHideBalanceToggle";

interface TokenCardProps {
  token: TokenData;
  onClick: () => void;
}

export default function TokenListView({ token, onClick }: TokenCardProps) {
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const { value } = useWalletHideBalanceStore();
  // const data = token.sparklineData;

  // const TokenSparkline = () => {
  //   if (!data || data.length === 0) {
  //     return <div className="text-gray-500">No data available</div>;
  //   }
  //   return (
  //     <ResponsiveContainer width="100%" height="100%">
  //       <AreaChart data={data}>
  //         <defs>
  //           <linearGradient
  //             id={`gradient-${token.symbol}`}
  //             x1="0"
  //             y1="0"
  //             x2="0"
  //             y2="1"
  //           >
  //             <stop
  //               offset="0%"
  //               stopColor={token.marketData.color}
  //               stopOpacity={0.2}
  //             />
  //             <stop
  //               offset="100%"
  //               stopColor={token.marketData.color}
  //               stopOpacity={0}
  //             />
  //           </linearGradient>
  //         </defs>
  //         <Area
  //           type="basis"
  //           dataKey="value"
  //           stroke={token.marketData.color}
  //           strokeWidth={2}
  //           fill={`url(#gradient-${token.symbol})`}
  //           dot={false}
  //           isAnimationActive={false}
  //         />
  //       </AreaChart>
  //     </ResponsiveContainer>
  //   );
  // };

  useEffect(() => {
    const savedPreference = Cookies.get("hideBalance");
    setIsBalanceHidden(savedPreference === "true");
    console.log("value tut", value);
  }, [value]);

  return (
    <div
      className="flex items-center justify-between bg-white cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="mt-2">
          <TokenImage token={token} />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{token.name}</h3>
          <p className="text-xs text-gray-600">
            {isBalanceHidden ? (
              <div className="flex items-center gap-0">
                <BsThreeDots size={24} color="gray" />
                <BsThreeDots
                  size={24}
                  color="gray"
                  className="-translate-x-0.5"
                />
              </div>
            ) : (
              `${parseFloat(token.balance).toFixed(4)} ${token.symbol}`
            )}
          </p>
        </div>
      </div>
      {/* <div className="h-[60px] w-full">
        <TokenSparkline />
      </div> */}
      <div className="flex items-center gap-4 text-sm">
        <div className="text-right">
          <p className="font-bold">
            {isBalanceHidden ? (
              <div className="flex items-center gap-0">
                <BsThreeDots size={24} color="gray" />
                <BsThreeDots
                  size={24}
                  color="gray"
                  className="-translate-x-0.5"
                />
              </div>
            ) : (
              <>
                {token.marketData?.price !== undefined &&
                token.marketData?.price !== null ? (
                  `$${
                    typeof token.marketData?.price === "number"
                      ? token.marketData?.price
                      : "0.0000"
                  }`
                ) : (
                  <span className="text-gray-500">Price unavailable</span>
                )}
              </>
            )}
          </p>
          <div
            className={`text-xs ${
              token.marketData?.priceChangePercentage24h &&
              parseFloat(token.marketData?.priceChangePercentage24h) >= 0
                ? " text-green-700"
                : " text-red-700"
            }`}
          >
            {token.marketData?.priceChangePercentage24h ? (
              <>
                {parseFloat(
                  token.marketData?.priceChangePercentage24h || "0"
                ) >= 0
                  ? "+"
                  : ""}
                {parseFloat(token.marketData?.priceChangePercentage24h || "0")}%
              </>
            ) : (
              <div className="text-gray-500">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
