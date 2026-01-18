"use client";
import { FC } from "react";
// import Image from "next/image";
// import { ToastAction } from "@/components/ui/toast";
// import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
interface Props {
  name: string;
  bio: string;
  primaryFontColor?: string;
  secondaryFontColor?: string;
}

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};
const Bio: FC<Props> = ({
  name,
  bio,
  primaryFontColor = "#000000",
  secondaryFontColor = "#D3D3D3",
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{
        duration: 0.4,
        type: "easeInOut",
      }}
      className="text-center"
    >
      <h1
        style={{ color: primaryFontColor }}
        className="text-base font-semibold"
      >
        {name}
      </h1>
      <p style={{ color: secondaryFontColor }} className="text-sm">
        {bio}
      </p>
    </motion.div>
  );
};

export default Bio;
