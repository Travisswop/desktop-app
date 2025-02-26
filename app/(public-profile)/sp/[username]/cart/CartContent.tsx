"use client";
import { updateCartQuantity } from "@/actions/addToCartActions";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { useUser } from "@/lib/UserContext";
import { CircleMinus, CirclePlus, Loader2 } from "lucide-react"; // Import Loader2 for a spinner
import Image from "next/image";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import { LiaTimesSolid } from "react-icons/lia";

const CartContent = ({ data }: any) => {
  const { accessToken } = useUser();
  const params = useParams();
  const name: any = params.username; // This will be "testh63s"

  // State to track loading for each item
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});

  const handleUpdateQuantity = async (data: any, type: string) => {
    try {
      // Set loading state for this item
      setLoadingStates((prev) => ({ ...prev, [data._id]: true }));

      const newQuantity =
        type === "inc" ? data.quantity + 1 : data.quantity - 1;
      const payload = {
        cartId: data._id,
        quantity: newQuantity,
      };

      if (name) {
        const response = await updateCartQuantity(payload, accessToken, name);
        console.log("response for update", response);

        // Handle success (e.g., update the UI or state)
      }
    } catch (error) {
      console.log(error, "error is");
    } finally {
      // Reset loading state for this item
      setLoadingStates((prev) => ({ ...prev, [data._id]: false }));
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2 w-full">
        {data.data.cartItems.map((data: any, index: string) => (
          <div
            key={index}
            className="bg-white shadow-medium rounded-xl w-full flex items-center gap-6 justify-between p-3 relative"
          >
            <div className="flex items-center gap-3">
              <Image
                src={data.nftTemplate.image}
                alt="nft image"
                width={320}
                height={320}
                className="w-32 h-auto"
              />
              <div>
                <p className="text-lg font-semibold mb-1">
                  {data.nftTemplate.name}
                </p>
                <p>{data.nftTemplate.price} USDC</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-black">
              <button
                onClick={() => handleUpdateQuantity(data, "dec")}
                disabled={loadingStates[data._id]} // Disable button when loading
              >
                {false ? (
                  <Loader2 className="animate-spin" size={20} /> // Show spinner when loading
                ) : (
                  <CircleMinus size={20} />
                )}
              </button>
              <span>
                {loadingStates[data._id] ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : data.quantity ? (
                  data.quantity
                ) : (
                  1
                )}
              </span>
              <button
                onClick={() => handleUpdateQuantity(data, "inc")}
                disabled={loadingStates[data._id]} // Disable button when loading
              >
                {false ? (
                  <Loader2 className="animate-spin" size={20} /> // Show spinner when loading
                ) : (
                  <CirclePlus size={20} />
                )}
              </button>
            </div>
            <button className="absolute top-1 right-1">
              <LiaTimesSolid size={18} />
            </button>
          </div>
        ))}
      </div>
      <div className="bg-white w-full shadow-medium rounded-t-lg mt-10 p-3 text-gray-600 font-medium flex flex-col gap-1">
        <div className="flex items-center gap-6 justify-between">
          <p>Subtotal (1 items)</p>
          <p>10 USDC</p>
        </div>
        <div className="flex items-center gap-6 justify-between">
          <p>Discount Rate</p>
          <p>0 USDC</p>
        </div>
        <div className="flex items-center gap-6 justify-between text-gray-800 font-bold">
          <p>Total Amount</p>
          <p>0 USDC</p>
        </div>
        <AnimateButton
          whiteLoading={true}
          type="button"
          className="bg-black text-white py-2 !border-0 w-full mt-6"
        >
          Pay With Wallet
        </AnimateButton>
        <AnimateButton
          whiteLoading={true}
          type="button"
          className=" w-full mt-2"
        >
          Pay With Card
        </AnimateButton>
      </div>
    </div>
  );
};

export default CartContent;
