import { getCartData } from '@/actions/addToCartActions';
import { cookies } from 'next/headers';
import React from 'react';
import CartCheckout from './CartCheckout';

const CartPage = async () => {
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get('access-token')?.value;

  if (!accessToken) {
    throw new Error('Access Token required');
  }

  const data = await getCartData(accessToken);

  return (
    <div className="flex max-w-md mx-auto min-h-screen flex-col items-center px-4">
      <p className="text-2xl font-bold mt-6 mb-4">Your Cart</p>
      <CartCheckout data={data} accessToken={accessToken} />
    </div>
  );
};

export default CartPage;
