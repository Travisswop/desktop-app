'use client';

import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

interface TokenIconProps {
  symbol?: string;
  logo?: string;
  size?: number;
  className?: string;
}

const unique = (values: string[]) =>
  values.filter(
    (value, index, array) =>
      value && array.indexOf(value) === index,
  );

const TokenIcon = ({
  symbol,
  logo,
  size = 20,
  className = 'object-cover',
}: TokenIconProps) => {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const label = symbol?.trim() || '?';

  const candidates = useMemo(
    () =>
      unique([
        sanitizeNextImageSrc(logo),
        symbol ? `/assets/crypto-icons/${symbol}.png` : '',
        symbol ? `/assets/crypto-icons/${symbol.toUpperCase()}.png` : '',
      ]),
    [logo, symbol],
  );

  useEffect(() => {
    setCandidateIndex(0);
  }, [logo, symbol]);

  const src = candidates[candidateIndex];

  if (!src) {
    return (
      <span className="text-[10px] font-bold text-zinc-500 leading-none">
        {label.slice(0, 3).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      key={src}
      src={src}
      alt={label}
      width={size}
      height={size}
      className={className}
      onError={() => setCandidateIndex((index) => index + 1)}
    />
  );
};

export default TokenIcon;
