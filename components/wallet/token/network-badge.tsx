import React from 'react';
import Image from 'next/image';
import { ChainType } from '@/types/token';

interface NetworkBadgeProps {
  chain: ChainType;
  size?: number;
  className?: string;
}

const NetworkBadge = ({
  chain,
  size = 18,
  className = '',
}: NetworkBadgeProps) => {
  const getNetworkIcon = () => {
    switch (chain?.toUpperCase()) {
      case 'ETHEREUM':
        return '/assets/icons/ethereum.png';
      case 'POLYGON':
        return '/assets/icons/polygon.png';
      case 'BASE':
        return '/assets/icons/base.png';
      case 'SOLANA':
        return '/assets/icons/solana.png';
      case 'SEPOLIA':
        return '/assets/icons/ethereum.png'; // Sepolia is Ethereum testnet
      default:
        return null;
    }
  };

  const iconPath = getNetworkIcon();

  if (!iconPath) {
    return (
      <div
        className={`bg-gray-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          fontSize: `${size * 0.6}px`,
        }}
      >
        ?
      </div>
    );
  }

  return (
    <div
      className={`rounded-full border-2 border-white bg-white overflow-hidden ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <Image
        src={iconPath}
        alt={chain}
        width={size}
        height={size}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default NetworkBadge;
