'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
} from '@/components/ui/carousel';
import {
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { NFT } from '@/types/nft';
import { Button } from '@/components/ui/button';

interface NftListProps {
  onSelectNft: (nft: NFT) => void;
  address: string | undefined;
  nfts: NFT[];
  loading: boolean;
  error: Error | null;
  refetch?: () => void;
}

const ErrorAlert = ({
  message,
  onRetry,
  isNetworkError = false,
}: {
  message: string;
  onRetry?: () => void;
  isNetworkError?: boolean;
}) => (
  <div className="mb-4 p-4 bg-red-50 rounded-lg">
    <div className="flex items-start gap-3">
      {isNetworkError ? (
        <WifiOff className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-grow">
        <p className="text-sm text-red-600 mb-2">{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  </div>
);

const LoadingSkeleton = () => {
  const skeletonItems = Array(3).fill(0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {skeletonItems.map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-[150px] bg-gray-300 animate-pulse rounded-xl"></div>
          <div className="h-[10px] bg-gray-300 animate-pulse rounded-xl"></div>
          <div className="h-[20px] bg-gray-300 animate-pulse rounded-xl"></div>
        </div>
      ))}
    </div>
  );
};

const EmptyState = ({ hasAddress }: { hasAddress: boolean }) => (
  <div className="text-center py-8">
    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
      <Wifi className="w-8 h-8 text-gray-400" />
    </div>
    {hasAddress ? (
      <>
        <p className="text-gray-600 font-medium mb-1">
          No NFTs found
        </p>
        <p className="text-sm text-gray-500">
          This wallet doesn&apos;t contain any NFTs or they
          haven&apos;t loaded yet.
        </p>
      </>
    ) : (
      <>
        <p className="text-gray-600 font-medium mb-1">
          Connect your wallet
        </p>
        <p className="text-sm text-gray-500">
          Connect a wallet to view your NFT collection.
        </p>
      </>
    )}
  </div>
);

export default function NFTSlider({
  onSelectNft,
  address,
  nfts,
  loading,
  error,
  refetch,
}: NftListProps) {
  const getErrorMessage = (error: Error) => {
    const errorMessage = error.message.toLowerCase();

    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch')
    ) {
      return {
        message:
          'Network connection issue. Please check your internet connection and try again.',
        isNetworkError: true,
      };
    }

    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429')
    ) {
      return {
        message:
          'API rate limit reached. Please wait a moment and try again.',
        isNetworkError: false,
      };
    }

    if (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('401')
    ) {
      return {
        message:
          'API authentication failed. Please check your configuration.',
        isNetworkError: false,
      };
    }

    return {
      message:
        'Unable to load NFTs. Our team has been notified and is working on a fix.',
      isNetworkError: false,
    };
  };

  const errorInfo = error ? getErrorMessage(error) : null;

  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="font-bold text-xl text-gray-700">
            Digitals (NFTs)
          </p>
          <div className="flex items-center gap-2">
            {!loading && nfts.length > 0 && (
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {nfts.length} item
                {nfts.length !== 1 ? 's' : ''}
              </span>
            )}
            {refetch && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetch();
                }}
                disabled={loading}
                className="border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    loading ? 'animate-spin' : ''
                  }`}
                />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton />}

        {error && errorInfo && (
          <ErrorAlert
            message={errorInfo.message}
            onRetry={refetch}
            isNetworkError={errorInfo.isNetworkError}
          />
        )}

        {!loading && !error && nfts.length === 0 && (
          <EmptyState hasAddress={!!address} />
        )}

        {!loading && !error && nfts.length > 0 && nfts.length < 2 && (
          <div className="flex justify-center">
            <Card
              className="border-0 shadow-sm cursor-pointer hover:shadow-lg transition-shadow max-w-xs"
              onClick={() => onSelectNft(nfts[0])}
            >
              <CardContent className="p-4 space-y-3">
                <div className="relative aspect-square overflow-hidden rounded-lg">
                  <Image
                    src={nfts[0].image}
                    alt={nfts[0].name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 300px"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/placeholder-nft.png';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-medium text-center line-clamp-2">
                    {nfts[0].name}
                  </h3>
                  {nfts[0].collection?.collectionName && (
                    <p className="text-xs text-gray-500 text-center mt-1">
                      {nfts[0].collection.collectionName}
                    </p>
                  )}
                </div>
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
              {nfts.map((nft, index) => (
                <CarouselItem
                  key={`${nft.contract}-${nft.tokenId}-${index}`}
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
                          onError={(e) => {
                            const target =
                              e.target as HTMLImageElement;
                            target.src =
                              '/images/placeholder-nft.png';
                          }}
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium truncate flex-grow">
                            {nft.name}
                          </h3>
                        </div>
                        {nft.collection?.collectionName && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {nft.collection.collectionName}
                          </p>
                        )}
                        {nft.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {nft.description}
                          </p>
                        )}
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
