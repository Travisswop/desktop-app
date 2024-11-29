// import UpdateQRCode from '@/components/CustomQRCode/UpdateQrCode';
// import ForceSignOut from '@/components/ForceSignOut';
// import isUserAuthenticate from '@/util/isUserAuthenticate';
import UpdateQRCode from "@/components/smartsite/qrCode/CustomQRCode/UpdateQrCode";
import React from "react";

const UpdateQrCodePage = async ({ params }: { params: { id: string } }) => {
  const session = {
    _id: 123,
    accessToken: "rrrrr",
  };

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/customQRCodes/details/${params.id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${session.accessToken}`,
      },
    }
  );
  const data = await response.json();

  return (
    <div>
      <UpdateQRCode data={data.data} session={session} />
    </div>
  );
};

export default UpdateQrCodePage;
