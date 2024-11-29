// import CreateQRCode from "@/components/CustomQRCode/CreateQrCode";
// import isUserAuthenticate from "@/util/isUserAuthenticate";
import CreateQRCode from "@/components/smartsite/qrCode/CustomQRCode/CreateQrCode";
import { cookies } from "next/headers";
import React from "react";

const CreateQrCodePage = async () => {
  const cookieStore = cookies();

  // Retrieve data from specific cookie
  const accessToken = (await cookieStore).get("access-token")?.value;
  const userId = (await cookieStore).get("user-id")?.value;

  const session = {
    _id: userId,
    accessToken,
  };
  return <CreateQRCode session={session} />;
};

export default CreateQrCodePage;
