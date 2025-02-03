"use client";
import { MdOutlineFileDownload } from "react-icons/md";
import { TbEdit } from "react-icons/tb";
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
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";
import Image from "next/image";
import { BsFillSendFill } from "react-icons/bs";
import { IoCopyOutline } from "react-icons/io5";
import { FcOk } from "react-icons/fc";
import Link from "next/link";

export default function QRCodeShareModal({
  isOpen,
  onOpenChange,
  qrCodeUrl,

  forSmartSite,
  micrositeIdforEditingQR,
}: any) {
  const [imageUrl, setImageUrl] = useState<any>(null);
  const [loading, setLoading] = useState<any>(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    if (qrCodeUrl) {
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
    }
  }, [qrCodeUrl]);

  const handleExport = (url: any) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${"qrcode"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initial text
  const [textToCopy, setTextToCopy] = useState(imageUrl);
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

  return !forSmartSite ? (
    <>
      {/* this QR modal is for QR Code */}
      {isOpen && (
        <>
          <Modal
            size="xl"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop={"blur"}
          >
            <ModalContent>
              <div className="w-[91%] mx-auto py-12">
                <ModalBody className="text-center">
                  <div>
                    <p className="font-bold">Your QR Code</p>
                    <Image
                      src={qrCodeUrl}
                      alt="qrcode"
                      width={300}
                      height={300}
                      className="w-52 h-52 mx-auto"
                    />
                  </div>
                  {/* <div className="flex w-full justify-center items-center gap-5"> */}
                  {/*   <button */}
                  {/*     type="button" */}
                  {/*     className="bg-black text-white w-12 h-9 rounded-lg flex items-center justify-center" */}
                  {/*   > */}
                  {/*     <TbEdit size={20} /> */}
                  {/*   </button>{" "} */}
                  {/*   <button */}
                  {/*     type="button" */}
                  {/*     className="bg-black text-white w-12 */}
                  {/*     h-9 rounded-lg flex items-center justify-center" */}
                  {/*   > */}
                  {/*     <MdOutlineFileDownload size={22} /> */}
                  {/*   </button>{" "} */}
                  {/*   <button */}
                  {/*     type="button" */}
                  {/*     className="bg-black text-white w-12 h-9 rounded-lg flex items-center justify-center" */}
                  {/*   > */}
                  {/*     <BsFillSendFill size={15} /> */}
                  {/*   </button> */}
                  {/* </div> */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginTop: "20px",
                      flexDirection: "column",
                    }}
                    className="w-full"
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                      className=" w-full px-10"
                    >
                      <input
                        type="text"
                        value={imageUrl}
                        style={{
                          fontSize: "16px",
                          borderRadius: "20px",
                          border: "1px solid #ccc",
                          width: "full",
                        }}
                        className="w-full rounded-full pl-4 pr-14 py-2 "
                      />
                      <button
                        onClick={handleCopy}
                        style={{
                          padding: "8px 12px",
                          fontSize: "16px",
                          // Green color for the button
                          // backgroundColor: "#28a745",
                          color: "#fff",
                          cursor: "pointer",
                          position: "absolute",
                          overflow: "hidden",
                        }}
                        className="right-[17%] border-l-2 border-gray-200"
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
                  {/* <div> */}
                  {/*   <p className="font-bold">Share Your QR Code Link Via</p> */}
                  {/*   <p className="text-sm text-gray-500 my-3 font-medium"> */}
                  {/*     Select from our wide variety of links and contact info */}
                  {/*     below. */}
                  {/*   </p> */}
                  {/* </div> */}
                  {/**/}
                  {/* {error ? ( */}
                  {/*   <p className="text-sm font-medium text-red-600">{error}</p> */}
                  {/* ) : ( */}
                  {/*   <> */}
                  {/*     {loading ? ( */}
                  {/*       <Spinner size="sm" color="secondary" /> */}
                  {/*     ) : ( */}
                  {/*       <div className="flex items-center gap-4 justify-center"> */}
                  {/*         <FacebookShareButton url={imageUrl}> */}
                  {/*           <FacebookIcon size={38} round /> */}
                  {/*         </FacebookShareButton> */}
                  {/**/}
                  {/*         <WhatsappShareButton url={imageUrl}> */}
                  {/*           <WhatsappIcon size={38} round /> */}
                  {/*         </WhatsappShareButton> */}
                  {/**/}
                  {/*         <LinkedinShareButton url={imageUrl}> */}
                  {/*           <LinkedinIcon size={38} round /> */}
                  {/*         </LinkedinShareButton> */}
                  {/**/}
                  {/*         <TwitterShareButton url={imageUrl}> */}
                  {/*           <XIcon size={38} round /> */}
                  {/*         </TwitterShareButton> */}
                  {/**/}
                  {/*         <TelegramShareButton url={imageUrl}> */}
                  {/*           <TelegramIcon size={38} round /> */}
                  {/*         </TelegramShareButton> */}
                  {/*       </div> */}
                  {/*     )} */}
                  {/*   </> */}
                  {/* )} */}
                </ModalBody>
              </div>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  ) : (
    <>
      {/* this QR modal is for smartsite */}
      {isOpen && (
        <>
          <Modal
            size="xl"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop={"blur"}
          >
            <ModalContent>
              <div className="w-[91%] mx-auto py-12">
                <ModalBody className="text-center">
                  <div>
                    <p className="font-bold">Your QR Code</p>
                    <Image
                      src={qrCodeUrl}
                      alt="qrcode"
                      width={300}
                      height={300}
                      className="w-52 h-52 mx-auto"
                    />
                  </div>
                  <div className="flex w-full justify-center items-center gap-5">
                    <Link
                      href={`/smartsite/qr-code/${micrositeIdforEditingQR}`}
                    >
                      <button
                        type="button"
                        className="bg-black text-white w-12 h-9 rounded-lg flex items-center justify-center"
                      >
                        <TbEdit size={20} />
                      </button>
                    </Link>
                    <button
                      type="button"
                      className="bg-black text-white w-12 h-9 rounded-lg flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(qrCodeUrl);
                      }}
                    >
                      <MdOutlineFileDownload size={22} />
                    </button>{" "}
                    <button
                      onClick={handleCopy}
                      type="button"
                      className="bg-black text-white w-12 h-9 rounded-lg flex items-center justify-center"
                    >
                      <BsFillSendFill size={15} />
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginTop: "20px",
                      flexDirection: "column",
                    }}
                    className="w-full"
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                      className=" w-full px-10"
                    >
                      <input
                        type="text"
                        value={imageUrl}
                        style={{
                          fontSize: "16px",
                          borderRadius: "20px",
                          border: "1px solid #ccc",
                          width: "full",
                        }}
                        className="w-full rounded-full pl-4 pr-14 py-2 "
                      />
                      <button
                        onClick={handleCopy}
                        style={{
                          padding: "8px 12px",
                          fontSize: "16px",
                          // Green color for the button
                          // backgroundColor: "#28a745",
                          color: "#fff",
                          cursor: "pointer",
                          position: "absolute",
                          overflow: "hidden",
                        }}
                        className="right-[17%] border-l-2 border-gray-200"
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
                  {/* <div> */}
                  {/*   <p className="font-bold">Share Your QR Code Link Via</p> */}
                  {/*   <p className="text-sm text-gray-500 my-3 font-medium"> */}
                  {/*     Select from our wide variety of links and contact info */}
                  {/*     below. */}
                  {/*   </p> */}
                  {/* </div> */}
                  {/**/}
                  {/* {error ? ( */}
                  {/*   <p className="text-sm font-medium text-red-600">{error}</p> */}
                  {/* ) : ( */}
                  {/*   <> */}
                  {/*     {loading ? ( */}
                  {/*       <Spinner size="sm" color="secondary" /> */}
                  {/*     ) : ( */}
                  {/*       <div className="flex items-center gap-4 justify-center"> */}
                  {/*         <FacebookShareButton url={imageUrl}> */}
                  {/*           <FacebookIcon size={38} round /> */}
                  {/*         </FacebookShareButton> */}
                  {/**/}
                  {/*         <WhatsappShareButton url={imageUrl}> */}
                  {/*           <WhatsappIcon size={38} round /> */}
                  {/*         </WhatsappShareButton> */}
                  {/**/}
                  {/*         <LinkedinShareButton url={imageUrl}> */}
                  {/*           <LinkedinIcon size={38} round /> */}
                  {/*         </LinkedinShareButton> */}
                  {/**/}
                  {/*         <TwitterShareButton url={imageUrl}> */}
                  {/*           <XIcon size={38} round /> */}
                  {/*         </TwitterShareButton> */}
                  {/**/}
                  {/*         <TelegramShareButton url={imageUrl}> */}
                  {/*           <TelegramIcon size={38} round /> */}
                  {/*         </TelegramShareButton> */}
                  {/*       </div> */}
                  {/*     )} */}
                  {/*   </> */}
                  {/* )} */}
                </ModalBody>
              </div>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
}
