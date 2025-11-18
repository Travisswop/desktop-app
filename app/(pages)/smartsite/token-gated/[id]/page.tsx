// import { cookies } from "next/headers";
import React from "react";
import TokenGatedContent from "./mainContent";

const AddTokenGated = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  // const session: any = await isUserAuthenticate();
  // const cookieStore = cookies();

  // Retrieve data from specific cookie
  // const accessToken = (await cookieStore).get("access-token")?.value;

  // const id = (await params).id;

  return <TokenGatedContent />;
};

export default AddTokenGated;
