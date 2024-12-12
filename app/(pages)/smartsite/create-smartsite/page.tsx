import CreateSmartSite from "@/components/smartsite/CreateNewSmartsite";
import { cookies } from "next/headers";
import React from "react";

const CreateSmartSitePage = async () => {
  const cookieStore = cookies();

  // Retrieve data from specific cookie
  const accessToken = (await cookieStore).get("access-token")?.value;

  return <div>{accessToken && <CreateSmartSite token={accessToken} />}</div>;
};

export default CreateSmartSitePage;
