import React from "react";
import { Settings } from "lucide-react";
import Image from "next/image";
import { QrCode1 } from "../smartsite/qrCode/QRData";
import { PrimaryButton } from "../ui/Button/PrimaryButton";

const QRCodePreview = () => {
  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">QR</h3>
        <PrimaryButton
          //   onClick={handleViewClick}
          className="text-sm"
        >
          View
        </PrimaryButton>
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col items-center">
        <div className="border-2 border-black rounded-xl p-2 pb-4">
          <div className="relative w-[130px] h-[130px]">
            <QrCode1 color={"black"} width={130} height={130} />
            <Image
              alt="swop-logo"
              src={
                "https://res.cloudinary.com/bayshore/image/upload/v1732872687/swop-logo_n9qal7.jpg"
              }
              width={90}
              height={90}
              className="absolute inset-0 m-auto w-8 h-8"
            />
            <p className="text-[8px] text-center">Powered By SWOP</p>
          </div>
        </div>

        {/* Manage QR Button */}
        <PrimaryButton className="text-sm mt-5 px-10 py-2">
          <Settings className="w-4 h-4" />
          <span className="ml-1">Manage QR</span>
        </PrimaryButton>
      </div>
    </div>
  );
};

export default QRCodePreview;
