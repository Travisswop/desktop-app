"use client";

import { FC, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
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
    evmLink: string[];
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

const Redeem: FC<Props> = ({ data, socialType, parentId, number }) => {
  const {
    _id,
    network,
    link,
    description,
    imageUrl,
    tokenUrl,
    mintName,
    evmLink,
  } = data;

  const [availableLinks, setAvailableLinks] = useState<string[]>([]);
  const { toast } = useToast();

  const updateCount = useCallback(async () => {
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
  }, [socialType, _id, parentId]);

  const openLink = useCallback(() => {
    updateCount();
    if (network.toLowerCase() === "solana") {
      window.open(link, "_self");
    } else if (availableLinks.length > 0) {
      window.open(availableLinks[0], "_self");
    } else {
      toast({ title: "All links are redeemed" });
    }
  }, [network, link, availableLinks, updateCount, toast]);

  useEffect(() => {
    if (network.toLowerCase() !== "solana") {
      const fetchValidLinks = async () => {
        const validLinks = await Promise.all(
          evmLink.map(async (item: any) => {
            if (item.isClaimed) {
              return null;
            }
            const response = await fetch(
              `${API_URL}/api/v4/microsite/isRedeemLinkValid`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ link: item.link, id: _id }),
              }
            );
            const { data } = await response.json();
            return data ? null : item.link;
          })
        );
        setAvailableLinks(
          validLinks.filter((link) => typeof link === "string")
        );
      };
      fetchValidLinks();
    }
  }, [network, evmLink, _id]);

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
        onClick={openLink}
        className="my-1 flex flex-row gap-2 items-center cursor-pointer bg-white shadow-2xl p-3 rounded-[12px] relative"
      >
        <div>
          <Image
            className="object-fill w-20 h-20 rounded-[12px]"
            src={imageUrl}
            alt={mintName}
            width={80}
            height={80}
            priority
          />
        </div>
        <div className="max-w-xs overflow-hidden">
          <h4 className="text-md font-semibold">{mintName}</h4>
          <p className="text-xs ">{description}</p>
          {network.toLowerCase() !== "solana" && (
            <span className="text-xs font-bold">
              {availableLinks.length} Available
            </span>
          )}
        </div>
        <div className="absolute right-2 bottom-2">
          <Image src={tokenUrl} alt="redeem" width={18} height={18} />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Redeem;
