'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
} from '@/components/ui/carousel';
import { ChevronRight } from 'lucide-react';

interface NFT {
  id: string;
  type: string;
  creator: string;
  image: string;
}

const nfts: NFT[] = [
  {
    id: '1',
    type: 'Watch',
    creator: 'AstrosWorld',
    image: '/assets/nfts/watch.png?height=300&width=300',
  },
  {
    id: '2',
    type: 'Nice T-Shirt',
    creator: 'Mask_man',
    image: '/assets/nfts/shirt.png?height=300&width=300',
  },
  {
    id: '3',
    type: 'Sunglass',
    creator: 'Jelly with monkey',
    image: '/assets/nfts/sunglass.png?height=300&width=300',
  },
  // Add more NFTs as needed
];

export default function NFTSlider() {
  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-white rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Digitals (NFTs)
        </h2>
      </div>

      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {nfts.map((nft) => (
            <CarouselItem
              key={nft.id}
              className="pl-2 md:pl-4 md:basis-1/3 lg:basis-1/3"
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    <Image
                      src={nft.image}
                      alt={nft.type}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <h3 className="font-medium">{nft.type}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {nft.creator}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNext className="hidden md:flex -right-12 bg-white shadow-lg border-0">
          <ChevronRight className="h-4 w-4" />
        </CarouselNext>
      </Carousel>
    </div>
  );
}
