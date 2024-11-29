// import CreateQRCode from "@/components/CustomQRCode/CreateQrCode";
// import isUserAuthenticate from "@/util/isUserAuthenticate";
import CreateQRCode from "@/components/smartsite/qrCode/CustomQRCode/CreateQrCode";
import React from "react";

const CreateQrCodePage = async () => {
  // const session: any = await isUserAuthenticate();
  const session = {
    _id: 123,
    accessToken: "rrrrr",
  };
  return <CreateQRCode session={session} />;
};

export default CreateQrCodePage;
