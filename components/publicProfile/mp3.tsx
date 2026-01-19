"use client";

import { FC } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import InfoCardContent from "./InfoCardContent";
import AudioPlayer from "react-h5-audio-player";
import { FaPause, FaPlay } from "react-icons/fa6";

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
  fontColor?: string;
  secondaryFontColor?: string;
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
  fontColor,
  secondaryFontColor,
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
        type: "easeInOut",
      }}
    >
      <motion.div
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 10,
        }}
        className={`${
          number === length - 1 ? "mb-0" : "mb-2"
        } flex flex-row gap-2 items-center cursor-pointer bg-white shadow-2xl p-2 rounded-[12px] w-full`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-1 items-center">
            <div className="relative">
              <Image
                src={coverPhoto}
                alt="cover photo"
                width={320}
                height={280}
                className="object-fill w-10 h-10 rounded-md"
                quality={100}
              />
            </div>
            {
              <InfoCardContent
                title={name}
                description={"Tap play button to listen the audio"}
                fontColor={fontColor}
                secondaryFontColor={secondaryFontColor}
              />
            }
          </div>
          <div className="custom-audio">
            <AudioPlayer
              key={fileUrl}
              autoPlay={false}
              src={fileUrl}
              showJumpControls={false}
              customAdditionalControls={[]}
              customVolumeControls={[]}
              layout="stacked-reverse"
              className={`!w-max !p-0 !shadow-none translate-y-1 rounded-full`}
              customIcons={{
                play: <FaPlay className="text-xl" />,
                pause: <FaPause className="text-xl" />,
              }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MP3;
