import React from "react";
import TokenGatedContent from "./mainContent";

const AddTokenGated = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;

  return <TokenGatedContent micrositeId={id} />;
};

export default AddTokenGated;
