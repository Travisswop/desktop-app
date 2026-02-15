import React, { useState } from "react";
import Image from "next/image";

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
  width,
  height,
  className = "rounded-lg",
  priority = false,
}: NFTImageProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  // If image failed to load, show placeholder
  if (imageError) {
    return (
      <Image
        src="/images/placeholder-nft.png"
        alt="NFT placeholder"
        className="p-4"
        width={320}
        height={320}
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
      // sizes={sizes}
      priority={priority}
      onError={handleImageError}
    />
  );
};

export default NFTImage;
