"use client";

import { FC } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import InfoCardContent from "./InfoCardContent";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  data: {
    _id: string;
    micrositeId: string;
    domain: string;
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

const Ens: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
  accessToken,
  fontColor,
  secondaryFontColor,
}) => {
  const { _id, domain } = data;
  const openlink = async () => {
    // if (!accessToken) {
    //   window.location.href =
    //     'https://apps.apple.com/us/app/swop-connecting-the-world/id1593201322';
    //   return;
    // }
    navigator.clipboard.writeText(domain);
    toast.success("Copied to clipboard");
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
  };

  // const delay = number + 0.1;

  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{
        duration: 0.4,
        delay: 0.2,
        type: "easeInOut",
      }}
    >
      <motion.div
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 10,
        }}
        onClick={openlink}
        className="my-1 flex items-center cursor-pointer bg-white shadow-xl p-2 rounded-[12px]"
      >
        <div>
          <Image
            className="object-fill w-10 h-auto"
            src="/images/outline-icons/ethereum.svg"
            alt={domain}
            width={320}
            height={280}
            quality={100}
            priority
          />
        </div>
        {
          <InfoCardContent
            title={domain}
            description="Use my swop.id to send to my self custodial wallet"
            fontColor={fontColor}
            secondaryFontColor={secondaryFontColor}
          />
        }
      </motion.div>
    </motion.div>
  );
};

export default Ens;
