import UpdateQRCode from "@/components/smartsite/qrCode/CustomQRCode/UpdateQrCode";
import { cookies } from "next/headers";
import React from "react";

const UpdateQrCodePage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const cookieStore = cookies();

  const id = (await params).id;

  // Retrieve data from specific cookie
  const accessToken = (await cookieStore).get("access-token")?.value;
  const userId = (await cookieStore).get("user-id")?.value;
  const session = {
    _id: userId,
    accessToken,
  };

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/customQRCodes/details/${id}`,
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
