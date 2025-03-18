import { getCartData } from '@/actions/addToCartActions';
import { cookies } from 'next/headers';
import React from 'react';
import CartContent from './CartContent';
// import { redirect } from "next/navigation";

const AddToCartPage = async () => {
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get('access-token')?.value;

  // if (accessToken) {
  const data = await getCartData(accessToken ? accessToken : '');

  // console.log("data", data);

  return (
    <div className="flex max-w-md mx-auto min-h-screen flex-col items-center px-4">
      <p className="text-2xl font-bold mt-6 mb-4">Cart</p>
      <CartContent data={data} accessToken={accessToken} />
    </div>
  );
  // }
};

export default AddToCartPage;
