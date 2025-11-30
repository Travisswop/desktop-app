export const formatEns = (ensName: string) => {
  return ensName
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(".");
};
