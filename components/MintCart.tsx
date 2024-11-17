import Image from "next/image";
import Link from "next/link";
import React from "react";

const MintCart = ({
  img,
  title,
  subtitle,
  text,
  collectionId,
  templateId,
}: {
  img: any;
  title: string;
  subtitle?: string;
  text?: string;
  collectionId: string; // Added to pass collection ID
  templateId: string; // Added to pass template ID
}) => {
  return (
    <div className="shadow-medium rounded-lg px-5 py-6">
      <Link href={`/mint/${collectionId}/${templateId}`} className="flex justify-center mb-3">
        <Image alt="coupon mit image" src={img} width={220} height={220} />
      </Link>
      <div className="flex flex-col gap-1 items-start">
        <h4 className="text-lg font-bold text-gray-700">{title}</h4>
        {subtitle ? (
          <p className="text-green-500 font-semibold">{subtitle}</p>
        ) : (
          <button className="text-[#1C83E5] font-semibold">
            Click to Claim
          </button>
        )}
        <p className="text-sm text-gray-500 font-medium">{text}</p>
      </div>
    </div>
  );
};

export default MintCart;
