'use client';

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { CartItemsListProps } from './types';
import { CartItem } from './CartItem';

const muted = '#6e6e76';
const hair = 'rgba(0,0,0,0.06)';

export const CartItemsList: React.FC<CartItemsListProps> = ({
  cartItems,
  loadingOperations,
  onUpdate,
  onRemove,
}) => {
  if (cartItems.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          border: `1px dashed ${hair}`,
          borderRadius: 18,
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#f4f4f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          <ShoppingBag size={20} color={muted} />
        </div>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#0a0a0c',
            marginTop: 14,
            marginBottom: 4,
            letterSpacing: -0.2,
          }}
        >
          Your cart is empty
        </h3>
        <p
          style={{
            fontSize: 12.5,
            color: muted,
            maxWidth: 320,
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          Browse the storefront and add items to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
