import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const MintCart = ({
  img,
  title,
  subtitle,
  text,
  collectionId,
  templateId,
  description,
}: {
  img: string; // Updated to specify a string type for the image URL
  title: string;
  subtitle?: string;
  text?: string;
  collectionId: string; // Added to pass collection ID
  templateId: string; // Added to pass template ID
  description: string;
}) => {
  const handleClick = () => {
    const localStorageKey = 'swop_desktop_cart_item_list';

    // Retrieve the existing cart items from local storage
    const existingCart = JSON.parse(
      localStorage.getItem(localStorageKey) || '[]'
    );

    // Ensure the value is an array
    const updatedCart = Array.isArray(existingCart)
      ? existingCart
      : [];

    // Add the current collectionId and templateId to the cart if it doesn't already exist
    if (
      !updatedCart.some(
        (item: { collectionId: string; templateId: string }) =>
          item.collectionId === collectionId &&
          item.templateId === templateId
      )
    ) {
      updatedCart.push({ collectionId, templateId });
    }

    // Update the local storage with the modified cart
    localStorage.setItem(
      localStorageKey,
      JSON.stringify(updatedCart)
    );
    alert('Item added to your cart!');
  };

  return (
    <div className="shadow-medium rounded-lg px-5 py-6">
      <Link
        href={`/mint/${templateId}`}
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
