'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { CirclePlus, Edit, QrCode, Send, Wallet } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
}

interface SmarsiteInfos {
  id: string;
  name: string;
  image: string;
  background: string;
  leads: Lead[];
}

const leads: Lead[] = [
  {
    id: '1',
    name: 'Jakob Rhiel Madsen',
    title: 'Marketing Officer',
    phone: '(336567-6403)',
    email: 'jakobrhiel@gmail.com',
  },
  {
    id: '2',
    name: 'Jakob Rhiel Madsen',
    title: 'Marketing Officer',
    phone: '(336567-6403)',
    email: 'jakobrhiel@gmail.com',
  },
  {
    id: '3',
    name: 'Jakob Rhiel Madsen',
    title: 'Marketing Officer',
    phone: '(336567-6403)',
    email: 'jakobrhiel@gmail.com',
  },
];

const smarSiteInfos: SmarsiteInfos[] = [
  {
    id: 'travis',
    name: 'Travis Herron',
    image: '/assets/images/avatar.png',
    background: '/assets/images/cover-photo/1.png',
    leads: leads,
  },
  {
    id: 'rakib',
    name: 'Rakibul Islam',
    image: '/assets/images/sadit.png',
    background: '/assets/images/cover-photo/2.png',
    leads: leads,
  },
];

export default function SmartSiteSlider() {
  return (
    <div>
      <Carousel
        className="w-full"
        opts={{
          align: 'start',
        }}
      >
        <CarouselContent>
          {smarSiteInfos.map((item) => (
            <CarouselItem key={item.id}>
              <Card className="bg-white border-0">
                <CardContent className="p-6">
                  <div className="bg-white  shadow-xl rounded-2xl ">
                    <div className="relative p-6">
                      <Image
                        src={`${item.background}?height=180&width=400`}
                        alt="Mountain background"
                        width={400}
                        height={180}
                        className="w-full h-[180px]  rounded-xl border-white border-4 shadow-xl"
                      />
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                        <Image
                          src={`${item.image}?height=120&width=120`}
                          alt="Profile"
                          width={120}
                          height={120}
                          className="rounded-full border-4 border-white"
                        />
                      </div>
                    </div>

                    <div className="pt-10 px-4 pb-4 text-center">
                      <h3 className="font-semibold">Travis Herron</h3>
                      <p className="text-sm text-muted-foreground">
                        Founder & CEO at SWOP
                      </p>

                      <div className="flex justify-center gap-2 my-4">
                        <Button
                          variant="black"
                          size="icon"
                          className="rounded-xl"
                        >
                          <Edit />
                        </Button>
                        <Button
                          variant="black"
                          size="icon"
                          className="rounded-xl"
                        >
                          <Send />
                        </Button>
                        <Button
                          variant="black"
                          size="icon"
                          className="rounded-xl"
                        >
                          <QrCode />
                        </Button>
                        <Button
                          variant="black"
                          size="icon"
                          className="rounded-xl"
                        >
                          <Wallet />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="black"
                      className="gap-2 font-bold"
                    >
                      <CirclePlus className="h-6 w-6" />
                      Create Microsite
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-0 -translate-x-1/2" />
        <CarouselNext className="absolute right-0 translate-x-1/2" />
      </Carousel>
    </div>
  );
}
