import React, { useState } from "react";
import Image from "next/image";
import { TokenData } from "@/types/token";

interface TokenImageProps {
  token: TokenData;
  width?: number;
  height?: number;
  className?: string;
}

// Custom TokenImage component with fallback logic
const TokenImage = ({
  token,
  width = 30,
  height = 30,
  className = "rounded-full",
}: TokenImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // Determine the image source with fallback logic
  const getImageSrc = () => {
    if (!imageError && token.logoURI) {
      return token.logoURI;
    }
    if (!fallbackError && token.marketData?.iconUrl) {
      return token.marketData?.iconUrl;
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

  // If we have a valid image source, render the Image component
  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt={token.symbol}
        width={width}
        height={height}
        className={className}
        onError={handleImageError}
      />
    );
  }

  // Fallback placeholder with token symbol
  return (
    <div
      className={`bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 ${className}`}
      style={{ width: width, height: height }}
    >
      {token.symbol?.slice(0, 2).toUpperCase() || "??"}
    </div>
  );
};

export default TokenImage;
