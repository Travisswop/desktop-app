"use client";

import { FC } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import InfoCardContent from "./InfoCardContent";

interface Props {
  data: {
    _id: string;
    micrositeId: string;
    domain: string;
  };
  socialType: string;
  parentId: string;
  number: number;
  fontColor?: string;
  secondaryFontColor?: string;
}

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};

const Message: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
  fontColor,
  secondaryFontColor,
}) => {
  const { _id, domain } = data;

  const delay = number + 0.1;

  const redirectToSwop = () => {
    console.log("redirecting to swop");
    return window.open("https://swopme.co", "_blank");
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
        className="my-1.5 flex flex-row gap-2 items-center cursor-pointer bg-white shadow-xl p-2 rounded-[12px]"
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className="flex relative cursor-pointer">
              <Image
                className="object-fill w-10 h-auto"
                src="/images/outline-icons/message.svg"
                alt={domain}
                width={80}
                height={80}
                priority
              />
              {
                <InfoCardContent
                  title="Message Me"
                  description="Message me on swop"
                  fontColor={fontColor}
                  secondaryFontColor={secondaryFontColor}
                />
              }
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogDescription>
                You need to download the Swop app to message. Do you want to
                download the app?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={redirectToSwop}>
                Download App
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </motion.div>
  );
};

export default Message;
