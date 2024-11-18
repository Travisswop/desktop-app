import React from "react";
import EditSmartSite from "./mainContent";
import getSingleSmartsiteData from "@/util/fetchingData/singleSmartsiteDataFetching";
import isUserAuthenticate from "@/util/isUserAuthenticate";
import ForceSignOut from "@/components/ForceSignOut";

const SmartsiteUpdatePage = async ({
  params,
}: {
  params: { editId: string };
}) => {
  const session: any = await isUserAuthenticate();
  const data = await getSingleSmartsiteData(
    params.editId,
    session.accessToken as string
  );

  if (data && data.state === "fail") {
    return <ForceSignOut />;
  }

  // console.log("data", data);

  return (
    <EditSmartSite token={session.accessToken} session={session} data={data} />
  );
};

export default SmartsiteUpdatePage;
