export const isProductFeedPost = (feed?: any) => {
  const content = feed?.content || {};
  return (
    feed?.postType === "minting" ||
    feed?.postType === "product" ||
    content?.type === "product" ||
    Boolean(content?.productCount) ||
    (Array.isArray(content?.products) && content.products.length > 0)
  );
};
