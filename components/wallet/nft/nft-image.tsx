import React, { useState } from 'react';
import Image from 'next/image';

interface NFTImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

// Custom NFTImage component with fallback logic
const NFTImage = ({
  src,
  alt,
  fill = true,
  width,
  height,
  className = 'object-cover',
  sizes = '(max-width: 768px) 100vw, 300px',
  priority = false,
}: NFTImageProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  // If image failed to load, show placeholder
  if (imageError) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center ${className}`}
      >
        <Image
          src="/images/placeholder-nft.png"
          alt="NFT placeholder"
          fill
          className="object-contain p-4"
          sizes="(max-width: 768px) 100vw, 300px"
        />
      </div>
    );
  }

  // Render the Image component with error handling
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      priority={priority}
      onError={handleImageError}
    />
  );
};

export default NFTImage;
