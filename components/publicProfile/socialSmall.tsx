"use client";
import { FC } from "react";
import Image from "next/image";
// import { ToastAction } from '@/components/ui/toast';
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import getSmallIconColorFilter from "@/utils/smallIconColorFilter";
// import { getDeviceInfo } from '@/components/collectiVistUserInfo';
// import { addSwopPoint } from '@/app/actions/addPoint';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
// const deviceInfo = getDeviceInfo();
interface Props {
  data: {
    _id: string;
    micrositeId: string;
    name: string;
    value: string;
    url: string;
    iconName: string;
    iconPath: string;
    group: string;
  };
  socialType: string;
  parentId: string;
  number: number;
  accessToken: string;
  fontColor: string;
}

interface SocialInputTypes {
  [key: string]: string;
}

const socialInputTypes: SocialInputTypes = {
  TikTok: "username",
  Instagram: "username",
  Facebook: "username",
  Twitter: "username",
  Snapchat: "username",
  "Linked In": "username",
  Github: "link",
  YouTube: "link",
  Bluesky: "link",
  Rumble: "link",
  Truth: "link",
};

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};
const SocialSmall: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
  accessToken,
  fontColor,
}) => {
  const { _id, micrositeId, name, value, url, iconName, iconPath, group } =
    data;

  const openlink = async () => {
    // if (!accessToken) {
    //   window.location.href =
    //     "https://apps.apple.com/us/app/swop-connecting-the-world/id1593201322";
    //   return;
    // }
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

    switch (group) {
      case "Social Media":
        if (socialInputTypes[name] === "link") {
          return window.open(value, "_blank");
        }
        if (value.includes("https") || value.includes("http")) {
          return window.open(value, "_blank");
        } else {
          return window.open(`https://${url}/${value}`, "_blank");
        }
      case "Commands":
        if (name === "Email") {
          return window.open(`mailto:${value}`, "_self");
        }
        return window.open(value, "_self");
      case "Chat Links":
        if (name === "Whatsapp") {
          return window.open(`https://wa.me/${value}?`, "_self");
        }
        if (name === "Telegram") {
          return window.open(`https://t.me/${value}?`, "_self");
        }
        return window.open(`${value}`, "_self");
      default:
        return window.open(value, "_self");
    }
  };

  const delay = 0.5;

  const trimIcon = iconName.toLowerCase().trim().replace(" ", "");

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
      onClick={openlink}
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 10,
        }}
        className="flex rounded-full cursor-pointer justify-center"
      >
        <Image
          src={
            iconPath ? iconPath : `/images/small-icons/black/${trimIcon}.png`
          }
          alt={iconName}
          width={320}
          height={320}
          quality={100}
          className="w-5 h-auto"
          style={{
            filter: getSmallIconColorFilter(fontColor),
          }}
        />
      </motion.div>
    </motion.div>
  );
};

export default SocialSmall;
