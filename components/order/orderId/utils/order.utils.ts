import { Customer } from '../types/order.types';

/**
 * Formats an address object into a readable string
 */
export const formatAddress = (
  address?: Customer['address']
): string => {
  if (!address?.line1) return 'No address provided';

  const addressParts = [address.line1];
  if (address.line2) addressParts.push(address.line2);
  if (address.city) addressParts.push(address.city);

  let stateZip = '';
  if (address.state) stateZip += address.state;
  if (address.postalCode) stateZip += ` ${address.postalCode}`;
  if (stateZip) addressParts.push(stateZip);

  if (address.country) addressParts.push(address.country);

  return addressParts.join(', ');
};

/**
 * Creates a memoized date formatter
 */
export const createDateFormatter = () => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
};

/**
 * Formats a date string using the provided formatter
 */
export const formatDate = (
  dateString: string,
  formatter: Intl.DateTimeFormat
): string => {
  return formatter.format(new Date(dateString));
};

/**
 * Calculates the total price for an NFT item
 */
export const calculateItemTotal = (
  price: number,
  quantity: number
): number => {
  return price * quantity;
};

/**
 * Truncates text to a specified length with ellipsis
 */
export const truncateText = (
  text: string,
  maxLength: number
): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
