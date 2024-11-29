import React, { Suspense } from "react";
// import getSingleSmartsiteData from "@/util/fetchingData/singleSmartsiteDataFetching";
import MicrositeEditMainContentPage from "./mainContent";
import SmartSiteIconLoading from "./loading";
import getSingleSmartsiteData from "@/actions/singleSmartsiteDataFetching";
import { cookies } from "next/headers";

const SmartsiteUpdatePage = async ({
  params,
}: {
  params: Promise<{ editId: string }>;
}) => {
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("access-token")?.value;

  const editId = (await params).editId;

  if (accessToken) {
    const data = await getSingleSmartsiteData(editId, accessToken);

    return (
      <div>
        <Suspense fallback={<SmartSiteIconLoading />}>
          <MicrositeEditMainContentPage data={data} />
        </Suspense>
      </div>
    );
  }
};

export default SmartsiteUpdatePage;
