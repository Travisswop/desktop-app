import React from 'react';
import CartCheckout from './CartCheckout';
import { CartProvider } from './context/CartContext';
const CartPage = async () => {
  return (
    <div className="flex max-w-md mx-auto min-h-screen flex-col items-center px-4">
      <p className="text-2xl font-bold mt-6 mb-4">Your Cart</p>
      <CartProvider>
        <CartCheckout />
      </CartProvider>
    </div>
  );
};

export default CartPage;
