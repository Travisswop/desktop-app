"use client";
import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingCart, Loader2 } from "lucide-react";

import { addProductToCart } from "@/actions/addToCartActions";
import toast from "react-hot-toast";
import { useCart } from "@/app/(public-profile)/sp/[username]/cart/context/CartContext";

// const API_URL = process.env.NEXT_PUBLIC_API_URL;

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};

const MarketPlace: any = ({
  data,
  sellerId,
  number,
  userName,
  accessToken,
  userId,
  fontColor,
}: any) => {
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const {
    itemImageUrl,
    itemName,
    itemPrice,
    collectionId,
    templateId,
    itemDescription,
  } = data;

  const delay = number + 1 * 0.2;

  const { dispatch } = useCart();

  const handleAddToCart = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setAddToCartLoading(true);

    if (!accessToken) {
      window.location.href =
        "https://apps.apple.com/us/app/swop-connecting-the-world/id1593201322";
      return;
    }

    const cartItem = {
      _id: Math.random().toString(36).substring(2, 15),
      quantity: 1,
      timestamp: new Date().getTime(),
      sellerId: sellerId,
      nftTemplate: {
        _id: data._id,
        name: itemName,
        description: itemDescription,
        image: itemImageUrl,
        price: itemPrice,
        collectionId: collectionId,
        templateId: templateId,
        nftType:
          data.collectionMintAddress ===
          "EFNUeHdd9dYNWaczMGfCtqThFea7HcL7xUdH8QNsYUcq"
            ? ("phygital" as const)
            : ("non-phygital" as const),
      },
    };

    if (!accessToken) {
      dispatch({ type: "ADD_ITEM", payload: cartItem });
      setAddToCartLoading(false);
      toast.success("Item added to cart (offline)");
      return;
    }

    try {
      const cartData = {
        userId: userId,
        collectionId: collectionId,
        templateId: templateId,
        quantity: 1,
        sellerId: sellerId,
      };

      const response = await addProductToCart(cartData, accessToken, userName);

      if (response.state === "success") {
        dispatch({ type: "ADD_ITEM", payload: cartItem });
        toast.success("Items added to cart");
      } else {
        throw new Error(response.message || "Failed to add item to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart. Please try again.");
    } finally {
      setAddToCartLoading(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{
        duration: 0.4,
        delay,
        type: "easeInOut",
      }}
      className="w-full "
    >
      <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <button
          onClick={handleAddToCart}
          disabled={addToCartLoading || isExisting}
          className="absolute top-3 right-3 z-10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addToCartLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-700" />
          ) : (
            <ShoppingCart
              className={`w-5 h-5 ${
                isExisting ? "text-gray-400" : "text-gray-700"
              }`}
            />
          )}
        </button>

        <div className="relative aspect-square overflow-hidden m-6 mx-10 rounded-md">
          <Image
            src={itemImageUrl}
            alt={itemName}
            fill
            quality={100}
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>

        <div className="p-3 pt-0">
          <div className="flex flex-col gap-0.5">
            <p
              style={{
                color: fontColor ? fontColor : "black",
              }}
              className="text-sm font-semibold line-clamp-1"
            >
              {itemName}
            </p>
            <p className="text-xs font-medium mt-0.5 bg-gray-100 w-max px-2 py-0.5 rounded-md">
              ${itemPrice}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MarketPlace;
