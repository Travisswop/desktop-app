"use client";
import { useDisclosure } from "@nextui-org/react";
import React, { useState } from "react";
// import { IoIosSend } from "react-icons/io";
// import QRCodeShareModal from "./QRCodeShareModal";
import { BsFillSendFill } from "react-icons/bs";
import QRCodeShareModal from "./QRCodeShareModal";

import AnimateButton from "@/components/ui/Button/AnimateButton";

import { MdQrCodeScanner } from "react-icons/md";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";

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
        <PrimaryButton onClick={handleQRCodeShare}>
          <p className="flex items-center gap-1">
            QR <MdQrCodeScanner size={18} />
          </p>
        </PrimaryButton>
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
