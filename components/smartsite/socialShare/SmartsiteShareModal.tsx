"use client";
import { IoCopyOutline } from "react-icons/io5";
import React, { useState } from "react";
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
import { FcOk } from "react-icons/fc";
import { useUser } from "@/lib/UserContext";

export default function SmartSiteUrlShareModal({
  isOpen,
  onOpenChange,
  smartSiteProfileUrl,
}: any) {
  const { user } = useUser();
  // Initial text
  const [textToCopy, setTextToCopy] = useState(user?.ensName);
  // State to manage copied effect
  const [isCopied, setIsCopied] = useState(false);
  // State to manage notification visibility
  const [showNotification, setShowNotification] = useState(false);

  const handleCopy = (e: any) => {
    e.stopPropagation();
    // Copy text to clipboard
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true); // Show "Copied!" effect
    setShowNotification(true); // Show notification
    // Remove "Copied!" text after 2 seconds
    setTimeout(() => setIsCopied(false), 5000);
    // Hide notification after 3 seconds
    setTimeout(() => setShowNotification(false), 3000);
  };
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
              <div className="w-[91%] mx-auto py-10">
                <ModalBody className="text-center">
                  <div>
                    <p className="font-bold">Share Your Smartsite Link Via</p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginTop: "20px",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                        className="pb-5 w-full px-10"
                      >
                        <input
                          type="text"
                          value={user?.ensName}
                          disabled
                          style={{
                            padding: "8px 16px",
                            fontSize: "16px",
                            borderRadius: "20px",
                            border: "1px solid #ccc",
                            width: "full",
                          }}
                          className="rounded-full"
                        />
                        <button
                          onClick={handleCopy}
                          style={{
                            padding: "8px 12px",
                            fontSize: "16px",
                            borderRadius: "4px",
                            border: "none",
                            // Green color for the button
                            // backgroundColor: "#28a745",
                            color: "#fff",
                            cursor: "pointer",
                            position: "absolute",
                            overflow: "hidden",
                          }}
                          className="right-[17%]"
                        >
                          {isCopied ? (
                            <FcOk className="text-[#28a745] size-6" />
                          ) : (
                            <IoCopyOutline className=" text-gray-500 size-6" />
                          )}
                        </button>
                      </div>

                      {/* Notification */}
                      {showNotification && (
                        <div
                          style={{
                            position: "fixed",
                            bottom: "20px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            backgroundColor: "#333",
                            color: "#fff",
                            padding: "10px 20px",
                            borderRadius: "4px",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                            zIndex: 1000,
                            transition: "opacity 0.3s ease-in-out",
                          }}
                        >
                          Copied to the clipboard!
                        </div>
                      )}
                    </div>
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
