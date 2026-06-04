import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import CartCheckout from './CartCheckout';
import { CartProvider } from './context/CartContext';

interface Props {
  params: Promise<{ username: string }>;
}

const CartPage = async ({ params }: Props) => {
  const { username } = await params;
  return (
    <div
      style={{
        background: '#f4f4f2',
        minHeight: '100vh',
        padding: '28px 16px 64px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <Link
            href={`/sp/${username}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              color: '#6e6e76',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            Continue shopping
          </Link>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: '#6e6e76',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
            }}
          >
            <ShoppingBag size={12} />
            Cart
          </span>
        </div>

        <h1
          style={{
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: -0.6,
            color: '#0a0a0c',
            margin: 0,
          }}
        >
          Your cart
        </h1>
        <p
          style={{
            fontSize: 13,
            color: '#6e6e76',
            marginTop: 4,
            marginBottom: 24,
          }}
        >
          Review your items and complete checkout — pay with USDC or card.
        </p>

        <CartProvider>
          <CartCheckout />
        </CartProvider>
      </div>
    </div>
  );
};

export default CartPage;
