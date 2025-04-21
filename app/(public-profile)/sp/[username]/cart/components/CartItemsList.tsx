'use client';

import React from 'react';
import Image from 'next/image';
import { Loader, Minus, Plus, CircleX } from 'lucide-react';
import { CartItemsListProps } from './types';

const CartItemsList: React.FC<CartItemsListProps> = ({
  cartItems,
  loadingOperations,
  onUpdate,
  onRemove,
}) => (
  <div className="flex flex-col gap-2 w-full mb-6">
    {cartItems.length > 0 ? (
      cartItems.map((item) => {
        const isUpdating = loadingOperations[item._id]?.updating;
        const isDeleting = loadingOperations[item._id]?.deleting;
        return (
          <div
            key={item._id}
            className="bg-white shadow-medium rounded-xl w-full flex items-center gap-6 justify-between p-3 relative"
          >
            <div className="flex items-center gap-3">
              <Image
                src={item.nftTemplate.image}
                alt={item.nftTemplate.name}
                width={320}
                height={320}
                className="w-32 h-auto rounded"
                loading="lazy"
              />
              <div>
                <p className="text-lg font-semibold mb-1">
                  {item.nftTemplate.name}
                </p>
                <p>${item.nftTemplate.price}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-black">
              <button
                onClick={() => onUpdate(item, 'dec')}
                disabled={isUpdating || item.quantity <= 1}
                className="p-1 disabled:opacity-50"
                aria-label="Decrease quantity"
              >
                <Minus size={20} />
              </button>
              <span className="w-6 flex justify-center">
                {isUpdating ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  item.quantity
                )}
              </span>
              <button
                onClick={() => onUpdate(item, 'inc')}
                disabled={isUpdating}
                className="p-1 disabled:opacity-50"
                aria-label="Increase quantity"
              >
                <Plus size={20} />
              </button>
            </div>
            <button
              onClick={() => onRemove(item._id)}
              className="absolute top-2 right-2 p-1"
              disabled={isDeleting}
              aria-label="Remove item"
            >
              {isDeleting ? (
                <Loader className="animate-spin" size={18} />
              ) : (
                <CircleX size={18} />
              )}
            </button>
          </div>
        );
      })
    ) : (
      <div className="text-lg font-semibold py-10 text-center">
        <p>No Items Found!</p>
        <p className="font-medium text-gray-600">
          Please add an item to continue
        </p>
      </div>
    )}
  </div>
);

export default CartItemsList;
