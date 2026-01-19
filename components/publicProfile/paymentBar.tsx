"use client";
import { FC } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import InfoCardContent from "./InfoCardContent";
// import { addSwopPoint } from '@/app/actions/addPoint';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  data: {
    _id: string;
    micrositeId: string;
    title: string;
    paymentUrl: string;
    imageUrl: string;
    description: string;
    price: number;
  };
  socialType: string;
  parentId: string;
  number: number;
  accessToken: string;
  fontColor?: string;
  secondaryFontColor?: string;
}
const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};
const PaymentBar: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
  accessToken,
  fontColor,
  secondaryFontColor,
}) => {
  const { _id, micrositeId, title, paymentUrl, imageUrl, description, price } =
    data;

  const openlink = async () => {
    if (!accessToken) {
      window.location.href =
        "https://apps.apple.com/us/app/swop-connecting-the-world/id1593201322";
      return;
    }
    try {
      fetch(`${API_URL}/api/v1/web/updateCount`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          socialType,
          socialId: _id,
          parentId,
        }),
      });
    } catch (err) {
      console.log(err);
    }
    return window.open(paymentUrl, "_self");
  };

  const delay = number + 1 * 0.2;

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
    >
      <motion.div
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 10,
        }}
        onClick={() => openlink()}
        className="my-1.5 flex justify-between items-center cursor-pointer bg-white shadow-2xl p-2 rounded-[12px]"
      >
        <div className="flex flex-row items-center">
          <div>
            <Image
              className="object-fill w-10 h-auto rounded-md"
              src={imageUrl}
              alt={title}
              width={80}
              height={80}
              priority
            />
          </div>
          {
            <InfoCardContent
              title={title}
              description={description}
              fontColor={fontColor}
              secondaryFontColor={secondaryFontColor}
            />
          }
        </div>
        <div>
          <span className="font-medium text-sm">${price}</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PaymentBar;
