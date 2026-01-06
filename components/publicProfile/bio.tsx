"use client";
import { FC } from "react";
// import Image from "next/image";
// import { ToastAction } from "@/components/ui/toast";
// import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
interface Props {
  name: string;
  bio: string;
}

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};
const Bio: FC<Props> = ({ name, bio }) => {
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
    >
      <h1 className="text-xl font-bold text-center">{name}</h1>
      <div className="text-sm sm:text-md text-center">{bio}</div>
    </motion.div>
  );
};

export default Bio;
