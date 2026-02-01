"use client";

import { FC, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import InfoCardContent from "./InfoCardContent";
import toast from "react-hot-toast";
// import { addSwopPoint } from '@/app/actions/addPoint';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
interface Props {
  data: {
    _id: string;
    micrositeId: string;
    network: string;
    imageUrl: string;
    tokenUrl: string;
    link: string;
    mintName: string;
    mintLimit: number;
    amount: number;
    symbol: string;
    description: string;
    poolId: string;
  };
  socialType: string;
  parentId: string;
  number: number;
  accessToken: string;
  fontColor?: string;
  secondaryFontColor?: string;
  onClick?: () => void;
}

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};

const Redeem: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
  accessToken,
  fontColor,
  secondaryFontColor,
  onClick,
}) => {
  const {
    _id,
    network,
    link,
    description,
    imageUrl,
    tokenUrl,
    mintName,
    poolId,
  } = data;

  const [available, setAvailable] = useState(0);

  const updateCount = useCallback(async () => {
    if (onClick) return;
    try {
      fetch(`${API_URL}/api/v1/web/updateCount`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ socialType, socialId: _id, parentId }),
      });
    } catch (err) {
      console.error("Error updating count:", err);
    }
  }, [onClick, socialType, _id, parentId]);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick?.();
      return;
    }

    if (available > 0) {
      updateCount();
      window.open(`https://redeem.swopme.app/${poolId}`, "_blank");
    } else {
      toast.error("0 available amount to claim");
    }
  }, [onClick, available, updateCount, poolId]);

  useEffect(() => {
    if (onClick) return;
    const fetchValidLinks = async () => {
      const response = await fetch(
        `${API_URL}/api/v2/desktop/wallet/getRedeemTokenFromPool/${poolId}`,
      );
      const { data } = await response.json();
      if (data.pool && data.redeemed) {
        setAvailable(data.pool.max_wallets - data.redeemed.length);
      }
      return data;
    };
    fetchValidLinks();
  }, [onClick, poolId]);

  const delay = number + 0.1;

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
      className="w-full"
    >
      <motion.div
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 10,
        }}
        onClick={handleClick}
        className="max-w-full my-2 mx-1 flex flex-row items-center cursor-pointer bg-white shadow-small p-3 rounded-[12px] relative"
      >
        <div>
          <Image
            className="object-fill w-12 h-12 rounded-full"
            src={imageUrl}
            alt={mintName}
            width={320}
            height={280}
            priority
          />
        </div>
        {
          <InfoCardContent
            title={mintName}
            description={description}
            fontColor={fontColor}
            secondaryFontColor={secondaryFontColor}
          >
            <span className="text-xs font-bold">{available} Available</span>
          </InfoCardContent>
        }
      </motion.div>
    </motion.div>
  );
};

export default Redeem;
