"use client";
import React, { ReactNode, useState } from "react";
import { BsSendFill } from "react-icons/bs";
import { useDisclosure } from "@nextui-org/react";
import SmartSiteUrlShareModal from "./SmartsiteShareModal";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";

const SmartsiteSocialShare = ({
  profileUrl,
  isAbsolute = true,
  className,
  children,
}: {
  profileUrl: string;
  isAbsolute?: boolean;
  className?: string;
  children?: ReactNode;
}) => {
  const [smartSiteProfileUrl, setSmartSiteProfileUrl] = useState<string>("");

  const {
    isOpen: isSmartsiteOpen,
    onOpen: onSmartsiteOpen,
    onOpenChange: onSmartsiteOpenChange,
  } = useDisclosure();

  const handleOpenSmartSiteProfileShareModal = (e: any) => {
    e.stopPropagation();
    onSmartsiteOpen();
    setSmartSiteProfileUrl(profileUrl);
  };

  return (
    <div className="relative">
      <PrimaryButton
        onClick={(e) => handleOpenSmartSiteProfileShareModal(e)}
        className={`bg-gray-200 hover:bg-gray-300 rounded-md py-2 px-2.5 w-max ${className} ${
          isAbsolute && "absolute top-3 right-2"
        } `}
      >
        {children ? children : <BsSendFill size={16} />}
      </PrimaryButton>
      {smartSiteProfileUrl && (
        <SmartSiteUrlShareModal
          isOpen={isSmartsiteOpen}
          onOpenChange={onSmartsiteOpenChange}
          smartSiteProfileUrl={smartSiteProfileUrl}
        />
      )}
    </div>
  );
};

export default SmartsiteSocialShare;
