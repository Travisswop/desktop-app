'use client';

import React from 'react';
import { CartItemsListProps } from './types';
import { CartItem } from './CartItem';

export const CartItemsList: React.FC<CartItemsListProps> = ({
  cartItems,
  loadingOperations,
  onUpdate,
  onRemove,
}) => {
  if (cartItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 space-y-2">
      {cartItems.map((item) => (
        <CartItem
          key={item._id}
          item={item}
          loadingOperations={loadingOperations}
          onUpdateQuantity={(id, quantity) =>
            onUpdate(item, quantity > item.quantity ? 'inc' : 'dec')
          }
          onRemoveItem={onRemove}
        />
      ))}
    </div>
  );
};
