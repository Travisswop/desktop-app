export function truncateWalletAddress(
  address: string,
  startChars = 5,
  endChars = 4
) {
  // Ensure the address is long enough to truncate
  if (address.length <= startChars + endChars) {
    return address; // Return the full address if it's too short
  }

  // Extract the first `startChars` and last `endChars` characters
  const start = address.slice(0, startChars);
  const end = address.slice(-endChars);

  // Combine them with an ellipsis
  return `${start}...${end}`;
}
