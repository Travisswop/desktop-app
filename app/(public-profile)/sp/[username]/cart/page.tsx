import { getCartData, getNftDetails } from "@/actions/addToCartActions";
import { cookies } from "next/headers";
import React from "react";
import CartCheckout from "./CartCheckout";

const CartPage = async () => {
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("access-token")?.value;

  // if (!accessToken) {
  //   throw new Error('Access Token required');
  // }

  if (accessToken) {
    const data = await getCartData(accessToken);
    console.log("data", data);

    return (
      <div className="flex max-w-md mx-auto min-h-screen flex-col items-center px-4">
        <p className="text-2xl font-bold mt-6 mb-4">Your Cart</p>
        <CartCheckout data={data} accessToken={accessToken} />
      </div>
    );
  } else {
    // const cartItems = (await cookieStore).get("marketplace-add-to-cart");
    // console.log("cartItems from localStorage", cartItems);

    // const data = await getNftDetails();
    return (
      <div className="flex max-w-md mx-auto min-h-screen flex-col items-center px-4">
        <p className="text-2xl font-bold mt-6 mb-4">Your Cart</p>
        <CartCheckout />
      </div>
    );
  }
};

export default CartPage;
