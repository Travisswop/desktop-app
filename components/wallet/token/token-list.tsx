"use client";
import Cookies from "js-cookie";
import { TokenData } from "@/types/token";
import { AlertCircle } from "lucide-react";
import TokenCardView from "./token-card-view";
import React, { useMemo, useState } from "react";
import TokenListView from "./token-list-view";

type ViewMode = "card" | "list";
interface TokenListProps {
  tokens: TokenData[];
  loading: boolean;
  error: Error | null;
  onSelectToken: (token: TokenData) => void;
}

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-center gap-2">
    <AlertCircle className="w-5 h-5 text-red-500" />
    <p className="text-sm text-red-600">{message}</p>
  </div>
);

// const ViewToggle = ({
//   viewMode,
//   onViewChange,
// }: {
//   viewMode: ViewMode;
//   onViewChange: (mode: ViewMode) => void;
// }) => (
//   <div className="flex bg-gray-100 rounded-md">
//     <ViewToggleButton
//       mode="card"
//       currentMode={viewMode}
//       onClick={() => onViewChange('card')}
//       icon={<LayoutGrid className="h-4 w-4" />}
//     />
//     <ViewToggleButton
//       mode="list"
//       currentMode={viewMode}
//       onClick={() => onViewChange('list')}
//       icon={<List className="h-4 w-4" />}
//     />
//   </div>
// );

// const ViewToggleButton = ({
//   mode,
//   currentMode,
//   onClick,
//   icon,
// }: {
//   mode: ViewMode;
//   currentMode: ViewMode;
//   onClick: () => void;
//   icon: React.ReactNode;
// }) => (
//   <Button
//     size="icon"
//     onClick={onClick}
//     className={`rounded-md w-8 h-8 hover:bg-transparent bg-transparent ${
//       currentMode === mode ? 'text-black' : 'text-gray-300'
//     }`}
//   >
//     {icon}
//   </Button>
// );

const LoadingSkeleton = ({ viewMode }: { viewMode: ViewMode }) => {
  const skeletonItems = Array(4).fill(0);
  const skeletonClass = viewMode === "card" ? "h-[200px]" : "h-[100px]";
  const containerClass =
    viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4";

  return (
    <div className={containerClass}>
      {skeletonItems.map((_, i) => (
        <div
          key={i}
          className={`${skeletonClass} bg-gray-300 animate-pulse rounded-xl`}
        />
      ))}
    </div>
  );
};

const TokenContent = ({
  tokens,
  viewMode = "list",
  onSelectToken,
}: {
  tokens: TokenData[];
  viewMode: ViewMode;
  onSelectToken: (token: TokenData) => void;
}) => {
  // Get hidden token addresses from cookie
  const getHiddenTokenAddresses = () => {
    const cookie = Cookies.get("selected_tokens");
    if (!cookie) return [];
    try {
      return JSON.parse(cookie);
    } catch (e) {
      return [];
    }
  };

  // Filter out tokens that are in the cookie
  const hiddenAddresses = getHiddenTokenAddresses();
  const visibleTokens = tokens.filter(
    (token) => !hiddenAddresses.includes(token.address)
  );

  if (visibleTokens.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No tokens found in your wallet
      </div>
    );
  }

  // Categorize tokens into Cash (USDC) and Crypto (everything else)
  const cashTokens = visibleTokens.filter(
    (token) => token.symbol.toUpperCase() === "USDC"
  );
  const cryptoTokens = visibleTokens.filter(
    (token) => token.symbol.toUpperCase() !== "USDC"
  );

  const containerClass =
    viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4";

  const TokenComponent = viewMode === "card" ? TokenCardView : TokenListView;

  return (
    <div className="space-y-6">
      {/* Cash Section */}
      {cashTokens.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 text-gray-900">Cash</h2>
          <div className={containerClass}>
            {cashTokens.map((token) => (
              <TokenComponent
                key={`${token.chain}-${token.symbol}-${
                  token.address || Math.random()
                }`}
                token={token}
                onClick={() => onSelectToken(token)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Crypto Section */}
      {cryptoTokens.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 text-gray-900">Crypto</h2>
          <div className={containerClass}>
            {cryptoTokens.map((token) => (
              <TokenComponent
                key={`${token.chain}-${token.symbol}-${
                  token.address || Math.random()
                }`}
                token={token}
                onClick={() => onSelectToken(token)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TokenList = ({
  tokens,
  loading,
  error,
  onSelectToken,
}: TokenListProps) => {
  const [viewMode] = useState<ViewMode>("card");

  const content = useMemo(() => {
    if (loading) {
      return <LoadingSkeleton viewMode={viewMode} />;
    }
    return (
      <TokenContent
        tokens={tokens}
        viewMode={"list"}
        onSelectToken={onSelectToken}
      />
    );
  }, [loading, tokens, viewMode, onSelectToken]);

  return (
    <div>
      {error && (
        <ErrorAlert message="Some tokens couldn't be loaded. Please try again later." />
      )}

      {/* {tokens.length > 0 && !loading ? (
          <PortfolioBalance tokens={tokens} />
        ) : loading ? (
          <PortfolioBalanceSkeleton />
        ) : null} */}

      {content}
    </div>
  );
};

export default TokenList;
