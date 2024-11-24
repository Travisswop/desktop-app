"use client";
import React from "react";
import { Modal, ModalContent, ModalBody } from "@nextui-org/react";
import {
  FacebookShareButton,
  WhatsappShareButton,
  LinkedinShareButton,
  TwitterShareButton,
  TelegramShareButton,
  XIcon,
  TelegramIcon,
  LinkedinIcon,
  FacebookIcon,
  WhatsappIcon,
} from "react-share";

export default function SmartSiteUrlShareModal({
  isOpen,
  onOpenChange,
  smartSiteProfileUrl,
}: any) {
  // console.log("smartstie", smartSiteProfileUrl);

  return (
    <>
      {isOpen && (
        <>
          <Modal
            size="xl"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop={"blur"}
          >
            <ModalContent>
              <div className="w-[91%] mx-auto py-6">
                <ModalBody className="text-center">
                  <div>
                    <p className="font-bold">Share Your Smartsite Link Via</p>
                    <p className="text-sm text-gray-500 my-3 font-medium">
                      Select from our wide variety of links and contact info
                      below.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 justify-center">
                    <FacebookShareButton url={smartSiteProfileUrl}>
                      <FacebookIcon size={38} round />
                    </FacebookShareButton>

                    <WhatsappShareButton url={smartSiteProfileUrl}>
                      <WhatsappIcon size={38} round />
                    </WhatsappShareButton>

                    <LinkedinShareButton url={smartSiteProfileUrl}>
                      <LinkedinIcon size={38} round />
                    </LinkedinShareButton>

                    <TwitterShareButton url={smartSiteProfileUrl}>
                      <XIcon size={38} round />
                    </TwitterShareButton>

                    <TelegramShareButton url={smartSiteProfileUrl}>
                      <TelegramIcon size={38} round />
                    </TelegramShareButton>
                  </div>
                </ModalBody>
              </div>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
}
