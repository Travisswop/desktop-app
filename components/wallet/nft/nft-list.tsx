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
import { AlertCircle, ChevronRight } from 'lucide-react';
import { NFT } from '@/types/nft';

type Network = 'ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA';

interface NftListProps {
  onSelectNft: (nft: NFT) => void;
  address: string | undefined;
  network: Network;
  nfts: NFT[];
  loading: boolean;
  error: Error | null;
}

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-center gap-2">
    <AlertCircle className="w-5 h-5 text-red-500" />
    <p className="text-sm text-red-600">{message}</p>
  </div>
);

const LoadingSkeleton = () => {
  const skeletonItems = Array(3).fill(0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ">
      {skeletonItems.map((_, i) => (
        <div key={i} className="space-y-2">
          <div
            className={`h-[150px] bg-gray-300 animate-pulse rounded-xl`}
          ></div>
          <div className="h-[10px] bg-gray-300 animate-pulse rounded-xl"></div>
          <div className="h-[20px] bg-gray-300 animate-pulse rounded-xl"></div>
        </div>
      ))}
    </div>
  );
};

export default function NFTSlider({
  onSelectNft,
  address,
  network,
  nfts,
  loading,
  error,
}: NftListProps) {
  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <CardTitle>Digitals (NFTs)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton />}
        {error && (
          <ErrorAlert message="NFTs couldn't be loaded. Please try again later." />
        )}
        {!loading && !error && nfts.length === 0 && (
          <p className="text-center text-gray-500">
            No NFTs available.
          </p>
        )}
        {!loading && !error && nfts.length > 0 && nfts.length < 2 && (
          <div className="text-center">
            <Card
              className="border-0 shadow-sm cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onSelectNft(nfts[0])}
            >
              <CardContent className="p-2 space-y-2">
                <div className="flex flex-col items-center justify-center">
                  <Image
                    src={nfts[0].image}
                    alt={nfts[0].name}
                    width={200}
                    height={200}
                  />
                </div>
                <h3 className="font-medium">{nfts[0].name}</h3>
                <p className="text-sm text-muted-foreground mt-1 truncate-2-lines">
                  {nfts[0].description}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        {!loading && !error && nfts.length >= 2 && (
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
                  key={nft.contract}
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
                          alt={nft.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium truncate">
                            {nft.name}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate-2-lines">
                          {nft.description}
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
        )}
      </CardContent>
    </Card>
  );
}
