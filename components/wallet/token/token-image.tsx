import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { TokenData } from '@/types/token';
import NetworkBadge from './network-badge';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';

interface TokenImageProps {
  token: TokenData;
  width?: number;
  height?: number;
  className?: string;
  showNetworkBadge?: boolean;
}

type TokenImageData = TokenData & {
  icon?: string | null;
  image?: string | null;
  logo?: string | null;
  thumbnail?: string | null;
  marketData?: (TokenData['marketData'] & {
    icon?: string | null;
    iconUrl?: string | null;
    large?: string | null;
    logo?: string | null;
    logoURI?: string | null;
    small?: string | null;
    thumb?: string | null;
  }) | null;
};

const TOKEN_IMAGE_ALIASES: Record<string, string[]> = {
  PUSD: ['/assets/crypto-icons/PUSD.png'],
  USDC_E: ['/assets/crypto-icons/USDC.png'],
};

const normalizeAliasKey = (symbol: string) =>
  symbol.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');

const localTokenImageCandidates = (symbol?: string | null) => {
  const trimmed = symbol?.trim();
  if (!trimmed) return [];

  const candidates: string[] = [];
  const aliasKey = normalizeAliasKey(trimmed);
  candidates.push(...(TOKEN_IMAGE_ALIASES[aliasKey] || []));

  const aaveUnderlying = trimmed.match(/^a(?:Eth|Pol|Arb|Bas)(.+)$/i)?.[1];
  if (aaveUnderlying) {
    candidates.push(`/assets/crypto-icons/${aaveUnderlying.toUpperCase()}.png`);
  }

  candidates.push(
    `/assets/crypto-icons/${trimmed}.png`,
    `/assets/crypto-icons/${trimmed.toUpperCase()}.png`,
  );

  return candidates;
};

const uniqueImageCandidates = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const candidates: string[] = [];

  values.forEach((value) => {
    const src = sanitizeNextImageSrc(value);
    if (!src || seen.has(src)) return;

    seen.add(src);
    candidates.push(src);
  });

  return candidates;
};

const getTokenImageCandidates = (token: TokenImageData) =>
  uniqueImageCandidates([
    token.logoURI,
    token.icon,
    token.logo,
    token.image,
    token.thumbnail,
    token.marketData?.image,
    token.marketData?.iconUrl,
    token.marketData?.logoURI,
    token.marketData?.logo,
    token.marketData?.icon,
    token.marketData?.large,
    token.marketData?.small,
    token.marketData?.thumb,
    ...localTokenImageCandidates(token.symbol),
  ]);

// Custom TokenImage component with fallback logic
const TokenImage = ({
  token,
  width = 30,
  height = 30,
  className = 'rounded-full',
  showNetworkBadge = true,
}: TokenImageProps) => {
  const imageToken = token as TokenImageData;
  const imageCandidates = useMemo(
    () => getTokenImageCandidates(imageToken),
    [
      imageToken.logoURI,
      imageToken.icon,
      imageToken.logo,
      imageToken.image,
      imageToken.thumbnail,
      imageToken.symbol,
      imageToken.marketData?.image,
      imageToken.marketData?.iconUrl,
      imageToken.marketData?.logoURI,
      imageToken.marketData?.logo,
      imageToken.marketData?.icon,
      imageToken.marketData?.large,
      imageToken.marketData?.small,
      imageToken.marketData?.thumb,
    ],
  );
  const imageCandidateKey = imageCandidates.join('|');
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [imageCandidateKey]);

  const handleImageError = () =>
    setImageIndex((current) =>
      current < imageCandidates.length ? current + 1 : current,
    );

  const imageSrc = imageCandidates[imageIndex] || '';
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
          style={{ width, height, objectFit: 'cover' }}
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
        className={`bg-gray-200 flex items-center justify-center text-[13px] font-medium text-gray-500 ${className}`}
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
