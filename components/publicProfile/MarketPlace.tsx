"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingCart, Loader2 } from "lucide-react";

import toast from "react-hot-toast";
import { useCart } from "@/app/(public-profile)/sp/[username]/cart/context/CartContext";
import { useUser } from "@/lib/UserContext";
import {
  getSmartsiteMarketplaceImage,
  getSmartsiteMarketplaceName,
  getSmartsiteMarketplacePrice,
  normalizeSmartsiteMarketplaceItem,
} from "@/lib/smartsite-marketplace-display";

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
  const [isExisting, setIsExisting] = useState(true);
  const displayItem = normalizeSmartsiteMarketplaceItem(data) || data;
  const {
    itemImageUrl,
    itemName,
    itemPrice,
    collectionId,
    templateId,
    itemDescription,
  } = data;

  const { user } = useUser();
  const marketplaceProductId = String(
    displayItem.marketplaceProductId || data.productId || data._id || ""
  );
  const productName = getSmartsiteMarketplaceName(displayItem);
  const productDescription =
    displayItem.description || itemDescription || "";
  const productImage = getSmartsiteMarketplaceImage(displayItem);
  const productPrice = getSmartsiteMarketplacePrice(displayItem);
  const requiresShipping =
    displayItem.productType === "physical" ||
    Boolean(displayItem.fulfillment?.requiresShipping);
  const isSoldOut =
    Boolean(displayItem.inventory?.track) &&
    Number(displayItem.inventory?.available || 0) <= 0;

  const delay = (number + 1) * 0.2;

  const { dispatch } = useCart();

  const handleAddToCart = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!marketplaceProductId) {
      toast.error("This product is not available for checkout.");
      return;
    }

    setAddToCartLoading(true);

    const cartItem = {
      _id: marketplaceProductId,
      marketplaceProductId,
      productType: displayItem.productType,
      quantity: 1,
      timestamp: new Date().getTime(),
      sellerId,
      nftTemplate: {
        _id: marketplaceProductId,
        name: productName,
        description: productDescription,
        image: productImage,
        price: productPrice,
        collectionId,
        templateId,
        nftType: requiresShipping
          ? ("phygital" as const)
          : ("non-phygital" as const),
      },
    };

    dispatch({ type: "ADD_ITEM", payload: cartItem });
    toast.success("Item added to cart");
    setAddToCartLoading(false);
  };

  useEffect(() => {
    if (!accessToken) {
      setIsExisting(false);
    } else {
      if (user) {
        const isMyPublicProfile = user?.microsites?.find(
          (item) =>
            item?.ens === userName ||
            item?.ensData?.ens === userName ||
            item?.ensData?.ensData?.name === userName,
        );

        if (isMyPublicProfile) {
          setIsExisting(true);
        } else {
          setIsExisting(false);
        }
      } else {
        setIsExisting(false);
      }
    }
  }, [accessToken, user, userName]);

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
      <div className="relative bg-white rounded-2xl shadow-small overflow-hidden">
        {!isExisting && (
          <button
            onClick={handleAddToCart}
            disabled={addToCartLoading || isExisting || isSoldOut}
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
        )}

        <div className="relative aspect-square overflow-hidden m-6 mx-10 rounded-md">
          <Image
            src={productImage}
            alt={productName}
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
              className="text-sm font-medium line-clamp-1"
            >
              {productName}
            </p>
            <p className="text-xs font-medium mt-0.5 bg-gray-100 w-max px-2 py-0.5 rounded-md">
              ${productPrice}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MarketPlace;
