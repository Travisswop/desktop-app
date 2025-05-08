'use client';
import { useState } from 'react';
import Image from 'next/image';
import { downloadVCard } from '@/lib/vCardUtils';
import { motion } from 'framer-motion';
import { LuCirclePlus } from 'react-icons/lu';

import { addProductToCart } from '@/actions/addToCartActions';
import toast from 'react-hot-toast';
import { Loader } from 'lucide-react';
import { useCart } from '@/app/(public-profile)/sp/[username]/cart/context/CartContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};

const download = async (data: any, parentId: string) => {
  const vCard = await downloadVCard(data);
  const blob = new Blob([vCard], { type: 'text/vcard' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `${data.name}.vcf`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  try {
    fetch(`${API_URL}/api/v1/web/updateCount`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        socialType: 'contact',
        socialId: data._id,
        parentId,
      }),
    });
  } catch (err) {
    console.log(err);
  }
};

const MarketPlace: any = ({
  data,
  parentId,
  number,
  userName,
  accessToken,
  userId,
  index,
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

    const cartItem = {
      _id: Math.random().toString(36).substring(2, 15),
      quantity: 1,
      timestamp: new Date().getTime(),
      sellerId: parentId,
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
          'EFNUeHdd9dYNWaczMGfCtqThFea7HcL7xUdH8QNsYUcq'
            ? ('phygital' as const)
            : ('non-phygital' as const),
      },
    };

    if (!accessToken) {
      dispatch({ type: 'ADD_ITEM', payload: cartItem });
      setAddToCartLoading(false);
      toast.success('Item added to cart (offline)');
      return;
    }

    try {
      const cartData = {
        userId: userId,
        collectionId: collectionId,
        templateId: templateId,
        quantity: 1,
        sellerId: parentId,
      };

      const response = await addProductToCart(
        cartData,
        accessToken,
        userName
      );

      if (response.state === 'success') {
        dispatch({ type: 'ADD_ITEM', payload: cartItem });
        toast.success('Items added to cart');
      } else {
        throw new Error(
          response.message || 'Failed to add item to cart'
        );
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart. Please try again.');
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
        type: 'easeInOut',
      }}
    >
      <div>
        <motion.div
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 10,
          }}
          onClick={() => download(data, parentId)}
          className="my-1 flex gap-2 justify-between items-center cursor-pointer bg-white shadow-xl p-2 rounded-[12px]"
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center w-20 h-20">
              <Image
                className="w-20 h-20 rounded-xl"
                src={itemImageUrl}
                alt={'mint image'}
                width={240}
                height={240}
              />
            </div>
            <div className="w-auto">
              <div className="text-lg font-semibold w-full">
                {itemName}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {itemPrice} USDC
              </div>
            </div>
          </div>
          <div>
            <button
              type="button"
              disabled={addToCartLoading || isExisting}
              onClick={handleAddToCart}
              className={`text-sm flex items-center gap-1 w-max ${
                isExisting
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'font-semibold'
              }`}
            >
              <span className="flex items-center gap-1">
                Add To Cart{' '}
                <span className="w-5">
                  {addToCartLoading ? (
                    <Loader className="animate-spin" size={20} />
                  ) : (
                    <LuCirclePlus
                      color={isExisting ? 'gray' : 'black'}
                      size={18}
                    />
                  )}
                </span>
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MarketPlace;
