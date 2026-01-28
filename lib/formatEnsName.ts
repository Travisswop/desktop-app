export const formatEns = (ensName: string) => {
  if (!ensName) {
    return;
  }

  return ensName
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('.');
};
