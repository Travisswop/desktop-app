import getSingleSmartsiteData from "@/actions/singleSmartsiteDataFetching";
import { cookies } from "next/headers";
import { Suspense } from "react";
import SmartSiteIconLoading from "../../icons/[editId]/loading";
import SmartsiteIconLivePreview from "@/components/smartsite/SmartsiteIconLivePreview";

const SmartsiteProfileView = async ({
  params,
}: {
  params: Promise<{ editId: string }>;
}) => {
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("access-token")?.value;

  const editId = (await params).editId;

  if (accessToken) {
    const data = await getSingleSmartsiteData(editId, accessToken);

    // console.log("data hhh", data);

    return (
      <div>
        <Suspense fallback={<SmartSiteIconLoading />}>
          <SmartsiteIconLivePreview data={data.data} />
        </Suspense>
      </div>
    );
  }
};

export default SmartsiteProfileView;
