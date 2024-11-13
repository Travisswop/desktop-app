'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  description: string;
}

const nfts: NFT[] = [
  {
    id: '1',
    type: 'Watch',
    creator: 'AstrosWorld',
    image: '/assets/nfts/watch.png?height=300&width=300',
    description:
      'Ullamcorper feugiat morbi volutpat vulputate fringilla ultrices sceleris que eget amet, arcu nisl, diam proin hendrerit duis',
  },
  {
    id: '2',
    type: 'Nice T-Shirt',
    creator: 'Mask_man',
    image: '/assets/nfts/shirt.png?height=300&width=300',
    description:
      'Ullamcorper feugiat morbi volutpat vulputate fringilla ultrices sceleris que eget amet, arcu nisl, diam proin hendrerit duis',
  },
  {
    id: '3',
    type: 'Sunglass',
    creator: 'Jelly with monkey',
    image: '/assets/nfts/sunglass.png?height=300&width=300',
    description:
      'Ullamcorper feugiat morbi volutpat vulputate fringilla ultrices sceleris que eget amet, arcu nisl, diam proin hendrerit duis',
  },
  // Add more NFTs as needed
];

interface NftListProps {
  onSelectNft: (nft: NFT) => void;
}

export default function NFTSlider({ onSelectNft }: NftListProps) {
  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <CardTitle>Digitals (NFTs)</CardTitle>
      </CardHeader>

      <CardContent>
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
                <Card
                  className="border-0 shadow-sm cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => onSelectNft(nft)}
                >
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
      </CardContent>
    </Card>
  );
}

export { nfts, type NFT };
