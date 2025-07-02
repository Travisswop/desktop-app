import React, { useState } from 'react';
import Image from 'next/image';

interface TokenImageProps {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
}

// Custom TokenImage component with fallback logic for swap modal
const TokenImage = ({
  src,
  alt,
  width = 20,
  height = 20,
  className = 'rounded-full',
  fallbackSrc = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
}: TokenImageProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  // If no src provided or image failed to load, show fallback
  if (!src || imageError) {
    return (
      <Image
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={() => {
          // If fallback also fails, show a simple placeholder
          console.warn(`Failed to load token image for ${alt}`);
        }}
      />
    );
  }

  // Render the Image component with error handling
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleImageError}
    />
  );
};

export default TokenImage;
