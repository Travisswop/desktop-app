export const fetchTokensFromLiFi = async (
  chainId: string,
  searchQuery = ""
) => {
  try {
    const url = `https://li.quest/v1/tokens?chains=${chainId}${
      searchQuery ? `&search=${searchQuery}` : ""
    }`;
    const response = await fetch(url);
    const data = await response.json();
    return data.tokens[chainId] || [];
  } catch (error) {
    console.error("Error fetching tokens from Li.Fi:", error);
    return [];
  }
};
