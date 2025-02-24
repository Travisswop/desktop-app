'use client';

import { FC } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface Props {
  data: {
    _id: string;
    micrositeId: string;
    name: string;
    coverPhoto: string;
    fileUrl: string;
  };
  socialType: string;
  parentId: string;
  number: number;
  length: number;
}

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};

const MP3: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
  length,
}) => {
  const { name, coverPhoto, fileUrl } = data;

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
    >
      <motion.div
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 10,
        }}
        className={`${
          number === length - 1 ? 'mb-0' : 'mb-2'
        } flex flex-row gap-2 items-center cursor-pointer bg-white shadow-2xl p-2 rounded-[12px]`}
      >
        <div>
          <Image
            className="object-fill w-16 h-16 rounded-[12px]"
            src={coverPhoto}
            alt={name}
            width={80}
            height={80}
            priority
          />
        </div>
        <div className="max-w-xs overflow-hidden">
          <figure>
            <audio controls>
              <source src={fileUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </figure>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MP3;
