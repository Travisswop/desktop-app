'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  CirclePlus,
  Edit,
  QrCode,
  Send,
  Settings,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import isUrl from '@/lib/isUrl';
import { useState } from 'react';
import SmartSiteUrlShareModal from '../smartsite/socialShare/SmartsiteShareModal';
import { useDisclosure } from '@nextui-org/react';
import QRCodeShareModal from '../smartsite/socialShare/QRCodeShareModal';
interface Lead {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
}

interface SmarsiteInfos {
  _id: string;
  name: string;
  profilePic: string;
  backgroundImg: string;
  bio: string;
  profileUrl: string;
  qrcodeUrl: string;
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

  console.log('Microsites', microsites);

  const [smartSiteProfileUrl, setSmartSiteProfileUrl] =
    useState<any>(null);
  const [qrCode, setQrCode] = useState<any>(null);

  const handleShareMicrosite = (smartsiteUrl: string) => {
    console.log('smartsiteUrl', smartsiteUrl);
    onSmartsiteOpen();
    setQrCode(null);
    setSmartSiteProfileUrl(smartsiteUrl);
  };

  const handleShareQrCode = (qrCode: string) => {
    onOpen();
    setSmartSiteProfileUrl(null);
    setQrCode(qrCode);
  };

  return (
    <div className="w-full ">
      <Carousel
        className="w-full "
        opts={{
          align: 'start',
        }}
      >
        <CarouselContent className="">
          {microsites.map((item: any) => (
            <CarouselItem key={item._id} className="">
              <Card className="bg-white border-0 ">
                <CardHeader className="">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">
                      Smartsites
                    </h2>
                    <Link
                      href={`/smartsite/icons/${item._id}`}
                      className="flex items-center border px-4 py-1.5 rounded-lg"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Sites
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0 py-6 mx-10 ">
                  <div
                    style={{
                      backgroundImage: item.theme
                        ? `url(${
                            isUrl(item.backgroundImg)
                              ? item.backgroundImg
                              : `/images/smartsite-background/${item.backgroundImg}.png`
                          }) `
                        : '',
                      backgroundSize: 'cover', // Scale the image to cover the container
                      backgroundPosition: 'center', // Center the image
                      height: 'full', // Full viewport height
                      backgroundRepeat: 'no-repeat',
                    }}
                    className="shadow-medium rounded-2xl "
                  >
                    <div className="relative p-6 ">
                      {item.theme === false ? (
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
                      )}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                        <Image
                          src={`${
                            isUrl(item.profilePic)
                              ? item.profilePic
                              : `/images/user_avator/${item.profilePic}.png`
                          }?height=120&width=120`}
                          alt={item.name}
                          width={120}
                          height={120}
                          className="rounded-full border-4 border-white"
                        />
                      </div>
                    </div>

                    <div className="pt-10 px-4 pb-4 text-center">
                      <h3 className="font-semibold">{item.name}</h3>
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
                          onClick={() =>
                            handleShareMicrosite(item.profileUrl)
                          }
                        >
                          <Send />
                        </Button>
                        <Button
                          variant="black"
                          size="icon"
                          className="rounded-xl"
                          onClick={() =>
                            handleShareQrCode(item.qrcodeUrl)
                          }
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
                  <div className="mt-8 flex justify-center">
                    <Image
                      src={item.qrcodeUrl}
                      alt="Qr code"
                      height={120}
                      width={120}
                      className=" rounded-2xl border-black border-2"
                    />
                  </div>
                  <div className="flex justify-center mt-8">
                    <Link href="/smartsite/create-smartsite">
                      <Button
                        variant="black"
                        className="gap-2 font-bold"
                      >
                        <CirclePlus className="h-6 w-6" />
                        Create Microsite
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-5 -translate-x-1/2" />
        <CarouselNext className="absolute right-5 translate-x-1/2" />
      </Carousel>
    </div>
  );
}
