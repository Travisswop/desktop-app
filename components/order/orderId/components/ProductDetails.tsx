import React, { memo } from 'react';
import { Card, CardBody, CardHeader } from '@nextui-org/react';
import Image from 'next/image';
import { NFT } from '../types/order.types';

interface ListItemProps {
  item: string;
}

const ListItem: React.FC<ListItemProps> = memo(({ item }) => (
  <li className="text-sm tracking-tight ml-0.5">{item}</li>
));

ListItem.displayName = 'ListItem';

interface NFTDetailSectionProps {
  nft: NFT;
}

export const NFTDetailSection: React.FC<NFTDetailSectionProps> = memo(
  ({ nft }) => {
    // Arrays to render with their labels
    const sections = [
      { label: 'Benefits', items: nft.benefits || [] },
      { label: 'Requirements', items: nft.requirements || [] },
      { label: 'Content', items: nft.content || [] },
      { label: 'Addons', items: nft.addons || [] },
    ];

    return (
      <Card className="w-full">
        <CardHeader className="pb-0">
          <div className="flex flex-col">
            <p className="text-lg font-bold">
              {nft?.name || 'Unnamed Product'}
            </p>
            <p className="text-sm text-gray-500">
              Price: ${nft?.price?.toFixed(2) || '0.00'} ×{' '}
              {nft?.quantity || 0}
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              {nft?.image ? (
                <div className="relative w-full h-48">
                  <Image
                    src={nft.image}
                    alt={nft.name || 'Product'}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder.svg';
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">
                    No image available
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-4">
              <div>
                <p className="text-base font-semibold text-gray-500">
                  Description
                </p>
                <p className="text-sm text-gray-900">
                  {nft?.description || 'No description provided'}
                </p>
              </div>

              {sections.map((section, idx) =>
                section.items.length > 0 ? (
                  <div key={idx}>
                    <p className="text-base font-semibold text-gray-500">
                      {section.label}
                    </p>
                    <ul className="list-disc list-inside text-gray-900 space-y-1">
                      {section.items.map((item, itemIdx) => (
                        <ListItem key={itemIdx} item={item} />
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }
);

NFTDetailSection.displayName = 'NFTDetailSection';

interface ProductDetailsProps {
  nfts: NFT[] | null;
}

export const ProductDetails: React.FC<ProductDetailsProps> = memo(
  ({ nfts }) => {
    return (
      <div className="w-full bg-white rounded p-4 shadow-sm">
        <div className="space-y-8">
          {nfts && nfts.length > 0 ? (
            nfts.map((item, idx) => (
              <NFTDetailSection key={idx} nft={item} />
            ))
          ) : (
            <p className="text-gray-500 italic">
              No product details available
            </p>
          )}
        </div>
      </div>
    );
  }
);

ProductDetails.displayName = 'ProductDetails';
