import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const MintCart = ({
  img,
  title,
  collectionId,
  description,
}: {
  img: string; // Updated to specify a string type for the image URL
  title: string;
  collectionId: string; // Added to pass collection ID
  description: string;
}) => {
  return (
    <div className="shadow-medium rounded-lg px-5 py-6">
      <Link
        href={`/mint/${collectionId}`}
        className="flex justify-center mb-3"
      >
        <Image
          alt="coupon mit image"
          src={img}
          width={220}
          height={220}
        />
      </Link>
      <div className="flex flex-col gap-1 items-center">
        <h4 className="text-lg font-bold text-gray-700">{title}</h4>
        <p className="text-sm text-gray-500 font-medium line-clamp-3">
          {description}
        </p>
      </div>
    </div>
  );
};

export default MintCart;
