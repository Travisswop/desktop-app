// import EditOldQRCode from "@/components/smartsiteList/EditOldQrCode";
// import EditQRCode from "@/components/smartsiteList/EditQrCode";
// import isUserAuthenticate from "@/util/isUserAuthenticate";
import EditOldQRCode from "@/components/smartsite/qrCode/EditOldQrCode";
import EditQRCode from "@/components/smartsite/qrCode/EditQrCode";
import React from "react";

const EditQrCodePage = async ({ params }: { params: { id: string } }) => {
  // const session: any = await isUserAuthenticate();
  const demoToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjM4NjMyMDIzMDQxMDMyODAyOTk4MmIiLCJpYXQiOjE3MjcxNTI4MzB9.CsHnZAgUzsfkc_g_CZZyQMXc02Ko_LhnQcCVpeCwroY";

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/getQrCode/${params.id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${demoToken}`,
      },
    }
  );

  const data = await response.json();

  // if (data && data.state === "fail") {
  //   return <ForceSignOut />;
  // }

  // console.log("data gg", data);

  if (data && data.state === "failed") {
    // has server action also called fetchMicrositeInfo
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/microsite/withoutPopulate/${params.id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${demoToken}`,
        },
      }
    );
    const data = await response.json();
    //console.log("failed", data.data);

    return (
      <div>
        {data && data.data && (
          <EditOldQRCode
            profileUrl={data.data.profileUrl}
            micrositeId={data.data._id}
            token={demoToken}
          />
        )}
      </div>
    );
  }

  if (data && data.state === "success") {
    return (
      <div>
        {data && data.data && (
          <EditQRCode
            qrCodeData={data.data}
            // micrositeId={data.data.microsite}
            token={demoToken}
          />
        )}
      </div>
    );
  }
};

export default EditQrCodePage;
