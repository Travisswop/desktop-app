import EditOldQRCode from "@/components/smartsite/qrCode/EditOldQrCode";
import EditQRCode from "@/components/smartsite/qrCode/EditQrCode";
import { cookies } from "next/headers";
import React from "react";

const EditQrCodePage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  // const session: any = await isUserAuthenticate();
  const cookieStore = cookies();

  // Retrieve data from specific cookie
  const accessToken = (await cookieStore).get("access-token")?.value;

  const id = (await params).id;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/getQrCode/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();

  console.log("data hola", data);

  if (data && data.state === "failed") {
    // has server action also called fetchMicrositeInfo
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/microsite/withoutPopulate/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const data = await response.json();

    return (
      <div>
        {data && data.data && (
          <EditOldQRCode
            profileUrl={data.data.profileUrl}
            micrositeId={data.data._id}
            token={accessToken}
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
            token={accessToken}
          />
        )}
      </div>
    );
  }
};

export default EditQrCodePage;
