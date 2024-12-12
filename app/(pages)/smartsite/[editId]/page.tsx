import React from "react";
import EditSmartSite from "../../../../components/smartsite/EditMicrosite/mainContent";
import getSingleSmartsiteData from "@/actions/singleSmartsiteDataFetching";
import { cookies } from "next/headers";

const SmartsiteUpdatePage = async ({
  params,
}: {
  params: Promise<{ editId: string }>;
}) => {
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("access-token")?.value;

  if (accessToken) {
    const editId = (await params).editId;

    if (editId) {
      const data = await getSingleSmartsiteData(editId, accessToken);

      return <EditSmartSite token={accessToken} data={data} />;
    }
  }
};

export default SmartsiteUpdatePage;
