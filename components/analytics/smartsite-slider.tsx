"use client";

import * as React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Edit, QrCode, Send, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import isUrl from "@/lib/isUrl";
import { useState } from "react";
import SmartSiteUrlShareModal from "../smartsite/socialShare/SmartsiteShareModal";
import { useDisclosure } from "@nextui-org/react";
import QRCodeShareModal from "../smartsite/socialShare/QRCodeShareModal";
import filePlus from "@/public/images/file-plus.png";

// interface Lead {
//   id: string;
//   name: string;
//   title: string;
//   phone: string;
//   email: string;
// }

interface SmarsiteInfos {
  _id: string;
  name: string;
  profilePic: string;
  backgroundImg: string;
  bio: string;
  profileUrl: string;
  qrcodeUrl: string;
  theme: boolean;
}

export default function SmartSiteSlider({
  microsites,
}: {
  microsites: SmarsiteInfos[];
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isSmartsiteOpen,
    onOpen: onSmartsiteOpen,
    onOpenChange: onSmartsiteOpenChange,
  } = useDisclosure();

  const [smartSiteProfileUrl, setSmartSiteProfileUrl] = useState<string | null>(
    null
  );
  const [qrCode, setQrCode] = useState<string | null>(null);

  const handleShareMicrosite = (smartsiteUrl: string) => {
    console.log("smartsiteUrl", smartsiteUrl);
    onSmartsiteOpen();
    setQrCode(null);
    setSmartSiteProfileUrl(smartsiteUrl);
  };

  const handleShareQrCode = (qrCode: string) => {
    console.log("🚀 ~ handleShareQrCode ~ qrCode:", qrCode);
    setQrCode(qrCode); // Ensure this is the correct QR code URL
    onOpen(); // Open the modal after setting the QR code
  };

  return (
    <div className="w-full ">
      <Carousel
        className="w-full "
        opts={{
          align: "start",
        }}
      >
        <CarouselContent className="">
          {microsites.map((item: SmarsiteInfos) => (
            <CarouselItem key={item._id} className="">
              <Card className="bg-white border-0 ">
                <CardHeader className="">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Smartsites</h2>
                    <Link
                      href={`/smartsite/icons/${item._id}`}
                      className="flex items-center border border-gray-400 px-4 py-1.5 rounded-lg"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Sites
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0 py-6 mx-14 xl:mx-16 2xl:mx-20 ">
                  <div
                    // style={{
                    //   backgroundImage: item.theme
                    //     ? `url(${
                    //         isUrl(item.backgroundImg)
                    //           ? item.backgroundImg
                    //           : `/images/smartsite-background/${item.backgroundImg}.png`
                    //       }) `
                    //     : "",
                    //   backgroundSize: "cover", // Scale the image to cover the container
                    //   backgroundPosition: "center", // Center the image
                    //   height: "full", // Full viewport height
                    //   backgroundRepeat: "no-repeat",
                    // }}
                    className="shadow-medium rounded-2xl bg-neutral-100 border-none"
                  >
                    <div className="flex justify-center pt-10">
                      {/* {item.theme === false ? (
                        <Image
                          src={`${
                            isUrl(item.backgroundImg)
                              ? item.backgroundImg
                              : `/images/smartsite-banner/${item.backgroundImg}.png`
                          }?height=180&width=400`}
                          alt={item.name}
                          width={400}
                          height={180}
                          className="w-full h-[180px] rounded-xl border-white border-4 shadow-xl"
                        />
                      ) : (
                        <div className="w-full h-40"></div>
                      )} */}
                      {/* <div className="absolute -bottom-8 left-1/2 -translate-x-1/2"> */}
                      <div className="w-24 2xl:w-28 h-24 2xl:h-28 rounded-full">
                        <Image
                          src={`${
                            isUrl(item.profilePic)
                              ? item.profilePic
                              : `/images/user_avator/${item.profilePic}@3x.png`
                          }`}
                          alt={item.name}
                          width={300}
                          height={300}
                          className="rounded-full shadow-medium p-0.5"
                        />
                      </div>
                      {/* </div> */}
                    </div>

                    <div className="p-3 text-center">
                      <h3 className="font-semibold text-lg mb-0.5">
                        {item.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.bio}
                      </p>

                      <div className="flex justify-center gap-2 my-4">
                        <Link href={`/smartsite/qr-code/${item._id}`}>
                          <Button
                            variant="black"
                            size="icon"
                            className="rounded-xl"
                          >
                            <Edit />
                          </Button>
                        </Link>

                        <Button
                          variant="black"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => handleShareMicrosite(item.profileUrl)}
                        >
                          <Send />
                        </Button>
                        <Button
                          variant="black"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => handleShareQrCode(item.qrcodeUrl)}
                        >
                          <QrCode />
                        </Button>
                        <Button
                          variant="black"
                          size="icon"
                          className="rounded-xl cursor-not-allowed"
                        >
                          <Wallet />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-center">
                    <Image
                      src={item.qrcodeUrl}
                      alt="Qr code"
                      height={120}
                      width={120}
                      className=" rounded-2xl border-black border-2"
                    />
                  </div>
                  <div className="flex justify-center mt-6">
                    {/* <Link href="/smartsite/create-smartsite">
                      <Button variant="black" className="gap-2 font-bold">
                        <CirclePlus className="h-6 w-6" />
                        Create Microsite
                      </Button>
                    </Link> */}
                    <Link href="/create-smartsite">
                      <Button
                        variant="black"
                        className="gap-2 font-bold rounded-xl"
                      >
                        {/* <LiaFileMedicalSolid size={20} /> */}
                        <Image
                          src={filePlus}
                          alt="file-plus"
                          className="w-6 h-6"
                        />
                        Create Microsite
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-6 xl:left-10 -translate-x-1/2 border" />
        <CarouselNext className="absolute right-6 xl:right-10 translate-x-1/2" />
      </Carousel>
      {smartSiteProfileUrl && (
        <SmartSiteUrlShareModal
          isOpen={isSmartsiteOpen}
          onOpenChange={onSmartsiteOpenChange}
          smartSiteProfileUrl={smartSiteProfileUrl}
        />
      )}
      {qrCode && (
        <QRCodeShareModal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          qrCodeUrl={qrCode}
        />
      )}
    </div>
  );
}
