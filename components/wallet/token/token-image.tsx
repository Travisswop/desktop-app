import React, { useState } from 'react';
import Image from 'next/image';
import { TokenData } from '@/types/token';
import NetworkBadge from './network-badge';

interface TokenImageProps {
  token: TokenData;
  width?: number;
  height?: number;
  className?: string;
  showNetworkBadge?: boolean;
}

// Custom TokenImage component with fallback logic
const TokenImage = ({
  token,
  width = 30,
  height = 30,
  className = 'rounded-full',
  showNetworkBadge = true,
}: TokenImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  console.log('🚀 ~ token:', token);

  // Determine the image source with fallback logic
  const getImageSrc = () => {
    if (!imageError && token.logoURI) {
      return token.logoURI;
    }
    if (!fallbackError && token.marketData?.image) {
      return token.marketData?.image;
    }
    return null; // No more fallbacks, will show placeholder
  };

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
    } else if (!fallbackError) {
      setFallbackError(true);
    }
  };

  const imageSrc = getImageSrc();
  const networkBadgeSize = Math.max(12, Math.floor(width * 0.4));

  // If we have a valid image source, render the Image component
  if (imageSrc) {
    return (
      <div className="relative inline-block">
        <Image
          src={imageSrc}
          alt={token.symbol}
          width={width}
          height={height}
          className={className}
          onError={handleImageError}
        />
        {showNetworkBadge && (
          <div className="absolute -bottom-0.5 -right-0.5">
            <NetworkBadge
              chain={token.chain}
              size={networkBadgeSize}
            />
          </div>
        )}
      </div>
    );
  }

  // Fallback placeholder with token symbol
  return (
    <div className="relative inline-block">
      <div
        className={`bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 ${className}`}
        style={{ width: width, height: height }}
      >
        {token.symbol?.slice(0, 2).toUpperCase() || '??'}
      </div>
      {showNetworkBadge && (
        <div className="absolute -bottom-0.5 -right-0.5">
          <NetworkBadge chain={token.chain} size={networkBadgeSize} />
        </div>
      )}
    </div>
  );
};

export default TokenImage;
