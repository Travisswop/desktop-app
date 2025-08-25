export const fetchTokensFromLiFi = async (
  chainId: string,
  searchQuery = ""
) => {
  try {
    const url = `${
      process.env.NEXT_PUBLIC_LIFI_API_URL
        ? process.env.NEXT_PUBLIC_LIFI_API_URL
        : "https://li.quest/v1"
    }/tokens?chains=${chainId}${searchQuery ? `&search=${searchQuery}` : ""}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.tokens[chainId] || [];
  } catch (error) {
    console.error("Error fetching tokens from Li.Fi:", error);
    return [];
  }
};
