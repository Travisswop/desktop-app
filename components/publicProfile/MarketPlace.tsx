'use client';
import { FC, useState } from 'react';
import Image from 'next/image';
import { downloadVCard } from '@/lib/vCardUtils';
import { motion } from 'framer-motion';
import { LuCirclePlus } from 'react-icons/lu';
import { useUser } from '@/lib/UserContext';
import { useRouter } from 'next/navigation';
import { Spinner } from '@nextui-org/react';
import { addProductToCart } from '@/actions/addToCartActions';
import toast from 'react-hot-toast';
import { Loader } from 'lucide-react';
import useAddToCardToggleStore from '@/zustandStore/addToCartToggle';
const API_URL = process.env.NEXT_PUBLIC_API_URL;
interface Props {
  data: {
    _id: string;
    micrositeId: string;
    name: string;
    mobileNo: string;
    email: string;
    address: string;
    websiteUrl: string;
  };
  socialType: string;
  parentId: string;
  number: number;
}

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
  socialType,
  parentId,
  number,
  userName,
  accessToken,
  userId,
}: any) => {
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const {
    _id,
    itemImageUrl,
    itemName,
    itemPrice,
    mintLimit,
    collectionId,
    templateId,
  } = data;
  const delay = number + 1 * 0.2;

  const { toggle, setToggle } = useAddToCardToggleStore();

  // const { user, accessToken } = useUser();

  const router = useRouter();

  // console.log("user from hook", user);

  const handleAddToCart = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setAddToCartLoading(true);
    if (!accessToken) {
      return router.push('/login');
    }
    const data = {
      userId: userId,
      collectionId: collectionId,
      templateId: templateId,
      quantity: 1,
    };

    try {
      const response = await addProductToCart(
        data,
        accessToken,
        userName
      );

      setToggle();

      // const resData = await response.json();

      // if (resData?.data?.quantity === 1) {
      //   setCartQty(cartQty + 1);
      // }

      setAddToCartLoading(false);
      toast.success('Items added to cart');

      // console.log("data", data);
    } catch (error) {
      toast.error('Something went wrong!Please try again!');
      console.log(error);
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
          <div className="flex items-center gap-2">
            <div className="w-24 h-24">
              <Image
                className="w-full h-auto"
                src={itemImageUrl}
                alt={'mint image'}
                width={240}
                height={240}
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{itemName}</div>
              <div className="text-xs text-gray-600 font-medium">
                {itemPrice} USDC
              </div>
            </div>
          </div>
          <div className="pr-2">
            <button
              type="button"
              disabled={addToCartLoading}
              onClick={handleAddToCart}
              className="text-sm font-semibold flex items-center gap-1"
            >
              <span className="flex items-center gap-1">
                Add To Cart{' '}
                <span className="w-5">
                  {addToCartLoading ? (
                    <Loader className="animate-spin" size={20} />
                  ) : (
                    <LuCirclePlus color="black" size={18} />
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
