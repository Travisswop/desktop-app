import React from 'react';
import Image from 'next/image';
import { CartItem as CartItemType, LoadingOperations } from './types';
import { Minus, Plus, CircleX, Loader } from 'lucide-react';

interface CartItemProps {
  item: CartItemType;
  loadingOperations: LoadingOperations;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  loadingOperations,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const { quantity } = item;
  const { updating, deleting } = loadingOperations[item._id] || {
    updating: false,
    deleting: false,
  };

  // // Safety check for nftTemplate
  // if (!nftTemplate) {
  //   console.error('Cart item missing nftTemplate:', item);
  //   return null;
  // }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    onUpdateQuantity(item._id, newQuantity);
  };

  const handleRemove = () => {
    onRemoveItem(item._id);
  };

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
          onClick={() => handleQuantityChange(quantity - 1)}
          disabled={updating || quantity <= 1}
          className="p-1 disabled:opacity-50"
          aria-label="Decrease quantity"
        >
          <Minus size={20} />
        </button>
        <span className="w-6 flex justify-center">
          {updating ? (
            <Loader className="animate-spin" size={20} />
          ) : (
            quantity
          )}
        </span>
        <button
          onClick={() => handleQuantityChange(quantity + 1)}
          disabled={updating}
          className="p-1 disabled:opacity-50"
          aria-label="Increase quantity"
        >
          <Plus size={20} />
        </button>
      </div>
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 p-1"
        disabled={deleting}
        aria-label="Remove item"
      >
        {deleting ? (
          <Loader className="animate-spin" size={18} />
        ) : (
          <CircleX size={18} />
        )}
      </button>
    </div>
  );
};
