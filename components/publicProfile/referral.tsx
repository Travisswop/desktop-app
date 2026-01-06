'use client';

import { FC } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
interface Props {
  data: {
    _id: string;
    micrositeId: string;
    buttonName: string;
    referralCode: string;
    description: string;
  };
  socialType: string;
  parentId: string;
  number: number;
  accessToken: string;
}

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};

const Referral: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
  accessToken,
}) => {
  const { _id, micrositeId, buttonName, referralCode, description } =
    data;
  const { toast } = useToast();
  const action = async () => {
    if (!accessToken) {
      window.location.href =
        'https://apps.apple.com/us/app/swop-connecting-the-world/id1593201322';
      return;
    }
    navigator.clipboard.writeText(referralCode);
    toast({
      title: 'Copied to clipboard',
    });
    try {
      fetch(`${API_URL}/api/v1/web/updateCount`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
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
        type: 'easeInOut',
      }}
      onClick={action}
      className="w-full"
    >
      <motion.div
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 10,
        }}
        className="mb-3 flex flex-row gap-2 items-center cursor-pointer bg-white shadow-2xl p-2 rounded-[12px]"
      >
        <div>
          <Image
            className="object-fill w-16 h-16 rounded-[12px]"
            src="/share.svg"
            alt={buttonName}
            width={80}
            height={80}
            priority
          />
        </div>
        <div className="max-w-xs overflow-hidden">
          <div className="text-md font-semibold">{buttonName}</div>
          <div className="text-xs">{description}</div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Referral;
