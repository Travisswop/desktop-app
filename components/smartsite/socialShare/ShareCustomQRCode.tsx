"use client";
import { useDisclosure } from "@nextui-org/react";
import React, { useState } from "react";
// import { IoIosSend } from "react-icons/io";
// import QRCodeShareModal from "./QRCodeShareModal";
import { BsFillSendFill } from "react-icons/bs";
import QRCodeShareModal from "./QRCodeShareModal";

import AnimateButton from "@/components/ui/Button/AnimateButton";

import { MdQrCodeScanner } from "react-icons/md";

const ShareCustomQRCode = ({
  url,
  smartSiteButton,
  qrEmbeddedUrl,
  micrositeIdforEditingQR,
}: any) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [qrCode, setQrCode] = useState<any>(null);
  const handleQRCodeShare = () => {
    onOpen();
    setQrCode(url);
  };
  return (
    <div>
      {!smartSiteButton ? (
        <button
          onClick={handleQRCodeShare}
          type="button"
          className="bg-black text-white w-9 h-9 rounded-lg flex items-center justify-center"
        >
          <BsFillSendFill size={15} />
        </button>
      ) : (
        <AnimateButton
          onClick={handleQRCodeShare}
          // width="w-[5.8rem]"
          className="!rounded-md !text-black hover:!text-white !border-black !gap-1 2xl:!gap-1.5 text-sm 2xl:text-base !w-[3.7rem] 2xl:!w-20 !px-2.5"
        >
          QR <MdQrCodeScanner size={18} />
        </AnimateButton>
      )}

      {qrCode && (
        <QRCodeShareModal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          qrCodeUrl={qrCode}
          forSmartSite={smartSiteButton}
          micrositeIdforEditingQR={micrositeIdforEditingQR}
        />
      )}
    </div>
  );
};

export default ShareCustomQRCode;
