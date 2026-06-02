"use client";

import { FC } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import InfoCardContent from "./InfoCardContent";

interface Props {
  data: {
    _id: string;
    micrositeId: string;
    domain: string;
  };
  socialType: string;
  parentId?: string;
  number: number;
  fontColor?: string;
  secondaryFontColor?: string;
  onClick?: () => void;
}

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};

const Message: FC<Props> = ({
  data,
  parentId,
  number,
  fontColor,
  secondaryFontColor,
  onClick,
}) => {
  const { domain } = data;

  const delay = number + 0.1;

  const buildMessageUrl = () => {
    const params = new URLSearchParams();
    const recipientId = parentId?.trim();
    const micrositeId = data.micrositeId?.trim();
    const recipientEns = domain?.trim().replace(/^@/, "");

    if (recipientId) params.set("recipientId", recipientId);
    if (micrositeId) params.set("micrositeId", micrositeId);
    if (recipientEns) params.set("recipientEns", recipientEns);
    params.set("source", "smartsite");

    const query = params.toString();
    return query ? `/dashboard/chat?${query}` : "/dashboard/chat";
  };

  const openMessages = () => {
    window.location.assign(buildMessageUrl());
  };

  const handleClick = async () => {
    // If custom onClick is provided, use it
    if (onClick) {
      onClick();
      return;
    }

    openMessages();
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
    >
      <motion.div
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 10,
        }}
        className="max-w-full my-2 mx-1"
      >
        <button
          type="button"
          onClick={handleClick}
          className="flex w-full cursor-pointer flex-row items-center gap-2 rounded-[12px] bg-white p-2 text-left shadow-small"
        >
          <Image
            className="h-auto w-10 object-fill"
            src="/images/outline-icons/message.svg"
            alt={domain}
            width={80}
            height={80}
            priority
          />
          <InfoCardContent
            title="Message Me"
            description="Message me on swop"
            fontColor={fontColor}
            secondaryFontColor={secondaryFontColor}
          />
        </button>
      </motion.div>
    </motion.div>
  );
};

export default Message;
