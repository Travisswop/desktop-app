"use client";
import Link from "next/link";
import React from "react";
import { MdQrCodeScanner } from "react-icons/md";
import { TbEdit } from "react-icons/tb";
import { BiWallet } from "react-icons/bi";
import { useRouter } from "next/navigation";
import ShareCustomQRCode from "./socialShare/ShareCustomQRCode";
import { PrimaryButton } from "../ui/Button/PrimaryButton";

const ButtonList = ({ microsite, token, id, qrEmbeddedUrl }: any) => {
  const router = useRouter();

  const handleWalletRedirect = () => {
    if (microsite.primary) {
      router.push("/wallet");
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <Link href={`/smartsite/profile/${microsite._id}`} className="">
        <PrimaryButton>
          <p className="flex items-center gap-1">
            Edit <TbEdit size={19} />
          </p>
        </PrimaryButton>
      </Link>
      <PrimaryButton
        disabled={!microsite.primary && true}
        onClick={() => handleWalletRedirect()}
      >
        <p className="flex items-center gap-1">
          Wallet <BiWallet size={19} />
        </p>
      </PrimaryButton>

      <ShareCustomQRCode
        url={microsite?.qrcodeUrl}
        micrositeIdforEditingQR={microsite?._id}
        smartSiteButton
      >
        QR <MdQrCodeScanner size={18} />
      </ShareCustomQRCode>
    </div>
  );
};

export default ButtonList;
