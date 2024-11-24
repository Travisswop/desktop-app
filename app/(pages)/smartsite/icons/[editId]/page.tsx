import React, { Suspense } from "react";
// import getSingleSmartsiteData from "@/util/fetchingData/singleSmartsiteDataFetching";
import MicrositeEditMainContentPage from "./mainContent";
import SmartSiteIconLoading from "./loading";
import getSingleSmartsiteData from "@/actions/singleSmartsiteDataFetching";

const SmartsiteUpdatePage = async ({
  params,
}: {
  params: { editId: string };
}) => {
  const demoToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjM4NjMyMDIzMDQxMDMyODAyOTk4MmIiLCJpYXQiOjE3MjcxNTI4MzB9.CsHnZAgUzsfkc_g_CZZyQMXc02Ko_LhnQcCVpeCwroY";

  const data = await getSingleSmartsiteData(params.editId, demoToken);

  return (
    <div>
      <Suspense fallback={<SmartSiteIconLoading />}>
        <MicrositeEditMainContentPage data={data} />
      </Suspense>
    </div>
  );
};

export default SmartsiteUpdatePage;
