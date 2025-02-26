import { getCartData } from "@/actions/addToCartActions";
import { cookies } from "next/headers";
import React from "react";
import CartContent from "./CartContent";

const AddToCartPage = async () => {
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("access-token")?.value;
  //   console.log("access token from card", accessToken);

  if (accessToken) {
    const data = await getCartData(accessToken);

    // console.log("data", data);

    return (
      <div className="flex max-w-md mx-auto min-h-screen flex-col items-center px-4">
        <p className="text-2xl font-bold mt-6 mb-4">Cart</p>
        <CartContent data={data} />
      </div>
    );
  }
};

export default AddToCartPage;
