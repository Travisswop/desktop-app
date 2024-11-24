"use client";
import React, { useState } from "react";
import { BsSendFill } from "react-icons/bs";
import { useDisclosure } from "@nextui-org/react";
import SmartSiteUrlShareModal from "./SmartsiteShareModal";

const SmartsiteSocialShare = ({ profileUrl }: any) => {
  const [smartSiteProfileUrl, setSmartSiteProfileUrl] = useState<any>(null);

  const {
    isOpen: isSmartsiteOpen,
    onOpen: onSmartsiteOpen,
    onOpenChange: onSmartsiteOpenChange,
  } = useDisclosure();

  const handleOpenSmartSiteProfileShareModal = () => {
    onSmartsiteOpen();
    setSmartSiteProfileUrl(profileUrl);
  };

  return (
    <div>
      <button
        onClick={handleOpenSmartSiteProfileShareModal}
        className="bg-gray-200 hover:bg-gray-300 rounded-md py-2 px-3 w-max absolute top-3 right-2"
      >
        <BsSendFill size={16} />
      </button>
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
