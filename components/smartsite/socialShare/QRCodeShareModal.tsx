"use client";
import React, { useEffect, useState } from "react";
import { Modal, ModalContent, ModalBody, Spinner } from "@nextui-org/react";
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
import { sendCloudinaryImage } from "@/util/SendCloudineryImage";

export default function QRCodeShareModal({
  isOpen,
  onOpenChange,
  qrCodeUrl,
}: any) {
  // console.log("qr code url", qrCodeUrl);

  const [imageUrl, setImageUrl] = useState<any>(null);
  const [loading, setLoading] = useState<any>(false);
  const [error, setError] = useState<any>(null);

  // console.log("imageurl", imageUrl);

  useEffect(() => {
    setLoading(true);
    sendCloudinaryImage(qrCodeUrl)
      .then((imageUrl) => {
        setImageUrl(imageUrl);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error uploading image:", error);
        setLoading(false);
        setError("Something went wrong! Please try again later.");
      });
  }, [qrCodeUrl]);

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
                    <p className="font-bold">Share Your QR Code Link Via</p>
                    <p className="text-sm text-gray-500 my-3 font-medium">
                      Select from our wide variety of links and contact info
                      below.
                    </p>
                  </div>

                  {error ? (
                    <p className="text-sm font-medium text-red-600">{error}</p>
                  ) : (
                    <>
                      {loading ? (
                        <Spinner size="sm" color="secondary" />
                      ) : (
                        <div className="flex items-center gap-4 justify-center">
                          <FacebookShareButton url={imageUrl}>
                            <FacebookIcon size={38} round />
                          </FacebookShareButton>

                          <WhatsappShareButton url={imageUrl}>
                            <WhatsappIcon size={38} round />
                          </WhatsappShareButton>

                          <LinkedinShareButton url={imageUrl}>
                            <LinkedinIcon size={38} round />
                          </LinkedinShareButton>

                          <TwitterShareButton url={imageUrl}>
                            <XIcon size={38} round />
                          </TwitterShareButton>

                          <TelegramShareButton url={imageUrl}>
                            <TelegramIcon size={38} round />
                          </TelegramShareButton>
                        </div>
                      )}
                    </>
                  )}
                </ModalBody>
              </div>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
}
