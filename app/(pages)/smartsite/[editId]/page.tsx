import React from "react";
import EditSmartSite from "../../../../components/smartsite/EditMicrosite/mainContent";
import getSingleSmartsiteData from "@/actions/singleSmartsiteDataFetching";

const SmartsiteUpdatePage = async ({
  params,
}: {
  params: { editId: string };
}) => {
  const demoToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjM4NjMyMDIzMDQxMDMyODAyOTk4MmIiLCJpYXQiOjE3MjcxNTI4MzB9.CsHnZAgUzsfkc_g_CZZyQMXc02Ko_LhnQcCVpeCwroY";

  if (params) {
    const data = await getSingleSmartsiteData(params.editId, demoToken);

    return <EditSmartSite token={demoToken} data={data} />;
  }
};

export default SmartsiteUpdatePage;
