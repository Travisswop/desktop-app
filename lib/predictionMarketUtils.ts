/**
 * Utility functions for prediction markets
 */

import { type MarketStatus } from '@/types/predictionMarkets';

/**
 * Format volume number to readable string
 */
export const formatVolume = (volume: number | undefined): string => {
  if (!volume) return 'N/A';

  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(2)}M`;
  }
  if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
};

/**
 * Format price to percentage string
 */
export const formatPercentage = (price: number | undefined): string => {
  if (price === undefined || price === null) return '0%';
  return `${(price * 100).toFixed(1)}%`;
};

/**
 * Get status color class
 */
export const getStatusColor = (status?: MarketStatus): string => {
  switch (status) {
    case 'open':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'settled':
    case 'finalized':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'closed':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Get status badge label
 */
export const getStatusLabel = (status?: MarketStatus): string => {
  switch (status) {
    case 'open':
      return 'Live';
    case 'settled':
    case 'finalized':
      return 'Settled';
    case 'closed':
      return 'Closed';
    default:
      return status || 'Unknown';
  }
};

/**
 * Format date to readable string
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return date.toLocaleDateString();
  }

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (diffDays === 1) {
    return 'Tomorrow';
  }

  if (diffDays <= 7) {
    return `In ${diffDays} days`;
  }

  return date.toLocaleDateString();
};

/**
 * Get bet type color
 */
export const getBetTypeColor = (type: 'YES' | 'NO'): string => {
  return type === 'YES'
    ? 'text-green-700'
    : 'text-red-700';
};

/**
 * Get bet type background color
 */
export const getBetTypeBgColor = (type: 'YES' | 'NO'): string => {
  return type === 'YES'
    ? 'bg-green-50 border-green-200 hover:bg-green-100'
    : 'bg-red-50 border-red-200 hover:bg-red-100';
};
