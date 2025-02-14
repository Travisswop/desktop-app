// app/components/MintDetails.tsx
'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { Accordion, AccordionItem } from '@nextui-org/react';
import { HiOutlineBars3BottomLeft } from 'react-icons/hi2';
import Link from 'next/link';
import { LucideBarChartHorizontalBig, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NFTAttributes {
  trait_type: string;
  value: string;
}

interface NFTDetails {
  image: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  supplyLimit: number;
  attributes?: NFTAttributes[];
  creator?: string;
  tokenId?: string;
  collectionName?: string;
}

const MintDetails = ({
  templateDetails,
}: {
  templateDetails: NFTDetails[];
}) => {
  return (
    <div className="main-container">
      <div className="bg-white py-10">
        <div className="max-w-7xl mx-auto px-4">
          {/* Collection Stats */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-6">
              Collection Stats
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-gray-500">
                    Total Items
                  </div>
                  <div className="text-2xl font-bold">
                    {templateDetails.length}
                  </div>
                </CardContent>
              </Card>
              {/* <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-gray-500">
                    Floor Price
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.min(
                      ...templateDetails.map((nft) => nft.price)
                    )}{' '}
                    {templateDetails[0]?.currency}
                  </div>
                </CardContent>
              </Card> */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-gray-500">
                    Total Volume
                  </div>
                  <div className="text-2xl font-bold">
                    {templateDetails.reduce(
                      (acc, nft) => acc + nft.price,
                      0
                    )}{' '}
                    {templateDetails[0]?.currency}
                  </div>
                </CardContent>
              </Card>
              {/* <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-gray-500">
                    Supply Limit
                  </div>
                  <div className="text-2xl font-bold">
                    {templateDetails[0]?.supplyLimit || 'Unlimited'}
                  </div>
                </CardContent>
              </Card> */}
            </div>
          </div>

          {/* NFT Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templateDetails.map((nft, index) => (
              <Card
                key={index}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-0">
                  <div className="relative aspect-square">
                    <Image
                      src={nft.image}
                      alt={nft.name}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-t-lg"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <h4 className="text-lg font-bold text-gray-700">
                        {nft.name}
                      </h4>
                      <p className="text-sm text-gray-500 font-medium line-clamp-3">
                        {nft.description}
                      </p>
                    </div>

                    <div className="flex justify-between items-center my-4">
                      <div>
                        <p className="text-sm text-gray-500">Price</p>
                        <p className="font-bold">
                          {nft.price} {nft.currency}
                        </p>
                      </div>
                      {nft.supplyLimit && (
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            Mint Limit
                          </p>
                          <p className="font-mono text-sm">
                            #{nft.supplyLimit}
                          </p>
                        </div>
                      )}
                    </div>

                    {nft.attributes && nft.attributes.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">
                          Attributes
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {nft.attributes
                            .slice(0, 3)
                            .map((attr, idx) => (
                              <div
                                key={idx}
                                className="bg-gray-100 rounded-full px-3 py-1 text-xs"
                              >
                                {attr.trait_type}: {attr.value}
                              </div>
                            ))}
                          {nft.attributes.length > 3 && (
                            <div className="bg-gray-100 rounded-full px-3 py-1 text-xs">
                              +{nft.attributes.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* <Button className="w-full" variant="outline">
                      Mint Now
                    </Button> */}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MintDetails;
